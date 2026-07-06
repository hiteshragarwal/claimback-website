import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, caseId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !caseId) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
    }

    // HMAC-SHA256 signature verification
    const secret = process.env.RAZORPAY_SECRET!;
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[verify-payment] Signature mismatch');
      return NextResponse.json({ success: false, error: 'Signature verification failed' }, { status: 400 });
    }

    // Update case payment status
    const admin = supabaseAdmin();
    const { error } = await admin
      .from('cases')
      .update({
        payment_status: 'paid',
        payment_id: razorpay_payment_id,
        razorpay_order_id,
        status: 'analysing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    if (error) {
      console.error('[verify-payment] DB update error', error);
      return NextResponse.json({ success: false, error: 'DB update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[verify-payment]', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
