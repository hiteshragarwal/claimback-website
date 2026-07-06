import { NextRequest, NextResponse } from 'next/server';

// Referral link handler: set ref_code cookie (30 days, readable by client JS
// for createCase()) and redirect to sign-up. Must be a Route Handler — pages
// cannot modify cookies during render.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const res = NextResponse.redirect(new URL(`/sign-up?ref=${encodeURIComponent(code)}`, req.url));
  res.cookies.set('ref_code', code, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}
