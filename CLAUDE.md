# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A Next.js 16 app that automates local-business sales outreach for **Infra2Rise** (a Dubai IT consulting firm): search Google Places for businesses → audit their web presence (PageSpeed Insights + competitor/social scan) → generate an AI cold email + call script (OpenAI) → send/track outreach, all behind Firebase-authenticated, admin-approved login.

## Commands

```bash
npm run dev     # starts on port 3003 (not 3000)
npm run build
npm run start   # port 3003
npm run lint
```

No test suite exists in this repo.

## Breaking Next.js changes in this version

This project pins a Next.js version with breaking API/convention changes vs. training data (see `AGENTS.md`). Notably:
- **`src/proxy.ts` replaces `middleware.ts`** — same request-interception role (auth gate + redirects), new file name/export (`export function proxy(...)`, `export const config = { matcher: [...] }`).
- Before touching routing, config, caching, or any App Router convention file, check `node_modules/next/dist/docs/` for the current API — do not assume standard Next.js behavior.

## Architecture

**Two separate persistence layers — don't confuse them:**
1. **Firestore** (`src/lib/firebase-admin.ts` server-side, `src/lib/firebase.ts` client-side) is the source of truth for **users** (`src/lib/users.ts`, collection `users`, doc ID = lowercased email) and **generated pitches** (`src/lib/pitch-storage.ts`, collection `generated_pitches`) — used for cross-device history, owner attribution, and CSV export.
2. **`localStorage`** (`src/lib/storage.ts` + `src/hooks/useStorage.ts`) holds `Lead`/`Campaign`/search-history/activity-feed state for the current browser only. `useStorage.ts` wraps it in `useSyncExternalStore`, syncing across components via a custom `storage-change` event (since same-tab `storage` events don't fire). There is no server sync of leads/campaigns — this is intentionally local/ephemeral app state, distinct from the Firestore-backed pitch records.

**Auth is custom, not Firebase session cookies:**
- Client signs in with Firebase Auth (Google provider) → posts the ID token to `POST /api/auth/session` → server verifies via `firebase-admin`, looks up/creates an `AppUser` in Firestore (`src/lib/users.ts`), and issues its own **HMAC-signed cookie** (`src/lib/session.ts`, `SESSION_SECRET` env var, home-rolled JWT-like format, no library).
- New signups default to `status: "pending"` unless their email is in `ADMIN_EMAILS`, in which case they're auto-approved as `admin`. Pending signups trigger a notification email to admins (`src/lib/mailer.ts`).
- `src/proxy.ts` gates every non-public route: no session → redirect `/login`; not-approved → redirect `/pending`; non-admin hitting `/admin*` or `/api/admin*` → redirect `/`. API routes get the same checks in `src/lib/auth-server.ts` (`requireApprovedSession`/`requireAdminSession`, thrown as `AuthError` and rendered via `authErrorResponse`) since `proxy.ts` matching isn't the only enforcement point for server logic that needs the caller's identity.
- Route groups: `src/app/(platform)/*` is the authenticated app shell (wrapped by `src/app/(platform)/layout.tsx`, which redirects unauthenticated/unapproved sessions server-side too — belt-and-suspenders with `proxy.ts`); `login`/`pending` are the public pages.

**Core pipeline (`Step = 'search' | 'select' | 'audit' | 'pitch'` in `src/lib/types.ts`):**
1. `GET /api/search` — Google Places API (New) `searchText`, returns `Business[]`.
2. `POST /api/audit` (`src/app/api/audit/route.ts`) — fetches place details, runs competitor `searchNearby` and social-profile discovery (HEAD-request probing of predictable profile URLs, not a real API) **in parallel**, then branches:
   - No real website (or the "website" Google has on file is actually a social-media URL — see `detectSocialOnlyWebsite`) → synthetic `generateNoWebsiteScores` pitch data, no PageSpeed call.
   - Real website → `getPageSpeedScores` calls PageSpeed Insights v5 (`runPagespeed`) for `performance`, `seo`, `accessibility`, `best_practices`. **No `strategy` param is passed, so PSI defaults to desktop** — this audit is currently desktop-only, not mobile.
   - PSI unreachable/erroring on the target site is deliberately reframed as a sales angle (`siteBroken`/`generateBrokenSiteScores`) rather than a generic failure — "if Google's bots can't reach it, neither can customers."
3. `POST /api/generate-pitch` — feeds a text summary of the `AuditResult` to two parallel OpenAI (`gpt-4o-mini`) calls (cold email JSON, call-script JSON) using a hardcoded `INFRA2RISE_CONTEXT` system prompt block; also renders the HTML email via `buildEmailHTML` in the same file (not a separate template engine — `src/lib/email-template.ts` is a different, simpler template used elsewhere, e.g. catch-up emails).
4. Send/track: `send-email`, `send-catchup` (follow-up nudge) use `src/lib/mailer.ts` (nodemailer over Gmail SMTP, `SMTP_*` env vars); sent/called/converted state is persisted back to the Firestore pitch doc via `pitch-storage.ts`, independent of the localStorage `Lead` record.

**Env vars** (see `.env.example` for the full list and setup links): `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` and `NEXT_PUBLIC_FIREBASE_*` are also used client-side; `PAGESPEED_API_KEY`, `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `SESSION_SECRET`, `ADMIN_EMAILS`, `SMTP_*`, `FIRM_*`, `CALENDLY_URL` are server-only. `SITE_PASSWORD` (optional blanket site password) is separate from the per-user auth flow above.
