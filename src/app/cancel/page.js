"use client"
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import failed from '../lottie/failed.json';
import lottie from "lottie-web";


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

const CancelSubscription = (props) => {
  const { searchParams } = props;
  const orderId = searchParams?.orderid;

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  useEffect(() => {
    if (!orderId) return;

    const handleCancelSubscription = async () => {
      setIsLoading(true); 

      try {
        console.log(orderId, "orderId")
        const response = await axios.post('/api/cancel-subscription', {
          wcSubscriptionId: orderId, 
        });
        console.log(response, "response")
        if (response.data.subscription) {
          setMessage('Subscription canceled successfully!');
        } else {
          console.log(response)
          setMessage(response?.data?.message || 'Failed to cancel the subscription.');
        }
      } catch (error) {
        console.log('Error canceling subscription:', error.response);
        setMessage(`Error: ${error.response?.data?.message || error.message}`); 
      } finally {
        setIsLoading(false); 
      }
    };

    handleCancelSubscription();
  }, [orderId]); 

  return (
    <div style={{
      backgroundColor: "#fff",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      flexDirection: "column"
    }} >
      <div style={{
        height: "200px",
        width: "200px",
      }} >
        <LottieAnimation animationData={failed} />

      </div>
      <br />

      <div style={{ textAlign: "center", padding: "20px", maxWidth: "670px" }}>
        <h2 style={{ color: "#000" }}>Subscription cancelled</h2>
        <br />

        <p style={{ color: "#222", fontWeight: "600", fontSize: "16px" }}>
          We're sorry to see you go.
        </p>
        <br />

        <p style={{fontWeight: "600"}} >Your subscription has been successfully cancelled. if you have any questions or would like to reactive your subscription in the future, we are here to help </p>
        <br />

        <p style={{fontWeight: "600"}}>Simply reach out to us at anytime  </p>
        <p style={{fontWeight: "600"}}>Thank you for being a part of our community, and we hope to serve you again</p>
      </div>

    </div>
  );
};


export default CancelSubscription;
