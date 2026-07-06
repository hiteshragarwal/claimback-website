-- ============================================================
-- ClaimBack Partner Portal DB Migration
-- Run this in Supabase SQL editor (project: pnalqaajxfzvwjfugkur)
-- ============================================================

-- 1. Partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  upi_id          TEXT NOT NULL,
  irda_licence    TEXT,
  org_name        TEXT,
  role            TEXT NOT NULL CHECK (role IN ('insurance_agent','financial_advisor','hospital_liaison','hr_benefits','individual','other')),
  partner_code    TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partners_partner_code_idx ON public.partners(partner_code);
CREATE INDEX IF NOT EXISTS partners_user_id_idx ON public.partners(user_id);

-- 2. Referral events
CREATE TABLE IF NOT EXISTS public.referral_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_code        TEXT NOT NULL,
  referred_user_id    UUID,
  referred_email      TEXT,
  case_id             UUID,
  event_type          TEXT NOT NULL CHECK (event_type IN ('signup','payment','analysis_complete')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','analysed','paid','cancelled')),
  commission_amount   NUMERIC(10,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_events_partner_id_idx ON public.referral_events(partner_id);
CREATE INDEX IF NOT EXISTS referral_events_case_id_idx ON public.referral_events(case_id);

-- 3. Partner earnings summary
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  total_referrals     INTEGER NOT NULL DEFAULT 0,
  converted_referrals INTEGER NOT NULL DEFAULT 0,
  referral_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_earned        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_earned        NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_payout      NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Payout records
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  upi_id          TEXT NOT NULL,
  utr_number      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  payout_month    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

-- 5. Deletion requests (DPDP Act 2023)
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_own" ON public.partners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "partners_insert_own" ON public.partners
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "partners_update_own" ON public.partners
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "referral_events_select_own" ON public.referral_events
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_earnings_select_own" ON public.partner_earnings
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_payouts_select_own" ON public.partner_payouts
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "deletion_requests_insert_own" ON public.deletion_requests
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Add payment columns to cases table (if not present)
-- ============================================================
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS payment_status    TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_id        TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS ref_code          TEXT;

-- ============================================================
-- Trigger: auto-create partner_earnings on partner insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_partner_earnings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.partner_earnings (partner_id)
  VALUES (NEW.id)
  ON CONFLICT (partner_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_partner_created ON public.partners;
CREATE TRIGGER on_partner_created
  AFTER INSERT ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.create_partner_earnings();
