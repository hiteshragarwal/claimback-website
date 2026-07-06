'use client';
import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { emailToUserId, getPartnerByUserId, getPartnerEarnings, getPartnerReferrals } from '@/lib/supabase';
import { Copy, Share2, TrendingUp, Users, DollarSign, Loader, QrCode } from 'lucide-react';

export default function PartnerDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [partner, setPartner] = useState<Record<string, unknown> | null>(null);
  const [earnings, setEarnings] = useState<Record<string, unknown> | null>(null);
  const [referrals, setReferrals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'earnings'>('overview');

  const refLink = partner ? `https://claimback.co.in/?ref=${partner.partner_code}` : '';

  useEffect(() => {
    if (!user) return;
    const uid = emailToUserId(user.primaryEmailAddress!.emailAddress);

    Promise.all([
      getPartnerByUserId(uid),
      getPartnerEarnings(uid),
      getPartnerReferrals(uid),
    ]).then(([p, e, r]) => {
      if (!p) { router.push('/partner/register'); return; }
      setPartner(p);
      setEarnings(e);
      setReferrals(r || []);
      setLoading(false);
      // Generate QR code
      generateQR(`https://claimback.co.in/?ref=${p.partner_code}`);
    }).catch(() => { toast.error('Failed to load dashboard'); setLoading(false); });
  }, [user, router]);

  const generateQR = async (url: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: '#06195e', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
    } catch { /* QR optional */ }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => toast.success('Link copied!'));
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Hi! Get your rejected insurance claim reviewed by AI. Use my referral link: ${refLink}\n\nClaimBack helps you appeal and recover your claim.`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) return (
    <AppShell variant="partner">
      <div className="flex items-center justify-center py-20">
        <Loader size={28} className="spinner text-[#06195e]" />
      </div>
    </AppShell>
  );

  const totalEarned = (earnings?.total_earned as number) || 0;
  const pendingPayout = (earnings?.pending_payout as number) || 0;
  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter(r => r.status === 'paid').length;

  // Slab bonus progress
  const SLABS = [
    { min: 0, max: 4, bonus: 0, label: '0–4 referrals' },
    { min: 5, max: 9, bonus: 2000, label: '5–9 referrals: +₹2,000 bonus' },
    { min: 10, max: 19, bonus: 5000, label: '10–19 referrals: +₹5,000 bonus' },
    { min: 20, max: Infinity, bonus: 15000, label: '20+ referrals: +₹15,000 bonus' },
  ];
  const nextSlab = SLABS.find(s => s.min > convertedReferrals);

  return (
    <AppShell variant="partner">
      <div className="max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif text-[#06195e] text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Code: <span className="font-mono font-bold text-[#06195e]">{partner?.partner_code as string}</span></p>
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          {(['overview', 'referrals', 'earnings'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${activeTab === t ? 'bg-white shadow-sm text-[#06195e]' : 'text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Users} label="Referrals" value={String(totalReferrals)} sub={`${convertedReferrals} paid`} />
              <StatCard icon={DollarSign} label="Earned" value={`₹${totalEarned.toLocaleString('en-IN')}`} sub="total" />
              <StatCard icon={TrendingUp} label="Pending" value={`₹${pendingPayout.toLocaleString('en-IN')}`} sub="next payout" />
            </div>

            {/* Slab progress */}
            {nextSlab && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bonus Progress</p>
                <p className="text-sm font-medium text-gray-800 mb-2">{nextSlab.label}</p>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
                  <div className="bg-[#06195e] h-2 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((convertedReferrals / nextSlab.min) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400">{convertedReferrals} / {nextSlab.min} referrals for +₹{nextSlab.bonus.toLocaleString('en-IN')} bonus</p>
              </div>
            )}

            {/* Referral link */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your referral link</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-[#06195e] font-mono flex-1 truncate">{refLink}</p>
                <button onClick={copyLink} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 text-gray-500">
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-1.5 bg-[#EFF4FF] text-[#06195e] font-medium py-2.5 rounded-xl text-sm">
                  <Copy size={14} /> Copy Link
                </button>
                <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white font-medium py-2.5 rounded-xl text-sm">
                  <Share2 size={14} /> WhatsApp
                </button>
              </div>
            </div>

            {/* QR code */}
            {qrDataUrl && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3 self-start">
                  <QrCode size={16} className="text-[#06195e]" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">QR Code</p>
                </div>
                <Image src={qrDataUrl} alt="Referral QR" width={144} height={144} className="rounded-xl" unoptimized />
                <p className="text-xs text-gray-400 mt-2 text-center">Show or print this for clients to scan</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-3">
            {referrals.length === 0 && (
              <div className="text-center py-12">
                <Users size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="font-medium text-gray-500">No referrals yet</p>
                <p className="text-sm text-gray-400 mt-1">Share your link to start earning</p>
              </div>
            )}
            {referrals.map((r, i) => {
              const rStatus = r.status as string;
              const rEmail = r.referred_email as string | undefined;
              const rCreatedAt = r.created_at as string;
              const rCommission = r.commission_amount as number | undefined;
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{rEmail || 'Anonymous'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(rCreatedAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      rStatus === 'paid' ? 'bg-green-100 text-green-700' :
                      rStatus === 'analysed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{rStatus}</span>
                    {rCommission && (
                      <p className="text-xs font-bold text-[#06195e] mt-1">+₹{rCommission}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Earnings Breakdown</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Referral commissions</span><span className="font-medium">₹{((earnings?.referral_commission as number) || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Monthly bonuses</span><span className="font-medium">₹{((earnings?.bonus_earned as number) || 0).toLocaleString('en-IN')}</span></div>
                <div className="border-t pt-2 flex justify-between font-semibold"><span>Total earned</span><span className="text-[#06195e]">₹{totalEarned.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-amber-700 font-medium"><span>Pending payout</span><span>₹{pendingPayout.toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            <div className="bg-[#EFF4FF] rounded-2xl p-4 text-sm text-[#06195e]">
              <p className="font-semibold mb-1">Payout info</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Payouts processed on 1st of each month</li>
                <li>• Minimum balance ₹500 required</li>
                <li>• Sent to UPI: {(partner?.upi_id as string) || 'Not set'}</li>
                <li>• TDS deducted above ₹30,000 per year</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commission Slabs</p>
              <div className="space-y-2">
                {[
                  { range: '1–4 referrals', rate: '₹300 each' },
                  { range: '5–9 referrals', rate: '₹400 each + ₹2,000 bonus' },
                  { range: '10–19 referrals', rate: '₹500 each + ₹5,000 bonus' },
                  { range: '20+ referrals', rate: '₹600 each + ₹15,000 bonus' },
                ].map(s => (
                  <div key={s.range} className="flex justify-between text-xs">
                    <span className="text-gray-600">{s.range}</span>
                    <span className="font-medium text-[#06195e]">{s.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
      <Icon size={16} className="text-[#06195e] mx-auto mb-1" />
      <p className="font-bold text-[#06195e] text-sm">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs text-gray-300">{sub}</p>
    </div>
  );
}
