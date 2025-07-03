import { NextResponse } from 'next/server';
import { updateOrderStatus } from '@/app/utils/updateOrderStatus';

export async function PUT(request) {
  if (request.method !== 'PUT') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const reqBody = await request.json();
    const { orderId, transactionId } = reqBody;
    console.log(transactionId, 'TRANSACTION ID')
    console.log(orderId, 'ORDER ID')
    
    const data = {
      status: 'processing',
      orderId,
      transaction_id: transactionId,
    };

    const updateResult = await updateOrderStatus(data);

    if (updateResult.statusCode === 200) {
      return NextResponse.json({ message: updateResult.message, updateResult }, { status: updateResult.statusCode || 500 });
    }

    return NextResponse.json({
      message: `Order status updated to ${data.status}`,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ message: 'Error updating order status' }, { status: 500 });
  }
}
