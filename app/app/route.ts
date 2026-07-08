import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import landingHtml from './landing-html';

// Serve the original static marketing site verbatim at the root.
// Signed-in users skip the marketing page and land in the app.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (userId) {
    return NextResponse.redirect(new URL('/home', req.url));
  }
  return new NextResponse(landingHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
