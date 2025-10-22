


import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { orderId } = await request.json();

    if (!orderId || isNaN(Number(orderId))) {
      return NextResponse.json(
        { error: "Valid Order ID is required" },
        { status: 400 }
      );
    }

    const WOOCOMMERCE_URL = process.env.SITE_URL;
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

    if (!WOOCOMMERCE_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      return NextResponse.json(
        { error: "WooCommerce credentials not configured" },
        { status: 500 }
      );
    }

 

    const api = axios.create({
      baseURL: `${WOOCOMMERCE_URL}/wp-json/wc/v3`,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    let orderData;

    try {
      const orderResponse = await api.get(`/orders/${orderId}`, {
        params: {
          consumer_key: CONSUMER_KEY,
          consumer_secret: CONSUMER_SECRET
        }

      });
      orderData = orderResponse.data;
    } catch (err) {
      console.error("Order fetch error:", err.response?.data || err.message);
      return NextResponse.json(
        {
          error: "Failed fetch order",
          details: err.response?.data || err.message,
        },
        { status: err.response?.status || 500 }
      );
    }

    let subscriptions
    try {
      const subsResponse = await api.get(`/subscriptions`, {
        params: {
          consumer_key: CONSUMER_KEY,
          consumer_secret: CONSUMER_SECRET,
          parent: orderId
        },
      });
      // console.log(subsResponse, ">>>>>>>>>>>>>>>><<<<<<<<<<<")
      subscriptions = subsResponse.data.length > 0 ? subsResponse.data : false;
    } catch (err) {
      console.error("Subscriptins fetch error:", err.response?.data || err.message);
      return NextResponse.json(
        {
          error: "Failed to fetch subscriptions",
          details: err.response?.data || err.message,
        },
        { status: err.response?.status || 500 }
      );
    }

    return NextResponse.json({
      orderData,
      subscription: subscriptions,

    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}


