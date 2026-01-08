import { NextResponse } from "next/server";
import Stripe from "stripe";
import axios from "axios";
import { MongoClient } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET;
const WC_BASE = process.env.SITE_URL + "/wp-json/wc/v3";
const MONGODB_URI = process.env.MONGODB_URI;

const getDb = async () => {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db();
};

const logAction = async (action, details) => {
    if (!['order_updated', 'subscription_updated', 'renewal_order_updated'].includes(action)) return;
    try {
        const db = await getDb();
        await db.collection('logs').insertOne({
            action,
            details,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Logging failed:', error.message);
    }
};

const isEventProcessed = async (eventId) => {
    try {
        const db = await getDb();
        const result = await db.collection('processed_events').findOne({ eventId });
        return !!result;
    } catch (error) {
        return false;
    }
};

const markEventProcessed = async (eventId) => {
    try {
        const db = await getDb();
        await db.collection('processed_events').insertOne({ eventId, processedAt: new Date() });
    } catch (error) {
    }
};

export async function POST(request) {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event = JSON.parse(payload);
    console.log('Received Stripe event:', event.type);
    //  try {
    //     event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    // } catch (err) {
    //     await logAction('webhook_verification_failed', { error: err.message });
    //     return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    // }

    // if (await isEventProcessed(event.id)) {
    //     return NextResponse.json({ received: true });
    // }

    const findAndUpdateRenewalOrder = async (wcSubId) => {

        if (!wcSubId) return;
        try {
            const response = await axios.get(
                `${WC_BASE}/subscriptions/${wcSubId}/orders`,
                {
                    params: {
                        consumer_key: process.env.CONSUMER_KEY,
                        consumer_secret: process.env.CONSUMER_SECRET,
                        orderby: 'date',
                        order: 'desc'
                    }
                }
            );
            const orders = response.data;

            const ordersData = orders.map(order => ({ id: order.id, status: order.status }));
            console.log('Fetched renewal orders:', ordersData);
            if (!orders || orders.length === 0) {
                return;
            }
            const renewalOrder = orders.find(order => order.status === 'pending');
            if (renewalOrder) {
                await updateOrder(renewalOrder.id, "processing", 'renewal_order_updated');
            } else {
            }
        } catch (error) {
        }
    };

    const updateOrder = async (orderId, status, action = 'order_updated') => {
        if (!orderId) return;
        try {
            await axios.put(
                `${WC_BASE}/orders/${orderId}`,
                { status },
                {
                    params: {
                        consumer_key: process.env.CONSUMER_KEY,
                        consumer_secret: process.env.CONSUMER_SECRET
                    }
                }
            );
            await logAction(action, { orderId, status });
        } catch (error) {
            console.error('Update order failed:', error.message);
        }
    };

    const updateSubscription = async (wcSubId, status, stripeSubId) => {
        if (!wcSubId) return;
        try {
            const body = { status };
            if (stripeSubId) {
                body.meta_data = [{ key: "stripe_subscription_id", value: stripeSubId }];
            }
            await axios.put(
                `${WC_BASE}/subscriptions/${wcSubId}`,
                body,
                {
                    params: {
                        consumer_key: process.env.CONSUMER_KEY,
                        consumer_secret: process.env.CONSUMER_SECRET
                    }
                }
            );
            await logAction('subscription_updated', { wcSubId, status, stripeSubId });
        } catch (error) {
            console.error('Update subscription failed:', error.message);
        }
    };

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const orderId = session.metadata?.order_id || session.client_reference_id;
                const subId = session.metadata?.subscription_id;
                const stripeSubId = session?.subscription;
                if (!orderId) {
                    break;
                }
                await updateOrder(orderId, "processing");
                if (stripeSubId && subId) {
                    await updateSubscription(subId, "active", stripeSubId);
                }
                break;
            }
            case "payment_intent.succeeded": {
                const pi = event.data.object;
                const orderId = pi.metadata?.order_id;
                if (!orderId) {
                    break;
                }
                await updateOrder(orderId, "completed");
                break;
            }
            case "invoice.payment_succeeded": {
                const inv = event.data.object;
                const wcSubIdFromParent = inv.parent?.subscription_details?.metadata?.subscription_id;
                const wcSubId = wcSubIdFromParent || inv.metadata?.subscription_id;
                const billingReason = inv.billing_reason;
                if (!wcSubId) {
                    break;
                }
                if (billingReason === 'subscription_cycle' || billingReason === 'subscription_update') {
                    await updateSubscription(wcSubId, "active");
                    console.log('Processing renewal for wcSubId:', wcSubId);
                    await findAndUpdateRenewalOrder(wcSubId);
                } else if (billingReason === 'subscription_create') {
                    console.log('Subscription created invoice processed for wcSubId:', wcSubId);
                    await updateSubscription(wcSubId, "active");
                }
                break;
            }
            case "invoice.payment_failed": {
                const sub = event.data.object;
                const subId = sub.parent?.subscription_details?.metadata?.subscription_id || sub.metadata?.subscription_id;
                if (!subId) {
                    break;
                }
                await updateSubscription(subId, "on-hold");
                break;
            }
            case "customer.subscription.updated": {
                const sub = event.data.object;
                const subId = sub.metadata?.subscription_id;
                const stripeSubId = sub.id;
                if (!subId) {
                    break;
                }
                await updateSubscription(subId, sub.status, stripeSubId);
                break;
            }
            case "customer.subscription.deleted": {
                const sub = event.data.object;

                const subId = sub.parent?.subscription_details?.metadata?.subscription_id || sub.metadata?.subscription_id;
                console.log(subId)
                if (!subId) {
                    break;
                }
                await updateSubscription(subId, "cancelled");
                break;
            }
            default: {
            }
        }
        await markEventProcessed(event.id);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }

    return NextResponse.json({ received: true });
}

export function GET() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}
