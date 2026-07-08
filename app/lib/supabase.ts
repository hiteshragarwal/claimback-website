import { createClient } from '@supabase/supabase-js';

// Lazy getters — evaluated at call time (not module load), so Next.js static
// analysis during build doesn't crash when env vars are absent.
export const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

// Server-only client (service role — bypasses RLS, only used in API routes)
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

// ── IDENTITY ─────────────────────────────────────────────────────────────────
// Same deterministic UUID-v5 logic as the mobile app.
// Keeps user identity consistent across web and app.
import { v5 as uuidv5 } from 'uuid';
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
export function emailToUserId(email: string): string {
  return uuidv5(email.toLowerCase().trim(), NAMESPACE);
}

// Idempotent users upsert (mirrors iOS syncUserRecord). Never throws —
// must not be able to block login. The row must exist before cases insert
// (cases.user_id FK).
export async function syncUserRecord(uid: string, email: string): Promise<boolean> {
  try {
    const { error } = await supabase()
      .from('users')
      .upsert({ id: uid, email }, { onConflict: 'id' });
    if (error) { console.warn('[users.upsert] non-fatal:', error.message); return false; }
    return true;
  } catch (e) {
    console.warn('[users.upsert] non-fatal:', e);
    return false;
  }
}

// ── DOCUMENT TYPES ────────────────────────────────────────────────────────────
export type DocumentType =
  | 'policy_document' | 'rejection_letter' | 'hospital_bill'
  | 'discharge_summary' | 'tpa_correspondence' | 'investigation_report'
  | 'outcome_document' | 'additional_document';

// ── CASE STAGE ────────────────────────────────────────────────────────────────
// The DB tracks payment_status / pre_scan_status / analysis_status separately
// (see cases table). Pages need a single funnel stage to route on.
export type CaseStage =
  | 'draft' | 'pending_payment' | 'pre_scan' | 'analysing' | 'completed' | 'failed';

export function deriveCaseStage(c: Record<string, unknown>): CaseStage {
  if (c.analysis_status === 'completed') return 'completed';
  if (c.analysis_status === 'failed') return 'failed';
  if (c.analysis_status === 'processing') return 'analysing';
  if (c.payment_status === 'paid') {
    if (c.pre_scan_status === 'confirmed') return 'analysing';
    return 'pre_scan';
  }
  return c.claim_amount ? 'pending_payment' : 'draft';
}

