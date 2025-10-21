// // app/api/stripe/renewal-webhook/route.js
// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import axios from "axios";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_RENEWAL;
// const WC_BASE = (process.env.SITE_URL || "").replace(/\/$/, "") + "/wp-json/wc/v3";
// const PENDING_STATUSES = new Set(["pending", "pending-payment", "failed"]);

// // optional fallback Woo product id (use a generic "subscription renewal" product in WC)
// const WC_FALLBACK_PRODUCT_ID = process.env.WC_RENEWAL_PRODUCT_ID ? String(process.env.WC_RENEWAL_PRODUCT_ID) : null;

// function wcAuthParams() {
//   return {
//     params: {
//       consumer_key: process.env.CONSUMER_KEY,
//       consumer_secret: process.env.CONSUMER_SECRET,
//     },
//     timeout: 10000,
//   };
// }

// function amountCentsToCurrency(cents) {
//   return Number(cents || 0) / 100;
// }

// function normalizeStr(s = "") {
//   return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
// }

// function orderHasStripeInvoiceMeta(order, invoiceId) {
//   if (!order || !Array.isArray(order.meta_data)) return false;
//   return order.meta_data.some(
//     (md) =>
//       String(md.key).toLowerCase() === "stripe_invoice_id" && String(md.value) === String(invoiceId)
//   );
// }

// function orderTotalMatchesInvoice(order, invoice) {
//   if (!order || !invoice) return false;
//   const orderTotal = Number(order.total || 0);
//   const invoicePaid = amountCentsToCurrency(invoice.amount_paid ?? invoice.amount ?? 0);
//   return Math.abs(orderTotal - invoicePaid) < 0.01;
// }

// /**
//  * Try to map an invoice line to a wc product id using Stripe metadata (product/price metadata).
//  * Returns { wcProductId: string|null, usedFallback: boolean }
//  */
// async function findWcProductIdFromStripeLine(il) {
//   try {
//     // Check if price object contains direct wc mapping in metadata (fast)
//     if (il.price && il.price.metadata) {
//       const md = il.price.metadata;
//       const wcId = md.wc_product_id || md.wc_id || md.wcProductId || md.wc_product || null;
//       if (wcId) return { wcProductId: String(wcId), usedFallback: false };

//       // maybe SKU stored on price metadata
//       if (md.sku) {
//         const sku = String(md.sku).trim();
//         const bySku = await findWcProductBySku(sku);
//         if (bySku) return { wcProductId: String(bySku), usedFallback: false };
//       }
//     }

//     // If price.product present, retrieve Stripe product and check metadata
//     if (il.price && il.price.product) {
//       try {
//         const prod = await stripe.products.retrieve(il.price.product);
//         if (prod && prod.metadata) {
//           const wcId =
//             prod.metadata.wc_product_id ||
//             prod.metadata.wc_id ||
//             prod.metadata.wcProductId ||
//             prod.metadata.wc_product ||
//             null;
//           if (wcId) return { wcProductId: String(wcId), usedFallback: false };

//           // check SKU in product metadata
//           if (prod.metadata.sku) {
//             const sku = String(prod.metadata.sku).trim();
//             const bySku = await findWcProductBySku(sku);
//             if (bySku) return { wcProductId: String(bySku), usedFallback: false };
//           }
//         }
//       } catch (e) {
//         // ignore product retrieval errors
//       }
//     }

//     // Invoice-line metadata directly
//     if (il.metadata) {
//       const md = il.metadata;
//       const wcId = md.wc_product_id || md.wc_id || md.wcProductId || md.wc_product || null;
//       if (wcId) return { wcProductId: String(wcId), usedFallback: false };
//       if (md.sku) {
//         const bySku = await findWcProductBySku(String(md.sku).trim());
//         if (bySku) return { wcProductId: String(bySku), usedFallback: false };
//       }
//     }
//   } catch (e) {
//     // ignore and continue to other strategies
//     console.warn("stripe mapping attempt failed:", e?.message || e);
//   }

//   return { wcProductId: null, usedFallback: false };
// }

// /**
//  * Query WooCommerce for a product by SKU. Returns product id or null.
//  * Uses the WC REST API: /products?sku=SKU
//  */
// async function findWcProductBySku(sku) {
//   if (!sku) return null;
//   try {
//     const url = `${WC_BASE}/products`;
//     const res = await axios.get(url, {
//       ...wcAuthParams(),
//       params: { sku, per_page: 1 },
//     });
//     const data = res.data || [];
//     if (Array.isArray(data) && data.length > 0) return data[0].id || null;
//   } catch (e) {
//     // some stores may not support sku filter; silently ignore
//     console.warn("WC SKU lookup failed:", e?.response?.data || e.message || e);
//   }
//   return null;
// }

