# Rules for the AI assistant working on LeadFlu

This file tells the AI assistant how to work on this project. The owner is NOT a
programmer, so the assistant must make the work easy to understand, safe, and minimal.

---

## 1. The 3 golden rules (always)

1. **KEEP IT SIMPLE.** Explain things in plain words. No jargon, no long technical
   essays. If the owner asks "what happened?", answer in 2–3 short sentences.
   Do not dump every detail, file name, and option on them.

2. **MAKE MINIMAL CHANGES.** Change ONLY what was asked. Use the smallest safe fix.
   Never rewrite whole files, never refactor, never reformat, never "clean up"
   unrelated code, never add features that were not requested. If the correct fix
   looks big or risky, STOP and tell the owner with 2–3 simple options.

3. **NEVER HIDE IMPORTANT THINGS.** Always state clearly, up front, in plain words:
   - anything that changes what the owner or users see,
   - anything that touches money, accounts, passwords, or security,
   - anything the OWNER must do afterwards (deploy, add a key, approve, click a button),
   - any risk (could delete data, could cost money, could break a feature).
   Say these things BEFORE making the change, not after.

---

## 2. Never do these (no exceptions)

- **Never show or commit secrets.** `.env.local` holds API keys and the service
  account. Never print its contents, never paste the admin password or any key in
  chat, never `git add` it, never commit it.
- **Never delete user or lead data** — not in Firestore, not in code, not in tests.
  Tests may create temporary data and clean it up, but never delete real data.
- **Never change the admin login** (username/password) or add a backdoor account.
- **Never change the free/PRO contact-masking rules** without asking the owner.
- **Never push to GitHub without the owner asking**, and always say "this will go
  live on the website" when a push is about to happen.

---

## 3. What the app is (plain summary)

- **LeadFlu** is a website where the owner posts video-editing gigs ("leads").
  Editors browse them, search, and unlock the client's contact details.
- **FREE leads**: contacts visible to everyone. **PRO leads**: contacts visible only
  to PRO users; everyone else sees masked contacts (e.g. `•••••@•••••.com`) and a
  "Contact locked" message.
- **Admin panel** (`/admin`): the owner adds leads (manually or by pasting a client
  message and pressing Auto-Fill), creates user accounts, sets/renews PRO (30 days),
  and deletes leads.
- **AI Auto-Fill**: Gemini reads a pasted client message and fills the lead form.
  If Gemini is down, **Groq** is used automatically as a backup. It only fills in
  what the message actually says — it never invents details.
- **Money is NOT inside the app yet.** PRO is granted manually by the owner over
  WhatsApp and lasts 30 days. Payments (Razorpay) are planned but not built.

---

## 4. How to work reliably (the Zero-Trust rules)

These rules exist because guessing, trusting memory, and blind trial-and-error are
how bugs get introduced. Each rule states the problem it prevents, then the rule.

1. **Never guess versions or how a library works.** The Problem: guessing the
   "latest version" or assuming how a library behaves can silently break the build
   on a different machine. The Rule: before writing code that uses a library, check
   the real installed version in the project (`package.json`, `node_modules/<library>`).
   If unsure how a library actually behaves, search the OFFICIAL docs/site for that
   exact version — never random blog posts. If something acts oddly, read the
   library's real code in `node_modules` to see why.

2. **Check reality, not memory.** The Problem: the assistant's memory of tools and
   APIs can be outdated. The Rule: for anything unfamiliar, look it up in the
   official documentation before writing code that relies on it.

3. **Isolate and diagnose first.** The Problem: running the whole app to find a bug
   is slow and confusing. The Rule: when something fails, make a tiny isolated check
   (a small script, one endpoint call, one focused test) that proves the exact
   failing step BEFORE running anything big.

4. **Explain before running commands.** The Problem: firing many commands to "see if
   it works" wastes time and hides mistakes. The Rule: say what a command does and
   why BEFORE running it. No blind trial-and-error.

5. **Confirm outside-the-code things first.** The Problem: the code cannot see the
   real world — whether a key is valid, a service is paid, or live data is ready.
   Acting on a guess fails silently or costs money. The Rule: before anything touches
   live, paid, or real things (API keys, real Firebase data, deploying, pushing
   live), confirm with the owner that it is ready and that they want it done.

6. **The final look is the owner's.** The Problem: if the assistant runs everything,
   the owner never sees how it actually behaves and cannot catch what looks wrong to
   a human. The Rule: the assistant runs the automatic checks. But for anything
   visual or live, tell the owner exactly what to look at and how — and NEVER claim
   something "looks right" until the owner has seen it.

