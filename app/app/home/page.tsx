'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { emailToUserId, getUserCases, deriveCaseStage } from '@/lib/supabase';
import { getScoreColor } from '@/lib/theme';
import { PlusCircle, ChevronRight, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [cases, setCases] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const uid = emailToUserId(user.primaryEmailAddress!.emailAddress);
    getUserCases(uid).then(c => { setCases(c); setLoading(false); }).catch(() => setLoading(false));
  }, [isLoaded, user]);

  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'there';
  const activeCases = cases.filter(c => !['won_full', 'won_partial', 'lost'].includes(c.outcome_status as string));

  return (
    <AppShell>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-serif text-[#06195e] text-2xl font-bold">Hello, {firstName}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {activeCases.length > 0 ? `${activeCases.length} active case${activeCases.length > 1 ? 's' : ''}` : 'Ready to fight a rejection?'}
        </p>
      </div>

      {/* CTA Card */}
      <Link href="/upload" className="block mb-6">
        <div className="bg-[#06195e] rounded-2xl p-5 text-white shadow-lg active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <PlusCircle size={24} className="text-white/80" />
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">Free in beta</span>
          </div>
          <h2 className="font-serif text-xl font-bold mb-1">Start a New Claim</h2>
          <p className="text-white/70 text-sm">Upload your rejection letter and get an IRDAI-backed appeal letter in 3 minutes.</p>
          <div className="flex items-center gap-1 mt-4 text-white/80 text-sm font-medium">
            Get started <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* How it works */}
      {cases.length === 0 && !loading && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-serif text-[#06195e] text-base font-bold mb-4">How ClaimBack works</h3>
          {[
            { n: '1', t: 'Upload your documents', d: 'Rejection letter + policy doc' },
            { n: '2', t: 'Enter your invite code', d: 'Free during beta. ₹999 flat fee after launch.' },
            { n: '3', t: 'Get your appeal letter', d: 'IRDAI-cited, ready to send in 3 minutes.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3 mb-4 last:mb-0">
              <div className="w-7 h-7 rounded-full bg-[#EFF4FF] text-[#06195e] text-xs font-bold flex items-center justify-center flex-shrink-0">
                {s.n}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{s.t}</p>
                <p className="text-gray-500 text-xs">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent cases */}
      {cases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700 text-sm">Recent Cases</h3>
            <Link href="/cases" className="text-[#2563EB] text-xs font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {cases.slice(0, 3).map(c => {
              const id = c.id as string;
              const stage = deriveCaseStage(c);
              const winScore = c.win_score as number | null;
              return (
                <Link key={id} href={stage === 'completed' ? `/results?case=${id}` : `/cases`}>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{((c.insurer as string) !== 'Pending' && (c.insurer as string)) || 'Draft case'}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {c.claim_amount ? `₹${Number(c.claim_amount).toLocaleString('en-IN')}` : '—'}
                        {' · '}
                        {new Date(c.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {winScore != null && (
                        <span className="text-sm font-bold" style={{ color: getScoreColor(winScore) }}>
                          {winScore}%
                        </span>
                      )}
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 flex items-start gap-2 text-gray-400">
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          ClaimBack provides document analysis and appeal letter drafting. This is not legal advice. Results depend on document quality and insurer response.
        </p>
      </div>
    </AppShell>
  );
}
