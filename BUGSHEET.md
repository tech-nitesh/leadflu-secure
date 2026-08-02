# LeadFlu — Bug / Task Sheet (v1, for discussion)

## How to read this sheet
- **Priority**: P0 = blocking / do first · P1 = urgent · P2 = soon · P3 = later
- **MVP**: "MVP" = must have now (customers are waiting) · "Post" = can wait
- Every task below states: what it is, today's behavior, what we want, how we'll do it,
  and any decision still open.

---

## ✅ P0 blocker — RESOLVED: the live site is down (fixed by you in Vercel)
Both `leadflu-secure.vercel.app` and `leadflu.online` returned Vercel's
"deployment could not be found" error. This was a Vercel account/settings problem
(not code). Fixed by the owner in the Vercel dashboard; `leadflu.online` now loads.

---

## Priority overview

| # | Task | Priority | MVP | Type | Status |
|---|------|----------|-----|------|--------|
| — | Site down (Vercel) | P0 | MVP | Infra | DONE — you fixed in Vercel |
| 4 | Remove USD label | P0 | MVP | Small fix | DONE - pushed live (3 Aug) |
| 2 | Smarter WhatsApp message | P1 | MVP | Small fix | DONE - pushed live (3 Aug) |
| 3 | Fix blur (too much hidden) | P1 | MVP | UX fix | DONE - pushed live (3 Aug) |
| 5 | Minimal lead form | P1 | MVP | Feature | DONE - pushed live (3 Aug) |
| 6 | Visibility: all leads shown, contacts locked | P1 | MVP | Feature | DONE - pushed live (3 Aug) |
| 8 | Separate test site + test database | P0 (prereq) | MVP | Setup | Not started |
| 1 | PRO max 2 devices | P2 | Post | Feature | Not started |
| 7 | Admin edits all user details | P2 | Post | Feature | Not started |
| 1b | Owner can remove a lost device | P3 | Post | Feature | Later |
| 9 | Real paging for the leads list | P3 | Post | Performance | Not started |

**Proposed order** (to ship fast for waiting customers):
1. You fix the live site in Vercel.
2. Quick safe fixes straight to production: **#4, #2, #3**.
3. **#5** + **#6** (the core experience) — via test site if you prefer, else direct.
4. **#8** set up before anything risky; then **#1** and **#7** go through the test site.

---

## Task details

