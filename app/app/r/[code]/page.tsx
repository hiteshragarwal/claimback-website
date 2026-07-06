import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function ReferralRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Set referral cookie (30 day expiry) — readable by client JS for createCase()
  const cookieStore = await cookies();
  cookieStore.set('ref_code', code, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });

  redirect(`/sign-up?ref=${code}`);
}