// ── CASES ────────────────────────────────────────────────────────────────────
export async function createCase(userId: string, partnerCode?: string) {
  // Insurer defaults to 'Pending' — the analysis extracts it from documents
  // (same as the mobile app). The upload form may overwrite it via updateCase.
  const { data, error } = await supabase().from('cases').insert({
    user_id: userId,
    insurer: 'Pending',
    insurance_type: 'individual',
    payment_status: 'pending',
    partner_code: partnerCode || null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateCase(caseId: string, updates: Record<string, unknown>) {
  const { error } = await supabase().from('cases').update(updates).eq('id', caseId);
  if (error) throw new Error(error.message);
}

export async function getCaseById(caseId: string) {
  const { data, error } = await supabase().from('cases').select('*').eq('id', caseId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserCases(userId: string) {
  const { data, error } = await supabase()
    .from('cases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── PAYMENT (beta: promo code only, no gateway) ──────────────────────────────
// Atomic check-and-decrement via RPC — same mechanism as the mobile app.
// Prevents two users redeeming the last use of a code simultaneously.
export async function applyPromoCode(code: string): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase().rpc('use_promo_code', { p_code: code.trim().toUpperCase() });
  if (error) return { ok: false, reason: 'error' };
  if (!data?.ok) return { ok: false, reason: data?.reason || 'not_found' };
  return { ok: true };
}

export async function markCasePaid(caseId: string, promoCode: string) {
  const { error } = await supabase().from('cases').update({
    payment_status: 'paid',
    amount_paid: 0,
    promo_code: promoCode.trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  }).eq('id', caseId);
  if (error) throw new Error(error.message);
}

// ── DOCUMENTS ────────────────────────────────────────────────────────────────
export async function uploadDocument(
  caseId: string,
  userId: string,
  file: File,
  documentType: DocumentType,
  bucket: 'claim-documents' | 'outcome-documents' = 'claim-documents'
) {
  if (!file || file.size === 0) throw new Error('File is empty');
  const ext = file.name.split('.').pop() || 'pdf';
  const storagePath = `${userId}/${caseId}/${Date.now()}_${documentType}.${ext}`;

  const { error: uploadError } = await supabase().storage
    .from(bucket).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: dbError } = await supabase().from('documents').insert({
    case_id: caseId, user_id: userId, document_type: documentType,
    file_name: file.name, file_size: file.size, mime_type: file.type, storage_path: storagePath,
  }).select('id').single();
  if (dbError) throw new Error(`DB error: ${dbError.message}`);
  return data.id as string;
}

export async function getCaseDocuments(caseId: string) {
  const { data, error } = await supabase().from('documents')
    .select('*').eq('case_id', caseId);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteDocument(docId: string, storagePath: string, bucket = 'claim-documents') {
  await supabase().storage.from(bucket).remove([storagePath]);
  await supabase().from('documents').delete().eq('id', docId);
}

// ── PRE-SCAN ─────────────────────────────────────────────────────────────────
export async function triggerPreScan(caseId: string) {
  const { data, error } = await supabase().functions.invoke('pre-scan-docs', {
    body: { case_id: caseId },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPreScanResult(caseId: string) {
  const { data, error } = await supabase().from('cases')
    .select('pre_scan_status, pre_scan_json').eq('id', caseId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function confirmPreScan(caseId: string) {
  const { error } = await supabase().from('cases').update({
    pre_scan_status: 'confirmed',
    user_confirmed_at: new Date().toISOString(),
  }).eq('id', caseId);
  if (error) throw new Error(error.message);
}

// ── ANALYSIS ─────────────────────────────────────────────────────────────────
export async function triggerAnalysis(caseId: string) {
  const { data, error } = await supabase().functions.invoke('analyse-claim', {
    body: { case_id: caseId },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function pollAnalysisResult(caseId: string) {
  const { data, error } = await supabase().from('cases')
    .select('analysis_status, analysis_json, win_score, appeal_letter').eq('id', caseId).single();
  if (error) throw new Error(error.message);
  return data;
}

// ── OUTCOME ──────────────────────────────────────────────────────────────────
export async function submitOutcome(
  caseId: string, userId: string,
  outcomeStatus: string, file: File
) {
  const storagePath = `${userId}/${caseId}/outcome_${Date.now()}.${file.name.split('.').pop()}`;
  const { error: upErr } = await supabase().storage
    .from('outcome-documents').upload(storagePath, file, { contentType: file.type });
  if (upErr) throw new Error(upErr.message);

  await supabase().from('documents').insert({
    case_id: caseId, user_id: userId, document_type: 'outcome_document',
    file_name: file.name, file_size: file.size, mime_type: file.type, storage_path: storagePath,
  });

  const { error } = await supabase().from('cases').update({
    outcome_status: outcomeStatus,
    outcome_updated_at: new Date().toISOString(),
    cashback_status: 'doc_submitted',
  }).eq('id', caseId);
  if (error) throw new Error(error.message);
}

// ── PARTNERS ─────────────────────────────────────────────────────────────────
export async function validatePartnerCode(code: string) {
  const { data, error } = await supabase().from('partners')
    .select('id, partner_code, status').eq('partner_code', code).eq('status', 'active').single();
  if (error || !data) return null;
  return data;
}

export async function getPartnerByUserId(userId: string) {
  const { data, error } = await supabase().from('partners')
    .select('*').eq('user_id', userId).single();
  if (error) return null;
  return data;
}

export async function getPartnerEarnings(userId: string) {
  const { data: partner } = await supabase().from('partners').select('id').eq('user_id', userId).single();
  if (!partner) return null;
  const { data, error } = await supabase().from('partner_earnings')
    .select('*').eq('partner_id', partner.id).single();
  if (error) return null;
  return data;
}

export async function getPartnerReferrals(userId: string) {
  const { data: partner } = await supabase().from('partners').select('id').eq('user_id', userId).single();
  if (!partner) return [];
  const { data, error } = await supabase().from('referral_events')
    .select('*').eq('partner_id', partner.id).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}
