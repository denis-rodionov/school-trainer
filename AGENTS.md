# School Trainer — Agent Guide

This document gives AI coding agents the context needed to work on this project efficiently. Read it before making changes.

## What This Project Is

**School Trainer** is a supplementary school exercise trainer for children. It is not a full LMS — it focuses on daily practice worksheets across multiple subjects (math, German, English, and extensible to more).

The core idea is a **flexible exercise constructor**:

- **Trainers** (parents/teachers) define **topics** with a natural-language prompt and task description.
- The app generates **worksheets** of exercises on demand using AI (Google Gemini).
- **Students** complete worksheets in the browser; progress and statistics are tracked per subject.

Exercise formats are pluggable via `TopicType`:

| Type | Description |
|------|-------------|
| `FILL_GAPS` | Markdown with `<input data-answer="...">` gaps — see `src/utils/markdownParser.ts` |
| `DICTATION` | AI-generated text → TTS audio → student types answer in `<textarea>` |

New exercise types should follow the same pattern: add a type to `TopicType`, route in `src/services/exerciseGenerator.ts`, and add a renderer in `src/components/Worksheet/`.

## Where It Runs

| Environment | URL / target |
|-------------|--------------|
| **Production** | Firebase Hosting — project `school-trainer-70cb5`, URL `https://school-trainer-70cb5.web.app` |
| **Local dev** | `npm start` → `http://localhost:3000` |
| **Backend** | Firebase Auth + Firestore + Storage (no custom server; SPA calls Gemini API from the browser) |

Deploy flow: `npm run build` then `firebase deploy`. Hosting serves the `build/` directory (see `firebase.json`).

Secrets live in `.env.local` locally (never committed) and in Firebase Hosting environment config for production. See `README.md` and `docs/README_AI_SETUP.md` for setup steps.

## Users and Data Model

Two roles (`UserRole`): **student** and **trainer**.

```
users/{uid}
  └── subjects/{subjectName}     # topic assignments + statistics

topics/{topicId}                 # exercise templates (trainer-managed)

worksheets/{worksheetId}
  └── exercises/{exerciseId}     # generated exercises for a session
```

Security rules are in `firestore.rules` and `storage.rules`. Key constraints:

- Students read/write only their own worksheets and user data.
- Trainers can read all users and manage topics.
- All authenticated users can read topics.

Types are defined in `src/types/index.ts` — keep this file as the single source of truth for domain types.

## Code Quality Expectations

This is a small, long-lived family project. Prioritize:

1. **Readability over cleverness** — clear names, short functions, obvious control flow.
2. **Minimal scope** — change only what the task requires; no drive-by refactors.
3. **Follow existing patterns** — services in `src/services/`, components grouped by role (`Auth/`, `Student/`, `Trainer/`, `Worksheet/`), contexts for global state (`AuthContext`, `LanguageContext`).
4. **TypeScript strictness** — use existing types; extend `src/types/index.ts` when the domain changes.
5. **Self-explanatory code** — comments only for non-obvious business logic (e.g. Firestore batch-create rules, AI prompt structure).
6. **i18n** — UI strings go through `src/i18n/translations.ts`; subjects use `translateSubject()` with constants in `src/constants/subjects.ts`.

Avoid introducing new dependencies unless there is a strong reason. The stack is intentionally simple: React 19, TypeScript, MUI v5, React Router v6, Firebase client SDK, date-fns.

## Security

- **Never commit** `.env.local`, API keys, or credentials.
- **Gemini API key** (`REACT_APP_GEMINI_API_KEY`) is exposed to the browser by design (Create React App). Mitigate with:
  - HTTP referrer restrictions on the key (production domain + `localhost:3000`)
  - API quotas in Google Cloud Console
  - Monitoring usage in GCP billing
- **Firestore/Storage rules** must be updated and deployed (`firebase deploy --only firestore:rules,storage`) whenever data access patterns change.
- Do not weaken auth checks in `App.tsx` `ProtectedRoute` or `firestore.rules` for convenience.
- Prefer server-side secrets (Firebase Functions) only if browser exposure becomes unacceptable — that is a deliberate architectural change, not a quick fix.

## Cost Budget

**Target: $1–3 USD per child account per month** (AI + Firebase combined).

Planning assumptions:

- Exercise generation uses **Gemini Flash** (`gemini-2.5-flash` by default) — roughly $0.00003 per fill-gap exercise.
- Dictation adds TTS calls (same API key) and Firebase Storage for audio files — still low at family scale.
- Firebase Spark/free tier covers Auth, modest Firestore reads/writes, and Hosting for a handful of users.
- A typical child doing a few worksheets daily should stay well under $1/month in API costs alone.

