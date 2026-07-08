'use client';
// App-level session, mirroring the iOS app's trust model: a verified email OTP
// is the auth gate, identity is the deterministic email→UUID, and the session
// lives in our own cookie. A Clerk session is used when present but is NOT
// required — the Clerk instance may refuse to mint one (e.g. phone number
// marked required in the dashboard → sign-up stays 'missing_requirements').
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const COOKIE = 'cb_user';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — same as the app

export function setAppSession(email: string) {
  const value = encodeURIComponent(btoa(JSON.stringify({ email: email.toLowerCase().trim(), ts: Date.now() })));
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAppSession() {
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readAppSession(): { email: string } | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='))?.substring(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(decodeURIComponent(raw)));
    return parsed?.email ? { email: parsed.email as string } : null;
  } catch {
    return null;
  }
}

// Clears our session, then Clerk's (if any), then leaves the app.
// A Clerk signOut alone would leave cb_user set and keep the user "logged in".
export async function appSignOut(clerkSignOut?: () => Promise<unknown>) {
  clearAppSession();
  try {
    await clerkSignOut?.();
  } catch (e) {
    console.warn('[auth] clerk signOut non-fatal:', e);
  }
  window.location.assign('/');
}

// Same shape as the slice of Clerk's useUser() the pages consume, so pages can
// swap `import { useUser } from '@clerk/nextjs'` for
// `import { useAppUser as useUser } from '@/lib/appUser'` with no other edits.
type AppUser = {
  primaryEmailAddress: { emailAddress: string };
  firstName: string | null;
} | null;

export function useAppUser(): { user: AppUser; isLoaded: boolean } {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const [cookieUser, setCookieUser] = useState<AppUser>(null);
  const [cookieChecked, setCookieChecked] = useState(false);

  useEffect(() => {
    const s = readAppSession();
    if (s) setCookieUser({ primaryEmailAddress: { emailAddress: s.email }, firstName: null });
    setCookieChecked(true);
  }, []);

  if (clerkLoaded && clerkUser?.primaryEmailAddress) {
    return {
      user: {
        primaryEmailAddress: { emailAddress: clerkUser.primaryEmailAddress.emailAddress },
        firstName: clerkUser.firstName,
      },
      isLoaded: true,
    };
  }
  return { user: cookieUser, isLoaded: cookieChecked && clerkLoaded };
}
