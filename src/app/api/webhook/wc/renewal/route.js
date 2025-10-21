// // app/api/wc/webhook/route.js
// import crypto from "crypto";
// import { NextResponse } from "next/server";

//  async function saveWcEvent(payload) {
//     console.log(payload, "saveWcEvent")
//   return;
// }

// async function saveOrderSubscriptionMapping({ wcOrderId, wcSubscriptionId, stripeInvoiceId, stripeSubscriptionId }) {
//     console.log({ wcOrderId, wcSubscriptionId, stripeInvoiceId, stripeSubscriptionId })
//   return;
// }

// export async function POST(req) {
//   const secret = process.env.WC_WEBHOOK_SECRET; // set in env, same as WP webhook secret
//   const bodyText = await req.text();
//   const headers = Object.fromEntries(req.headers.entries());
//    const signature = headers["x-wc-webhook-signature"] || headers["x-wc-signature"] || "";

//   if (!secret) {
//     console.error("WC webhook secret missing in env");
//     return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
//   }

//    const hmac = crypto.createHmac("sha256", secret).update(bodyText).digest();
//   const expected = Buffer.from(hmac).toString("base64");
//   if (signature !== expected) {
//     console.error("Invalid WC webhook signature", signature, expected);
//     return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//   }

//   let payload;
//   try {
//     payload = JSON.parse(bodyText);
//   } catch (e) {
//     console.error("Invalid JSON payload", e);
//     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
//   }

//    await saveWcEvent({ source: "woocommerce", payload, headers });

//   try {
//      const eventType = headers["x-wc-webhook-topic"] || payload.event || "order"; // try to infer
//      const wcOrderId = payload.id || payload.order_id || null;
//     const wcSubscriptionId = payload.subscription_id || payload.meta_data?.find?.(m=>m.key==='subscription_id')?.value || null;

//      const stripeInvoiceId = payload.meta_data?.find?.(m=>m.key==='stripe_invoice_id')?.value || null;
//     const stripeSubscriptionId = payload.meta_data?.find?.(m=>m.key==='stripe_subscription_id')?.value || null;

//      if (wcOrderId || wcSubscriptionId) {
//       await saveOrderSubscriptionMapping({ wcOrderId, wcSubscriptionId, stripeInvoiceId, stripeSubscriptionId });
//     }

//      return NextResponse.json({ ok: true });
//   } catch (err) {
//     console.error("Processing WC webhook error", err);
//     return NextResponse.json({ error: "processing error" }, { status: 500 });
//   }
// }
