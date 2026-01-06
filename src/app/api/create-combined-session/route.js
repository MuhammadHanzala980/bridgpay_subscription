// import Stripe from 'stripe';
// import { NextResponse } from 'next/server';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export async function POST(request) {
//   try {
//     const { orderData, subscription } = await request.json();
//     const origin = request.headers.get('origin') || process.env.SUCCESS_URL;
//     const toCents = (amount) => Math.round(parseFloat(amount || '0') * 100);
//     const currency = (orderData.currency || 'USD').toLowerCase();
//     const orderTotal = toCents(orderData.total);
//     const subscriptionTotal = Array.isArray(subscription) && subscription.length
//       ? toCents(subscription[0].total)
//       : 0;

//     const initialCharge = Math.max(orderTotal - subscriptionTotal, 0);
//     const line_items = [];


//     if (initialCharge > 0) {
//       line_items.push({
//         price_data: {
//           currency,
//           unit_amount: initialCharge,
//           product_data: { name: 'Initial Payment' },
//         },
//         quantity: 1,
//       });
//     }

//     if (subscriptionTotal > 0) {
//       const firstSubItem = subscription[0].line_items.find(item =>
//         item.meta_data.some(md => md.key === '_wcsatt_scheme' && md.value !== '0')
//       );
//       const schemeMeta = firstSubItem.meta_data.find(md => md.key === '_wcsatt_scheme');
//       const [count, interval] = schemeMeta.value.split('_'); // e.g., ['1','month']

//       line_items.push({
//         price_data: {
//           currency,
//           unit_amount: subscriptionTotal,
//           recurring: { interval, interval_count: parseInt(count, 10) },
//           product_data: { name: 'Subscription Payment' },
//         },
//         quantity: 1,
//       });
//     }

//     if (!line_items.length) {
//       return NextResponse.json(
//         { error: 'No valid items to process' },
//         { status: 400 }
//       );
//     }



//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'subscription',
//       metadata: {
//         order_id: orderData.id,
//         subscription_id: subscription[0].id
//       },
//       subscription_data: { metadata: { subscription_id: subscription[0].id } },
//       line_items,
//       success_url: `${origin}/payment-status`,
//       cancel_url: `${origin}/payment-status`,
//       metadata: { order_id: String(orderData.id) },
//     });
//     console.log(session.url)
//     return NextResponse.json(session);


//   } catch (err) {
//     console.error('Error creating checkout session:', err);
//     return NextResponse.json(
//       { error: 'Checkout session creation failed', details: err.message },
//       { status: 500 }
//     );
//   }
// }


import Stripe from 'stripe';
import { NextResponse } from 'next/server';

 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

 const sanitizeNumber = (v) => {
  if (v == null) return 0;
  const s = String(v).replace(/[,₹$£€\s]/g, '').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const toCents = (amount) => Math.round(sanitizeNumber(amount) * 100);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'missing Stripe key' }, { status: 500 });
    }

    const body = await request.json();
    const { orderData, subscription } = body || {};

    if (!orderData || typeof orderData.total === 'undefined') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.SUCCESS_URL || '';
    const currency = (orderData.currency || 'USD').toString().toLowerCase();
    const orderTotal = toCents(orderData.total);
    const subscriptionObj = Array.isArray(subscription) ? subscription[0] : subscription;
    const hasSubscription = Boolean(subscriptionObj && (subscriptionObj.total || subscriptionObj.amount));
 
    const subscriptionTotal = hasSubscription ? toCents(subscriptionObj.total ?? subscriptionObj.amount ?? 0) : 0;
    const initialCharge = orderTotal;

    const line_items = [];

     if (hasSubscription && subscriptionTotal > 0) {
      const rawInterval = (subscriptionObj.billing_period ?? 'month')
        .toString()
        .toLowerCase();

      const rawCount = parseInt(
        (subscriptionObj.billing_interval ?? 1),
        10
      ) || 1;

      const allowed = new Set(['day', 'week', 'month', 'year']);
      const intervalSafe = allowed.has(rawInterval) ? rawInterval : 'month';
      const intervalCountSafe = Math.max(1, rawCount);

       if (typeof subscriptionTotal !== 'number' || subscriptionTotal <= 0) {
        throw new Error('Invalid subscription totel amount');
      }

      line_items.push({
        price_data: {
          currency,
          unit_amount: subscriptionTotal,
          recurring: { interval: intervalSafe, interval_count: intervalCountSafe },
          product_data: { name: subscriptionObj.name || 'Subscription Payment' },
        },
        quantity: 1,
      });
    }

     if (initialCharge > 0) {
      line_items.unshift({
        price_data: {
          currency,
          unit_amount: initialCharge,
          product_data: { name: 'Initial Payment' },
        },
        quantity: 1,
      });
    }

    if (!line_items.length) {
      return NextResponse.json({ error: 'No valid items' }, { status: 400 });
    }

     const mode = (hasSubscription && subscriptionTotal > 0) ? 'subscription' : 'payment';

    const commonMetadata = {
      order_id: String(orderData.id ?? ''),
    };

     if (hasSubscription && subscriptionObj.id) {
       commonMetadata.subscription_id = String(subscriptionObj.id);
    }

    const sessionParams = {
      payment_method_types: ['card'],
      mode,
      line_items,
      success_url: `${origin}/payment-status`,
      cancel_url: `${origin}/payment-status`,
      metadata: commonMetadata,
    };

    if (mode === 'subscription' && subscriptionObj?.id) {
       sessionParams.subscription_data = {
        metadata: {
          subscription_id: String(subscriptionObj.id)
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

     return NextResponse.json(session);
  } catch (err) {
    console.error('Error:', err);
    const message = err?.message || String(err);
    return NextResponse.json({ error: 'Checkout session creation failed', details: message }, { status: 500 });
  }
}

