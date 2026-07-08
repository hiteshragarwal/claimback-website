'use client';
import { Suspense } from 'react';
import EmailOtpForm from '@/components/auth/EmailOtpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#06195e] flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-white text-3xl font-bold mb-2">ClaimBack</h1>
        <p className="text-white/60 text-sm">Create your account — free to start</p>
      </div>
      <Suspense>
        <EmailOtpForm mode="sign-up" />
      </Suspense>
      <p className="text-white/40 text-xs mt-6 max-w-xs text-center">
        No password needed. We’ll email you a 6-digit code — same as the ClaimBack app.
      </p>
    </div>
  );
}
