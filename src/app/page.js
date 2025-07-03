"use client";
import { useEffect, useRef } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import lottie from "lottie-web";
import redirectCheckout from "./lottie/redirectCheckout.json";
import { useRouter } from "next/navigation";
import { fetchOrderData } from "./utils/fetchOrderData";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const LottieAnimation = ({ animationData }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData,
      });
      return () => anim.destroy();
    }
  }, [animationData]);

  return <div ref={containerRef} />;
};

const PaymentPage = () => {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderid");
    console.log("Getting order data from the ID:", orderId)
    if (orderId) {
      fetchOrder(orderId);
    } else {
      router.push(process.env.NEXT_PUBLIC_HOMEPAGE);
    }
  }, [router]);

  // const isSubscription = (items) => {
  //   const keys = ["1_day", "1_week", "1_month", "1_year"];
  //   return items.some(item =>
  //     item.meta_data.some(
  //       meta => meta.key === "_wcsatt_scheme" && keys.includes(meta.value)
  //     )
  //   );
  // };

  const createSession = (endpoint, data) =>
    axios.post(endpoint, data).then(res => res.data.sessionId);

  const redirectToStripe = async (sessionId) => {
    const stripe = await stripePromise;
    await stripe.redirectToCheckout({ sessionId });
  };

  const handleRedirect = async (orderData, orderId, subscription) => {
    const endpoint = subscription ? "/api/create-combined-session" : "/api/create-payment-session";

    const payload = {
      orderId,
      line_items: orderData.line_items,
      currency: orderData.currency,
      ...(endpoint.includes("combined") ? { billing: orderData.billing } : { totalAmount: orderData.total }),
    };
    if (subscription) {
      payload.subscription_id = subscription.id
    }

    console.log(payload, "Payload")
    const sessionId = await createSession(endpoint, payload);
    orderData.transactionId = sessionId;
    // orderData.orderType = isSubscription(orderData.line_items) ? "subscription" : "orders";
    localStorage.setItem("orderData", JSON.stringify(orderData));
    await redirectToStripe(sessionId);
  };

  const fetchOrder = async (orderId) => {
    try {
      const { orderData, subscription, debug, message } = (await axios.post("/api/fetch-order-details", { orderId })).data; 
      console.log("Order Data:", orderData, subscription)
      await handleRedirect(orderData, orderId, subscription);
    } catch {
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <LottieAnimation animationData={redirectCheckout} />
        <h2 style={{ color: "#000" }}>Redirecting To Secure Payment</h2>
        <p style={{ color: "#222", fontWeight: "600", fontSize: "13px" }}>
          Please Wait While We Generate Secure Payment Gateway!
        </p>
      </div>
    </div>
  );
};


export default PaymentPage;
