'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppUser as useUser } from '@/lib/appUser';
import toast from 'react-hot-toast';
import { ChevronRight, Loader, Users, TrendingUp, DollarSign } from 'lucide-react';

const PARTNER_ROLES = [
  { value: 'insurance_agent', label: 'Insurance Agent', sub: 'IRDAI registered agent' },
  { value: 'financial_advisor', label: 'Financial Advisor', sub: 'CFP / financial planner' },
  { value: 'hospital_liaison', label: 'Hospital Liaison', sub: 'Hospital / clinic staff' },
  { value: 'hr_benefits', label: 'HR / Benefits Manager', sub: 'Corporate benefits team' },
  { value: 'individual', label: 'Individual Referrer', sub: 'Freelance / personal network' },
  { value: 'other', label: 'Other', sub: 'Tell us your role' },
];

export default function PartnerRegisterPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<'role' | 'details' | 'done'>('role');
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', upi_id: '', irda_licence: '', org_name: '' });
  const [loading, setLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');

  const handleRoleSelect = (r: string) => { setRole(r); setStep('details'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit Indian mobile number'); return; }
    if (!form.upi_id.trim()) { toast.error('UPI ID is required for payouts'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          role,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setPartnerCode(data.partner_code);
      setStep('done');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader size={28} className="spinner text-[#06195e]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple top bar */}
      <div className="bg-[#06195e] px-5 py-4">
        <p className="font-serif text-white text-xl font-bold">ClaimBack Partners</p>
        <p className="text-blue-200 text-xs mt-0.5">Earn by helping people recover insurance claims</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Benefits strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: DollarSign, label: '₹300–₹600', sub: 'per referral' },
            { icon: TrendingUp, label: 'Monthly bonuses', sub: 'slab-based' },
            { icon: Users, label: 'No cap', sub: 'on referrals' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
              <Icon size={18} className="text-[#06195e] mx-auto mb-1" />
              <p className="text-xs font-bold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {step === 'role' && (
          <div>
            <h2 className="font-serif text-[#06195e] text-xl font-bold mb-1">I am a…</h2>
            <p className="text-gray-500 text-sm mb-4">Choose your profile to get started</p>
            <div className="space-y-2">
              {PARTNER_ROLES.map(r => (
                <button key={r.value} onClick={() => handleRoleSelect(r.value)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md active:scale-[0.99] transition-all">
                  <div className="text-left">
                    <p className="font-medium text-gray-800 text-sm">{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
            {user && (
              <button onClick={() => router.push('/partner/dashboard')} className="w-full text-center text-[#06195e] text-sm mt-4">
                Already registered? Go to dashboard →
              </button>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="font-serif text-[#06195e] text-xl font-bold mb-1">Your details</h2>
              <p className="text-gray-500 text-sm mb-4">
                Role: <span className="font-medium text-[#06195e]">{PARTNER_ROLES.find(r => r.value === role)?.label}</span>
                <button type="button" onClick={() => setStep('role')} className="ml-2 text-gray-400 underline text-xs">change</button>
              </p>
            </div>

            {[
              { key: 'name', label: 'Full Name', placeholder: 'As per PAN card', type: 'text', required: true },
              { key: 'phone', label: 'Mobile Number', placeholder: '10-digit Indian number', type: 'tel', required: true },
              { key: 'org_name', label: 'Organisation / Agency (optional)', placeholder: 'Your firm or agency name', type: 'text', required: false },
              { key: 'upi_id', label: 'UPI ID for payouts', placeholder: 'yourname@upi', type: 'text', required: true },
            ].map(({ key, label, placeholder, type, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</label>
                <input
                  type={type}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={required}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06195e] focus:ring-1 focus:ring-[#06195e]"
                />
              </div>
            ))}

            {(role === 'insurance_agent') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">IRDAI Licence Number</label>
                <input
                  type="text"
                  value={form.irda_licence}
                  onChange={e => setForm(f => ({ ...f, irda_licence: e.target.value }))}
                  placeholder="Your IRDAI agent licence number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#06195e] focus:ring-1 focus:ring-[#06195e]"
                />
              </div>
            )}

            {/* User must sign in to complete registration */}
            {!user && (
              <div className="bg-[#EFF4FF] rounded-xl p-4 text-sm text-[#06195e]">
                <p className="font-medium mb-1">Create your account to continue</p>
                <p className="text-xs text-gray-500">You&apos;ll be asked to sign in or sign up after submitting.</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
              By registering, you agree to our <a href="/partner-terms" className="underline">Partner Terms</a>. Payouts are processed monthly via UPI. Minimum payout ₹500.
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm">
              {loading ? <><Loader size={16} className="spinner" /> Registering…</> : <>Register as Partner <ChevronRight size={16} /></>}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center py-4 space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-4xl">🎉</span>
            </div>
            <div>
              <h2 className="font-serif text-[#06195e] text-2xl font-bold">You&apos;re in!</h2>
              <p className="text-gray-500 text-sm mt-1">Your partner account is ready.</p>
            </div>
            <div className="bg-[#06195e] rounded-2xl p-5 text-white">
              <p className="text-xs text-blue-200 uppercase tracking-wide mb-1">Your referral code</p>
              <p className="font-mono font-bold text-3xl tracking-widest">{partnerCode}</p>
              <p className="text-xs text-blue-200 mt-2">Share link: claimback.co.in/?ref={partnerCode}</p>
            </div>
            <button onClick={() => router.push('/partner/dashboard')}
              className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl text-sm flex items-center justify-center gap-2">
              Go to Dashboard <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
