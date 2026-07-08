'use client';
import { useAppUser as useUser } from '@/lib/appUser';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { triggerPreScan, getPreScanResult, confirmPreScan } from '@/lib/supabase';
import { CheckCircle, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';

// pre-scan-docs writes pre_scan_status: running → valid | invalid | incomplete | failed
const TERMINAL = ['valid', 'invalid', 'incomplete', 'failed'];

function PreScanPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get('case')!;

  const [status, setStatus] = useState<'scanning' | 'done' | 'error'>('scanning');
  const [verdict, setVerdict] = useState<string>('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!user || !caseId || started.current) return;
    started.current = true;

    triggerPreScan(caseId)
      .then(() => poll())
      .catch(err => { setStatus('error'); toast.error(err.message); });

    async function poll() {
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const data = await getPreScanResult(caseId);
        const s = data.pre_scan_status as string;
        if (TERMINAL.includes(s)) {
          setVerdict(s);
          setResult(data.pre_scan_json as Record<string, unknown> | null);
          setStatus(s === 'failed' ? 'error' : 'done');
          return;
        }
      }
      setStatus('error');
      toast.error('Document check timed out. You can proceed anyway or try again.');
    }
  }, [user, caseId]);

  // 'failed' pre-scan: skip confirm so status stays 'failed' — analyse-claim
  // allows 'confirmed' and 'failed' (the iOS "Proceed Anyway" path)
  const handleProceed = async (skipConfirm = false) => {
    try {
      if (!skipConfirm) await confirmPreScan(caseId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm. Try again.');
      return;
    }
    router.push(`/analysing?case=${caseId}`);
  };

  const summary = (result?.summary as Record<string, unknown>) || {};
  const userMessage = (result?.user_message as string) || '';
  const confidence = (result?.confidence as string) || '';
  const confidenceNote = (result?.confidence_note as string) || '';

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-1">Document Check</h1>
        <p className="text-gray-500 text-sm mb-6">Verifying your documents before analysis begins.</p>

        {status === 'scanning' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="flex justify-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06195e] dot-1" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#06195e] dot-2" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#06195e] dot-3" />
            </div>
            <p className="font-medium text-gray-800 mb-1">Reading your documents…</p>
            <p className="text-gray-400 text-sm">This takes 30–60 seconds</p>
          </div>
        )}

        {status === 'done' && verdict === 'valid' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <span className="font-semibold text-green-800">Documents Verified</span>
              </div>
              {!!userMessage && <p className="text-sm text-gray-700 mb-3">{userMessage}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {!!summary.insurer && <Chip label="Insurer" value={summary.insurer as string} />}
                {!!summary.claim_amount && <Chip label="Claim" value={`₹${Number(summary.claim_amount as number).toLocaleString('en-IN')}`} />}
                {!!summary.policy_number && <Chip label="Policy No." value={summary.policy_number as string} />}
                {!!summary.insured_name && <Chip label="Insured" value={summary.insured_name as string} />}
                {!!summary.rejection_reason_verbatim && <Chip label="Rejection" value={summary.rejection_reason_verbatim as string} className="col-span-2" />}
              </div>
            </div>
            <div className="bg-[#EFF4FF] rounded-xl p-4 text-xs text-[#06195e] leading-relaxed">
              <strong>Confidence:</strong> {confidence || 'High'} — {confidenceNote || 'All key documents present.'}
            </div>
            <button onClick={() => handleProceed()} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm">
              Looks correct — Start Analysis <ChevronRight size={16} />
            </button>
          </div>
        )}

        {status === 'done' && verdict === 'incomplete' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-amber-600" />
                <span className="font-semibold text-amber-800">Some Documents Missing</span>
              </div>
              <p className="text-sm text-gray-700">{userMessage || 'We can still analyse with the documents you’ve provided, but results may be less accurate.'}</p>
            </div>
            <div className="bg-[#EFF4FF] rounded-xl p-4 text-xs text-[#06195e]">
              <strong>Confidence tier:</strong> {confidence || 'Medium'} — Win score will be capped accordingly.
            </div>
            <button onClick={() => handleProceed()} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] text-sm">
              Proceed Anyway <ChevronRight size={16} />
            </button>
            <button onClick={() => router.push(`/upload`)} className="w-full text-center text-[#06195e] text-sm font-medium py-2">
              ← Go back and add more documents
            </button>
          </div>
        )}

        {status === 'done' && verdict === 'invalid' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={20} className="text-red-600" />
                <span className="font-semibold text-red-800">Documents Not Recognised</span>
              </div>
              <p className="text-sm text-gray-700">{userMessage || 'The uploaded files don’t appear to be insurance documents. Please upload your rejection letter.'}</p>
            </div>
            <button onClick={() => router.push('/upload')} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl text-sm">
              Re-upload Documents
            </button>
            <button onClick={() => handleProceed()} className="w-full border border-gray-200 text-gray-600 font-medium py-3.5 rounded-2xl text-sm active:bg-gray-50">
              Proceed Anyway (not recommended)
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
            <p className="font-medium text-red-800">Document check couldn&apos;t complete</p>
            <p className="text-sm text-gray-600 mt-1 mb-4">You can proceed anyway — the analysis will read your documents directly — or contact support.</p>
            <button onClick={() => handleProceed(true)} className="w-full bg-[#06195e] text-white font-semibold py-3.5 rounded-2xl text-sm">
              Proceed to Analysis Anyway
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PreScanPage() {
  return <Suspense><PreScanPageInner /></Suspense>;
}

function Chip({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-white rounded-lg p-2 border border-green-100 ${className}`}>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="font-medium text-gray-800 text-xs mt-0.5 truncate">{value}</p>
    </div>
  );
}
