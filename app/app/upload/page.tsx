'use client';
import { useUser } from '@clerk/nextjs';
import { useCallback, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import { emailToUserId, createCase, uploadDocument, updateCase, DocumentType } from '@/lib/supabase';
import { INSURERS } from '@/lib/theme';
import { Upload, X, CheckCircle, ChevronRight, Loader } from 'lucide-react';

type DocSlot = {
  type: string; label: string; required: boolean;
  file: File | null; uploading: boolean; uploaded: boolean; docId: string | null;
};

function UploadPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const partnerCode = params.get('ref') || '';
  const caseIdRef = useRef<string | null>(null);

  const [step, setStep] = useState<'upload' | 'form'>('upload');
  const [docs, setDocs] = useState<DocSlot[]>([
    { type: 'rejection_letter', label: 'Rejection Letter', required: true,  file: null, uploading: false, uploaded: false, docId: null },
    { type: 'policy_document',  label: 'Policy Document',  required: false, file: null, uploading: false, uploaded: false, docId: null },
    { type: 'hospital_bill',    label: 'Hospital Bills',   required: false, file: null, uploading: false, uploaded: false, docId: null },
  ]);
  const [form, setForm] = useState({ insurer: '', amount: '', reason: '', claimDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  const ensureCase = async () => {
    if (caseIdRef.current) return caseIdRef.current;
    const uid = emailToUserId(user!.primaryEmailAddress!.emailAddress);
    const id = await createCase(uid, partnerCode || undefined);
    caseIdRef.current = id;
    return id;
  };

  const handleFileDrop = async (slotIndex: number, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setDocs(d => { const n = [...d]; n[slotIndex] = { ...n[slotIndex], file, uploading: true }; return n; });
    try {
      const caseId = await ensureCase();
      const uid = emailToUserId(user!.primaryEmailAddress!.emailAddress);
      const docId = await uploadDocument(caseId, uid, file, docs[slotIndex].type as DocumentType);
      setDocs(d => { const n = [...d]; n[slotIndex] = { ...n[slotIndex], file, uploading: false, uploaded: true, docId }; return n; });
      toast.success(`${docs[slotIndex].label} uploaded`);
    } catch (err: unknown) {
      setDocs(d => { const n = [...d]; n[slotIndex] = { ...n[slotIndex], file: null, uploading: false, uploaded: false }; return n; });
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async () => {
    if (!form.insurer || !form.amount || !form.reason) { toast.error('Fill all required fields'); return; }
    setSubmitting(true);
    try {
      const caseId = await ensureCase();
      await updateCase(caseId, {
        insurer_name: form.insurer,
        claim_amount: parseFloat(form.amount.replace(/,/g, '')),
        rejection_reason: form.reason,
        claim_date: form.claimDate || null,
        status: 'documents_uploaded',
      });
      router.push(`/payment?case=${caseId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {['Documents', 'Details', 'Payment'].map((s, i) => {
            const active = (step === 'upload' && i === 0) || (step === 'form' && i === 1);
            const done   = step === 'form' && i === 0;
            return (
              <div key={s} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-green-500 text-white' : active ? 'bg-[#06195e] text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`ml-1.5 text-xs font-medium ${active ? 'text-[#06195e]' : 'text-gray-400'}`}>{s}</span>
                {i < 2 && <div className="w-5 h-px bg-gray-200 mx-2" />}
              </div>
            );
          })}
        </div>

        {step === 'upload' && (
          <>
            <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-1">Upload Documents</h1>
            <p className="text-gray-500 text-sm mb-5">Start with your rejection letter. More docs = stronger analysis.</p>
            <div className="space-y-3 mb-5">
              {docs.map((slot, i) => <DocZone key={slot.type} slot={slot} index={i} onDrop={handleFileDrop} onRemove={(i) => setDocs(d => { const n=[...d]; n[i]={...n[i],file:null,uploaded:false,docId:null}; return n; })} />)}
            </div>
            {/* DPDP consent */}
            <label className="flex items-start gap-3 p-3.5 bg-[#EFF4FF] rounded-xl cursor-pointer mb-5">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-[#06195e] w-4 h-4 flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                I consent to ClaimBack processing my insurance documents to generate an appeal letter, as described in the{' '}
                <a href="/privacy" target="_blank" className="text-[#2563EB] underline font-medium">Privacy Policy</a>.
                Data is stored securely and not shared with third parties. <strong>(DPDP Act 2023)</strong>
              </span>
            </label>
            <button
              onClick={() => setStep('form')}
              disabled={!docs[0].uploaded || !consent}
              className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all text-sm"
            >
              Continue to Details <ChevronRight size={16} />
            </button>
            <p className="text-center text-gray-400 text-xs mt-3">Rejection letter required to continue</p>
          </>
        )}

        {step === 'form' && (
          <>
            <h1 className="font-serif text-[#06195e] text-2xl font-bold mb-1">Claim Details</h1>
            <p className="text-gray-500 text-sm mb-5">Tell us about your case.</p>
            <div className="space-y-4 mb-6">
              <Field label="Insurance Company" required>
                <select value={form.insurer} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))} className="input-base">
                  <option value="">Select insurer</option>
                  {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Claim Amount (₹)" required>
                <input type="text" inputMode="numeric" placeholder="e.g. 1,50,000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-base" />
              </Field>
              <Field label="Rejection Reason" required>
                <textarea placeholder="e.g. Pre-existing disease, waiting period not met…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="input-base resize-none" />
              </Field>
              <Field label="Date of Claim (optional)">
                <input type="date" value={form.claimDate} onChange={e => setForm(f => ({ ...f, claimDate: e.target.value }))} className="input-base" />
              </Field>
            </div>
            <button onClick={handleSubmit} disabled={submitting || !form.insurer || !form.amount || !form.reason}
              className="w-full bg-[#06195e] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all text-sm">
              {submitting ? <><Loader size={16} className="spinner" /> Saving…</> : <>Continue to Payment <ChevronRight size={16} /></>}
            </button>
            <button onClick={() => setStep('upload')} className="w-full text-center text-gray-400 text-sm py-3 mt-1">← Back to documents</button>
          </>
        )}
      </div>
      <style jsx global>{`.input-base{width:100%;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;font-size:14px;outline:none;background:white;font-family:'DM Sans',sans-serif}.input-base:focus{border-color:#06195e;box-shadow:0 0 0 3px rgba(6,25,94,0.08)}`}</style>
    </AppShell>
  );
}

export default function UploadPage() {
  return <Suspense><UploadPageInner /></Suspense>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function DocZone({ slot, index, onDrop, onRemove }: { slot: DocSlot; index: number; onDrop: (i: number, f: File) => void; onRemove: (i: number) => void }) {
  const cb = useCallback((files: File[]) => { if (files[0]) onDrop(index, files[0]); }, [index, onDrop]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: cb, accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }, maxFiles: 1, disabled: slot.uploaded || slot.uploading });

  if (slot.uploaded && slot.file) return (
    <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{slot.label}</p><p className="text-xs text-gray-500 truncate">{slot.file.name}</p></div>
      <button onClick={() => onRemove(index)} className="p-1 rounded-full hover:bg-green-100"><X size={14} className="text-gray-400" /></button>
    </div>
  );

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${isDragActive ? 'border-[#06195e] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      <input {...getInputProps()} />
      <div className="flex items-center gap-3">
        {slot.uploading ? <Loader size={20} className="text-[#06195e] spinner flex-shrink-0" /> : <Upload size={20} className="text-gray-400 flex-shrink-0" />}
        <div>
          <p className="text-sm font-medium text-gray-700">{slot.label}{slot.required && <span className="text-red-500 text-xs ml-1">*</span>}</p>
          <p className="text-xs text-gray-400">{slot.uploading ? 'Uploading…' : isDragActive ? 'Drop here' : 'PDF, JPG, PNG · Max 10MB'}</p>
        </div>
      </div>
    </div>
  );
}
