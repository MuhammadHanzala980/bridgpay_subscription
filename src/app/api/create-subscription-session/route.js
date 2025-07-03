const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
import { NextResponse } from "next/server";

export async function POST(request) {
  if (request.method === "POST") {
    const req = await request.json();
    const { orderId, email, totalAmount, interval } = req;
    console.log(orderId, totalAmount, interval);
    try {
      const price = await stripe.prices.create({
        product: process.env.PRODUCT_ID,
        unit_amount: totalAmount * 100,
        currency: "usd",
        recurring: { interval: interval },
      });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.SUCCESS_URL}/payment-status/?success=true`,
        customer_email: email,
        metadata: {
          order_id: orderId,
        },
      });

      return NextResponse.json({
        sessionId: session.id,
        checkoutSession: session,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message });
    }
  } else {
    return NextResponse.json({ message: "Method not allowed" });
  }
}
