// import { NextResponse } from 'next/server';
// import { Buffer } from 'buffer';
// import { updateOrderStatus } from '@/app/utils/updateOrderStatus';
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// // (App Router does not auto-parse into JSON for you,
// //  so no need for `config.api.bodyParser = false` here.)

// export async function POST(request) {
//   // 1. Grab the Stripe signature from headers
//   const sig = request.headers.get('stripe-signature');
//   if (!sig) {
//     return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
//   }

//   // 2. Read raw body as ArrayBuffer, then into Buffer
//   let event;
//   try {
//     const buf = await request.arrayBuffer();
//     const rawBody = Buffer.from(buf);

//     // 3. Verify and construct the Stripe event
//     event = stripe.webhooks.constructEvent(
//       rawBody,
//       sig,
//       process.env.STRIPE_HOOK_SIGNIN_SECRET
//     );
//   } catch (err) {
//     console.error('⚠️  Webhook signature verification failed.', err.message);
//     return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
//   }

//   // 4. Handle the event
//   try {
//     switch (event.type) {
//       case 'customer.subscription.created': {
//         const subscription = event.data.object;
//         console.log('Subscription created:', subscription.id);
//         break;
//       }
//       case 'customer.subscription.deleted': {
//         const subscription = event.data.object;
//         console.log('Subscription deleted:', subscription.id);
//         break;
//       }
//       case 'customer.subscription.updated': {
//         const subscription = event.data.object;
//         console.log('Subscription updated:', subscription.id);
//         break;
//       }
//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object;
//         console.log('Invoice payment succeeded:', invoice.id);

//         // Optionally: update your order status in your DB
//         // (Assuming you stored orderId in invoice.metadata.orderId)
//         const orderId = invoice.metadata?.orderId;
//         if (orderId) {
//           const data = {
//             status: 'completed',
//             orderId,
//             transaction_id: invoice.payment_intent,
//           };
//           const result = await updateOrderStatus(data);
//           console.log('Order status update result:', result);
//         }
//         break;
//       }
//       default:
//         console.log(`Unhandled event type: ${event.type}`);
//     }

//     // 5. Return a 2xx to acknowledge receipt
//     return NextResponse.json({ received: true });
//   } catch (err) {
//     console.error('Error handling event:', err);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }




// // server.js
// //
// // Use this sample code to handle webhook events in your integration.
// //
// // 1) Paste this code into a new file (server.js)
// //
// // 2) Install dependencies
// //   npm install stripe
// //   npm install express
// //
// // 3) Run the server on http://localhost:4242
// //   node server.js

// // The library needs to be configured with your account's secret key.
// // Ensure the key is kept out of any version control system you might be using.
// // const stripe = require('stripe')('sk_test_...');
// // const express = require('express');
// // const app = express();


// // // This is your Stripe CLI webhook secret for testing your endpoint locally.
// // const endpointSecret = "whsec_a23b65c91ce30485a9855634f6cbc12bbc8c0cb3d89a2f74315f99056ada4121";

// // app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
// //   const sig = request.headers['stripe-signature'];

// //   let event;

// //   try {
// //     event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
// //   } catch (err) {
// //     response.status(400).send(`Webhook Error: ${err.message}`);
// //     return;
// //   }

// //   // Handle the event
// //   switch (event.type) {
// //     case 'customer.subscription.created':
// //       const customerSubscriptionCreated = event.data.object;
// //       // Then define and call a function to handle the event customer.subscription.created
// //       break;
// //     case 'customer.subscription.deleted':
// //       const customerSubscriptionDeleted = event.data.object;
// //       // Then define and call a function to handle the event customer.subscription.deleted
// //       break;
// //     case 'customer.subscription.paused':
// //       const customerSubscriptionPaused = event.data.object;
// //       // Then define and call a function to handle the event customer.subscription.paused
// //       break;
// //     case 'customer.subscription.resumed':
// //       const customerSubscriptionResumed = event.data.object;
// //       // Then define and call a function to handle the event customer.subscription.resumed
// //       break;
// //     case 'customer.subscription.updated':
// //       const customerSubscriptionUpdated = event.data.object;
// //       // Then define and call a function to handle the event customer.subscription.updated
// //       break;
// //     case 'invoice.payment_succeeded':
// //       const invoicePaymentSucceeded = event.data.object;
// //       // Then define and call a function to handle the event invoice.payment_succeeded
// //       break;
// //     // ... handle other event types
// //     default:
// //       console.log(`Unhandled event type ${event.type}`);
// //   }

