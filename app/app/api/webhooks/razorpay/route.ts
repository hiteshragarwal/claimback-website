import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Razorpay sends webhooks for async payment events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Fail closed: an unverified webhook can forge payment.captured events
    if (!webhookSecret) {
      console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured — rejecting');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[razorpay-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const admin = supabaseAdmin();

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const caseId = payment?.notes?.case_id;

      if (caseId && payment?.status === 'captured') {
        await admin.from('cases').update({
          payment_status: 'paid',
          payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          status: 'analysing',
          updated_at: new Date().toISOString(),
        }).eq('id', caseId);
        console.log('[razorpay-webhook] Payment captured for case', caseId);
      }
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      const caseId = payment?.notes?.case_id;
      if (caseId) {
        await admin.from('cases').update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', caseId);
        console.log('[razorpay-webhook] Payment failed for case', caseId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[razorpay-webhook]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
