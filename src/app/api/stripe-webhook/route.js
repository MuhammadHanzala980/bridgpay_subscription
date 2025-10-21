// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import axios from "axios";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });
// const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET;
// const WC_BASE = (process.env.SITE_URL || "") + "/wp-json/wc/v3";
// const WC_AUTH = {
//   params: {
//     consumer_key: process.env.CONSUMER_KEY,
//     consumer_secret: process.env.CONSUMER_SECRET,
//   },
// };

// // helper: safe PUT to WC with logging
// async function wcPut(path, body) {
//   try {
//     const res = await axios.put(`${WC_BASE}${path}`, body, WC_AUTH);
//     return res.data;
//   } catch (e) {
//     console.error("WC PUT error", path, e?.response?.data || e.message);
//     throw e;
//   }
// }

// // helper: safe GET to WC
// async function wcGet(path, params = {}) {
//   try {
//     const res = await axios.get(`${WC_BASE}${path}`, { params: { ...WC_AUTH.params, ...params } });
//     return res.data;
//   } catch (e) {
//     console.error("WC GET error", path, e?.response?.data || e.message);
//     throw e;
//   }
// }

// // try to find WC subscription by stripe_subscription_id (paged brute-force if API has no direct filter)
// async function findWcSubscriptionByStripeId(stripeSubId) {
//   if (!stripeSubId) return null;
//   const per_page = 50;
//   let page = 1;
//   while (page < 50) { // safety limit
//     const subs = await wcGet("/subscriptions", { per_page, page });
//     if (!Array.isArray(subs) || subs.length === 0) break;
//     for (const s of subs) {
//       const meta = Array.isArray(s.meta_data) ? s.meta_data : [];
//       const m = meta.find(m => m.key === "stripe_subscription_id" && String(m.value) === String(stripeSubId));
//       if (m) return s.id;
//     }
//     page++;
//   }
//   return null;
// }

// // mark processed event on WC resource to avoid duplicates
// async function markEventProcessedOnOrderOrSub(resourceType, id, eventId) {
//   if (!id) return;
//   const meta_key = "stripe_last_event_id";
//   const body = {
//     meta_data: [{ key: meta_key, value: eventId }]
//   };
//   const path = resourceType === "order" ? `/orders/${id}` : `/subscriptions/${id}`;
//   try {
//     await wcPut(path, body);
//   } catch (err) {
//     console.warn("Failed to write processed event meta:", err?.message || err);
//   }
// }

// // safe update helpers
// const updateOrder = async (orderId, status, eventId) => {
//   if (!orderId) return;
//   try {
//     await wcPut(`/orders/${orderId}`, { status, meta_data: [{ key: "stripe_last_event_id", value: eventId }] });
//     console.log(`Order ${orderId} updated to ${status}`);
//   } catch (e) {
//     console.error("updateOrder error:", e?.message || e);
//   }
// };

// const updateSubscription = async (wcSubId, status, stripeSubId, eventId) => {
//   try {
//     if (!wcSubId && stripeSubId) {
//       // try to find mapping
//       wcSubId = await findWcSubscriptionByStripeId(stripeSubId);
//       if (!wcSubId) {
//         console.warn("Could not find WC subscription for stripe id:", stripeSubId);
//         return;
//       }
//     }
//     if (!wcSubId) return;

//     const meta = [];
//     if (stripeSubId) meta.push({ key: "stripe_subscription_id", value: stripeSubId });
//     if (eventId) meta.push({ key: "stripe_last_event_id", value: eventId });

//     const body = { status, meta_data: meta.length ? meta : undefined };
//     await wcPut(`/subscriptions/${wcSubId}`, body);
//     console.log(`Subscription ${wcSubId} updated to ${status}`);
//   } catch (e) {
//     console.error("updateSubscription error:", e?.message || e);
//   }
// };

// export async function POST(request) {
//   if (!endpointSecret) {
//     console.error("Stripe endpoint secret not configured");
//     return new NextResponse("Webhook misconfigured", { status: 500 });
//   }

//   const payload = await request.text();
//   const sig = request.headers.get("stripe-signature");
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
//   } catch (err) {
//     console.error("Signature verification failed:", err?.message || err);
//     return new NextResponse(`Webhook Error: ${err?.message || err}`, { status: 400 });
//   }

//   const eventId = event.id;
//   try {
//     switch (event.type) {
//       case "checkout.session.completed": {
//         const session = event.data.object;
//         const orderId = session.metadata?.order_id || session.client_reference_id;
//         const wcSubId = session.metadata?.subscription_id; // wc subscription id from your system
//         const stripeSubId = session.subscription || session?.metadata?.stripe_subscription_id || null;

//         // mark processed and update
//         await updateOrder(orderId, "processing", eventId);
//         if (stripeSubId) {
//           await updateSubscription(wcSubId, "active", stripeSubId, eventId);
//         } else if (wcSubId) {
//           // no stripeSubId but wcSubId exists — still mark active
//           await updateSubscription(wcSubId, "active", null, eventId);
//         }
//         break;
//       }

//       case "payment_intent.succeeded": {
//         const pi = event.data.object;
//         const orderId = pi.metadata?.order_id;
//         await updateOrder(orderId, "completed", eventId);
//         break;
//       }

//       // recurring success: prefer invoice.paid/invoice.payment_succeeded
//       case "invoice.payment_succeeded":
//       case "invoice.paid": {
//         const inv = event.data.object;
//         // invoice.subscription is the stripe subscription id
//         const stripeSubId = inv.subscription || inv.lines?.data?.[0]?.plan?.id || null;
//         const wcSubId = inv.metadata?.subscription_id || null;
//         // update subscription to active
//         await updateSubscription(wcSubId, "active", stripeSubId, eventId);
//         break;
//       }

//       case "invoice.payment_failed":
//       case "invoice.marked_uncollectible":
//       case "payment_intent.payment_failed": {
//         const inv = event.data.object;
//         const stripeSubId = inv.subscription || null;
//         const wcSubId = inv.metadata?.subscription_id || null;
//         // put subscription on-hold in WC
//         await updateSubscription(wcSubId, "on-hold", stripeSubId, eventId);
//         break;
//       }

//       case "customer.subscription.updated":
//       case "customer.subscription.created": {
//         const sub = event.data.object;
//         // prefer a metadata key that maps to your WC subscription id
//         const wcSubId = sub.metadata?.subscription_id || null;
//         const stripeSubId = sub.id;
//         // update WC subscription status to match Stripe
//         await updateSubscription(wcSubId, sub.status || "active", stripeSubId, eventId);
//         break;
//       }

//       case "customer.subscription.deleted": {
//         const sub = event.data.object;
//         const wcSubId = sub.metadata?.subscription_id || null;
//         await updateSubscription(wcSubId, "cancelled", sub.id, eventId);
//         break;
//       }

//       default:
//         console.log(`Unhandled event: ${event.type}`);
//     }
//   } catch (err) {
//     console.error("Webhook processing error:", err?.message || err);
//     // we still return 200 to Stripe if you want retries to happen, but log error for investigation
//     return NextResponse.json({ received: false, error: String(err) }, { status: 500 });
//   }

//   return NextResponse.json({ received: true });
// }

// export function GET() {
//   return new NextResponse("Method Not Allowed", { status: 405 });
// }





 


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
