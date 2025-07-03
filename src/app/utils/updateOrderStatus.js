// utils/updateOrderStatus.js
import axios from 'axios';
import qs from 'qs';

export async function updateOrderStatus(data) {
    const { orderId, status } = data;
    console.log(data, 'ORDER DATA')
    const formData = qs.stringify(data);
     const options = {
        // auth: {
        //     username: process.env.BASIC_AUTH_USERNAME,
        //     password: process.env.BASIC_AUTH_PASSWORD,
        // },
        method: 'PUT',
        url: `${process.env.SITE_URL}/wp-json/wc/v3/orders/${orderId}/?consumer_key=${process.env.CONSUMER_KEY}&consumer_secret=${process.env.CONSUMER_SECRET}`,
        data: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };

    try {
        const response = await axios(options);
        // console.log(response, 'RESPONSE')
        if (response.status === 200) {
            return {
                message: `Order status updated to ${status}`,
                id: orderId,
                checkOutUrl: process.env.SITE_URL
             };
        } else {
             throw new Error('Failed to update order status');
        }
    } catch (error) {
        console.log(error)
        throw error;
    }
}
