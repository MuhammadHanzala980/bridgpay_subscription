// src/app/api/payment-webhook/route.js

import { NextResponse } from "next/server";
import Stripe from "stripe";
import axios from "axios";

// 1) Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET;

// 2) WooCommerce REST credentials
const WC_BASE = process.env.SITE_URL + "/wp-json/wc/v3";
const WC_AUTH = {
  username: process.env.CONSUMER_KEY,
  password: process.env.CONSUMER_SECRET,
};

export async function POST(request) {
  // 1. Raw body for signature
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Helper to update WC order status
  const updateOrder = async (orderId, status) => {
    if (!orderId) return;
    await axios.put(
      `${WC_BASE}/orders/${orderId}`,
      { status },
      { auth: WC_AUTH }
    );
    console.log(`✅ Order ${orderId} updated to  ${status} `);
  };

  // Helper to update WC subscription status
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
      { auth: WC_AUTH }
    );
    console.log(`✅ Subscription ${wcSubId} ko ${status} pe set kara`);
    if (stripeSubId) console.log(`🔖 Stripe Sub ID ${stripeSubId} subscription meta me save hui`);
  };

  // 3. Handle events
  switch (event.type) {
    // jab checkout complete ho aur session mode subscription ho
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || session.client_reference_id;
      const subId = session.metadata.subscription_id;
      const stripeSubId = session?.subscription
       // order ko processing pe set karo
      await updateOrder(orderId, "processing");
      // agar subscription ID mili to usko active karo
      if (stripeSubId) {
        await updateSubscription(subId, "active", stripeSubId);
      }
      break;
    }

    // payment intent ke success pe order complete aur subscription bhi ensure active
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const orderId = pi.metadata?.order_id;
      await updateOrder(orderId, "completed");
      break;
    }

    // subscription renew ya invoice payment success
    case "invoice.payment_succeeded": {
      const inv = event.data.object;
      const subId = inv.metadata.subscription_id;
      ;
      // subscription ko active set karo
      await updateSubscription(subId, "active");
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object;
      const subId = inv.metadata.subscription_id;
      ;
      // agar payment fail hui to subscription on-hold pe daalo
      await updateSubscription(subId, "on-hold");
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const subId = sub.metadata.subscription_id;
      // plan change ho to bhi active rakho
      await updateSubscription(subId, sub.status);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const subId = sub.metadata.subscription_id;
      // jab user cancel kare to subscription cancel karo
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
