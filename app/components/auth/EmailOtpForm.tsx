'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSignUp, useSignIn } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { emailToUserId, syncUserRecord } from '@/lib/supabase';
import { setAppSession, readAppSession } from '@/lib/appUser';
import { Loader } from 'lucide-react';

type ClerkError = { errors?: { code?: string; message?: string; longMessage?: string }[] };
const errCode = (e: unknown) => (e as ClerkError)?.errors?.[0]?.code || '';
const errMsg = (e: unknown) =>
  (e as ClerkError)?.errors?.[0]?.longMessage || (e as ClerkError)?.errors?.[0]?.message || 'Something went wrong. Try again.';

// Email + 6-digit OTP auth, mirroring the iOS app (Clerk email_code strategy —
// no password, no phone). `mode` only picks which flow we try first; if the
// account already exists (or doesn't), we silently switch to the other flow.
export default function EmailOtpForm({ mode }: { mode: 'sign-up' | 'sign-in' }) {
  const router = useRouter();
  const params = useSearchParams();
  const refCode = params.get('ref') || '';
  // Only same-origin app paths — never an attacker-supplied absolute URL
  const rawRedirect = params.get('redirect') || '';
  const redirectTo = /^\/[a-zA-Z0-9/_-]*$/.test(rawRedirect) ? rawRedirect : '';

  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();

  // Already signed in — go straight to the app
  useEffect(() => {
    if (readAppSession()) router.replace(redirectTo || '/home');
  }, [router, redirectTo]);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [flow, setFlow] = useState<'sign-up' | 'sign-in'>(mode);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const startSignUp = async (em: string) => {
    await signUp!.create({ emailAddress: em });
    await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
    setFlow('sign-up');
  };

  const startSignIn = async (em: string) => {
    const attempt = await signIn!.create({ identifier: em });
    const factor = attempt.supportedFirstFactors?.find(f => f.strategy === 'email_code');
    if (!factor || !('emailAddressId' in factor)) throw new Error('Email code sign-in unavailable for this account.');
    await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId as string });
    setFlow('sign-in');
  };

  const handleSendOtp = async () => {
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast.error('Please enter a valid email address.'); return; }
    if (!signUpLoaded || !signInLoaded) return;
    setLoading(true);
    try {
      if (mode === 'sign-up') {
        try {
          await startSignUp(em);
        } catch (e: unknown) {
          if (errCode(e) === 'form_identifier_exists') await startSignIn(em); // account exists — OTP sign-in instead
          else throw e;
        }
      } else {
        try {
          await startSignIn(em);
        } catch (e: unknown) {
          if (errCode(e) === 'form_identifier_not_found') await startSignUp(em); // no account — create one
          else throw e;
        }
      }
      setStep('otp');
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
      toast.success(`Code sent to ${em}`);
    } catch (e: unknown) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code?: string) => {
    const c = code || otp.join('');
    if (c.length !== 6) { toast.error('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const em = email.trim();

      // Verifying the OTP is the auth gate (throws on a wrong code) — exactly
      // like the mobile app.
      let sessionId: string | null = null;
      if (flow === 'sign-up') {
        const result = await signUp!.attemptEmailAddressVerification({ code: c });
        sessionId = result.createdSessionId;
      } else {
        const result = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: c });
        sessionId = result.createdSessionId;
      }

      // Activating a Clerk session is best-effort: the instance may refuse to
      // mint one (e.g. status 'missing_requirements' when the dashboard marks
      // phone as required). Login must not depend on it.
      try {
        if (sessionId) {
          if (flow === 'sign-up') await setActiveSignUp!({ session: sessionId });
          else await setActiveSignIn!({ session: sessionId });
        }
      } catch (e) {
        console.warn('[auth] session activation non-fatal:', e);
      }

      // Our own session — identity is the deterministic email→UUID (same as iOS)
      setAppSession(em);

      // Ensure the Supabase user row exists (non-fatal — never blocks login)
      await syncUserRecord(emailToUserId(em), em);

      // Full navigation, not client-side push: middleware must see the new cookie
      window.location.assign(
        refCode ? `/upload?ref=${encodeURIComponent(refCode)}` : (redirectTo || '/home')
      );
    } catch (e: unknown) {
      toast.error(errMsg(e) || 'Invalid code. Try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, i: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const n = [...otp]; n[i] = digit; setOtp(n);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (digit && i === 5 && n.every(d => d !== '')) handleVerify(n.join(''));
  };

  const handleOtpKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setOtp(text.split(''));
      handleVerify(text);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7">
      {step === 'email' && (
        <>
          <h2 className="font-serif text-[#06195e] text-xl font-bold text-center mb-1">
            {mode === 'sign-up' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            {mode === 'sign-up' ? 'Just your email — we’ll send a 6-digit code.' : 'Enter your email to receive a sign-in code.'}
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendOtp(); }}
            placeholder="you@example.com"
            autoFocus
            className="w-full border-[1.5px] border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-[#06195e] focus:outline-none mb-4"
          />
          {/* Clerk mounts its bot-protection widget (Cloudflare Turnstile) here */}
          <div id="clerk-captcha" className="mb-4 empty:mb-0" />
          <button
            onClick={handleSendOtp}
            disabled={loading || !email.trim()}
            className="w-full bg-[#06195e] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
          >
            {loading ? <Loader size={16} className="spinner" /> : 'Send Code →'}
          </button>
          <p className="text-center text-gray-400 text-xs mt-4">
            {mode === 'sign-up'
              ? <>Already have an account? <Link href="/sign-in" className="text-[#2563EB] font-medium">Sign in</Link></>
              : <>New to ClaimBack? <Link href="/sign-up" className="text-[#2563EB] font-medium">Create account</Link></>}
          </p>
        </>
      )}

      {step === 'otp' && (
        <>
          <h2 className="font-serif text-[#06195e] text-xl font-bold text-center mb-1">Check your email</h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email.trim()}</span>
          </p>
          <div className="flex justify-center gap-2 mb-5" onPaste={handleOtpPaste}>
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el; }}
                value={d}
                onChange={e => handleOtpChange(e.target.value, i)}
                onKeyDown={e => handleOtpKey(e, i)}
                inputMode="numeric"
                maxLength={1}
                className="w-11 h-13 border-[1.5px] border-gray-200 rounded-xl text-center text-lg font-bold text-[#06195e] py-3 focus:border-[#06195e] focus:outline-none"
              />
            ))}
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            className="w-full bg-[#06195e] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
          >
            {loading ? <Loader size={16} className="spinner" /> : 'Verify & Continue →'}
          </button>
          <div className="text-center mt-4">
            {resendTimer > 0
              ? <p className="text-gray-400 text-xs">Resend code in {resendTimer}s</p>
              : <button onClick={handleSendOtp} className="text-[#2563EB] text-xs font-medium">Resend code</button>}
          </div>
          <button onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); }} className="w-full text-center text-gray-400 text-xs mt-3">
            ← Use a different email
          </button>
        </>
      )}
    </div>
  );
}