// /**
//  * Query WooCommerce for products by name search, try to pick best match by normalized name.
//  * Returns product id or null.
//  */
// async function findWcProductByName(name) {
//   if (!name) return null;
//   try {
//     const url = `${WC_BASE}/products`;
//     const res = await axios.get(url, {
//       ...wcAuthParams(),
//       params: { search: name, per_page: 5 },
//     });
//     const data = res.data || [];
//     if (!Array.isArray(data) || data.length === 0) return null;
//     const normalizedName = normalizeStr(name);
//     // prefer exact normalized match
//     for (const p of data) {
//       if (normalizeStr(p.name || "") === normalizedName) return p.id || null;
//     }
//     // otherwise return first
//     return data[0].id || null;
//   } catch (e) {
//     console.warn("WC name lookup failed:", e?.response?.data || e.message || e);
//   }
//   return null;
// }

// /**
//  * Build WC line_items and fee_lines from Stripe invoice lines.
//  * Returns { line_items: [...], fee_lines: [...] }
//  * - line_items contain product_id when available
//  * - fee_lines contain unnamed charges used as fallback if product can't be found and no WC_FALLBACK_PRODUCT_ID set
//  */
// async function buildItemsFromInvoice(invoice) {
//   const lines = invoice.lines && invoice.lines.data ? invoice.lines.data : [];
//   const line_items = [];
//   const fee_lines = [];

//   for (const il of lines) {
//     const qty = Number(il.quantity || 1);
//     let unit = 0;
//     if (il.price && typeof il.price.unit_amount === "number") {
//       unit = amountCentsToCurrency(il.price.unit_amount);
//     } else if (typeof il.amount === "number") {
//       unit = amountCentsToCurrency(il.amount) / (qty || 1);
//     } else {
//       unit = 0;
//     }
//     const total = (unit * qty).toFixed(2);
//     const name = il.description || il.plan?.nickname || `Subscription item`;

//     // 1) try Stripe metadata mapping
//     let mapped = await findWcProductIdFromStripeLine(il);
//     let wcProductId = mapped.wcProductId;
//     let usedFallback = mapped.usedFallback;

//     // 2) if still null, try SKU extracted from various places (price.metadata.sku, il.metadata.sku)
//     if (!wcProductId) {
//       const maybeSku = il.price?.metadata?.sku || il.metadata?.sku || null;
//       if (maybeSku) {
//         const bySku = await findWcProductBySku(String(maybeSku).trim());
//         if (bySku) {
//           wcProductId = String(bySku);
//         }
//       }
//     }

//     // 3) if still null, try name search in Woo
//     if (!wcProductId) {
//       const byName = await findWcProductByName(name);
//       if (byName) wcProductId = String(byName);
//     }

//     // 4) fallback env
//     if (!wcProductId && WC_FALLBACK_PRODUCT_ID) {
//       wcProductId = WC_FALLBACK_PRODUCT_ID;
//       usedFallback = true;
//     }

//     // now produce item(s)
//     if (wcProductId) {
//       const pid = /^\d+$/.test(String(wcProductId)) ? Number(wcProductId) : wcProductId;
//       line_items.push({
//         name,
//         quantity: qty,
//         total: String(total),
//         subtotal: String(total),
//         product_id: pid,
//         meta_data: [
//           { key: "stripe_invoice_line_id", value: il.id || "" },
//           { key: "stripe_invoice_description", value: name || "" },
//           { key: "wc_product_mapping_used_fallback", value: usedFallback ? "true" : "false" },
//         ],
//       });
//     } else {
//       // Add as fee_line (so we don't fail creating order). fee_lines accept name and total
//       fee_lines.push({
//         name,
//         total: String(total),
//         tax_class: "",
//       });
//     }
//   }

//   return { line_items, fee_lines };
// }

// async function fetchWcSubscriptionOrders(wcSubscriptionId) {
//   const url = `${WC_BASE}/subscriptions/${wcSubscriptionId}/orders`;
//   const res = await axios.get(url, wcAuthParams());
//   return res.data || [];
// }

