import { NextResponse } from "next/server";
import Stripe from "stripe";
import axios from "axios";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET;

const WC_BASE = process.env.SITE_URL + "/wp-json/wc/v3";


export async function POST(request) {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        console.error("Signature verification failed:", err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }


    const findAndUpdateRenewalOrder = async (wcSubId) => {
        console.log("________________________________________________________________________________________")
        console.log("________________________________________________________________________________________")
        console.log("Finding renewal orders:", wcSubId)
        console.log("________________________________________________________________________________________")
        console.log("________________________________________________________________________________________")
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
            console.log(orders)
            if (!orders || orders.length === 0) {
                console.log(`[Renewal] No orders found for WC Subscription ${wcSubId}`);
                return;
            }

            const renewalOrder = orders.find(order => order.status === 'pending');
            if (renewalOrder) {
                console.log(`[Renewal] Found pending renewal order ${renewalOrder.id} for sub ${wcSubId}.`);
                await updateOrder(renewalOrder.id, "processing");
            } else {
                console.log(`[Renewal] No 'pending' renewal order found for WC Sub ${wcSubId}.`);
            }
        } catch (error) {
            console.error(`[Renewal] Error finding/updating order for sub ${wcSubId}:`, error.message);
        }
    };

    const updateOrder = async (orderId, status) => {
        if (!orderId) return;
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
        console.log(`Order ${orderId} updated to  ${status} `);
    };

    const updateSubscription = async (wcSubId, status, stripeSubId) => {
        if (!wcSubId) return;
        const body = { status };
        if (stripeSubId) {
            body.meta_data = [
                { key: "stripe_subscription_id", value: stripeSubId }
            ];
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
        if (stripeSubId) console.log(`Stripe Sub ID ${stripeSubId} Saved into wc_subscription meta `);
    };

    switch (event.type) {
        case "checkout.session.completed": {
            console.log(event.type)
            const session = event.data.object;
            const orderId = session.metadata?.order_id || session.client_reference_id;
            const subId = session.metadata?.subscription_id;
            const stripeSubId = session?.subscription
            await updateOrder(orderId, "processing");
            if (stripeSubId) {
                await updateSubscription(subId, "active", stripeSubId);
            }
            break;
        }

        case "payment_intent.succeeded": {
            console.log(event.type)

            const pi = event.data.object;
            const orderId = pi.metadata?.order_id;
            await updateOrder(orderId, "completed");
            break;
        }

        case "invoice.payment_succeeded": {
            const inv = event.data.object;
            const wcSubIdFromParent = inv.parent?.subscription_details?.metadata?.subscription_id;
            const wcSubId = wcSubIdFromParent || inv.metadata?.subscription_id;
            const billingReason = inv.billing_reason;
            console.log(`[Invoice] Received invoice.payment_succeeded. Billing Reason: ${billingReason}. WC Sub ID found: ${wcSubId}`);
            if (!wcSubId) {
                console.log("[Invoice] Error: Could not find WC Subscription ID. Skipping.");
                break;
            }
            // if (billingReason === 'subscription_create' || billingReason === 'subscription_create') {
            if (billingReason === 'subscription_cycle' || billingReason === 'subscription_update') {
                console.log("________________________________________________________________________________________")

                await updateSubscription(wcSubId, "active");
                await findAndUpdateRenewalOrder(wcSubId);
            } else if (billingReason === 'subscription_create') {
                await updateSubscription(wcSubId, "active");
            }
            break;
        }

        case "invoice.payment_failed": {
            const inv = event.data.object;
            const subId = inv.metadata.subscription_id;
            await updateSubscription(subId, "on-hold");
            break;
        }

        case "customer.subscription.updated": {
            const sub = event.data.object;
            const subId = sub.metadata.subscription_id;
            const stripeSubId = sub.id

            console.log(subId, "From Stripe Meta")

            if (subId) {
                console.log(subId, "subscription_Id")
                console.log(stripeSubId, "stripe_subscription_Id")
                await updateSubscription(subId, sub.status, stripeSubId);
            }
            break;
        }

        case "customer.subscription.deleted": {
            console.log(event.type)

            const sub = event.data.object;
            const subId = sub.metadata.subscription_id;
            console.log(subId, "subscription_Id")
            await updateSubscription(subId, "cancelled");
            break;
        }

        default:
            console.log(`Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

export function GET() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}