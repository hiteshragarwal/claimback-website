import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect('/home');

  return (
    <main className="min-h-screen bg-[#06195e] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="font-serif text-white text-xl font-bold">ClaimBack</span>
        <Link href="/sign-in" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          IRDAI-backed analysis • 3-minute results
        </div>
        <h1 className="font-serif text-white text-4xl md:text-5xl font-bold leading-tight max-w-xl mb-4">
          Fight your health insurance rejection
        </h1>
        <p className="text-white/70 text-lg max-w-md mb-8">
          AI reads your rejection letter, checks IRDAI law, and drafts your appeal. Flat fee of ₹1,999.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/sign-up"
            className="flex-1 bg-white text-[#06195e] font-semibold py-3.5 px-6 rounded-xl text-center hover:bg-gray-50 transition-colors"
          >
            Start My Appeal →
          </Link>
          <Link
            href="/partner/register"
            className="flex-1 border border-white/30 text-white font-medium py-3.5 px-6 rounded-xl text-center hover:bg-white/10 transition-colors"
          >
            Become a Partner
          </Link>
        </div>
        <p className="text-white/40 text-xs mt-6">
          ₹1,999 flat fee • Not legal advice • DPDP Act 2023 compliant
        </p>
      </div>

      {/* Stats strip */}
      <div className="border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
        {[
          { val: '₹26,037 Cr', label: 'Rejected yearly' },
          { val: '58%',        label: 'Win at Ombudsman' },
          { val: '3 min',      label: 'Appeal generated' },
        ].map((s) => (
          <div key={s.val} className="flex flex-col items-center py-5 px-4">
            <span className="text-white font-bold text-lg md:text-2xl">{s.val}</span>
            <span className="text-white/50 text-xs mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
