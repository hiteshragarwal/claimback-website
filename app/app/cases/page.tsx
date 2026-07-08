'use client';
import { useAppUser as useUser } from '@/lib/appUser';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { emailToUserId, getUserCases, deriveCaseStage, CaseStage } from '@/lib/supabase';
import { getScoreColor } from '@/lib/theme';
import { ChevronRight, Plus, Loader, FileText } from 'lucide-react';

const STATUS_LABELS: Record<CaseStage, { label: string; color: string }> = {
  draft:           { label: 'Draft',           color: 'bg-gray-100 text-gray-500' },
  pending_payment: { label: 'Awaiting confirmation', color: 'bg-amber-100 text-amber-700' },
  pre_scan:        { label: 'Document check',  color: 'bg-blue-100 text-blue-700' },
  analysing:       { label: 'Analysing',       color: 'bg-purple-100 text-purple-700' },
  completed:       { label: 'Completed',       color: 'bg-green-100 text-green-700' },
  failed:          { label: 'Failed',          color: 'bg-red-100 text-red-700' },
};

export default function CasesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [cases, setCases] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const uid = emailToUserId(user.primaryEmailAddress!.emailAddress);
    getUserCases(uid).then(c => { setCases(c); setLoading(false); });
  }, [user]);

  const handleCaseClick = (c: Record<string, unknown>) => {
    const stage = deriveCaseStage(c);
    if (stage === 'completed') router.push(`/results?case=${c.id}`);
    else if (stage === 'analysing' || stage === 'failed') router.push(`/analysing?case=${c.id}`);
    else if (stage === 'pre_scan') router.push(`/pre-scan?case=${c.id}`);
    else router.push(`/payment?case=${c.id}`);
  };

  return (
    <AppShell variant="retail">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif text-[#06195e] text-2xl font-bold">My Cases</h1>
            <p className="text-gray-500 text-sm mt-0.5">{cases.length} case{cases.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={() => router.push('/upload')} className="flex items-center gap-1.5 bg-[#06195e] text-white text-sm font-medium px-4 py-2.5 rounded-xl">
            <Plus size={15} /> New
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader size={24} className="spinner text-[#06195e]" />
          </div>
        )}

        {!loading && cases.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#EFF4FF] flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[#06195e]" />
            </div>
            <p className="font-medium text-gray-700 mb-1">No cases yet</p>
            <p className="text-sm text-gray-400 mb-6">Upload your rejection letter to get started</p>
            <button onClick={() => router.push('/upload')} className="bg-[#06195e] text-white px-6 py-3 rounded-xl text-sm font-medium">
              Start a new case
            </button>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map(c => {
              const stage = deriveCaseStage(c);
              const st = STATUS_LABELS[stage];
              const score = (c.win_score as number | null) ?? undefined;
              const scoreColor = score != null ? getScoreColor(score) : undefined;
              return (
                <button key={c.id as string} onClick={() => handleCaseClick(c)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md active:scale-[0.99] transition-all text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#EFF4FF] flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-[#06195e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{((c.insurer as string) !== 'Pending' && (c.insurer as string)) || 'Insurer pending'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.claim_amount ? `₹${Number(c.claim_amount).toLocaleString('en-IN')} · ` : ''}
                      {new Date(c.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {score != null && (
                      <span className="text-sm font-bold" style={{ color: scoreColor }}>{score}%</span>
                    )}
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
