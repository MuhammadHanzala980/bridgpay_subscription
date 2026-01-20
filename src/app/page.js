"use client";
import { useEffect, useRef } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import lottie from "lottie-web";
import redirectCheckout from "./lottie/redirectCheckout.json";
import { useRouter } from "next/navigation";

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
  }, []);



  // const createSession = (endpoint, data) => axios.post(endpoint, data).then(res => res.data);

  const createSession = async (endpoint, data) => {
    const session = await axios.post(endpoint, data)
    console.log(session)
    return session.data
  }


  const redirectToStripe = async (url) => {
    console.log(url)
    window.location.href = url
    // const stripe = await stripePromise;
    // await stripe.redirectToCheckout({ sessionId });
  };

  const handleRedirect = async (orderData, orderId, subscription) => {
    const endpoint = subscription ? "/api/create-combined-session" : "/api/create-payment-session";

    const payload = {
      orderData,
      subscription,
      orderId,
      line_items: orderData.line_items,
      total: orderData?.total,
      currency: orderData.currency,
      ...(endpoint.includes("combined") ? { billing: orderData.billing } : { totalAmount: orderData.total }),
    };
    if (subscription) {
      payload.subscription_id = subscription.id
    }

    // console.log(payload, "Payload")
    const session = await createSession(endpoint, payload);
    console.log(session)
    orderData.transactionId = session;
    await redirectToStripe(session.url);
  };

  const fetchOrder = async (orderId) => {
    try {
      const { orderData, subscription, debug, message } = (await axios.post("/api/fetch-order-details", { orderId })).data;
      console.log("Order Data:", orderData, "Subscription:", subscription)
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
