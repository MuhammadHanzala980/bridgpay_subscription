

import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const WEBHOOK_SECRET = process.env.WC_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const signature = request.headers.get("x-wc-webhook-signature");
        const topic = request.headers.get("x-wc-webhook-topic");
        const bodyText = await request.text();

        if (WEBHOOK_SECRET) {
            const hash = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(bodyText)
                .digest("base64");

            if (hash !== signature) {
                return new NextResponse("Invalid Signature", { status: 401 });
            }
        }

        // if (topic !== "subscription.updated") {
        //     return new NextResponse("Webhook Received", { status: 200 });
        // }

        const payload = JSON.parse(bodyText);
        console.log(payload.status)
        const stripeMeta = payload.meta_data.find(
            (meta) => meta.key === "stripe_subscription_id"
        );

        if (!stripeMeta || !stripeMeta.value) {
            console.log("Stripe Subscription ID not found in WooCommerce Order Data.");
            return new NextResponse("Webhook Received", { status: 200 });
        }

        const stripeSubId = stripeMeta.value;
        console.log(stripeSubId)
        let subscription;
        try {
            subscription = await stripe.subscriptions.retrieve(stripeSubId);
         } catch (stripeErr) {
            if (stripeErr.code === 'resource_missing') {
                console.log("Stripe Subscription not found.");
                return new NextResponse("Webhook Received", { status: 200 });
            }
            return new NextResponse(`Stripe Error: ${stripeErr.message}`, { status: 500 });
        }

        if (payload.status === "cancelled") {
            if (subscription.status !== 'canceled') {
                try {
                    const deletedSubscription = await stripe.subscriptions.cancel(stripeSubId);
                    console.log(`Stripe Subscription ${deletedSubscription.id} cancelled successfully.`);
                } catch (stripeErr) {
                    console.log(stripeErr, "Stripe Error");
                    if (stripeErr.code !== 'resource_missing') {
                        return new NextResponse(`Stripe Error: ${stripeErr.message}`, { status: 500 });
                    }
                }
            }
        } else if (payload.status === "on-hold") {
            try {
                await stripe.subscriptions.update(stripeSubId, {
                    pause_collection: { behavior: 'void' }
                });
                console.log(`Stripe Subscription ${stripeSubId} paused successfully.`);
            } catch (stripeErr) {
                console.log(stripeErr, "Stripe Error");
                if (stripeErr.code !== 'resource_missing') {
                    return new NextResponse(`Stripe Error: ${stripeErr.message}`, { status: 500 });
                }
            }
        } else if (payload.status === "active") {
            try {
                await stripe.subscriptions.update(stripeSubId, {
                    pause_collection: null
                });
                console.log(`Stripe Subscription ${stripeSubId} payment collection resumed successfully.`);
            } catch (stripeErr) {
                console.log(stripeErr, "Stripe Error");
                if (stripeErr.code !== 'resource_missing') {
                    return new NextResponse(`Stripe Error: ${stripeErr.message}`, { status: 500 });
                }
            }

        }

        return new NextResponse("Webhook Received", { status: 200 });

    } catch (error) {
        console.error("Handler Error:", error);
        return new NextResponse(`Webhook Handler Error: ${error.message}`, { status: 500 });
    }
}

export function GET() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}
