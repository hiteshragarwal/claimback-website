'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { emailToUserId, triggerPreScan, getPreScanResult, updateCase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';

function PreScanPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get('case')!;

  const [status, setStatus] = useState<'scanning' | 'done' | 'error'>('scanning');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user || !caseId) return;
    const uid = emailToUserId(user.primaryEmailAddress!.emailAddress);

    triggerPreScan(caseId, uid)
      .then(() => poll())
      .catch(err => { setStatus('error'); toast.error(err.message); });

    async function poll() {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const data = await getPreScanResult(caseId);
        if (data.pre_scan_status === 'completed' || data.pre_scan_status === 'failed') {
          setResult(data.pre_scan_json);
          setStatus('done');
          return;
        }
      }
      setStatus('error');
      toast.error('Pre-scan timed out. Please try again.');
    }
  }, [user, caseId]);

  const handleProceed = async (force = false) => {
    await updateCase(caseId, { status: force ? 'pre_scan_bypassed' : 'pre_scan_confirmed' });
    router.push(`/analysing?case=${caseId}`);
  };

  const verdict = result?.verdict as string | undefined;

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
              {!!result?.summary && <p className="text-sm text-gray-700 mb-3">{result.summary as string}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {!!result?.insurer && <Chip label="Insurer" value={result.insurer as string} />}
                {!!result?.claim_amount && <Chip label="Claim" value={`₹${Number(result.claim_amount as number).toLocaleString('en-IN')}`} />}
                {!!result?.rejection_reason && <Chip label="Rejection" value={result.rejection_reason as string} className="col-span-2" />}
              </div>
            </div>
            <div className="bg-[#EFF4FF] rounded-xl p-4 text-xs text-[#06195e] leading-relaxed">
              <strong>Confidence:</strong> {(result?.confidence_tier as string) || 'High'} — {(result?.confidence_note as string) || 'All key documents present.'}
            </div>
            <button onClick={() => handleProceed(false)} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm">
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
              <p className="text-sm text-gray-700">{(result?.summary as string) || 'We can still analyse with the documents you&apos;ve provided, but results may be less accurate.'}</p>
            </div>
            <div className="bg-[#EFF4FF] rounded-xl p-4 text-xs text-[#06195e]">
              <strong>Confidence tier:</strong> {(result?.confidence_tier as string) || 'Medium'} — Win score will be capped accordingly.
            </div>
            <button onClick={() => handleProceed(false)} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] text-sm">
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
              <p className="text-sm text-gray-700">{(result?.summary as string) || 'The uploaded files don&apos;t appear to be insurance documents. Please upload your rejection letter.'}</p>
            </div>
            <button onClick={() => handleProceed(true)} className="w-full border border-gray-200 text-gray-600 font-medium py-3.5 rounded-2xl text-sm active:bg-gray-50">
              Proceed Anyway (not recommended)
            </button>
            <button onClick={() => router.push('/upload')} className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl text-sm">
              Re-upload Documents
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
            <p className="font-medium text-red-800">Scan failed</p>
            <p className="text-sm text-gray-600 mt-1 mb-4">Something went wrong. You can proceed anyway or contact support.</p>
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