When adding AI features:

- Prefer Flash models over Pro.
- Batch or cache where possible; avoid redundant regeneration.
- Log token usage (already supported in `src/services/ai.ts`) when evaluating new features.
- Set GCP quotas to cap runaway usage.

## Key Services (start here when debugging)

| File | Responsibility |
|------|----------------|
| `src/services/firebase.ts` | Firebase app initialization |
| `src/services/auth.ts` | Login, register, role assignment |
| `src/services/topics.ts` | CRUD for exercise topics |
| `src/services/worksheets.ts` | Worksheet lifecycle |
| `src/services/exerciseGenerator.ts` | Routes topic type → AI/TTS pipeline |
| `src/services/ai.ts` | Gemini fill-gap exercise generation |
| `src/services/aiDictation.ts` | Dictation text generation |
| `src/services/textToSpeech.ts` | Audio generation for dictation |
| `src/utils/markdownParser.ts` | Parses exercise markdown into interactive inputs |

## Environment Variables

All client env vars must be prefixed with `REACT_APP_`. Restart `npm start` after changing `.env.local`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `REACT_APP_FIREBASE_*` | Yes | Firebase config (6 vars) |
| `REACT_APP_GEMINI_API_KEY` | Yes (for AI) | Gemini + TTS API key |
| `REACT_APP_GEMINI_MODEL` | No | Default: `gemini-2.5-flash` |
| `REACT_APP_GEMINI_API_VERSION` | No | Default: `v1beta` |

## Common Tasks

### Add a new subject
1. Add to `AVAILABLE_SUBJECTS` in `src/constants/subjects.ts`.
2. Add translation keys in `src/i18n/translations.ts`.
3. No Firestore migration needed — subjects are string constants.

