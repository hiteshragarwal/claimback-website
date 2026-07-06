'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { getCaseById } from '@/lib/supabase';
import { getScoreColor } from '@/lib/theme';
import { Copy, Download, ChevronDown, ChevronUp, Loader, Info } from 'lucide-react';

function ResultsPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get('case')!;

  const [caseData, setCaseData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLetter, setShowLetter] = useState(false);
  const [showIssues, setShowIssues] = useState(true);

  useEffect(() => {
    if (!user || !caseId) return;
    getCaseById(caseId)
      .then(c => { setCaseData(c); setLoading(false); })
      .catch(() => { toast.error('Could not load results'); router.push('/cases'); });
  }, [user, caseId, router]);

  const copyLetter = () => {
    const analysisJson = caseData?.analysis_json as Record<string, unknown> | undefined;
    const letter = analysisJson?.appeal_letter as string | undefined;
    if (letter) {
      navigator.clipboard.writeText(letter).then(() => toast.success('Copied to clipboard'));
    }
  };

  const downloadLetter = () => {
    const analysisJson = caseData?.analysis_json as Record<string, unknown> | undefined;
    const letter = analysisJson?.appeal_letter as string | undefined;
    if (!letter) return;
    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claimback-appeal-${caseId?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  if (loading) return (
    <AppShell variant="retail">
      <div className="flex items-center justify-center py-20">
        <Loader size={28} className="spinner text-[#06195e]" />
      </div>
    </AppShell>
  );

  const analysis = (caseData?.analysis_json as Record<string, unknown>) || {};
  const score = (analysis.win_score as number) ?? 0;
  const scoreColor = getScoreColor(score);
  const issues: string[] = (analysis.irdai_issues as string[]) || [];
  const appealLetter: string = (analysis.appeal_letter as string) || '';
  const verdict: string = (analysis.verdict as string) || '';
  const outcomeLabel: string = (analysis.outcome_label as string) || (score >= 70 ? 'Strong grounds' : score >= 40 ? 'Moderate grounds' : 'Limited grounds');

  // SVG ring
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - score / 100);

  return (
    <AppShell variant="retail">
      <div className="max-w-lg mx-auto space-y-4 pb-8">

        {/* Win score ring */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Win Probability</p>
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#E5EAF8" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={R} fill="none"
                stroke={scoreColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold text-3xl" style={{ color: scoreColor }}>{score}%</span>
              <span className="text-xs text-gray-400 mt-0.5">win score</span>
            </div>
          </div>
          <p className="font-semibold text-gray-800 text-center">{outcomeLabel}</p>
          {verdict && <p className="text-sm text-gray-500 text-center mt-1 leading-relaxed">{verdict}</p>}
        </div>

        {/* IRDAI issues */}
        {issues.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowIssues(!showIssues)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#06195e]" />
                <span className="font-semibold text-gray-800 text-sm">Key Issues Found ({issues.length})</span>
              </div>
              {showIssues ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showIssues && (
              <div className="px-5 pb-4 space-y-2 border-t border-gray-50">
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700 pt-2">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EFF4FF] text-[#06195e] text-xs flex items-center justify-center flex-shrink-0 font-medium">{i + 1}</span>
                    <p className="leading-relaxed">{issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appeal letter */}
        {appealLetter && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <span className="font-semibold text-gray-800 text-sm">Appeal Letter</span>
              <div className="flex items-center gap-2">
                <button onClick={copyLetter} className="flex items-center gap-1 text-xs text-[#06195e] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#EFF4FF] transition-colors">
                  <Copy size={13} /> Copy
                </button>
                <button onClick={downloadLetter} className="flex items-center gap-1 text-xs text-[#06195e] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#EFF4FF] transition-colors">
                  <Download size={13} /> Download
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowLetter(!showLetter)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              <span>{showLetter ? 'Hide letter' : 'Show full letter'}</span>
              {showLetter ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {showLetter && (
              <div className="px-5 pb-5">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto border border-gray-100">
                  {appealLetter}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Next steps */}
        <div className="bg-[#EFF4FF] rounded-2xl p-5">
          <p className="font-semibold text-[#06195e] text-sm mb-3">What to do next</p>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="font-bold text-[#06195e] mt-0.5">1.</span> Download your appeal letter above</li>
            <li className="flex items-start gap-2"><span className="font-bold text-[#06195e] mt-0.5">2.</span> Send it to your insurer&apos;s grievance email (found on their website)</li>
            <li className="flex items-start gap-2"><span className="font-bold text-[#06195e] mt-0.5">3.</span> If rejected again, escalate to IRDAI Bima Bharosa portal</li>
            <li className="flex items-start gap-2"><span className="font-bold text-[#06195e] mt-0.5">4.</span> Keep a copy of all correspondence</li>
          </ol>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center leading-relaxed px-2">
          This analysis is generated by AI based on IRDAI guidelines and is not legal advice. Outcome depends on your insurer&apos;s internal review process. ClaimBack is not a law firm.
        </p>

        <button onClick={() => router.push('/home')} className="w-full border border-gray-200 text-gray-600 font-medium py-3.5 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
          Back to Home
        </button>
      </div>
    </AppShell>
  );
}

export default function ResultsPage() {
  return <Suspense><ResultsPageInner /></Suspense>;
}
