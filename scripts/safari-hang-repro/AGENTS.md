# Safari / WebKit hang reproduction scripts

Playwright scripts used to investigate intermittent **“stuck on loading”** after page refresh on production (`school-trainer-70cb5`). They are **not** part of the app build or CI — keep them for manual regression checks when touching auth, Firestore reads, or Safari-related fixes.

## Background

- **Desktop Chrome (Chromium):** reload stress tests showed ~0% hangs.
- **WebKit (Safari engine):** ~50–60% hangs on authenticated dashboard reloads; matches iPad Safari and **Chrome on iOS** (WebKit under the hood).
- Stuck state is usually **post-auth Firestore load** (layout visible, inner spinner), not a permanently pending auth iframe.

See root `AGENTS.md` and app code: `src/utils/firestoreResilience.ts`, `src/contexts/AuthContext.tsx`, `src/hooks/useFirestoreRecovery.ts`.

## Prerequisites

Playwright is **not** a project dependency. One-off install:

```bash
npm install --no-save playwright@1.61.1
npx playwright install chromium webkit
```

Credentials via environment variables (never commit real passwords):

```bash
export REPRO_EMAIL='student@example.com'
export REPRO_PASSWORD='...'
```

## Scripts

| Script | Purpose |
|--------|---------|
| `authed-reload-stress.mjs` | Log in, then N reloads on Chromium (baseline — should mostly pass). |
| `webkit-reload-stress.mjs` | Same on WebKit + multi-tab stress (reproduces Safari hangs). |
| `diagnose-stuck.mjs` | On reload, log pending auth/Firestore requests and console errors when stuck. |
| `diagnose-hang-layer.mjs` | Distinguish **auth boot** vs **dashboard data** hang (layout visible = post-auth). |

## Usage examples

```bash
# Chromium baseline (expect OK)
REPRO_EMAIL=... REPRO_PASSWORD=... node scripts/safari-hang-repro/authed-reload-stress.mjs \
  https://school-trainer-70cb5.firebaseapp.com 50

# Safari reproduction (expect intermittent STUCK)
REPRO_EMAIL=... REPRO_PASSWORD=... node scripts/safari-hang-repro/webkit-reload-stress.mjs \
  https://school-trainer-70cb5.web.app 30

# Layer diagnosis after a code change
REPRO_EMAIL=... REPRO_PASSWORD=... node scripts/safari-hang-repro/diagnose-hang-layer.mjs
```

Optional: pass `--headed` to `authed-reload-stress.mjs` for a visible browser.

## When to run

- After changes to `AuthContext`, `firestoreResilience`, `firebase.ts` auth init, or dashboard initial load paths.
- Before/after deploy when users report iPad refresh hangs.
- Do **not** add to `npm run test:ci` — these hit live production and need credentials.