// async function createWcOrderFromInvoice({ wcSubscriptionId, invoice, billing }) {
//   const url = `${WC_BASE}/orders`;
//   const { line_items, fee_lines } = await buildItemsFromInvoice(invoice);

//   // if both empty then fail
//   if ((!Array.isArray(line_items) || line_items.length === 0) && (!Array.isArray(fee_lines) || fee_lines.length === 0)) {
//     const err = new Error(
//       "Failed to create WC order: could not map any invoice lines to products and no fallback or fee lines available."
//     );
//     throw err;
//   }

//   const body = {
//     payment_method: "stripe",
//     payment_method_title: "Stripe",
//     set_paid: true,
//     meta_data: [
//       { key: "is_subscription_renewal", value: "true" },
//       { key: "wc_subscription_id", value: String(wcSubscriptionId) },
//       { key: "stripe_invoice_id", value: String(invoice.id || "") },
//     ],
//   };

//   if (line_items.length) body.line_items = line_items;
//   if (fee_lines.length) body.fee_lines = fee_lines;

//   // attach billing if present (helps WC link to customer)
//   if (billing?.email || invoice.customer_email) {
//     body.billing = {
//       email: billing?.email || invoice.customer_email || "",
//       first_name: billing?.first_name || "",
//       last_name: billing?.last_name || "",
//     };
//   }

//   // set totals if invoice.amount_paid present (Woo will compute but we set for safety)
//   const invoicePaid = amountCentsToCurrency(invoice.amount_paid ?? invoice.amount ?? 0);
//   if (invoicePaid > 0) body.total = String(invoicePaid.toFixed(2));

//   // Idempotency: use stripe-invoice-<id>
//   const idemp = `stripe-invoice-${invoice.id || Date.now()}`;

//   const res = await axios.post(url, body, {
//     ...wcAuthParams(),
//     headers: { "Idempotency-Key": idemp },
//   });
//   return res.data;
// }

// async function updateWcOrderStatus(orderId, status, invoiceId = null) {
//   const url = `${WC_BASE}/orders/${orderId}`;
//   const body = { status };
//   if (invoiceId) body.meta_data = [{ key: "stripe_invoice_id", value: String(invoiceId) }];
//   const res = await axios.put(url, body, wcAuthParams());
//   return res.data;
// }

// async function updateWcSubscriptionStatus(wcSubId, status, stripeSubId = null) {
//   const url = `${WC_BASE}/subscriptions/${wcSubId}`;
//   const body = { status };
//   if (stripeSubId) body.meta_data = [{ key: "stripe_subscription_id", value: String(stripeSubId) }];
//   const res = await axios.put(url, body, wcAuthParams());
//   return res.data;
// }

// export async function POST(req) {
//   const payloadBuf = Buffer.from(await req.arrayBuffer());
//   const sig = req.headers.get("stripe-signature");

