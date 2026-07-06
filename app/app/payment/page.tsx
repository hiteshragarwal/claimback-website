'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { getCaseById } from '@/lib/supabase';
import { Shield, Lock, ChevronRight, Loader, AlertCircle } from 'lucide-react';

type RazorpayInstance = { open: () => void; on: (event: string, handler: (r: { error: { description: string } }) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
declare global { interface Window { Razorpay: RazorpayConstructor; } }

function PaymentPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get('case');

  const [caseData, setCaseData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(null);

  useEffect(() => {
    if (!caseId || !user) return;
    getCaseById(caseId).then(c => { setCaseData(c); setLoading(false); }).catch(() => { toast.error('Case not found'); router.push('/upload'); });
  }, [caseId, user, router]);

  // Load Razorpay script
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, []);

  const handlePay = async () => {
    if (!tcAccepted) { toast.error('Please accept terms & conditions'); return; }
    setPaying(true);
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, amount: 199900 }), // paise
      });
      const { orderId, error } = await res.json();
      if (error) throw new Error(error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: 199900,
        currency: 'INR',
        name: 'ClaimBack',
        description: 'Insurance Appeal Analysis',
        order_id: orderId,
        prefill: { email: user!.primaryEmailAddress!.emailAddress },
        theme: { color: '#06195e' },
        handler: async (response: Record<string, unknown>) => {
          try {
            const verify = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, caseId }),
            });
            const result = await verify.json();
            if (result.success) {
              toast.success('Payment successful!');
              router.push(`/pre-scan?case=${caseId}`);
            } else {
              toast.error('Payment verification failed. Contact support.');
            }
          } catch { toast.error('Verification error. Contact support@claimback.co.in'); }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r: { error: { description: string } }) => { toast.error(`Payment failed: ${r.error.description}`); setPaying(false); });
      rzp.open();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment error');
      setPaying(false);
    }
  };

  const tcSections = [
    { title: 'What ClaimBack provides', body: 'ClaimBack provides AI-generated analysis and appeal letters based on uploaded documents and IRDAI regulations. This is not legal advice. Results are indicative and depend on document quality.' },
    { title: 'Payment & Refund Policy', body: 'Flat fee of ₹1,999. If our AI cannot process your documents (e.g. unreadable files), you are eligible for a ₹799 refund (₹1,200 AI processing cost deducted). No refund if analysis is successfully delivered.' },
    { title: 'Data Privacy (DPDP Act 2023)', body: 'Your documents are stored securely on encrypted servers. We do not share your health or financial data with any third party. You may request deletion of all data at any time via support@claimback.co.in.' },
    { title: 'Limitation of Liability', body: 'ClaimBack\'s liability is limited to ₹1,999 (the fee paid). We are not responsible for insurer decisions, legal outcomes, or consequential losses.' },
    { title: 'Governing Law', body: 'These terms are governed by the laws of India. Disputes subject to exclusive jurisdiction of Mumbai courts.' },
  ];

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader size={28} className="spinner text-[#06195e]" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-1">Review & Pay</h1>
        <p className="text-gray-500 text-sm mb-5">One-time flat fee. Analysis delivered in ~3 minutes after payment.</p>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Summary</p>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-600">Insurer</span><span className="font-medium">{caseData?.insurer_name as string}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Claim Amount</span><span className="font-medium">₹{Number((caseData?.claim_amount as number) || 0).toLocaleString('en-IN')}</span></div>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-800">ClaimBack Analysis Fee</span>
            <span className="font-bold text-[#06195e] text-lg">₹1,999</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Inclusive of all taxes. ₹799 refund if analysis cannot be completed.</p>
        </div>

        {/* T&C accordion */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Terms & Conditions</p>
          <div className="space-y-2">
            {tcSections.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button onClick={() => setOpenSection(openSection === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
                  {s.title}
                  <span className="text-gray-400 ml-2">{openSection === i ? '▲' : '▼'}</span>
                </button>
                {openSection === i && <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100">{s.body}</div>}
              </div>
            ))}
          </div>
          <label className="flex items-start gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={tcAccepted} onChange={e => setTcAccepted(e.target.checked)} className="mt-0.5 accent-[#06195e] w-4 h-4 flex-shrink-0" />
            <span className="text-xs text-gray-600 leading-relaxed">I have read and agree to the Terms & Conditions. I understand this is not legal advice and my liability cap is ₹1,999.</span>
          </label>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mb-5 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Shield size={13} className="text-green-500" /> DPDP Compliant</span>
          <span className="flex items-center gap-1"><Lock size={13} className="text-[#06195e]" /> Encrypted Storage</span>
          <span className="flex items-center gap-1"><AlertCircle size={13} className="text-amber-500" /> Not Legal Advice</span>
        </div>

        <button onClick={handlePay} disabled={paying || !tcAccepted}
          className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all text-sm">
          {paying ? <><Loader size={16} className="spinner" /> Processing…</> : <>Pay ₹1,999 Securely <ChevronRight size={16} /></>}
        </button>
        <p className="text-center text-gray-400 text-xs mt-3">Powered by Razorpay · UPI, Cards, NetBanking accepted</p>
      </div>
    </AppShell>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentPageInner /></Suspense>;
}
