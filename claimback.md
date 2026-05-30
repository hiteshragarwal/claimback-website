# ClaimBack — Founder's Context & Decisions

**Project**: AI-powered health insurance claim appeal service for India (B2C + B2B)  
**Founder**: Hitesh Agarwal  
**Last Updated**: May 30, 2026

---

## 1. Core Premise

- **Problem**: Health insurance claim rejections in India hit ₹26,037 Cr/year. Most claimants give up. Average appeal service costs ₹5,502 (₹999 + 15% of claim).
- **Solution**: AI tool (Claude Vision + Anthropic API) that reads rejection letters, cross-references IRDAI Health Insurance Regulations 2016, finds gaps in rejections, drafts appeal letters, and gives win probability estimates + recovery ranges.
- **Market**: India only. Health claim appeals. Individual (B2C) + HR teams managing group health (B2B).

---

## 2. Tech Stack

- **Frontend**: React Native + Expo 56 (claimback2/ folder, active repo)
- **Backend**: Supabase (PostgreSQL, file storage, Edge Functions)
- **AI**: Anthropic Claude Vision API (document analysis)
- **Auth**: Clerk (email OTP)
- **State**: Zustand
- **Website**: HTML/CSS (Netlify host, pointing to claimback.co.in via GoDaddy DNS)
- **Payments**: Razorpay (mocked until entity formation)
- **Email**: Titan Mail (support@claimback.co.in via GoDaddy)

---

## 3. Product — Consumer Pricing (Final)

**₹499 Starter** (Level 1–2 only)
- Full AI analysis, win score, estimated recovery, Grievance Officer appeal + IRDAI email
- Amber callout: "Upgrade to Full Package anytime: pay ₹799 more (total ₹1,298). Fresh analysis runs in full."

**₹999 Full Package** (All 4 levels, marked RECOMMENDED)
- All of Starter + Ombudsman complaint + Consumer Court docket
- 5.5× cheaper than traditional (₹5,502 average)

**Key Messaging**:
- "Each analysis reads your documents end-to-end using AI — there's no cached 'partial result.' Adding new documents means running the full process from scratch. That costs real compute, and we pass it on honestly."
- All prices are **final, non-refundable once analysis is generated**.
- Beta: completely free on TestFlight.

---

## 4. Product — Corporate (B2B) (Final)

**Structure**: No public pricing shown. Business case cards for 3 HR size bands:
- **Small teams** (50–250): "Your HR person is drowning... 3 minutes per case"
- **Mid-market** (250–1K): "Rejected claims bleeding your budget... ClaimBack scales advocacy"
- **Enterprises** (1K+): "At scale, cost you millions... standardised, auditable process"

**CTA**: "Discuss your plan →" (email to support@claimback.co.in)  
**Bottom CTA**: "Custom pricing based on your company's needs" → "Get Pricing →"

**Why no pricing**: Allows flexibility in per-case + annual fee mix. Hitesh's decision to keep B2B pricing closed until direct conversations with HR buyers.

---

## 5. Legal & Compliance (Website)

**Disclaimers** (4 blocks):
1. **AI Disclaimer**: Estimates not guaranteed, not legal opinion
2. **Not Legal Advice**: ClaimBack is a drafting tool, not law firm, not IRDAI regulated
3. **Limitation of Liability**: Capped to fee paid (max ₹999)
4. **DPDP Act 2023**: Data stored encrypted in Mumbai, Anthropic API disclosed, 12-month retention, user rights explained

**IRDAI Language** (critical):
- ✓ "AI analysis benchmarked against IRDAI regulations"
- ✓ "Built using IRDAI regulations as reference"
- ✗ NOT "Regulated under IRDAI framework" (incorrect — ClaimBack is not regulated by IRDAI)
- ✗ NOT "driven by IRDAI analysis" (misleading — sounds like IRDAI provides the tool)

**T&C + Privacy** (already drafted):
- terms.html (500 words, Section 8: Limitation of Liability capped at ₹999)
- privacy.html (Anthropic API disclosed, DPDP Act compliant, 12-month retention)

---

## 6. Incentive Plan (Vouchers — Not Cashback)

**Why vouchers, not cashback?**
- Cashback triggers RBI/pre-entity regulatory complexity
- Vouchers avoid regulatory friction pre-incorporation
- Verifiable via Amazon/Flipkart codes (can be AI-checked for fraud)

