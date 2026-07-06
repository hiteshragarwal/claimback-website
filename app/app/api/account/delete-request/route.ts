import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, emailToUserId } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const admin = supabaseAdmin();
    const dbUserId = emailToUserId(email);

    // Log deletion request (processed manually within 30 days per DPDP)
    await admin.from('deletion_requests').insert({
      user_id: dbUserId,
      email: email.toLowerCase(),
      requested_at: new Date().toISOString(),
      status: 'pending',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[delete-request]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
