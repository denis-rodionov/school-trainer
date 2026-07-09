# Gutscheins — Business Logic

Gutscheins (🎟️) are per-subject voucher credits that protect a student's **grade** when they skip practice. They are stored on each student's subject document at `users/{uid}/subjects/{subjectName}`.

## Terminology

| Term | Meaning |
|------|---------|
| **Grade** | Subject rating on the German 1–6 scale (1 = best, 6 = worst). Shown with emoji faces in the UI. |
| **Worksheet** | One practice session the student completes via **Practice**. |
| **Gutschein** | One credit that prevents one grade step from worsening when the grade is recalculated. |
| **Default weekly Gutscheins** | Trainer-configured amount added to the balance at the start of each calendar week. |
| **Balance** | Current number of Gutscheins available for that subject. |

Gutscheins are **per subject per student**. Math and German each have their own balance and weekly allowance.

## Data fields

On `SubjectData.gutscheins`:

| Field | Set by | Purpose |
|-------|--------|---------|
| `balance` | System + trainer | Current Gutschein count |
| `defaultWeekly` | Trainer | Amount added each new week |
| `lastWeeklyRefillWeek` | System | ISO week key (e.g. `2026-W27`) of last refill |

## How grades work (without Gutscheins)

The raw grade is computed from completed worksheets:

- **Fewer than 6 worksheets total:** grade = `1 + days since last completion` (capped at 6).
- **6 or more worksheets:** grade = `7 − count in rolling last 7 days` (capped at 1–6).

Grades recalculate when a worksheet is completed, or once per calendar day when the student or trainer opens the dashboard (if stale).

## Spending Gutscheins

When the grade is recalculated:

1. Compute the **raw grade** from worksheet history (unchanged formula).
2. Compare with the **stored grade** for that subject.
3. If the raw grade would **worsen** (higher number):
   - Spend `min(steps to worsen, balance)` Gutscheins.
   - **Adjusted grade** = raw grade − Gutscheins spent.
4. If the raw grade is the same or **better**, no Gutscheins are spent.

**Example:** stored grade **2 (Good)**, student skipped a day → raw grade **3** → spend **1** Gutschein → adjusted grade stays **2**, balance decreases by 1.

**Example:** stored grade **2**, raw grade **5**, balance **2** → spend **2** → adjusted grade **3** (partial protection).

**Example:** balance **0** → adjusted grade equals raw grade (full downgrade).

On the **first** grade calculation (no stored grade yet), no Gutscheins are spent.

## Weekly refill

- Calendar weeks start on **Monday** (ISO week).
- On the **student's first dashboard load** in a new week, add `defaultWeekly` to `balance`.
- Refill runs **once per week** per subject (tracked via `lastWeeklyRefillWeek`).
- Refill always adds the default amount, even if no Gutscheins were spent the previous week.
- Refill does **not** run when a trainer views the student — only when the student opens their dashboard.

## Trainer actions

Trainers can (per subject, per student):

1. Set **default weekly Gutscheins** (≥ 0).
2. Add **bonus Gutscheins** (+1, +2, or a custom amount) for extra effort.

## Student view

Students see their current Gutschein balance (🎟️) next to the grade on each subject tab. They cannot change settings or add Gutscheins.

## Code locations

| Layer | File |
|-------|------|
| Pure logic | `src/utils/gutscheinCalculator.ts` |
| Firestore orchestration | `src/services/gutscheinService.ts` |
| Grade integration | `src/services/gradeService.ts` |
| Types | `src/types/index.ts` → `SubjectGutscheins` |
| UI | `src/components/Trainer/GutscheinPanel.tsx`, `src/components/Student/Assignments.tsx` |

## Edge cases

| Scenario | Behavior |
|----------|----------|
| `defaultWeekly` is 0 | Weekly refill adds nothing; trainer can still grant bonuses |
| Grade improves | Raw grade used; no Gutscheins spent |
| Multiple missed days at once | Each grade step costs one Gutschein (up to balance) |
| Existing subjects without `gutscheins` field | Defaults to `{ balance: 0, defaultWeekly: 0 }` on read |