**Structure**:
- **₹200 voucher**: Update outcome (any result) + upload supporting doc (even losses count)
- **₹300 voucher**: Upload settlement/approval letter (proof of win)
- **Delivery**: Amazon/Flipkart gift card codes, emailed within 48–72 hrs
- **Verification**: AI validates upload, auto-triggered
- **Purpose**: Close feedback loop + social proof for conversions

**Messaging**: "Close the Loop — Earn a Voucher" (prominent banner on website + FAQ entry)

---

## 7. Website — Current Structure (May 30, 2026)

**index.html** (claimback.co.in landing):
- Hero: 3-minute appeal, IRDAI-benchmarked analysis
- Why ClaimBack: 4 cards (3min vs 2wks, gaps not guesses, know before fight, DPDP protected)
- Funnel: 4-column stat grid (₹1.10L Cr → 82% approved → 12.9% rejected → ~58% appeal win rate)
- Top 5 rejection reasons: tags (31% pre-ex, 24% exclusion, 18% incomplete, 15% non-disclosure, 12% waiting period)
- Cost compare: ₹5,502 traditional vs ₹999 ClaimBack
- How it works: 4 steps (upload → AI reads IRDAI → estimate + appeal → send)
- Sample output: 74 win score, ₹1.8L–₹2.4L est. recovery, confidence nudge
- Pricing: ₹499 Starter, ₹999 Full (RECOMMENDED badge)
- **Corporate**: 3 business-case cards (no prices) + "Get Pricing" CTA
- Comparison table: ClaimBack vs Insurance Samadhan vs DIY
- **Incentive banner**: "Tell us what happened. Earn ₹200–₹300 vouchers." (gold background, 2 cards, 5-step flow)
- Beta CTA: TestFlight link
- FAQ: 7 entries + 4 disclaimers
- Footer: "Made in India · Built using IRDAI regulations as reference"

**terms.html, privacy.html**: Already drafted, linked in footer.

---

## 8. App (claimback2/) — Current State

**Completed**:
- Expo 56 project scaffold
- Clerk auth (email OTP)
- Zustand state management
- Navigation structure (Expo Router)

**Missing (Critical for MVP)**:
- Document upload screens (Expo Image Picker + Document Picker)
- **4 Supabase Edge Functions** ported from claimback/ folder:
  - `analyse-claim`: Claude Vision + IRDAI analysis, returns win score + recovery range
  - `verify-document`: Document authenticity check (for voucher verification)
  - `trigger-cashback`: Issue voucher codes (currently mocked, will call Amazon/Flipkart API)
  - `create-razorpay-order`: Initialize payment (mocked until entity forms)
- Statistics funnel screen (funnel visualization mirroring website)
- Confidence levels (Low/Medium/High/Very High based on doc count)
- Re-run cost explanation UI
- T&C acceptance screen before claim submission (legal protection)
- Animations + polish

---

## 9. Deployment & Hosting Plan

### Website (claimback.co.in)

**Current**: HTML/CSS served locally (launch.json: `npx serve -p 3000 website/`)

**To Host on Netlify**:
1. Create GitHub repo: `github.com/hitesh-agarwal/claimback-website` (or add `/website` folder to main repo)
2. Push `/website` folder (index.html, terms.html, privacy.html) to GitHub
3. Netlify setup:
   - Connect GitHub repo
   - Build command: (none needed — static HTML)
   - Publish directory: `website/` (or `.` if only website files)
   - Deploy
4. DNS (GoDaddy):
   - Point `claimback.co.in` CNAME or A record to Netlify's domain (Netlify provides instructions)
   - DNS propagation: ~24 hrs
5. HTTPS: Netlify auto-provisions via Let's Encrypt

**Timeline**: 15 min setup + 24 hr DNS propagation = live by end of today

---

## 10. App Fix Plan (claimback2/)

### Phase 1: Port Edge Functions (Blocking MVP)

**Task**: Copy 4 Edge Functions from `claimback/` to `claimback2/supabase/functions/`:
- `analyse-claim/index.ts`: Claude Vision + document processing
- `verify-document/index.ts`: AI-based authenticity check
- `trigger-cashback/index.ts`: Voucher code issuance (stub for now)
- `create-razorpay-order/index.ts`: Payment initialization (stub)

**Why**: App cannot analyze claims without these. Core feature.

