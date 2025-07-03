const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
import { NextResponse } from "next/server";

// const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// const stripeInstance = new stripe(stripeSecretKey);

export async function POST(request) {
  if (request.method === "POST") {
    const req = await request.json();
    const { orderId, currency, line_items } = req;
    try {

      const transformedArray = await Promise.all(
        line_items.map(async (item) => {

          return {
            price_data: {
              currency: currency,
              product_data: {
                name: item.id,
              },
              unit_amount: item.price * 100,
            },
            quantity: item.quantity,
          };
        })
      );

      console.log("Creating Session...");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: transformedArray,
        mode: "payment",
        success_url: `${process.env.SUCCESS_URL}/payment-status/?success=true`,
        cancel_url: `${process.env.SUCCESS_URL}/payment-status/?success=false`,
        metadata: {
          order_id: orderId,
        },
      });
      return NextResponse.json({
        sessionId: session.id,
        checkoutSession: session,
      });
    } catch (error) {
      console.log(error);
      return NextResponse.json({ error: error.message });
    }
  } else {
    return NextResponse.json({ message: "Method not allowed" });
  }
}
