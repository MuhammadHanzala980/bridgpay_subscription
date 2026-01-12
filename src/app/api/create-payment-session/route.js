const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
import { NextResponse } from "next/server";

export async function POST(request) {
  if (request.method === "POST") {
    const req = await request.json();
    const { orderId, currency, line_items, total } = req;
    try {

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: currency,
            product_data: {
              name: 'Order Payment',
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${process.env.SUCCESS_URL}/payment-status/?success=true`,
        cancel_url: `${process.env.SUCCESS_URL}/payment-status/?success=false`,
        metadata: {
          order_id: orderId,
        },
      });

      return NextResponse.json(session);

    } catch (error) {
      console.log(error);
      return NextResponse.json({ error: error.message });
    }
  } else {
    return NextResponse.json({ message: "Method not allowed" });
  }
}
