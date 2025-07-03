 
import { NextResponse } from "next/server";
import Stripe from "stripe";
import axios from "axios";

 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

 const WC_BASE = process.env.SITE_URL + "/wp-json/wc/v3";
const WC_AUTH = {
  username: process.env.CONSUMER_KEY,
  password: process.env.CONSUMER_SECRET,
};

 
export async function POST(request) {
  try {
    const { wcSubscriptionId } = await request.json();
    if (!wcSubscriptionId) {
      return NextResponse.json({ error: "wcSubscriptionId is required" }, { status: 400 });
    }

     let stripeSubId;
    try {
      const resp = await axios.get(
        `${WC_BASE}/subscriptions/${wcSubscriptionId}`,
        { auth: WC_AUTH }
      );
      const meta = resp.data.meta_data || [];
      const metaEntry = meta.find(m => m.key === 'stripe_subscription_id');
      stripeSubId = metaEntry?.value;
      console.log(`🔍 Fetched Stripe Sub ID: ${stripeSubId}`);
    } catch (err) {
      console.error("Error fetching WC subscription:", err.response?.data || err.message);
      return NextResponse.json({ error: "Failed to fetch WooCommerce subscription" }, { status: 500 });
    }

     if (stripeSubId) {
      try {
        console.log("stripeSubId:", stripeSubId )
        await stripe.subscriptions.cancel(stripeSubId);
        console.log(`✅ Stripe subscription ${stripeSubId} cancelled`);
      } catch (err) {
        console.error(`Stripe cancel error:`, err.message);
       }
    }

     try {
      await axios.put(
        `${WC_BASE}/subscriptions/${wcSubscriptionId}`,
        { status: "cancelled" },
        { auth: WC_AUTH }
      );
      console.log(`✅ WooCommerce subscription ${wcSubscriptionId} cancelled`);
    } catch (err) {
      console.error(`WooCommerce cancel error:`, err.response?.data || err.message);
      return NextResponse.json({ error: "Failed to cancel on WooCommerce", details: err.toString() }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in cancel-subscription API:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
