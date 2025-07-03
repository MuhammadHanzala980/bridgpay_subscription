



"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import lottie from "lottie-web";
import redirectCheckout from "../lottie/generateReciept.json";

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

const PaymentSuccessPage = () => {
  const [paymentStatus, setPaymentStatus] = useState("Processing...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setPaymentStatus("Payment Successful!");

      const orderData = JSON.parse(localStorage.getItem("orderData") || "{}");
      const { id: orderId, transactionId, amount, currency } = orderData;

      // if (orderId && transactionId) {
      //   axios
      //     .put("/api/update-order-status", { orderId, transactionId })
      //     .then(async (res) => {
      //       window.gtag &&
      //         window.gtag("get", process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID, "client_id",
      //           (clientId) => {
      //             console.log("GA4 client_id:", clientId);
      //            }
      //         );

      //        window.gtag &&
      //         window.gtag("event", "purchase", {
      //           transaction_id: transactionId,
      //           value: amount,         // e.g. 49.99
      //           currency: currency,    // e.g. "USD"
      //           });

      //       console.log("GA4 purchase event sent");
      //     })
      //     .catch((err) => {
      //       console.error("Error updating order status:", err);
      //     });
      // } 
      //   else {
      //     console.warn("No valid orderData in localStorage");
      //   }
      // } else if (params.get("success") === "false") {
      //   setPaymentStatus("Payment Canceled.");
      }
  }, []);

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
        <div style={{ maxWidth: "400px" }}>
          <LottieAnimation animationData={redirectCheckout} />
        </div>
        <h2 style={{ color: "#000" }}>Payment Complete</h2>
        <p
          style={{
            color: "#222",
            fontWeight: "600",
            fontSize: "13px",
            marginTop: "1em",
          }}
        >
          We have successfully received your payment and are
          <br /> currently in the process of generating your receipt.{" "}
        </p>

        <p
          style={{
            color: "#222",
            fontWeight: "600",
            fontSize: "13px",
            marginTop: "1em",
          }}
        >
          You can expect to receive the receipt via email shortly.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
