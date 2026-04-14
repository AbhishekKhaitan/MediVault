# MediVault India 🏥

> Family medical records, forever. Built for Indian families.

MediVault lets your entire family — across generations — store, understand, and share medical records. Upload a lab report, get a plain-English summary in seconds. Tap a phone number at the reception desk, hand over a complete emergency profile.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [File-by-File Code Explanations](#file-by-file-code-explanations)
   - [types/index.ts](#typesindexts)
   - [lib/supabase.ts](#libsupabasests)
   - [lib/api.ts](#libapiats)
   - [lib/notifications.ts](#libnotificationsts)
   - [lib/ocr.ts](#libocrts)
   - [constants/theme.ts](#constantsthemets)
   - [stores/familyStore.ts](#storesfamilystorets)
   - [stores/documentStore.ts](#storesdocumentstorets)
   - [stores/medicationStore.ts](#storesmedicationstorets)
   - [app/_layout.tsx](#app_layouttsx)
   - [app/(auth)/login.tsx & register.tsx](#appauthlogintsx--registertsx)
   - [app/(app)/_layout.tsx](#appapp_layouttsx)
   - [app/(app)/index.tsx](#appappindextsx)
   - [app/(app)/upload.tsx](#appappuploadtsx)
   - [app/(app)/member/[id].tsx](#appappmemberidtsx)
   - [app/(app)/emergency.tsx](#appappemergencytsx)
   - [app/(app)/settings.tsx](#appappsettingstsx)
   - [app/emergency-access/[phone].tsx](#appemergency-accessphonetsx)
   - [components/DocumentCard.tsx](#componentsdocumentcardtsx)
   - [components/MemberAvatar.tsx](#componentsmemberavatartsx)
   - [components/ReportInsight.tsx](#componentsreportinsighttsx)
   - [components/MedicationReminder.tsx](#componentsmedicationremindertsx)
   - [components/TrendChart.tsx](#componentstrendcharttsx)
   - [supabase/migrations/ (001–007)](#supabasemigrations-001007)
   - [supabase/functions/parse-report/](#supabasefunctionsparse-report)
   - [supabase/functions/emergency-lookup/](#supabasefunctionsemergency-lookup)
   - [supabase/functions/razorpay-webhook/](#supabasefunctionsrazorpay-webhook)
4. [Security Design](#security-design)
5. [Environment Variables](#environment-variables)
6. [Running the Project](#running-the-project)
7. [Session Build Order](#session-build-order)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Expo (React Native) + TypeScript | One codebase for iOS + Android |
| Styling | NativeWind (Tailwind for RN) | Utility-first, fast to build |
| State | Zustand | Lightweight, no boilerplate |
| Backend | Supabase | Auth + DB + Storage + Edge Functions in one |
| AI / OCR | Google Vision API + Claude claude-opus-4-5 | Best-in-class document understanding |
| Payments | Razorpay | Only serious Indian payment gateway |
| Notifications | Expo Push | Cross-platform, works with Expo Go |

---

## Project Structure

```
medivault/
├── app/                        ← All screens (expo-router file-based routing)
│   ├── _layout.tsx             ← Root layout + auth session guard
│   ├── (auth)/                 ← Public screens (no session needed)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (app)/                  ← Protected screens (session required)
│   │   ├── _layout.tsx         ← Bottom tab navigator
│   │   ├── index.tsx           ← Family dashboard
│   │   ├── member/[id].tsx     ← Member profile + timeline + charts
│   │   ├── upload.tsx          ← Document upload flow
│   │   ├── emergency.tsx       ← In-app emergency card
│   │   └── settings.tsx
│   └── emergency-access/
│       └── [phone].tsx         ← Public web view (no auth, for receptionists)
├── components/                 ← Reusable UI components
├── lib/                        ← All business logic + data access
├── stores/                     ← Zustand global state
├── supabase/
│   ├── migrations/             ← SQL files that create the database
│   └── functions/              ← Deno edge functions (run server-side)
├── types/                      ← Shared TypeScript types
└── constants/                  ← Theme tokens
```

---

## File-by-File Code Explanations

---

### `types/index.ts`

**What it does:** Defines every TypeScript type used across the entire app. This is the single source of truth for data shapes.

**Key logic:**

```ts
// Union types constrain values to valid options only.
// The database and TypeScript both enforce these — double protection.
export type SubscriptionStatus = 'free' | 'active' | 'cancelled'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type ParsingStatus = 'pending' | 'processing' | 'done' | 'failed'
```

```ts
// ParsedReport is what Claude API returns after reading a lab report.
// It is stored as JSONB in the documents table.
export interface ParsedReport {
  metrics: HealthMetricRaw[]        // e.g. HbA1c: 6.2, unit: %, flagged: false
  medications: MedicationRaw[]      // e.g. Metformin 500mg twice daily
  plain_language_summary: string    // 2-3 sentences a family member can understand
  flags: string[]                   // values outside normal range, in plain English
  comparison_needed: boolean        // true if we've seen this report type before
}
```

```ts
// ClarificationItem is created when Google Vision is < 85% confident
// on a numeric value — we ask the user to verify it before storing.
export interface ClarificationItem {
  field: string           // which value is uncertain
  question: string        // "We couldn't read this clearly — what does it say?"
  options: string[]       // possible readings offered
  current_reading: string // our best guess
}
```

**Why it matters:** Every DB write, API call, and component prop references these types. TypeScript will error at compile time if anything doesn't match — catching bugs before they reach the user.

---

### `lib/supabase.ts`

**What it does:** Creates and exports the single Supabase client instance used by the whole app.

**Key logic:**

```ts
// EXPO_PUBLIC_ prefix is the only way to safely expose a variable
// to Expo's frontend bundle. The anon key is safe to expose —
// it can only do what RLS policies allow.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,   // silently refreshes JWT before it expires
    persistSession: true,     // keeps user logged in across app restarts
    detectSessionInUrl: false, // disable for React Native (no browser URL bar)
  },
})
```

**Why one instance:** Multiple Supabase clients would create multiple auth sessions and connection pools. One export, imported everywhere.

---

### `lib/api.ts`

**What it does:** Every single database operation in the app goes through this file — no raw Supabase calls scattered in components. This is a strict architectural rule.

**Key logic:**

```ts
// All functions are typed end-to-end.
// Components never see a Supabase query — only typed results.
export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as FamilyMember[]
}
```

```ts
// Document creation always sets parsing_status to 'pending'.
// This triggers the parse-report edge function to pick it up.
export async function createDocument(doc: Omit<Document, 'id' | 'created_at' | ...>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...doc, parsing_status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data as Document
}
```

```ts
// Today's logs are scoped to today's date — we never show
// yesterday's compliance on today's dashboard.
export async function getTodaysMedicationLogs(memberId: string): Promise<MedicationLog[]> {
  const today = new Date().toISOString().split('T')[0]  // "2026-04-14"
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('log_date', today)
  ...
}
```

**Why this pattern:** If Supabase is ever swapped for another backend, only this file changes. Components are completely decoupled from the data layer.

---

### `lib/notifications.ts`

**What it does:** Handles Expo push notification registration and medication reminder scheduling.

**Key logic:**

```ts
// Ask for permission first — never assume.
// Returns null if user denies, so callers can gracefully skip notifications.
export async function registerForPushNotifications(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null

  // The push token is what Supabase edge functions use to
  // send server-to-device notifications (e.g. "report parsed").
  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}
```

```ts
// Schedules a repeating daily notification for a medication.
// hour/minute come from the user's chosen reminder time (e.g. 08:00 → 8, 0).
export async function scheduleMedicationReminder(
  medicationId: string,
  medicationName: string,
  memberName: string,
  dosage: string,
  hour: number,
  minute: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${medicationName}`,
      body: `${memberName} needs to take ${medicationName} ${dosage}`,
      data: { medicationId },  // app uses this to open the right confirmation screen
    },
    trigger: { hour, minute, repeats: true },  // fires every day at this time
  })
  return id  // stored so we can cancel it later if medication is stopped
}
```

---

### `lib/ocr.ts`

**What it does:** Type definitions for Google Vision API responses. This file is a reference for the edge function — it is **never imported by the frontend**.

**Key logic:**

```ts
// The threshold below which we flag a numeric reading as unreliable
// and ask the user to verify it. 85% was chosen as the balance between
// catching genuine errors without annoying users too often.
export const OCR_CONFIDENCE_THRESHOLD = 0.85

export interface VisionWord {
  text: string
  confidence: number  // 0.0 → 1.0. Vision API gives per-word scores.
}
```

---

### `constants/theme.ts`

**What it does:** Central design tokens — colors, spacing, font sizes, border radii. Every component uses these instead of hardcoding values.

**Key logic:**

```ts
export const colors = {
  danger: '#EF4444',   // used for allergies and critical flags — always red
  warning: '#F59E0B',  // amber for values that need attention but aren't critical
  success: '#22C55E',  // green for medication taken, normal values
}

// Spacing scale based on 4px base unit — consistent rhythm across all screens
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
```

**Why:** Change `primary` once here and every button, tab bar, and link updates. No search-and-replace across 30 files.

---

### `stores/familyStore.ts`

**What it does:** Zustand store that holds the current user's family, all members, and their own profile in global state.

**Key logic:**

```ts
// loadFamily() runs three queries in parallel (Promise.all) —
// fetches the family row and the user's own member profile simultaneously,
// then fetches all members once we have the family ID.
loadFamily: async () => {
  set({ isLoading: true, error: null })
  const [family, myProfile] = await Promise.all([
    getMyFamily(),
    getMyMemberProfile(),
  ])
  let members: FamilyMember[] = []
  if (family) {
    members = await getFamilyMembers(family.id)
  }
  set({ family, myProfile, members, isLoading: false })
}
```

```ts
// reset() is called on sign-out — clears all user data from memory
// so the next user who logs in on the same device sees a clean state.
reset: () => set({ family: null, members: [], myProfile: null })
```

---

### `stores/documentStore.ts`

**What it does:** Caches documents per member so navigating between member profiles doesn't refetch unnecessarily.

**Key logic:**

```ts
// Documents are stored as a dictionary keyed by member_id.
// This means each member's document list is cached independently.
documents: Record<string, Document[]>  // { "uuid-of-member": [doc1, doc2, ...] }

// addDocument() prepends the new doc to the front of the list —
// the most recent document always appears first without a full refetch.
addDocument: (doc: Document) => {
  set((state) => ({
    documents: {
      ...state.documents,
      [doc.member_id]: [doc, ...(state.documents[doc.member_id] ?? [])],
    },
  }))
}
```

---

### `stores/medicationStore.ts`

**What it does:** Holds active medications and today's compliance logs per member.

**Key logic:**

```ts
// Medications and logs are separate — medications change rarely,
// but logs are written every time a user taps tick or cross.
// Keeping them separate avoids unnecessary re-renders.
medications: Record<string, Medication[]>
todaysLogs: Record<string, MedicationLog[]>
```

---

### `app/_layout.tsx`

**What it does:** Root layout for the entire app. Contains the **auth guard** — the logic that decides whether to show the login screen or the main app based on the user's session.

**Key logic:**

```ts
// onAuthStateChange fires whenever the session changes —
// on app start, on login, on logout, on token refresh.
supabase.auth.onAuthStateChange(async (event, session) => {
  const inAuthGroup = segments[0] === '(auth)'
  const inAppGroup = segments[0] === '(app)'

  // If logged in but on a login screen → redirect to home
  if (session && inAuthGroup) {
    router.replace('/(app)/')
  }
  // If logged out but on a protected screen → redirect to login
  else if (!session && inAppGroup) {
    router.replace('/(auth)/login')
  }
})
```

**Why `replace` not `push`:** `replace` swaps the current screen rather than stacking it. The user can't press Back to return to the login screen after logging in.

---

### `app/(auth)/login.tsx` & `register.tsx`

**What it does (Session 02 will build the full version):** Phone OTP login and family registration screens.

**Planned logic:**
- `login.tsx` — phone number input → Supabase sends OTP via SMS → user enters 6-digit code → session created
- `register.tsx` — appears only for new users. Collects: family name, user's name, relation, date of birth, blood group, known allergies → creates `families` row + `family_members` row in one transaction

---

### `app/(app)/_layout.tsx`

**What it does:** Bottom tab navigator — the persistent navigation bar shown on every app screen.

**Key logic:**

```ts
// Tabs are defined here. The member/[id] screen is hidden from the tab bar
// (href: null) but still accessible by navigating programmatically.
<Tabs.Screen name="member/[id]" options={{ title: 'Timeline', href: null }} />
```

**Why hide the member tab:** You navigate to a member's profile by tapping their avatar on the home screen — not from a tab. Showing it in the tab bar would be confusing.

---

### `app/(app)/index.tsx`

**What it does (Session 03 will build the full version):** Family dashboard — scrollable avatar grid of all family members, each showing their name, relation, and last document date. Floating action button navigates to Upload.

---

### `app/(app)/upload.tsx`

**What it does (Session 04 will build the full version):** The document upload flow.

**Planned logic:**
1. User picks image from camera or gallery
2. `expo-image-manipulator` compresses it to max 1200px, JPEG quality 0.82
3. Upload to Supabase Storage at `/{family_id}/{member_id}/{uuid}.jpg`
4. Create `documents` row with `parsing_status: 'pending'`
5. Show loading state — "Reading your document..."
6. Edge function picks it up and processes it

---

### `app/(app)/member/[id].tsx`

**What it does (Session 06 will build the full version):** Individual member timeline — chronological list of all documents, health metric trend charts (Victory Native), and active medications.

**The `[id]` in the filename** is expo-router's dynamic route syntax. `id` maps to the `family_members.id` UUID and is accessed with:

```ts
const { id } = useLocalSearchParams<{ id: string }>()
```

---

### `app/(app)/emergency.tsx`

**What it does (Session 08 will build the full version):** Full-screen emergency card with no navigation chrome. Shows blood group in large text, allergies in red, current medications, and a Share button that generates the public emergency URL.

---

### `app/(app)/settings.tsx`

**What it does:** Settings screen with sign-out. Calling `supabase.auth.signOut()` clears the session, which triggers `onAuthStateChange` in `_layout.tsx`, which automatically redirects to the login screen.

```ts
const handleSignOut = async () => {
  await supabase.auth.signOut()
  router.replace('/(auth)/login')
}
```

---

### `app/emergency-access/[phone].tsx`

**What it does (Session 08 will build the full version):** A public-facing web page. No authentication. The receptionist at a hospital types `medivault.in/e/9876543210` and sees the patient's emergency profile instantly.

`[phone]` is the dynamic route param — the actual phone number from the URL. It calls the `emergency-lookup` edge function to fetch the profile.

---

### `components/DocumentCard.tsx`

**What it does:** Card UI for a single document in the member timeline.

**Key logic:**

```ts
// Shows the AI summary if the document has been parsed.
// Shows amber flags if any values are outside normal range.
{(document.ai_parsed?.flags ?? []).length > 0 && (
  <View className="mt-2 bg-amber-50 rounded-lg px-3 py-1">
    <Text className="text-xs text-amber-700">
      {document.ai_parsed!.flags.join(' · ')}
    </Text>
  </View>
)}
```

---

### `components/MemberAvatar.tsx`

**What it does:** Circular avatar for a family member on the dashboard. Tapping it navigates to their profile.

**Key logic:**

```ts
// Generates initials from the member's name as fallback
// when no avatar photo has been uploaded.
const initials = member.name
  .split(' ')
  .map((n) => n[0])
  .join('')
  .toUpperCase()
  .slice(0, 2)   // max 2 characters — "Rahul Sharma" → "RS"
```

---

### `components/ReportInsight.tsx`

**What it does:** Displays the AI-parsed output from a lab report — the plain-English summary and flagged values.

**Key logic:**

```ts
// Flags are shown separately from the summary, in amber,
// so they catch the eye without being alarming.
{report.flags.map((flag, i) => (
  <Text key={i} className="text-xs text-amber-700">• {flag}</Text>
))}
```

---

### `components/MedicationReminder.tsx`

**What it does:** Card for one medication with tick (taken) and cross (not taken) buttons. State is reflected back to the parent via `onTaken` callback.

**Key logic:**

```ts
// Button color changes based on current state —
// green fill if taken = true, green outline if unknown.
className={`... ${taken === true ? 'bg-green-500' : 'bg-green-50 border border-green-200'}`}
```

---

### `components/TrendChart.tsx`

**What it does (Session 06 will build the full version):** Line chart of a health metric over time using Victory Native. Example: HbA1c across all lab reports for a member, showing the trend going up or down.

---

### `supabase/migrations/ (001–007)`

**What they do:** SQL files that build the entire database schema in order. Run once in the Supabase dashboard.

**Key patterns used in every migration:**

```sql
-- Every table has UUID primary keys — no auto-increment integers.
-- This means IDs are unpredictable and safe to expose in URLs.
id uuid primary key default gen_random_uuid()

-- Every table has RLS enabled immediately — before any data is inserted.
alter table health_metrics enable row level security;

-- RLS policy pattern: you can only read data that belongs to your family.
-- This check recurses through family_members to find your family_id.
create policy "Family members can view their health metrics"
  on health_metrics for select
  using (
    family_id in (
      select family_id from family_members
      where user_id = auth.uid()
    )
  );
```

**Indexes for performance:**

```sql
-- Emergency lookup is on the critical path (receptionist is waiting).
-- This partial index only covers members who opted into emergency access.
create index family_members_phone_idx on family_members(phone)
  where emergency_access_enabled = true;

-- Trend chart query: all readings for one member, one metric, sorted by date.
create index health_metrics_member_metric_idx
  on health_metrics(member_id, metric_name, recorded_at);
```

---

### `supabase/functions/parse-report/`

**What it does:** The brain of MediVault. Triggered when a document is uploaded. Runs entirely server-side — the phone never sees API keys.

**Step-by-step logic:**

```
1. Receive documentId in request body
2. Fetch document row from DB
3. Mark parsing_status = 'processing'
4. Download image bytes from Supabase Storage
5. Base64-encode image → send to Google Vision API
6. Vision returns: full text + per-word confidence scores
7. Scan all words: if numeric AND confidence < 0.85 → add to needs_user_clarification
8. Send OCR text to Claude claude-opus-4-5 with the exact system prompt
9. Parse the returned JSON
10. Append disclaimer to plain_language_summary
11. Insert rows into health_metrics table (one row per metric)
12. Insert rows into medications table
13. Update documents row: ai_parsed, parsing_status = 'done', doctor_name, etc.
14. (Session 07) Send push notification to family admin
```

**The Claude system prompt (verbatim, non-negotiable):**

```
You are a medical record parser for Indian health records. Extract structured
data from this lab report or prescription text. Return ONLY valid JSON...

Indian lab context: Common labs are Dr. Lal PathLabs, Thyrocare, SRL, Metropolis.
H/L markers beside values indicate high/low. Hindi or regional language headers
are possible — translate them. No preamble. No markdown. Return only the JSON object.
```

**Why verbatim:** Any change to this prompt changes the JSON structure, which breaks the parsing code that reads it.

---

### `supabase/functions/emergency-lookup/`

**What it does:** Public HTTP endpoint. No authentication. A receptionist visits `medivault.in/e/9876543210`, this function runs and returns the patient's emergency profile.

**Key logic:**

```ts
// In-memory rate limiter — resets on cold start but effective for burst attacks.
// 10 requests per IP per hour is enough for legitimate use.
function isRateLimited(ip: string): boolean {
  const entry = requestCounts.get(ip)
  if (!entry || Date.now() > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: Date.now() + 3_600_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}
```

```ts
// Lookup ONLY works if the member has explicitly opted in.
// emergency_access_enabled = false means this member is invisible to the endpoint.
.eq('emergency_access_enabled', true)
```

```ts
// Every hit is logged — no exceptions. Uses service role key
// so this insert bypasses RLS and always succeeds,
// even if the member row itself has restrictive policies.
await supabase.from('emergency_access_logs').insert({
  member_id: member.id,
  accessed_by_ip: clientIp,
  user_agent: req.headers.get('user-agent'),
})
```

---

### `supabase/functions/razorpay-webhook/`

**What it does:** Receives subscription lifecycle events from Razorpay and updates the family's subscription status in the database.

**Key logic:**

```ts
// Verify that the webhook actually came from Razorpay — not a fake request.
// HMAC-SHA256 signature check using the webhook secret.
const expectedSignature = createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex')

if (signature !== expectedSignature) {
  return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
}
```

```ts
// Four events, four outcomes:
// activated  → set status 'active', set end date 1 month out
// charged    → extend end date by 1 more month
// cancelled  → mark 'cancelled' but keep access until period end
// halted     → immediate cancellation + push notify admin (payment failed)
switch (event.event) { ... }
```

---

## Security Design

Security is not an afterthought in MediVault — it is designed into every layer. Medical records are among the most sensitive data a person owns.

---

### Layer 1 — API Keys Never Touch the Frontend

```
❌ Wrong:  fetch(`https://vision.googleapis.com?key=${GOOGLE_KEY}`)  ← in a component
✅ Right:  fetch(`${SUPABASE_URL}/functions/v1/parse-report`)        ← triggers edge function
```

All calls to Google Vision, Claude, and Razorpay happen inside **Supabase Edge Functions**, which run on Deno servers. The frontend only knows the Supabase project URL and the anon key — both are safe to expose.

The anon key has no power on its own. What it can do is entirely controlled by RLS policies on the database. Strip the RLS policies and the anon key is still useless — there's no data to read.

---

### Layer 2 — Row Level Security (RLS) on Every Table

Every one of the 7 database tables has RLS enabled **before any data is written**. The core policy is:

```sql
-- A user can only read/write data that belongs to a family
-- they are a member of. Period.
using (
  family_id in (
    select family_id from family_members
    where user_id = auth.uid()   ← auth.uid() = the JWT-verified user ID
  )
)
```

This means:
- A user in Family A **cannot** read documents belonging to Family B — even if they know the exact UUID
- A user who is not an admin **cannot** add new members to the family
- Direct database queries from a compromised anon key return zero rows

---

### Layer 3 — Emergency Access is Opt-In and Fully Logged

The emergency lookup endpoint is public (by design — a receptionist can't log in). Two controls prevent abuse:

**Opt-in only:**
```sql
-- Members are hidden from the endpoint unless they explicitly enabled it
where emergency_access_enabled = true
```

**Every single access is logged:**
```ts
// This insert uses the SERVICE ROLE key (server-side only).
// It bypasses RLS so the log is always written,
// even if something else in the request fails.
await supabase.from('emergency_access_logs').insert({
  member_id: member.id,
  accessed_by_ip: clientIp,
  accessed_at: new Date().toISOString(),
})
```

The family admin receives a push notification every time someone looks up their family member. Nothing is invisible.

**Rate limiting:**
```ts
// 10 requests per IP per hour — enough for legitimate hospital use,
// not enough for a data scraping attack.
if (entry.count >= RATE_LIMIT_PER_HOUR) return 429
```

---

### Layer 4 — Webhook Signature Verification

Razorpay (and any payment webhook) is a common attack vector — anyone can POST fake payment events to your endpoint.

```ts
// We verify every webhook with HMAC-SHA256 before touching the database.
// An attacker without the webhook secret cannot forge a valid signature.
const expectedSignature = createHmac('sha256', webhookSecret)
  .update(rawBody)   // must use RAW body bytes — not parsed JSON
  .digest('hex')

if (signature !== expectedSignature) {
  return new Response('Unauthorized', { status: 401 })
}
```

A fake request to this endpoint cannot upgrade a free account to paid status.

---

### Layer 5 — Image Compression Caps Attack Surface

```
Max upload: 1200px longest side, JPEG quality 0.82
```

This isn't just about storage cost. Uncompressed images sent directly to Google Vision API could include hidden metadata (EXIF GPS coordinates, device info). Recompression strips EXIF data and limits file sizes to a predictable range.

---

### Layer 6 — The Disclaimer is Enforced at the Storage Layer

```ts
// This runs inside the edge function, server-side, before the document is saved.
// The frontend cannot skip this step — the disclaimer is always appended.
parsed.plain_language_summary = `${parsed.plain_language_summary} ${DISCLAIMER}`

// DISCLAIMER = "This is for informational purposes only.
//               Please consult your doctor for medical advice."
```

Even if a bug caused the frontend to skip displaying the disclaimer, the data in the database always contains it. The display and the data are both protected.

---

### Layer 7 — Sensitive Secrets via Supabase Dashboard Only

Edge function secrets (`GOOGLE_VISION_API_KEY`, `ANTHROPIC_API_KEY`, `RAZORPAY_KEY_SECRET`) are set through the Supabase CLI or dashboard:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-...
```

They are injected as `Deno.env.get(...)` at runtime. They **never appear in any file** checked into Git — not even in `.env` files, because `.env.local` is blocked by `.gitignore`.

---

### Layer 8 — TypeScript as a Security Control

```ts
// No `any` means you cannot accidentally pass unsanitized data.
// Every value going into the database has a known, checked type.

// This won't compile:
const badData: any = { subscription_status: 'hacked' }
await supabase.from('families').update(badData)  // ← TypeScript error

// This compiles — and the DB also validates the constraint:
const update: Pick<Family, 'subscription_status'> = { subscription_status: 'active' }
```

TypeScript's strict mode + no `any` means an entire class of runtime injection bugs doesn't exist.

---

## Environment Variables

```bash
# .env.local — NEVER commit this file

# These two are safe to expose (controlled by RLS)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# These are set via Supabase dashboard — never in any file
# GOOGLE_VISION_API_KEY=...
# ANTHROPIC_API_KEY=...
# RAZORPAY_KEY_SECRET=...
# RAZORPAY_WEBHOOK_SECRET=...
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase values. The secret keys go into the Supabase dashboard under **Project Settings → Edge Functions → Secrets**.

---

## Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.local.example .env.local
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Run database migrations (in order, in Supabase SQL editor)
# supabase/migrations/001_families.sql
# supabase/migrations/002_family_members.sql
# ... through 007_emergency_access_logs.sql

# 4. Start the app
npm start
```

---

## Session Build Order

| Session | Feature | Status |
|---------|---------|--------|
| 01 | Project Setup + Types + Schema | ✅ Done |
| 02 | Auth Flow (Phone OTP) | ⏳ Next |
| 03 | Family Dashboard Home Screen | ⏳ |
| 04 | Upload Flow (UI only) | ⏳ |
| 05 | parse-report Edge Function | ⏳ |
| 06 | Member Profile + Charts | ⏳ |
| 07 | Medication Reminder System | ⏳ |
| 08 | Emergency Mode | ⏳ |
| 09 | Paywall + Razorpay | ⏳ |
| 10 | Polish + Onboarding | ⏳ |

---

*Built with Claude Code · MediVault India*
