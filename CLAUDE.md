# MediVault India — CLAUDE.md

Full App Build Blueprint — From Zero to Working Product

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo (React Native) + TypeScript + NativeWind |
| Backend | Supabase (Auth + Postgres + Storage + Edge Functions) |
| AI / OCR | Google Vision API + Claude API (claude-opus-4-5) |
| Payments | Razorpay |
| Notifications | Expo Push Notifications |

**Sessions:** 10 Claude Code sessions, in order

---

## 1. Tech Stack Rules

- **No deviations** from the stack above during the initial build
- Supabase eliminates the need for a separate server
- Expo gives one codebase for iOS and Android
- Razorpay is the only Indian payment gateway worth using
- All AI and payment API calls go through Supabase Edge Functions — **never from the client**
- API keys **never** touch frontend code

---

## 2. Project Folder Structure

```
medivault/
├── CLAUDE.md                     ← this file, at project root
├── app/
│   ├── _layout.tsx               ← root navigation + auth guard
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (app)/
│   │   ├── _layout.tsx           ← bottom tab navigator
│   │   ├── index.tsx             ← home / family dashboard
│   │   ├── member/[id].tsx       ← individual member timeline
│   │   ├── upload.tsx            ← document upload + AI parsing
│   │   ├── emergency.tsx         ← in-app emergency card
│   │   └── settings.tsx
│   └── emergency-access/
│       └── [phone].tsx           ← public web emergency view (no auth)
├── components/
│   ├── DocumentCard.tsx
│   ├── MemberAvatar.tsx
│   ├── ReportInsight.tsx         ← AI parsed output display
│   ├── MedicationReminder.tsx
│   └── TrendChart.tsx
├── lib/
│   ├── supabase.ts               ← supabase client init
│   ├── api.ts                    ← all DB calls, typed
│   ├── ocr.ts                    ← Vision API type reference
│   └── notifications.ts          ← expo push setup
├── supabase/
│   ├── migrations/               ← SQL schema files, numbered 001–007
│   └── functions/
│       ├── parse-report/         ← OCR + Claude parsing
│       ├── emergency-lookup/     ← phone → emergency profile
│       └── razorpay-webhook/     ← subscription management
├── stores/
│   ├── familyStore.ts
│   ├── documentStore.ts
│   └── medicationStore.ts
├── types/
│   └── index.ts                  ← all shared TypeScript types
└── constants/
    └── theme.ts                  ← colors, fonts, spacing tokens
```

---

## 3. Database Schema

Run migrations in order: `001_families.sql` → `007_emergency_access_logs.sql`

**CRITICAL:** Enable Row Level Security on ALL tables before any user data is written.  
Policy: users can only access data from families they are a member of.

### Tables
1. `families` — subscription status, Razorpay ID
2. `family_members` — member profiles, phone for emergency lookup
3. `documents` — uploaded files, OCR + AI parsed output
4. `health_metrics` — individual test results for trend charting
5. `medications` — active prescriptions
6. `medication_logs` — daily tick/cross records
7. `emergency_access_logs` — every emergency endpoint hit, no exceptions

---

## 4. Edge Functions

### 4.1 parse-report (Most Important)
Triggered after document upload. Steps:
1. Download image from Supabase Storage
2. Send to Google Vision API → raw text + per-word confidence scores
3. Flag numeric values with confidence < 0.85 as `needs_user_clarification`
4. Send OCR text to Claude API with system prompt below
5. Parse JSON response
6. Write metrics → `health_metrics` table
7. Write medications → `medications` table
8. Update `documents.ai_parsed`, set `parsing_status = 'done'`
9. Append disclaimer to `plain_language_summary`
10. Send Expo push notification to family admin

**Claude API System Prompt (use verbatim):**
```
You are a medical record parser for Indian health records. Extract structured data from this lab report or prescription text. Return ONLY valid JSON with this exact structure:
{
  "document_type": "lab_report"|"prescription"|"discharge_summary"|"xray"|"other",
  "document_date": "YYYY-MM-DD or null",
  "doctor_name": "string or null",
  "hospital_name": "string or null",
  "lab_name": "string or null",
  "metrics": [...],
  "medications": [...],
  "plain_language_summary": "2-3 sentence explanation in simple English...",
  "flags": ["..."],
  "comparison_needed": boolean
}
Indian lab context: Common labs are Dr. Lal PathLabs, Thyrocare, SRL, Metropolis.
No preamble. No markdown. Return only the JSON object.
```

**Disclaimer to append:** `This is for informational purposes only. Please consult your doctor for medical advice.`

### 4.2 emergency-lookup
- Public GET `/functions/v1/emergency-lookup?phone=9876543210`
- No auth, rate limit: 10 requests/IP/hour
- Logs every access to `emergency_access_logs` — no exceptions
- Sends push notification to family admin on access

### 4.3 razorpay-webhook
Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.halted`

---

## 5. Constraints (Non-Negotiable)

- **NEVER** store API keys in frontend code
- All Supabase queries go through typed helper functions in `lib/api.ts` — no raw Supabase calls scattered through components
- Every database write must have a corresponding TypeScript type — no `any`
- RLS policies must be enabled on all tables before any user data is written
- All AI-generated health text must include the disclaimer before storing or displaying
- Emergency lookup endpoint must log every single access to `emergency_access_logs`
- Image compression is mandatory before upload — max 1200px, JPEG 0.82 quality

---

## 6. Session Build Order

| Session | Feature |
|---------|---------|
| 01 | Project Setup + Types + Schema ✅ |
| 02 | Auth Flow (Phone OTP) |
| 03 | Family Dashboard Home Screen |
| 04 | Upload Flow (UI only) |
| 05 | parse-report Edge Function |
| 06 | Member Profile + Charts |
| 07 | Medication Reminder System |
| 08 | Emergency Mode |
| 09 | Paywall + Razorpay |
| 10 | Polish + Onboarding |

---

## 7. Free Tier Limits (Session 09 paywall)

- 1 member, 20 documents, no AI parsing, no trend charts
- Family Plan: ₹49/month or ₹449/year (Razorpay subscription)