### #4 — Remove USD label — P0 · MVP · Small fix
- **Today**: leads show a currency label (USD) on cards/pages.
- **Want**: show exactly what the owner typed for the price. No "USD" word, no extra label.
- **How**: remove the hardcoded currency text from the display. Old leads keep whatever
  text was typed into them (we don't touch data).
- **Open**: none.

### #2 — Smarter WhatsApp message — P1 · MVP · Small fix
- **Today**: the pre-filled WhatsApp message contains the word "leadflu".
- **Want**: remove "leadflu" and make the message smarter but simple (NO AI — that's
  overkill). A plain template related to the lead, e.g.:
  *"Hi, I'm a video editor and I'd like to apply for your **<lead title>** post. Can we talk?"*
  Users can still edit it before sending in WhatsApp anyway.
- **How**: change the pre-fill text template. Title pulled from the lead.
- **Open**: exact wording — I'll show you a sample before changing.

### #3 — Fix the blur / locked section — P1 · MVP · UX fix
- **Today**: for a locked lead the blur covers too much — price isn't even shown, and the
  blurred block takes too much space.
- **Want**: only the contact details (email / number / website) are hidden. Everything
  else — price, title, description, badges — fully visible. Locked section small and tidy.
- **How**: adjust the frontend on the lead card + lead detail page: keep all info visible,
  replace only the contact area with a compact "locked" note.
- **Open**: none (will confirm with you on the live site once done).

### #5 — Minimal lead form — P1 · MVP · Feature
- **Today**: the admin form has many required fields and corporate words like "access",
  "budget (numeric)".
- **Want** (from your answers):
  - Only the **client contact** is required: **email, number (may or may not be WhatsApp),
    and website**.
  - Everything else optional (AI/Auto-Fill still fills title/description when it can).
  - Remove the **numeric budget** field.
  - Rename **budget string** → simple **"Cost / price"** (no jargon).
  - Remove the **"access required"** constraint.
- **Open**: none. CONFIRMED (3 Aug): at least ONE of email/number/website is required
  (not all three); title + description stay required; Lead Type decides locking.

### #6 — Visibility: all leads shown, contacts locked — P1 · MVP · Feature
- **Your clarification**: there is NO "free user" category anymore. A person is either a
  **PRO member** or **everyone else** (signed out, normal, or expired-PRO — all the same).
- **Want**:
  - **Nothing disappears from the list.** Everyone sees all leads.
  - Locking happens **only on the contact side**: PRO leads → contacts hidden for
    non-PRO people; FREE leads → contacts open to everyone.
  - HOT / FEATURED become just **badges / highlights** — they don't hide anything.
- **How**: change the server so the lead list returns everything to everyone; keep
  contact masking for PRO leads for non-PRO viewers. Confirm in the browser what a
  signed-out person sees.
- **Open**: CONFIRMED (3 Aug): PRO + HOT hide contacts; FREE + FEATURED open to everyone.

### #8 — Separate test site + test database — P0 prereq · MVP · Setup
- **Your plan** (good): a separate git branch → hosted on Vercel under its own URL →
  that branch uses a different database (different env vars) → we copy the real data
  into it for testing → once everything passes, we merge the code back to production.
- **How**:
  1. New branch, e.g. `staging`.
  2. Second Vercel project pointing at that branch → its own URL.
  3. Different database via env vars on that project.
  4. A small one-time script copies **leads + users** from the real database to the
     test database.
  5. Test everything there, then merge.
- **Open — one choice to make**: the test database can be
  **(a)** a second database inside the same Firebase project (simplest, free, but code
  must support picking a non-default database), or
  **(b)** a brand-new separate Firebase project (cleanest, fully isolated, but needs a
  new service-account key). I recommend **(b)** for zero risk to your real data. Which
  do you prefer?

### #1 — PRO max 2 devices — P2 · Post · Feature
- **Your answers**: applies to PRO only (FREE/signed-out = no limits). Owner-removes-device
  is too complicated for now — just add the blocker, save the "remove device" idea for later.
- **How it will work (explained first, as you asked)**:
  - Each browser gets a secret "device stamp" (a random id saved in the browser, invisible
    to the user).
  - On login, the server remembers which stamps that PRO account has used.
  - 1st and 2nd device → allowed. 3rd different device → login blocked with a friendly
    message like *"This PRO account is already in use on 2 devices."*
  - No data is deleted; the existing devices keep working.
- **Known edge (we'll handle in a later discussion)**: if someone clears their browser
  data, the stamp is lost and the app sees a "new device". The remove-device tool
  (P3/1b) is the fix for that.
- **Open**: exact block message; nothing else for now.

### #7 — Admin edits all user details — P2 · Post · Feature
- **Want**: in the Users panel, admin can view and edit everything about a user: name,
  plan, PRO expiry, and reset password (plus the existing username/plan/delete).
- **Careful zone**: editing user accounts touches login/security — handled by admin only.
- **How**: add edit + reset-password actions to the user management panel.
- **Open**: none.

### #9 — Real paging for the leads list — P3 · Post · Performance
- **Today**: the server sends EVERY lead in one response. The home page hides them
  12-at-a-time ("Load more" just reveals more of what was already downloaded), and
  search shows all matches at once. No real paging.
- **Want (when the lead count grows)**: the server returns only a page at a time
  (e.g. 20 per request), with a "Load more" that fetches the next page from the server.
  This keeps pages fast no matter how many leads exist.
- **Why low priority**: fine now, but every fetch downloads the whole list, so it will
  slow down as leads pile up.
- **How**: add limit/cursor to GET /api/leads (server), then the pages fetch the next
  page on demand.
- **Open**: none.

---

## Card display polish - DONE (pushed live 3 Aug)
- Contacts shown directly on cards for anyone who can see them; locked PRO/HOT
  leads show a blur with "Contact details locked - PRO members only" written ON
  the blur. A lead with no contact at all shows no blur/dummy text.
- Titles fit on one line (truncated with '...').
- "Other / Other" platform+category is hidden; the space is reserved so every
  card keeps the same height.
- Budget box + "View details" footer is uniform on all cards (featured cards use
  smaller text to fit the narrow width).
- "not disclosed" / "not present" in a budget box is real stored data, not a bug.

---

## Decisions logged today (so nothing is lost)
- Device limit is PRO-only; FREE/no-login has no limits. (#1)
- No "free user" category: it's PRO member vs everyone else. (#6)
- No lead disappears from lists; locking is only on contacts. (#6)
- Form keeps only 3 required contact fields (email, number, website); cost/price replaces
  budget; numeric budget and access-required removed. (#5)
- WhatsApp prefill: no AI, static template with the lead title. (#2)
- Device-removal tool deferred to later (#1b).
