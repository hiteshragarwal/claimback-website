import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// App routes that require a signed-in user. The gate is our own `cb_user`
// cookie, set only after Clerk verifies the emailed OTP — the same trust model
// as the mobile app (a verified OTP is auth; identity is the email→UUID).
// We deliberately do NOT call auth.protect(): the Clerk instance may refuse to
// mint a session (status 'missing_requirements' when phone is a required
// field), which would bounce verified users to Clerk's hosted sign-in page.
const PROTECTED = [
  '/home', '/cases', '/upload', '/payment', '/pre-scan',
  '/analysing', '/results', '/settings', '/partner/dashboard',
];

export default clerkMiddleware(async (_auth, req) => {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (needsAuth && !req.cookies.get('cb_user')) {
    const signIn = new URL('/sign-in', req.url);
    signIn.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
