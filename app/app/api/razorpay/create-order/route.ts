import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { caseId, amount } = body;

    if (!caseId || !amount) {
      return NextResponse.json({ error: 'caseId and amount are required' }, { status: 400 });
    }

    if (amount !== 199900) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount, // in paise
      currency: 'INR',
      receipt: `cb_${caseId.slice(0, 16)}`,
      notes: { case_id: caseId, user_id: userId },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Order creation failed';
    console.error('[create-order]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
