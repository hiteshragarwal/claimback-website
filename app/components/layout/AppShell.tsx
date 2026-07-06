'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { Home, FileText, PlusCircle, Settings, LogOut, Users, BarChart3 } from 'lucide-react';

interface NavItem { href: string; label: string; icon: React.ReactNode; }

const retailNav: NavItem[] = [
  { href: '/home',   label: 'Home',     icon: <Home size={20} /> },
  { href: '/cases',  label: 'My Cases', icon: <FileText size={20} /> },
  { href: '/upload', label: 'New Case', icon: <PlusCircle size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const partnerNav: NavItem[] = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: <BarChart3 size={20} /> },
  { href: '/partner/referrals', label: 'Referrals',  icon: <Users size={20} /> },
  { href: '/partner/earnings',  label: 'Earnings',   icon: <FileText size={20} /> },
  { href: '/partner/settings',  label: 'Settings',   icon: <Settings size={20} /> },
];

export default function AppShell({
  children,
  variant = 'retail',
}: {
  children: React.ReactNode;
  variant?: 'retail' | 'partner';
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const nav = variant === 'partner' ? partnerNav : retailNav;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
      {/* ── DESKTOP TOP BAR ── */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#06195e] shadow-md sticky top-0 z-40">
        <Link href="/home" className="flex items-center gap-2">
          <span className="font-serif text-white text-xl font-bold tracking-tight">ClaimBack</span>
        </Link>
        {/* Desktop nav */}
        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#06195e] sticky top-0 z-40">
        <span className="font-serif text-white text-lg font-bold">ClaimBack</span>
        <span className="text-white/60 text-xs">{user?.primaryEmailAddress?.emailAddress}</span>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-2xl mx-auto md:max-w-4xl px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV (app-style) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px] ${
                isActive(item.href)
                  ? 'text-[#06195e]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`transition-transform ${isActive(item.href) ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive(item.href) && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#06195e]" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
