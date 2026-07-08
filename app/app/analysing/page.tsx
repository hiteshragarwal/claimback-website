'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { triggerAnalysis, pollAnalysisResult } from '@/lib/supabase';

const STEPS = [
  'Reading rejection letter…',
  'Checking policy clauses…',
  'Reviewing IRDAI guidelines…',
  'Identifying grounds for appeal…',
  'Calculating win probability…',
  'Drafting appeal letter…',
  'Finalising your report…',
];

function AnalysingPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get('case')!;

  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');

  useEffect(() => {
    if (!user || !caseId) return;

    // Animate steps every ~4s regardless of actual progress
    const stepTimer = setInterval(() => {
      setStepIndex(i => (i < STEPS.length - 1 ? i + 1 : i));
      setProgress(p => Math.min(p + 14, 92));
    }, 4000);

    triggerAnalysis(caseId)
      .then(() => poll())
      .catch(err => { setStatus('error'); toast.error(err.message); clearInterval(stepTimer); });

    async function poll() {
      for (let i = 0; i < 60; i++) { // max 5 min
        await new Promise(r => setTimeout(r, 5000));
        const data = await pollAnalysisResult(caseId);
        if (data?.analysis_status === 'completed') {
          clearInterval(stepTimer);
          setProgress(100);
          setStepIndex(STEPS.length - 1);
          setStatus('done');
          setTimeout(() => router.push(`/results?case=${caseId}`), 1000);
          return;
        }
        if (data?.analysis_status === 'failed') {
          clearInterval(stepTimer);
          setStatus('error');
          toast.error('Analysis failed. Please contact support.');
          return;
        }
      }
      clearInterval(stepTimer);
      setStatus('error');
      toast.error('Analysis timed out. Please contact support@claimback.co.in');
    }

    return () => clearInterval(stepTimer);
  }, [user, caseId, router]);

  return (
    <AppShell variant="retail">
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {status === 'running' && (
          <>
            {/* Progress ring */}
            <div className="relative w-28 h-28 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#E5EAF8" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#06195e" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-[#06195e] text-xl">{progress}%</span>
              </div>
            </div>

            <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-2">Analysing your claim</h1>
            <p className="text-gray-500 text-sm mb-6">Our AI is working through your documents. This usually takes 2–4 minutes.</p>

            {/* Step indicator */}
            <div className="w-full bg-[#EFF4FF] rounded-2xl p-4 text-left">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">Current step</p>
              <div className="space-y-1.5">
                {STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                    i < stepIndex ? 'text-green-600' :
                    i === stepIndex ? 'text-[#06195e] font-medium' :
                    'text-gray-300'
                  }`}>
                    <span className="w-4 h-4 flex-shrink-0 text-xs flex items-center justify-center">
                      {i < stepIndex ? '✓' : i === stepIndex ? '›' : '·'}
                    </span>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">Do not close this tab — you&apos;ll be redirected automatically.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-2">Analysis complete!</h1>
            <p className="text-gray-500 text-sm">Redirecting to your results…</p>
          </>
        )}

        {status === 'error' && (
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="font-semibold text-red-800 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-600 mb-4">The analysis could not be completed. Our team will follow up within 24 hours.</p>
            <p className="text-xs text-gray-400">Case ID: {caseId}</p>
            <p className="text-xs text-gray-400 mt-1">Support: support@claimback.co.in</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AnalysingPage() {
  return <Suspense><AnalysingPageInner /></Suspense>;
}