// //   // Return a 200 response to acknowledge receipt of the event
// //   response.send();
// // });

// // app.listen(4242, () => console.log('Running on port 4242'));

// pages/api/webhook.js

// import { buffer } from 'micro'
// import Stripe from 'stripe'
// import axios from 'axios'

// export const config = {
//   api: {
//     bodyParser: false, // raw body chahiye webhook signature verify ke liye
//   },
// }

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
// const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET

// // WooCommerce REST API credentials
// const wcApi = axios.create({
//   baseURL: process.env.WC_BASE_URL + '/wp-json/wc/v3',
//   auth: {
//     username: process.env.CONSUMER_KEY,
//     password: process.env.CONSUMER_SECRET,
//   },
// })

// export default async function handler(req, res) {
//   console.log("Web Hook Calling...")
//   console.log(redirect.body)
//   if (req.method !== 'POST') {
//     return res.status(405).end('Method Not Allowed')
//   }

//   const buf = await buffer(req)
//   const sig = req.headers['stripe-signature']

//   let event
//   try {
//     event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
//   } catch (err) {
//     console.error('⚠️ Webhook signature verification failed.', err.message)
//     return res.status(400).send(`Webhook Error: ${err.message}`)
//   }

//   const stripeSubId = event.data.object.id || event.data.object.subscription
//   // WooCommerce subscription ki ID humein apne DB me map karna hoga. 
//   // For simplicity assume Stripe subscription ID aur WC subscription meta me same store hai.

//   // Map events to WC subscription status/actions
//   try {
//     switch (event.type) {
//       case 'invoice.payment_succeeded':
//         // jab payment success ho, subscription ko active rakho
//         await wcApi.put(`/subscriptions/${stripeSubId}`, {
//           status: 'active',
//         })
//         break

//       case 'invoice.payment_failed':
//         // agar payment fail ho, subscription ko on-hold kar do
//         await wcApi.put(`/subscriptions/${stripeSubId}`, {
//           status: 'on-hold',
//         })
//         break

//       case 'customer.subscription.updated':
//         // agar plan change hua or quantity change hui
//         const updated = event.data.object
//         await wcApi.put(`/subscriptions/${stripeSubId}`, {
//           // plan or billing_cycle update karo agar zaroori ho
//           // example ke taur pe next_payment_date set karna:
//           date_paid: updated.current_period_end,
//         })
//         break

//       case 'customer.subscription.deleted':
//         // jab cancel hua, subscription ko cancelled mark karo
//         await wcApi.put(`/subscriptions/${stripeSubId}`, {
//           status: 'cancelled',
//         })
//         break

//       default:
//         console.log(`Unhandled event type ${event.type}`)
//     }

//     res.json({ received: true })
//   } catch (wcErr) {
//     console.error('❌ WC API error:', wcErr.response?.data || wcErr.message)
//     res.status(500).end('WC update failed')
//   }
// }
// src/app/api/subscription-hook/route.js

import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import axios from 'axios'

export const runtime = 'nodejs'  // taake raw body milay

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET

const wcApi = axios.create({
  baseURL: `${process.env.SITE_URL}/wp-json/wc/v3`,
  auth: {
    username: process.env.CONSUMER_KEY,
    password: process.env.CONSUMER_SECRET,
  },
})

// sirf POST handle karna hai
export async function POST(request) {
  // 1. Raw body as text
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err) {
    console.error('⚠️ Signature verification failed:', err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // 2. Debug logs
  
  // 3. Handle events
  const subId = event.data.object.id || event.data.object.subscription
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'active' })
        break
      case 'invoice.payment_failed':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'on-hold' })
        break
        case 'customer.subscription.updated':
        console.log('✅ Webhook hit:', event.type)
        console.log(event)
        await wcApi.put(`/subscriptions/${subId}`, {
          date_paid: event.data.object.current_period_end,
        })
        break
      case 'customer.subscription.deleted':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'cancelled' })
        break
      default:
        // console.log('Unhandled event:', event.type)
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ WC API error:', err.response?.data || err.message)
    return new NextResponse('WC update failed', { status: 500 })
  }
}

// baki methods (GET, PUT etc) agar nahi chaiyein to reject kar sakte hain
export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}
