import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  if (request.method === "POST") {
    const req = await request.json();
    const { orderId } = req;
    console.log("geting order data...", orderId);
    try {
      const response = await axios.get(
        `${process.env.SITE_URL}/wp-json/wc/v3/subscriptions/${orderId}?consumer_key=${process.env.CONSUMER_KEY}&consumer_secret=${process.env.CONSUMER_SECRET}`
      );
      const orderData = response.data;
      return NextResponse.json({
        orderData: orderData,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message, data: req.body });
    }
  } else {
    return NextResponse.json({ error: "error" }); // Method not allowed
  }
}