//   if (!STRIPE_WEBHOOK_SECRET) {
//     console.error("Missing STRIPE_WEBHOOK_SECRET");
//     return new NextResponse("Server misconfigured", { status: 500 });
//   }

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(payloadBuf, sig, STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     console.error("Stripe signature verification failed:", err?.message || err);
//     return new NextResponse(`Webhook Error: ${err?.message || "invalid signature"}`, { status: 400 });
//   }

//   try {
//     if (
//       ![
//         "invoice.paid",
//         "invoice.payment_succeeded",
//         "invoice.payment_failed",
//         "customer.subscription.updated",
//       ].includes(event.type)
//     ) {
//       console.log("Ignoring event:", event.type);
//       return NextResponse.json({ ok: true });
//     }

//     // resolve invoice + subscription objects
//     let stripeInvoice = null;
//     let stripeSubscription = null;

//     if (event.type === "customer.subscription.updated") {
//       stripeSubscription = event.data.object;
//       const latestInvId = stripeSubscription.latest_invoice;
//       if (!latestInvId) {
//         console.log("subscription.updated: no latest_invoice — nothing to verify");
//         return NextResponse.json({ ok: "no_invoice" });
//       }
//       stripeInvoice = await stripe.invoices.retrieve(latestInvId);
//     } else {
//       stripeInvoice = event.data.object;
//       if (stripeInvoice.subscription) {
//         try {
//           stripeSubscription = await stripe.subscriptions.retrieve(stripeInvoice.subscription);
//         } catch (e) {
//           console.warn("Could not fetch subscription:", e?.message || e);
//         }
//       }
//     }

//     if (!stripeInvoice) {
//       console.log("No invoice found — exit");
//       return NextResponse.json({ ok: "no_invoice" });
//     }

//     const invoicePaid =
//       stripeInvoice.payment_status === "paid" ||
//       stripeInvoice.status === "paid" ||
//       Boolean(stripeInvoice.paid);
//     const invoiceId = stripeInvoice.id;

//     // wc subscription id must be in stripe metadata (you said you saved it)
//     const wcSubscriptionId =
//       stripeSubscription?.metadata?.subscription_id || stripeInvoice?.metadata?.subscription_id;
//     if (!wcSubscriptionId) {
//       console.error("Missing wc_subscription_id in stripe metadata");
//       return new NextResponse("Missing wc_subscription_id in metadata", { status: 400 });
//     }

//     // fetch subscription orders and filter pending ones
//     let orders;
//     try {
//       orders = await fetchWcSubscriptionOrders(wcSubscriptionId);
//     } catch (err) {
//       console.error("Failed to fetch WC subscription orders:", err?.response?.data || err.message || err);
//       return new NextResponse("Failed fetching WC subscription orders", { status: 500 });
//     }

//     const pendingOrders = (orders || []).filter((o) => PENDING_STATUSES.has(String(o.status).toLowerCase()));

//     // try find matched order by stripe_invoice meta or by total heuristic
//     let matchedOrder = pendingOrders.find((o) => orderHasStripeInvoiceMeta(o, invoiceId));
//     if (!matchedOrder) {
//       matchedOrder = pendingOrders.find((o) => {
//         if (orderTotalMatchesInvoice(o, stripeInvoice)) return true;
//         return false;
//       });
//     }

//     if (invoicePaid) {
//       if (!matchedOrder) {
//         try {
//           const billing = stripeInvoice.customer_email ? { email: stripeInvoice.customer_email } : null;
//           const createdOrder = await createWcOrderFromInvoice({ wcSubscriptionId, invoice: stripeInvoice, billing });
//           console.log("Created renewal order", createdOrder.id, "for subscription", wcSubscriptionId);
//           const stripeSubId = stripeSubscription?.id || stripeInvoice.subscription || null;
//           await updateWcSubscriptionStatus(wcSubscriptionId, "active", stripeSubId);
//           return NextResponse.json({ ok: true, order_created: createdOrder.id });
//         } catch (err) {
//           console.error("Failed creating WC renewal order:", err?.response?.data || err.message || err);
//           // If order creation fails despite invoice paid, set subscription on-hold to be safe
//           try {
//             await updateWcSubscriptionStatus(wcSubscriptionId, "on-hold", stripeSubscription?.id || stripeInvoice.subscription || null);
//           } catch (e) { /* ignore */ }
//           return new NextResponse("Failed creating renewal order", { status: 500 });
//         }
//       } else {
//         // matched order exists → attach invoice meta and mark paid
//         try {
//           await updateWcOrderStatus(
//             matchedOrder.id,
//             process.env.WC_RENEWAL_STATUS_ON_PAID || "processing",
//             invoiceId
//           );
//         } catch (e) {
//           console.error("Error updating matched order:", e?.message || e);
//         }
//         // ensure subscription active
//         try {
//           await updateWcSubscriptionStatus(wcSubscriptionId, "active", stripeSubscription?.id || stripeInvoice.subscription || null);
//         } catch (e) { /* ignore */ }
//         return NextResponse.json({ ok: true, order_updated: matchedOrder.id });
//       }
//     } else {
//       // invoice not paid -> mark matched pending order failed + subscription on-hold
//       if (matchedOrder) {
//         try {
//           await updateWcOrderStatus(matchedOrder.id, "failed", invoiceId);
//         } catch (e) {
//           console.error(e);
//         }
//       }
//       try {
//         await updateWcSubscriptionStatus(wcSubscriptionId, "on-hold", stripeSubscription?.id || stripeInvoice.subscription || null);
//       } catch (e) {
//         console.error(e);
//       }
//       return NextResponse.json({ ok: "invoice_not_paid", order: matchedOrder?.id ?? null });
//     }
//   } catch (err) {
//     console.error("Webhook processing error:", err?.message || err);
//     return new NextResponse("processing error", { status: 500 });
//   }
// }

// export function GET() {
//   return new NextResponse("Method Not Allowed", { status: 405 });
// }
