const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
import { NextResponse } from "next/server";



export async function POST(request) {
  if (request.method === "POST") {
    const req = await request.json();
    const { line_items, currency, billing, orderId, subscription_id } = req;
    console.log(orderId, "orderId")
    try {

      const transformedArray = await Promise.all(
        line_items.map(async (item) => {
          if (
            item?.meta_data[0]?.display_value?.includes("1_day") ||
            item?.meta_data[0]?.display_value?.includes("1_week") ||
            item?.meta_data[0]?.display_value?.includes("1_month") ||
            item?.meta_data[0]?.display_value?.includes("1_year")

          ) {

            let interval = "day";
            if (item?.meta_data[0]?.display_value?.includes("1_day")) {
              interval = "day";
            } else if (item?.meta_data[0]?.display_value?.includes("1_week")) {
              interval = "week";
            } else if (item?.meta_data[0]?.display_value?.includes("1_month")) {
              interval = "month";
            } else if (item?.meta_data[0]?.display_value?.includes("1_year")) {
              interval = "year";
            }
            try {

              const label = `${interval}`
              console.log(label)
              const price = await stripe.prices.create({
                // product: process.env.PRODUCT_ID,
                unit_amount: Math.round(item.price * 100),
                currency: currency,
                recurring: { interval },
                product_data: {
                  name: item.id,
                  active: true,
                  unit_label: label,
                }

              });
              return {
                price: price?.id,
                quantity: 1,
              };
            } catch (error) {
              console.error("Error creating price:", error);
              throw error;
            }
          } else {
            return {
              price_data: {
                currency: currency,
                product_data: {
                  name: item.id,
                },
                unit_amount: Math.round(item.price * 100),
              },
              quantity: item.quantity,
            };
          }
        })
      );
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: transformedArray,
        customer_email: billing?.email,
        mode: "subscription",
        metadata: {
          order_id: orderId,
          subscription_id: subscription_id
        },
        subscription_data: { metadata: { subscription_id: subscription_id } },

        success_url: `${process.env.SUCCESS_URL}/payment-status/?success=true`,
        cancel_url: `${process.env.SUCCESS_URL}/payment-status/?success=false`,
      });

      const subscription = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['subscription'],
      });

      return NextResponse.json({
        session: session,
        sessionId: session.id,
        checkoutSession: session,
        custom: subscription.subscription
      });
    } catch (error) {
      return NextResponse.json({ error: error.message });
    }
  } else {
    return NextResponse.json({ message: "Method not allowed" });
  }
}

