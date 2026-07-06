import { NextRequest, NextResponse } from 'next/server';

// Referral link handler: set ref_code cookie (30 days, readable by client JS
// for createCase()) and redirect to sign-up. Must be a Route Handler — pages
// cannot modify cookies during render.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Relative Location header: behind Netlify's proxy req.url resolves to the
  // internal deploy hostname, which would strand the user off claimback.co.in
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: `/sign-up?ref=${encodeURIComponent(code)}` },
  });
  res.cookies.set('ref_code', code, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
