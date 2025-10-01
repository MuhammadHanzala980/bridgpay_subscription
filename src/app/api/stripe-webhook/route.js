
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
    if (stripeSubId) console.log(`Stripe Sub ID ${stripeSubId} Saved into subscription meta `);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || session.client_reference_id;
      const subId = session.metadata.subscription_id;
      const stripeSubId = session?.subscription
      await updateOrder(orderId, "processing");
      if (stripeSubId) {
        await updateSubscription(subId, "active", stripeSubId);
      }
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const orderId = pi.metadata?.order_id;
      await updateOrder(orderId, "completed");
      break;
    }

    case "invoice.payment_succeeded": {
      const inv = event.data.object;
      const subId = inv.metadata.subscription_id;
      await updateSubscription(subId, "active");
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object;
      const subId = inv.metadata.subscription_id;
      await updateSubscription(subId, "on-hold");
      break;
    }

    case "customer.subscription.updated": {
      console.log("<<<<<<<<<<<<")
      console.log("Calling customer.subscription.updated event ")
      const sub = event.data.object;
      const subId = sub.metadata.subscription_id;
      const stripeSubId = sub.id

      if (subId) {
        console.log(subId, sub.status, stripeSubId, "Updating subscription...")
        await updateSubscription(subId, sub.status, stripeSubId);
      }
      console.log("customer.subscription.updated End!")
      console.log(">>>>>>>>>>>>")
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const subId = sub.metadata.subscription_id;
      console.log(subId, "customer.subscription.deleted")

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
