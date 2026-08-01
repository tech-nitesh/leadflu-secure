# LeadFlu — Editor Gigs

A mobile-first lead management platform for video editors and freelancers. Admins
publish client gigs ("leads") for video editing work, editors browse/search them,
and the platform gates contact details behind a FREE/PRO access model.

View the app in AI Studio: https://ai.studio/apps/eb45f3b5-3ef6-4ab8-8efb-d19cfa4d1f29

---

## Table of Contents

- [Features](#features)
- [Architecture & Data Flow](#architecture--data-flow)
- [Tech Stack](#tech-stack)
- [Run Locally](#run-locally)
- [Environment Variables](#environment-variables)
- [How to Test](#how-to-test)
- [Auth Model](#auth-model)
- [Admin Panel](#admin-panel)
- [Google Sheets Sync](#google-sheets-sync)
- [Audit Findings & Known Limitations](#audit-findings--known-limitations)
- [Roadmap](#roadmap)

---

## Features

- Browse leads (Top Opportunities / Latest Leads) and search by keyword + platform
- Lead detail page with budget, description, software requirements, and contact info
- Save/bookmark leads (requires sign-in)
- Google sign-in via Firebase Auth (requests Google Sheets scope)
- FREE vs PRO access gating for contact details
- Admin panel: overview stats, lead manager (create via Gemini AI extraction), user
  role/plan management, bi-directional Google Sheets sync
- Gemini-powered auto-extraction of lead fields from a raw client message

## Architecture & Data Flow

> **Important:** The app is currently **client-first / local-first**. Leads and user
> data are stored in the browser via Zustand persist (localStorage), NOT in a
> server database.

```
Admin (browser)                      Server (Next.js)
──────────────────────────────────────────────────────────
create lead ─────────────► POST /api/leads       (route does NOT exist yet)
                             └── falls back to localStorage (silently)
browse/search ───────────► GET  /api/leads       (route does NOT exist yet)
                             └── falls back to localStorage (silently)
AI auto-fill ────────────► POST /api/leads/ai-extract  (exists, calls Gemini)
Sheets sync ─────────────► Google Sheets API directly from the browser
```

Because the `/api/leads` routes are missing, the store catches every failure and
continues locally. This means:

- All leads/users live in **localStorage** — clearing browser storage wipes data.
- Multi-device / multi-user data sharing is **not** implemented.
- The PRO-gating, roles, and saved leads are **client-side only**.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4, shadcn-style UI components, Radix primitives
- Zustand (client state, persisted to localStorage)
- Firebase Auth + Google OAuth (client-side SDK)
- Google Gemini (`@google/genai`) via `app/api/leads/ai-extract`
- Google Sheets API (direct from the browser)
- `bun.lock` (Bun lockfile; npm also works)

## Run Locally

**Prerequisites:** Node.js 20+ (Bun optional)

1. Install dependencies:
   ```bash
   npm install
   ```
   or with Bun:
   ```bash
   bun install
   ```

2. Create `.env.local` with the required secrets:
   ```bash
   GEMINI_API_KEY="your_gemini_api_key"
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ADMIN_EMAILS="you@gmail.com,second-admin@gmail.com"
   APP_URL="http://localhost:3000"
   ```
   - `FIREBASE_SERVICE_ACCOUNT` — the private service-account JSON from Firebase → Project
     settings → Service accounts. Enables the server-side Firestore backend and admin checks.
   - `ADMIN_EMAILS` — comma-separated emails that get the Admin role (no hardcoded admin).
   - Without these, the app still runs, but leads are stored only in the browser
     (localStorage fallback) and no one is an admin.

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Environment Variables

| Variable                 | Required | Description |
|--------------------------|----------|-------------|
| `GEMINI_API_KEY`         | Yes*     | Gemini API key for the AI extraction endpoint. *Only needed for "Auto-Fill". |
| `FIREBASE_SERVICE_ACCOUNT` | Yes**  | Private service-account JSON for server-side Firestore access + token verification. **Needed for the real backend; without it `/api/leads` returns 503 and the app falls back to localStorage. |
| `ADMIN_EMAILS`           | Yes**    | Comma-separated emails granted the Admin role. No hardcoded admin exists. |
| `APP_URL`                | No       | Public URL of the deployment (used for self-links/OAuth). Not set automatically by Vercel. |

Firebase config is committed in `firebase-applet-config.json` (public by design for
the Firebase web SDK).

## How to Test

1. **Leads browsing** — Open `/` (home), `/search` (search + platform filter), and
   `/saved` (requires sign-in; initially shows demo leads).
2. **Lead detail / PRO gating** — Open a lead. `demo-lead-1` is FREE (contacts shown);
   `demo-lead-2` is PRO (contacts blurred + upgrade prompt for non-PRO users).
3. **Sign in** — Go to `/profile`, "Sign in with Google". After sign-in, sign out and
   sign back in to confirm the flow. Note the refresh-persistence bug below.
4. **Admin panel** — The admin email is hardcoded to `editingbynitesh@gmail.com`
   (see security notes). Sign in with it, then `/admin`.
   - `/admin/leads` — paste a raw client message and click "Auto-Fill Fields" to test
     the Gemini endpoint; submit to create a lead.
   - `/admin/users` — upgrade/revoke PRO, grant Admin.
   - `/admin/sync` — push/pull/create a Google Sheet. Requires granting Google Sheets
     permission during sign-in.
5. **API endpoint (AI extract)** — test directly:
   ```bash
   curl -X POST http://localhost:3000/api/leads/ai-extract \
     -H "Content-Type: application/json" \
     -d '{"message": "Need a YouTube editor for 3 shorts/week, $300, must know Premiere."}'
   ```
6. **Lint / build**:
   ```bash
   npm run lint
   npm run build
   ```

## Auth Model

- Auth is **client-side Firebase + Google sign-in popup**.
- The OAuth provider requests the `spreadsheets` scope, so the access token also
  drives the Google Sheets sync feature.
- Roles: `Guest` / `Free` / `Pro` / `Admin`; Plans: `FREE` / `PRO`.
- Admin role is granted server-side from the `ADMIN_EMAILS` env var (no hardcoded
  email). The server verifies the Firebase ID token on every API call and looks up the
  role/plan in the Firestore `users` collection (seeded automatically).
- Normal sign-in requests only basic Google scopes (email/profile). The Google Sheets
  scope is requested separately on demand (`authorizeSheets`), used only by the
  Sheets Sync admin page.

## Admin Panel

Routes are under `/admin` (sidebar layout):

- `/admin` — overview stats (users, pro users, active/total leads)
- `/admin/leads` — create leads manually or via Gemini auto-fill; delete leads
- `/admin/users` — change user role/plan
- `/admin/sync` — Google Sheets push/pull/create

**Guard note:** The admin layout now verifies the role server-side via `/api/me`
(which validates the Firebase ID token and the Firestore `users` record), in addition
to the client-side check. Server enforcement is authoritative.

## Google Sheets Sync

- `pushLeadsToSheet` clears the `Leads` sheet then writes all current leads.
- `pullLeadsFromSheet` overwrites all local leads from the sheet.
- `createSpreadsheet` creates a new "Editor Leads Backup" sheet and pushes data.
- The OAuth token (with full Sheets scope) lives in the browser.
- Tokens are never refreshed; expiry breaks sync until re-sign-in.

## Audit Findings & Known Limitations

### Functional
| ID | Severity | Issue |
|----|----------|-------|
| F1 | High | `/api/leads` GET/POST routes are missing (`lib/store.ts:134,154`). All server calls fail silently; data lives only in localStorage. No persistence across devices, no real backend. |
| F2 | Medium | AI-extracted contact email is discarded in `admin/leads/page.tsx:65` (`contactDetails: prev.contactDetails`). |
| F3 | Low | Lead detail "Copy" button opens `mailto:` (`lead/[id]/page.tsx:133`). |
| F4 | Medium | "Upgrade Now" button has no action (`profile/page.tsx:128`) — no payment flow. |
| F5 | Low | Dead code: `updateLead`, `validateLeadInput`, `unlockedLeads`, `expiryDate` are unused. No edit UI, no unlock/expiry logic. |
| F6 | Low | `addLead` reports success even when the API fails, giving a false impression of server persistence. |

### Security
| ID | Severity | Issue |
|----|----------|-------|
| S1 | Critical | Admin role is stored in client localStorage and checked only client-side (`admin/layout.tsx:24`). Trivially bypassed via devtools; hardcoded super-admin email in the client bundle. |
| S2 | High | `/api/leads/ai-extract` has no auth and no rate limiting — anyone can consume Gemini quota. |
| S3 | High | Prompt injection: raw client `message` is interpolated into the prompt; AI JSON output is not schema-validated. |
| S4 | High | Contact masking is cosmetic — full emails/phones are in localStorage and the client bundle; PRO gating is bypassable. |
| S5 | Medium | API errors are returned verbatim to clients (`ai-extract/route.ts:43`), leaking internals. |

### Auth
| ID | Severity | Issue |
|----|----------|-------|
| A1 | High | After a page refresh `cachedAccessToken` is null (`lib/firebase.ts:21-28`), so `onAuthStateChanged` takes the failure branch and Sheets sync requires a re-login every time. |
| A2 | High | Google OAuth access token (~1h lifetime) is never refreshed — Sheets sync 401s after expiry. |
| A3 | High | No server-side verification of identity; client-supplied `x-user-email/role/plan` headers are trusted. |

### Scalability
| ID | Severity | Issue |
|----|----------|-------|
| SC1 | High | All data is in localStorage; Firestore (`db`) is initialized but unused. Won't scale beyond a single browser/device. |
| SC2 | Medium | All leads are loaded and mapped wholesale on every page; no pagination, virtualization, or indexed search. |

### Business Logic
| ID | Severity | Issue |
|----|----------|-------|
| B1 | High | PRO/unlock model is not real: no server enforcement, no unlock tracking, no credit system. |
| B2 | Medium | No lead expiry/archival (leads stay Active forever), no dedupe, no audit trail for admin actions. |
| B3 | Medium | No payment/subscription integration behind the "Pro" plan. |

## Roadmap

1. Add real backend persistence — implement `/api/leads` (GET/POST/PUT/DELETE) backed
   by Firestore; server-side admin/role checks.
2. Server-verified auth — verify Firebase ID token on every API call; drop reliance on
   client headers; refresh OAuth tokens.
3. Enforce PRO gating server-side — return masked contacts from the API, never ship
   full contacts to unauthorized clients.
4. Protect AI endpoint — auth, rate limiting, prompt hardening (delimit user input,
   schema-validate Gemini output).
5. Payment/subscription for Pro, lead expiry/archival, dedupe, and admin audit logs.
6. Pagination/virtualization for the leads list; debounced search.