### Add a new exercise type
1. Extend `TopicType` in `src/types/index.ts`.
2. Add generator logic in `src/services/exerciseGenerator.ts`.
3. Add UI component under `src/components/Worksheet/`.
4. Update trainer topic form (`src/components/Trainer/TopicForm.tsx`).
5. Add tests — see [Testing](#testing) below (parser/scoring unit tests, generator routing test, component smoke test).

### Change security or data access
1. Edit `firestore.rules` and/or `storage.rules`.
2. Deploy rules before relying on them: `firebase deploy --only firestore:rules,storage`.
3. Test with both student and trainer accounts.
4. Consider Firestore rules unit tests (`@firebase/rules-unit-testing`) when rules grow complex.

## Testing

Tests use **Jest + React Testing Library** via Create React App (`react-scripts test`). No extra test runner. Co-locate tests as `*.test.ts` / `*.test.tsx` next to the source file.

```bash
npm start              # local dev
npm run test:ci        # all tests once (preferred before deploy)
npm test               # Jest watch mode
npm run test:coverage  # tests + coverage report
npm run build          # production build
npm test -- markdownParser   # single file
```

See `README.md` for full run instructions. Tests do **not** need a real Firebase project or Gemini API key. AI features in the browser still require `REACT_APP_GEMINI_API_KEY` in `.env.local`.

### Test layout

```
src/
  utils/
    markdownParser.ts
    markdownParser.test.ts     ← co-located unit tests
  test/
    fixtures.ts                ← sample Topic, Exercise, markdown strings
    setupTests.ts              ← global Firebase/auth/service mocks (auto-loaded by Jest)
    renderWithProviders.tsx    ← MemoryRouter + LanguageProvider wrapper
```

### What to test (by priority)

| Priority | Category | When to add | How |
|----------|----------|-------------|-----|
| 1 | **Pure utils** | Any change to parsing, scoring, dates, i18n subject helpers | Unit tests, no mocks. Use `describe` + `it.each([...])` for table-driven cases. |
| 2 | **Extracted business logic** | Grade rules, AI markdown conversion, worksheet score % | Keep logic in `src/utils/` as pure functions; test directly. |
| 3 | **Services** | Orchestration (`exerciseGenerator`), HTTP (`ai.ts`) | `jest.mock` child services or `global.fetch`. Never call live Gemini/Firestore. |
| 4 | **Components** | Worksheet renderers, auth redirects | Import `src/test/setupMocks`, wrap with `renderWithProviders`. Test behavior, not MUI styling. |
| 5 | **E2E** (future) | Full login → worksheet flows | Playwright + Firebase emulators + seeded data. No Gemini in E2E. |

### Coverage map (existing tests)

| Area | Source | Test file |
|------|--------|-----------|
| Fill-gap parsing, drafts | `src/utils/markdownParser.ts` | `markdownParser.test.ts` |
| Dictation fuzzy match | `src/utils/dictationScoring.ts` | `dictationScoring.test.ts` |
| Dictation markdown | `src/utils/dictationParser.ts` | `dictationParser.test.ts` |
| Relative dates | `src/utils/dateUtils.ts` | `dateUtils.test.ts` |
| Subject translations | `src/i18n/translations.ts` | `translations.test.ts` |
| AI `____ (answer)` → `<input>` | `src/utils/aiMarkdownConverter.ts` | `aiMarkdownConverter.test.ts` |
| Grade scale 1–6 | `src/utils/gradeCalculator.ts` | `gradeCalculator.test.ts` |
| Worksheet score % | `src/utils/worksheetScoring.ts` | `worksheetScoring.test.ts` |
| Grade staleness | `src/services/gradeService.ts` | `gradeService.test.ts` |
| Topic type routing | `src/services/exerciseGenerator.ts` | `exerciseGenerator.test.ts` |
| Gemini fetch handling | `src/services/ai.ts` | `ai.test.ts` |
| Print HTML | `src/services/printing.ts` | `printing.test.ts` |
| Fill-gap UI | `src/components/Worksheet/ExerciseBlock.tsx` | `ExerciseBlock.test.tsx` |
| Auth smoke + role redirects | `src/App.tsx` | `App.test.tsx`, `App.protectedRoute.test.tsx` |

### How to cover common changes

**New/changed fill-gap or dictation parsing** → extend `markdownParser.test.ts`, `dictationParser.test.ts`, or `dictationScoring.test.ts`. Add fixtures to `src/test/fixtures.ts` when sample markdown is reused.

**New exercise type** → add routing in `exerciseGenerator.test.ts` (mock AI/TTS); add parser tests if new markdown shape; add a focused component test under `src/components/Worksheet/`.

**Changed grade or score rules** → update `gradeCalculator.test.ts` or `worksheetScoring.test.ts`. If logic is still embedded in a service/component, extract a pure function to `src/utils/` first.

**Changed AI output format** → update `aiMarkdownConverter.test.ts` and `ai.test.ts` (mocked `fetch` response).

**Changed auth or role routing** → update `App.protectedRoute.test.tsx`. Override `useAuth` via `jest.mocked(useAuth).mockReturnValue(...)`.

**New subject** → add constant + translation keys; extend `translations.test.ts` round-trip cases.

**Firestore/Storage rules** → manual test with student + trainer accounts; optional `@firebase/rules-unit-testing` (not set up yet).

### Mocking conventions

- **Firebase / Auth / Firestore services**: global mocks in `src/setupTests.ts` (loaded automatically by Jest).
- **Gemini API**: set `process.env.REACT_APP_GEMINI_API_KEY = 'AIzaFakeKeyForTests'` and mock `global.fetch` (see `ai.test.ts`).
- **Exercise generation pipeline**: `jest.mock('./ai')`, `jest.mock('./aiDictation')`, `jest.mock('./textToSpeech')` (see `exerciseGenerator.test.ts`).
- **Dates**: `jest.useFakeTimers()` + `jest.setSystemTime(...)` in `dateUtils.test.ts` pattern.

### What not to test

- Every MUI screen layout, theme, or CSS detail
- Live Gemini, TTS, or production Firebase calls in automated tests
- Full `WorksheetScreen.tsx` as a unit (cover via utils + future E2E)
- Snapshot-testing entire pages

### Verification checklist

After substantive changes, run:

```bash
npm run test:ci
npm run build
```

Manually verify role-based routes after auth changes.

## Additional Documentation

| Doc | Contents |
|-----|----------|
| `README.md` | Setup, deployment, project structure |
| `docs/README_AI_SETUP.md` | Gemini API setup, quotas, cost details |
| `docs/DICTATION_SETUP.md` | Dictation + TTS + Storage setup |
| `docs/DEPLOY_STORAGE_RULES.md` | Firebase Storage CORS and rules |

## What Not to Do

- Do not commit secrets or modify `.gitignore` to allow them.
- Do not add Cloud Functions or a backend unless explicitly requested — the current architecture is client-only + Firebase.
- Do not create commits or push unless the user asks.
- Do not expand README or docs unless the task requires it.
- Do not over-engineer abstractions for one-off logic.

## Product Direction (for context)

Near-term goals implied by the codebase:

- More exercise types via the flexible constructor pattern
- Additional subjects and languages (i18n already supports `en`, `ru`, `de`)
- Better statistics and progress reporting for trainers
- Keep per-child operating cost within the $1–3/month budget

When in doubt, favor simpler solutions that a parent can maintain and that stay readable for the next agent session.