### Phase 2: Document Upload UI (MVP)

**Screens**:
- **Upload screen** (Expo Image Picker + Document Picker):
  - Policy document (required → improves analysis)
  - Rejection letter (required minimum)
  - Hospital bills (optional → increases confidence)
  - Show doc count → confidence level indicator
  - "This affects your analysis. Add before paying" messaging
- **Confidence nudge**: "Add hospital bills → confidence Very High"
- **Cost summary**: Show ₹499 vs ₹999, explain re-run cost

### Phase 3: Analysis Result Screen

- **Win score circle** (conic gradient, 0–100)
- **Est. recovery cards** (min, max, probability)
- **Confidence badge** + nudge to upload missing docs
- **Re-run explanation box** (same as website)
- **CTA buttons**: "Download appeal letter" + "Send now" (pre-filled email)

### Phase 4: T&C Acceptance + Payment

- **T&C screen** (modal/new route before payment):
  - Show full T&C from terms.html
  - Checkbox: "I accept terms and confirm my documents are accurate"
  - Only enable "Pay" CTA when checked
- **Razorpay integration** (stub → real after entity):
  - Call `create-razorpay-order` Edge Function
  - Open Razorpay checkout
  - Handle success → unlock result download
  - Handle failure → retry prompt

### Phase 5: Outcome Tracking (Incentive Loop)

- **Outcome update screen** (appears after ~30 days):
  - "How did your appeal go?" radio: Won / Lost / Pending / Escalated
  - Document upload: any proof (insurer response, settlement, etc.)
  - AI verification (48–72 hrs)
  - Voucher code email
- **Voucher display**: Show code, "Valid on Amazon/Flipkart"

---

## 11. Entity & Payments

**Current**: No entity yet. Razorpay, vouchers, etc. are **stubbed/mocked**.

**Post-incorporation** (defer to later):
- Register as FSSAI/non-bank fintech (if needed for vouchers)
- Razorpay live credentials
- Interakt integration (outbound WhatsApp to users — later phase)

---

## 12. Cost Tracking (Feature Request — In Progress)

**Requirement** (Hitesh):
- Show token usage + $ cost for each response
- Session cumulative tokens & cost
- Cumulative till-date cost
- Recommend if alternative model (Haiku) would save tokens

**Status**: Not yet implemented in code. Hitesh wants to see this going forward in all AI responses.

---

## 13. Key Principles

1. **Transparency on costs**: Explain why re-runs cost again (full end-to-end execution, not cached partial result)
2. **Legal clarity**: Never claim IRDAI regulation or Bar Council recognition. Use "benchmarked against," "built using as reference"
3. **DPDP compliance**: Data stays in India (Mumbai), Anthropic API disclosed, 12-month retention, user deletion rights
4. **Liability cap**: Max ₹999 liability on individual plans
5. **No sales commission**: Win probability estimates are **not** a promise. They're AI guidance.
6. **Voucher program** (not cashback): Avoids RBI friction pre-entity, AI-verifiable, close feedback loop

---

## 14. Metrics to Track (Future)

- Beta install count (TestFlight)
- Case completion rate (% who pay after analysis)
- Outcome verification rate (% who return for voucher)
- Appeal success rate (empirical from verified outcomes)
- Customer acquisition cost (CAC) — when B2B sales start
- Corporate tier adoption (when B2B goes live)

---

## 15. Timeline (Hitesh's Mental Model)

- **Now (May 2026)**: Website live on Netlify, app MVP (upload + analysis + result), free beta
- **June 2026**: Launch B2B outreach, collect first 50–100 verified outcomes
- **Aug 2026**: Incorporate entity, go live with real Razorpay + payments
- **H2 2026**: Expand to Android, interakt WhatsApp, paid tier, first corporate deals
- **2027**: Scale to 1M+ claimants, multiple languages (Hindi, Tamil, Telugu, Kannada)

---

**End of Context Document**

---

## Questions for Hitesh (When Next Talking)

1. Which Razorpay credentials when ready? (test vs. production keys)
2. Interakt API key for WhatsApp? (when do you want to turn this on?)
3. Amazon/Flipkart gift card vendor API? (how to issue codes?)
4. Should app lock down to iOS-only in beta, or prepare Android UI? (timeline?)
5. IRDAI complaint handling? (do you want a dedicated support flow when appeals escalate?)
