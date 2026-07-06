'use client';
import { useUser, useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { User, LogOut, Trash2, Shield, ChevronRight, Mail, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleSignOut = () => {
    signOut(() => router.push('/'));
  };

  const handleDeleteAccount = async () => {
    if (deleteInput.trim().toLowerCase() !== 'delete') {
      toast.error('Type "delete" to confirm');
      return;
    }
    try {
      // Request data deletion — email support team (DPDP right to erasure)
      await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.primaryEmailAddress?.emailAddress }),
      });
      toast.success('Deletion request submitted. We will process within 30 days as per DPDP Act.');
      signOut(() => router.push('/'));
    } catch {
      toast.error('Request failed. Email support@claimback.co.in directly.');
    }
  };

  return (
    <AppShell variant="retail">
      <div className="max-w-lg mx-auto space-y-4 pb-8">
        <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-5">Settings</h1>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Profile</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EFF4FF] flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-[#06195e]" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-800">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` :
                 user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Mail size={13} />
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 pt-4 pb-2">Privacy & Data</p>
          <a href="/privacy" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#06195e]" />
              <span className="text-sm text-gray-700">Privacy Policy</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#06195e]" />
              <span className="text-sm text-gray-700">Terms of Service</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </a>
        </div>

        {/* DPDP info */}
        <div className="bg-[#EFF4FF] rounded-2xl p-4 text-sm text-[#06195e] leading-relaxed">
          <p className="font-semibold mb-1">Your data rights (DPDP Act 2023)</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• We store only documents you upload and analysis results</li>
            <li>• Your data is never shared with third parties</li>
            <li>• You can request full deletion at any time</li>
            <li>• Deletion requests processed within 30 days</li>
          </ul>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm">
          <LogOut size={16} className="text-gray-500" />
          Sign Out
        </button>

        {/* Delete account */}
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-red-500 text-sm font-medium py-3 flex items-center justify-center gap-1.5">
            <Trash2 size={14} />
            Request account deletion
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <p className="font-semibold text-red-800 text-sm">Delete your account?</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              All your cases, documents, and analysis results will be permanently deleted within 30 days as per DPDP Act 2023. This action cannot be undone.
            </p>
            <input
              type="text"
              placeholder='Type "delete" to confirm'
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="flex-1 bg-white border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-xl text-sm">
                Delete Account
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-2">
          Questions? <a href="mailto:support@claimback.co.in" className="text-[#06195e]">support@claimback.co.in</a>
        </p>
      </div>
    </AppShell>
  );
}
