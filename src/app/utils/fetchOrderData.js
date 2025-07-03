// utils/fetchOrderData.js
import axios from 'axios';

export async function fetchOrderData(orderId) {
  console.log(orderId, "UTILS LOG: fetch order data")
  const options = {
    // auth: {
    //   username: process.env.BASIC_AUTH_USERNAME,
    //   password: process.env.BASIC_AUTH_PASSWORD,
    // },
    method: 'GET',
    url: `${process.env.SITE_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${process.env.CONSUMER_KEY}&consumer_secret=${process.env.CONSUMER_SECRET}`,
  };

  try {
    const response = await axios(options);
    return response.data;
  } catch (error) {
    throw error;
  }
}
