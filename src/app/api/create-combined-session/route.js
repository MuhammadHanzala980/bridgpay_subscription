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

// specify api version to avoid sudden breaking changes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

// small sanitizers
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
      return NextResponse.json({ error: 'Server misconfigured: missing Stripe key' }, { status: 500 });
    }

    const body = await request.json();
    const { orderData, subscription } = body || {};

    if (!orderData || typeof orderData.total === 'undefined') {
      return NextResponse.json({ error: 'Invalid payload: orderData.total required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.SUCCESS_URL || '';
    const currency = (orderData.currency || 'USD').toString().toLowerCase();
    const orderTotal = toCents(orderData.total);

    // ---------- SIMPLE subscription presence check ----------
    // Accept either array or single object:
    const subscriptionObj = Array.isArray(subscription) ? subscription[0] : subscription;
    const hasSubscription = Boolean(subscriptionObj && (subscriptionObj.total || subscriptionObj.amount));
    // If your payload uses "total" or "amount" for subscription price, both are supported above.

    const subscriptionTotal = hasSubscription ? toCents(subscriptionObj.total ?? subscriptionObj.amount ?? 0) : 0;
    const initialCharge = orderTotal;

    const line_items = [];

    // If subscription exists, create a recurring line using provided interval info or default to monthly.
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
      const intervalCountSafe = Math.max(1, rawCount); // ensure at least 1

      // ensure subscriptionTotal looks valid (must be integer cents)
      if (typeof subscriptionTotal !== 'number' || subscriptionTotal <= 0) {
        throw new Error('Invalid subscription total amount');
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

    // If there is an initial (one-time) charge, include it
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
      return NextResponse.json({ error: 'No valid items to process' }, { status: 400 });
    }

    // mode must be 'subscription' if there is any recurring line
    const mode = (hasSubscription && subscriptionTotal > 0) ? 'subscription' : 'payment';

    // single metadata object (avoid duplicates)
    const commonMetadata = {
      order_id: String(orderData.id ?? ''),
    };

    // attach provided wc subscription id if caller included it in subscription payload
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

    // also attach subscription_data metadata for Stripe if creating a subscription
    if (mode === 'subscription' && subscriptionObj?.id) {
      sessionParams.subscription_data = { metadata: { subscription_id: String(subscriptionObj.id) } };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', session.id);
    return NextResponse.json(session);
  } catch (err) {
    console.error('Error creating checkout session:', err);
    const message = err?.message || String(err);
    return NextResponse.json({ error: 'Checkout session creation failed', details: message }, { status: 500 });
  }
}

