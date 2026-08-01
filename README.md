# LeadFlu — Editor Gigs

A mobile-first lead management platform for video editors and freelancers. Admins
publish client gigs ("leads") for video editing work, editors browse/search them,
and the platform gates contact details behind a FREE/PRO access model. PRO access
is granted by the admin; unlock requests are handled over WhatsApp.

---

## Table of Contents

- [Features](#features)
- [Architecture & Data Flow](#architecture--data-flow)
- [Tech Stack](#tech-stack)
- [Run Locally](#run-locally)
- [Environment Variables](#environment-variables)
- [Firebase Setup (one-time)](#firebase-setup-one-time)
- [Auth Model](#auth-model)
- [How to Test](#how-to-test)
- [Admin Panel](#admin-panel)
- [Google Sheets Sync](#google-sheets-sync)
- [Known Limitations](#known-limitations)

---

## Features

- Browse leads (Top Opportunities / Latest Leads) and search by keyword + platform
- Lead detail page with budget, description, software requirements, and contact info
- Save/bookmark leads (requires sign-in)
- **Username/password sign-in** via Firebase Auth — accounts are created by the admin
- FREE leads show contact details to everyone; PRO leads are masked for non-PRO users
- **WhatsApp unlock** — PRO leads open a WhatsApp chat to the owner with a prefilled message
- Admin panel: overview stats, lead manager (create via Gemini AI extraction),
  **create user accounts**, role/plan management, bi-directional Google Sheets sync
- Gemini-powered auto-extraction of lead fields from a raw client message
- Server-side Firestore persistence + admin enforcement (no localStorage-only data)
- **PRO auto-downgrade** — PRO access expires after 30 days; the server checks
  `expiryDate` on every authenticated request and downgrades to FREE automatically

## Architecture & Data Flow

The app is **server-first**: leads and user accounts live in Firestore and are served
through Next.js API routes that verify the Firebase ID token on every request.

```
Browser                            Server (Next.js) / Firestore
────────────────────────────────────────────────────────────────────
guest browse  ──────────────────►  GET /api/leads        (guest allowed, PRO masked)
sign-in (username+password) ────►  Firebase Auth         (username@leadflu.app)
admin sign-in ─────────────────►  POST /api/login       (fixed admin creds → custom token)
signed-in browse ──────────────►  GET /api/leads        (Bearer token → full contacts for PRO)
create/update/delete lead ─────►  POST|PUT|DELETE /api/leads (admin only)
create user account ──────────►  POST /api/admin/users  (admin only, Admin SDK)
AI auto-fill ─────────────────►  POST /api/leads/ai-extract (admin only, Gemini)
role/plan sync ───────────────►  GET /api/me            (server-verified)
Sheets sync ──────────────────►  Google Sheets API directly from the browser (admin OAuth)
```

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4, shadcn-style UI components, Radix primitives
- Zustand (client state, persisted to localStorage for UI niceties only)
- Firebase Auth (username/password mapped to `username@leadflu.app`; custom-token flow for admin) — client SDK
- Firebase Admin SDK (server-side): token verification, Firestore, user creation
- Google Gemini (`@google/genai`) via `app/api/leads/ai-extract`
- Google Sheets API (direct from the browser, admin only)

## Run Locally

**Prerequisites:** Node.js 20+ (Bun optional)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with the required secrets:
   ```bash
   GEMINI_API_KEY="your_gemini_api_key"
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ADMIN_USERNAME="adminleadflu"
   ADMIN_PASSWORD="NiteshK@1209"
   NEXT_PUBLIC_WHATSAPP_NUMBER="919142476621"
   ```
   - `FIREBASE_SERVICE_ACCOUNT` — the private service-account JSON from Firebase → Project
     settings → Service accounts. Enables the server-side backend and admin checks.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the single fixed admin login. If unset, the
     defaults `adminleadflu` / `NiteshK@1209` are used. Overridable per-environment.
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` — phone number (international format, digits only) that
     receives PRO-unlock requests via `wa.me` links. Defaults to `919142476621`.

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Environment Variables

| Variable                    | Required | Description |
|-----------------------------|----------|-------------|
| `GEMINI_API_KEY`            | Yes*     | Gemini API key for the AI extraction endpoint. *Only needed for "Auto-Fill". |
| `FIREBASE_SERVICE_ACCOUNT`  | Yes**    | Private service-account JSON for Firestore access, token verification, and admin user creation. **Without it `/api/*` returns 503. |
| `ADMIN_USERNAME`            | No       | Fixed admin username (default `adminleadflu`). |
| `ADMIN_PASSWORD`            | No       | Fixed admin password (default `NiteshK@1209`). |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No     | International-format phone number for WhatsApp PRO-unlock links (default `919142476621`). |
| `APP_URL`                   | No       | Public URL of the deployment (used for self-links/OAuth). Not set automatically by Vercel. |

Firebase config is committed in `firebase-applet-config.json` (public by design for
the Firebase web SDK).

## Firebase Setup (one-time)

1. **Enable Email/Password** — Firebase console → Authentication → Sign-in method →
   turn on **Email/Password**. (Accounts are only created by the admin — there is no
   public signup.)
2. **Add authorized domains** — Authentication → Settings → Authorized domains: add
   `localhost` and your Vercel domain (e.g. `leadflu-secure.vercel.app`).
3. **Create Firestore DB** — Firestore → Create database → Production mode.
4. **Lock Firestore rules** — Rules should deny direct client reads/writes; all access
   goes through the server with the Admin SDK:
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
5. **Add the service account** to the deployment (Vercel → Project → Settings → Environment
   Variables → `FIREBASE_SERVICE_ACCOUNT`).
6. **Google Sheets sync (optional)** — enable the Google Sheets API in Google Cloud console;
   the Sheets scope is requested only when an admin opens the Sync page.

## Auth Model

- **Primary login: username + password.** Accounts are created by the admin in the
  admin panel (`/admin/users`) via the Admin SDK — there is no public signup. Each
  username is stored in Firebase Auth as `username@leadflu.app`.
- **Admin is a fixed account** (`adminleadflu` / `NiteshK@1209`, overridable via
  `ADMIN_USERNAME` / `ADMIN_PASSWORD`). Admin logs in on `/profile`; the client calls
  `/api/login`, which validates the credentials server-side (rate-limited) and returns
  a Firebase custom token. Normal users can never reach the admin account.
- Roles: `Guest` / `Admin`; Plans: `FREE` / `PRO`. There is no per-account `role`
  editing — admin is the fixed account only.
- The server verifies the Firebase ID token on every API call and looks up role/plan in
  the Firestore `users` collection.
- **PRO is time-boxed (30 days).** `expiryDate` is stored on the `users` doc. On every
  authenticated request the server checks it; an expired PRO is automatically downgraded
  to `FREE` (in Firestore and for the current session). Renewal adds 30 days.
- Guests (not signed in) can browse FREE leads; PRO contact details are masked on the
  server and never shipped to unauthorized clients.
- **PRO unlock flow:** a non-PRO user hits a locked PRO lead → "Unlock on WhatsApp"
  opens a chat to the owner with a prefilled message → the owner promotes the user to
  PRO in the admin panel (sets a 30-day expiry).

## How to Test

1. **Browse as guest** — Open `/` and `/search`. FREE leads show full contacts; PRO
   leads show masked contacts with the WhatsApp unlock prompt.
2. **Sign in** — Go to `/profile`, enter the username/password the admin created for you.
   Pre-seeded test accounts: `adminleadflu`/`NiteshK@1209` (admin), `testpro`/`TestPro@123`
   (PRO), `testfree`/`TestFree@123` (free).
3. **Admin panel** — Sign in with `adminleadflu` / `NiteshK@1209`, then `/admin`.
   - `/admin/leads` — paste a raw client message and click "Auto-Fill Fields" (Gemini);
     submit to create a lead.
   - `/admin/users` — create a new account (username, name, password, plan), upgrade/renew
     PRO (30 days) or downgrade to FREE, delete accounts.
   - `/admin/sync` — push/pull/create a Google Sheet. Requires Google sign-in with the
     Sheets scope (admin only).
4. **API endpoint (AI extract)** — admin only, rate-limited:
   ```bash
   curl -X POST http://localhost:3000/api/leads/ai-extract \
     -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"message": "Need a YouTube editor for 3 shorts/week, $300, must know Premiere."}'
   ```
5. **Lint / build**:
   ```bash
   npm run lint
   npm run build
   ```

## Admin Panel

Routes are under `/admin` (sidebar layout):

- `/admin` — overview stats (users, pro users, active/total leads)
- `/admin/leads` — create leads manually or via Gemini auto-fill; delete leads
- `/admin/users` — **create accounts**, change plan (upgrade/renew/downgrade), delete
- `/admin/sync` — Google Sheets push/pull/create

**Guard note:** The admin layout verifies the role server-side via `/api/me` (which
validates the Firebase ID token and the Firestore `users` record), and every admin API
route re-checks the role. Server enforcement is authoritative.

## Google Sheets Sync

- `pushLeadsToSheet` clears the `Leads` sheet then writes all current leads.
- `pullLeadsFromSheet` overwrites all leads from the sheet.
- `createSpreadsheet` creates a new "Editor Leads Backup" sheet and pushes data.
- The OAuth token (with full Sheets scope) lives in the browser; sync requires an admin
  to sign in with Google first (the access token is not auto-refreshed — re-authorize
  if sync starts returning 401s).

## Known Limitations

- Google OAuth access token is not auto-refreshed; the Sheets sync needs a fresh
  sign-in after ~1 hour.
- All leads are loaded wholesale on every page; no pagination, virtualization, or
  indexed search yet.
- No lead expiry/archival, dedupe, or admin audit trail.
- No in-app payment flow yet — PRO membership is granted manually by the admin via
  WhatsApp and lasts 30 days. Razorpay is planned for later.
- A username must be unique (used as the login id); renaming it later is not supported
  in the UI.
