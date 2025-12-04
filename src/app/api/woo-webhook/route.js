


// WC_WEBHOOK_SECRET="K8Mm5XJ02BuD7RZN0lDoEdPFCjsaRckM" Add it to environment variables


import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const WEBHOOK_SECRET = process.env.WC_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const signature = request.headers.get("x-wc-webhook-signature");
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

        const payload = JSON.parse(bodyText);


        if (payload.status === "cancelled") {

            const stripeMeta = payload.meta_data.find(
                (meta) => meta.key === "stripe_subscription_id"
            );

            if (stripeMeta && stripeMeta.value) {
                const stripeSubId = stripeMeta.value;

                try {
                    const deletedSubscription = await stripe.subscriptions.cancel(stripeSubId);
                    console.log(`Stripe Subscription ${deletedSubscription.id} cancelled successfully.`);

                } catch (stripeErr) {
                    if (stripeErr.code !== 'resource_missing') {
                        return new NextResponse(`Stripe Error: ${stripeErr.message}`, { status: 500 });
                    }
                }
            } else {
                console.log(`Stripe Subscription ID not found in WooCommerce Order Data.`);
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
