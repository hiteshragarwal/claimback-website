'use client';
import { useAppUser as useUser } from '@/lib/appUser';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { getCaseById, applyPromoCode, markCasePaid } from '@/lib/supabase';
import { Shield, Lock, ChevronRight, Loader, AlertCircle, CheckCircle, Tag } from 'lucide-react';

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

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoChecking, setPromoChecking] = useState(false);

  useEffect(() => {
    if (!caseId || !user) return;
    getCaseById(caseId).then(c => { setCaseData(c); setLoading(false); }).catch(() => { toast.error('Case not found'); router.push('/upload'); });
  }, [caseId, user, router]);

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true);
    try {
      // Atomic check-and-decrement — same RPC the mobile app uses
      const { ok, reason } = await applyPromoCode(code);
      if (!ok) {
        toast.error(reason === 'invalid_or_exhausted'
          ? 'This code is invalid or fully used. Contact support@claimback.co.in'
          : 'That code doesn’t exist. Please check and try again.');
        return;
      }
      setPromoApplied(true);
      toast.success('Code applied — analysis is free!');
    } catch {
      toast.error('Could not validate code. Try again.');
    } finally {
      setPromoChecking(false);
    }
  };

  const handlePay = async () => {
    if (!tcAccepted) { toast.error('Please accept terms & conditions'); return; }
    if (!promoApplied) { toast.error('Enter your invite code to continue — payments open soon'); return; }
    if (!caseId) { toast.error('Case ID missing'); return; }
    setPaying(true);
    try {
      await markCasePaid(caseId, promoCode);
      toast.success('You’re in! Starting document check…');
      router.push(`/pre-scan?case=${caseId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setPaying(false);
    }
  };

  const tcSections = [
    { title: 'What ClaimBack provides', body: 'ClaimBack provides AI-generated analysis and appeal letters based on uploaded documents and IRDAI regulations. This is not legal advice. Results are indicative and depend on document quality.' },
    { title: 'Payment & Refund Policy', body: 'Flat fee of ₹999 (free during beta with an invite code). If our AI cannot process your documents (e.g. unreadable files), you are eligible for a partial refund on paid plans. No refund if analysis is successfully delivered.' },
    { title: 'Data Privacy (DPDP Act 2023)', body: 'Your documents are stored securely on encrypted servers. We do not share your health or financial data with any third party. You may request deletion of all data at any time via support@claimback.co.in.' },
    { title: 'Limitation of Liability', body: 'ClaimBack’s liability is limited to ₹999 (the fee paid). We are not responsible for insurer decisions, legal outcomes, or consequential losses.' },
    { title: 'Governing Law', body: 'These terms are governed by the laws of India. Disputes subject to exclusive jurisdiction of Mumbai courts.' },
  ];

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader size={28} className="spinner text-[#06195e]" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-1">Review & Confirm</h1>
        <p className="text-gray-500 text-sm mb-5">Analysis delivered in ~3 minutes after confirmation.</p>

        {/* What you get */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What you get</p>
          <div className="space-y-2.5 text-sm">
            {[
              ['⚖️', 'Full AI analysis against 14 IRDAI regulations'],
              ['✉️', 'Ready-to-send appeal letter with IRDAI citations'],
              ['📋', '4-level escalation plan (Grievance → Ombudsman → Court)'],
              ['📧', 'Draft emails for each escalation level'],
            ].map(([ico, txt]) => (
              <div key={txt} className="flex items-start gap-2.5">
                <span>{ico}</span>
                <span className="text-gray-600 text-sm leading-snug">{txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Summary</p>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-600">Insurer</span><span className="font-medium">{(caseData?.insurer as string) === 'Pending' ? 'Detected from documents' : (caseData?.insurer as string)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Claim Amount</span><span className="font-medium">₹{Number((caseData?.claim_amount as number) || 0).toLocaleString('en-IN')}</span></div>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-800">ClaimBack Analysis Fee</span>
            <span className="text-right">
              {promoApplied
                ? <><span className="text-gray-400 line-through text-sm mr-2">₹999</span><span className="font-bold text-green-600 text-lg">FREE</span></>
                : <span className="font-bold text-[#06195e] text-lg">₹999</span>}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Free during beta with an invite code. Online payments open soon.</p>
        </div>

        {/* Invite / promo code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Invite Code</p>
          {!promoApplied ? (
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Enter your invite code"
                autoCapitalize="characters"
                className="flex-1 border-[1.5px] border-gray-200 rounded-xl px-4 py-3 text-sm font-medium tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:border-[#06195e] focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleApplyPromo(); }}
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoChecking || !promoCode.trim()}
                className="bg-[#EFF4FF] border border-[#06195e]/20 text-[#06195e] font-semibold px-5 rounded-xl text-sm disabled:opacity-40"
              >
                {promoChecking ? <Loader size={15} className="spinner" /> : 'Apply'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-800">Code <span className="font-bold tracking-wide">{promoCode.trim().toUpperCase()}</span> applied — this analysis is free</span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Tag size={11} /> Got an invite from us or a partner? Enter the code above.</p>
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
            <span className="text-xs text-gray-600 leading-relaxed">I have read and agree to the Terms & Conditions. I understand this is not legal advice and my liability cap is ₹999.</span>
          </label>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mb-5 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Shield size={13} className="text-green-500" /> DPDP Compliant</span>
          <span className="flex items-center gap-1"><Lock size={13} className="text-[#06195e]" /> Encrypted Storage</span>
          <span className="flex items-center gap-1"><AlertCircle size={13} className="text-amber-500" /> Not Legal Advice</span>
        </div>

        <button onClick={handlePay} disabled={paying || !tcAccepted || !promoApplied}
          className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all text-sm">
          {paying ? <><Loader size={16} className="spinner" /> Starting analysis…</> : <>Start Free Analysis <ChevronRight size={16} /></>}
        </button>
        <p className="text-center text-gray-400 text-xs mt-3">Beta access · Free with invite code · Online payments coming soon</p>
      </div>
    </AppShell>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentPageInner /></Suspense>;
}