7. **Never trust "it works" without proof.** The Problem: people and assistants
   easily miss a small warning or a silent failure. The Rule: before moving on,
   verify with the actual output of the checks (tests, typecheck, lint). If the
   owner says something works, verify it yourself or ask them to paste the console
   output.

8. **Use the fast, exact checks first.** The Problem: reading code by eye to find
   bugs is slow and error-prone. The Rule: if a quick tool gives an exact answer
   (typecheck, tests, lint), run it FIRST instead of guessing by reading code.

9. **A green check is not the whole story.** The Problem: passing checks cannot see
   what happens in the browser, or with empty and missing values. The Rule: before
   claiming done, trace the edge cases: empty fields, missing API keys, no internet,
   a user without a plan. These must fail gracefully with a friendly message —
   never crash the page or throw raw errors.

---

## 5. Touch zones

**Safe to change (when asked):**
- Look and feel of pages (text, colors, layout), search, lead cards, admin forms.
- Fixing a bug in the app.
- Adding a new small field to a form.

**Handle with care — always tell the owner first:**
- Anything that changes how leads are created/displayed or who can see contacts.
- Anything that changes AI behavior (Gemini/Groq), costs money, or calls paid APIs.
- Anything involving the live website (pushing to GitHub, deploy, environment keys).
- Anything that adds or removes data from the database.

**Never touch:**
- `.env.local` (the owner handles secrets).
- Admin credentials.
- `firebase-applet-config.json` (public Firebase config — leave as is).

---

## 6. Always tell the owner after finishing

End every completed task with a short, plain summary that includes:
1. What changed (one or two sentences).
2. What it looks like / how to see it.
3. **Anything the owner must do** (deploy, add an API key in Vercel, approve something).
4. If you made a decision on their behalf, say so and why — don't hide it.

---

## 7. Verify work before saying "done"

- After a code change, run:
  - `npm run lint` (must have no new warnings)
  - `npx tsc --noEmit` (must finish with no errors)
  - `npm test` (must pass; needs the dev server running: `npm run dev` first)
- **AI tests are COSTLY (Gemini is paid) - keep them out of `npm test`.** The normal
  test run never calls the AI endpoint. The AI extraction tests live separately in
  `tests/ai/` and run ONLY right before a push, with `npm run test:ai`. Don't run
  `npm test` and `npm run test:ai` back-to-back: the AI endpoint rate-limits itself
  (15/min) and will 429 the second run.
- If the change is visual only, still make sure the page loads at `http://localhost:3000`.
- Per the Zero-Trust rules, also trace the empty/missing-value cases (they must fail
  gracefully) and, if the change is visible, tell the owner what to check.
- If you cannot verify, say so honestly — don't claim it works.

---

## 8. Decisions already made — do not change unless the owner asks

- Admin panel is for the fixed admin account only.
- PRO leads are masked on the server for non-PRO users; the browser never receives
  real contact details for locked leads.
- AI extracts only what's in the message; missing budget stays empty.
- PRO expires after 30 days automatically.
- Search matches without case sensitivity; platform/category chips come from real data.
- Contact rows open the right app (email → mail, WhatsApp → chat, website → browser).
- `firestore.rules` denies direct reads/writes of `leads`/`users` (needs a manual
  `firebase deploy --only firestore:rules` by the owner to activate).

---

## 9. Quick map of the project

- `app/` — the website pages (admin panel, search, lead details, profile).
- `lib/` — the brains (contact masking, AI, server logic).
- `tests/` — automated tests (run with `npm test`).
- `handover-notes.txt` — the owner's notebook. When behavior changes, offer to
  update it in simple words.
- `.env.local` — SECRETS. Never open, show, or commit it.

---

## 10. If you're unsure what the owner wants

Make the most sensible, minimal choice, say clearly what you did and why, and move
on. Only if the task could delete data, cost money, or change how contacts/PRO work,
stop and ask ONE short question with simple options.

---

## 11. About this rules file

- **Don't bloat this file.** Only add a new rule here if it is a genuinely big
  lesson: something that could lose money or data, or change how the whole app
  behaves. Routine fixes, normal errors, and small tweaks do NOT belong here.
- **Save important discoveries.** If a non-obvious fix, tricky behavior, or decision
  is found, write it into `handover-notes.txt` in plain words so it is not lost in
  chat history.
