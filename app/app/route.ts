import { NextRequest, NextResponse } from 'next/server';
import landingHtml from './landing-html';

// Serve the original static marketing site verbatim at the root.
// Signed-in users (our own cb_user session cookie) skip it and land in the app.
export async function GET(req: NextRequest) {
  if (req.cookies.get('cb_user')) {
    return new NextResponse(null, { status: 307, headers: { Location: '/home' } });
  }
  return new NextResponse(landingHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
