import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, emailToUserId } from '@/lib/supabase';

function generatePartnerCode(email: string): string {
  const hash = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return hash.slice(0, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role, name, phone, upi_id, irda_licence, org_name } = body;

    if (!email || !role || !name || !phone || !upi_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const userId = emailToUserId(email);

    // Check if already registered
    const { data: existing } = await admin.from('partners').select('id, partner_code').eq('user_id', userId).single();
    if (existing) {
      return NextResponse.json({ partner_code: existing.partner_code, message: 'Already registered' });
    }

    // Generate unique partner code
    let partnerCode = generatePartnerCode(email);
    const { data: conflict } = await admin.from('partners').select('id').eq('partner_code', partnerCode).single();
    if (conflict) {
      partnerCode = partnerCode.slice(0, 4) + Math.random().toString(36).slice(2, 4).toUpperCase();
    }

    const { error } = await admin.from('partners').insert({
      user_id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      phone: phone.trim(),
      upi_id: upi_id.trim(),
      irda_licence: irda_licence?.trim() || null,
      org_name: org_name?.trim() || null,
      role,
      partner_code: partnerCode,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[partner-register]', error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json({ partner_code: partnerCode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[partner-register]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
