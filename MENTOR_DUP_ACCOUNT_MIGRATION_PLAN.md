# Mentor Duplicate-Account Consolidation — DRY RUN PLAN

> **Status: PROPOSAL — no database writes have been made.** Review and approve before anything runs.
> Generated 2026-06-27 from live Supabase data.

## Problem
30 people have more than one `mentors` row (created from a JKKN-official `@jkkn.ac.in`
login plus an older personal-email / HR-API account). Students got assigned to whichever
row was current at the time, so:
- The admin directory dedups by name and shows the **max** count, but the detail page
  resolves a click to **one specific row** → list shows N, detail shows fewer/0.
- **115 students** are assigned only to **deactivated** mentor rows → invisible under any active mentor.

## Canonical-account selection rule
For each person, the **canonical** (keep) row is chosen as:
1. `is_active = true` **and** official `@jkkn.ac.in`, then
2. most assigned students, then
3. official over personal email.

All other rows are **merged into** the canonical row: their students are reassigned
(skipping students already on the canonical row, then deleting the leftover duplicate
rows), and the row is deactivated.

---

## Category 1 — Trivial cleanup (duplicate row has 0 students) — 23 people
Canonical already holds every distinct student; the duplicate is empty. **No student moves.**
Action: deactivate the empty duplicate row only. Zero risk to assignments.

| Person | KEEP (canonical) | DEACTIVATE (empty dup) |
|---|---|---|
| MAHENDIRAN S | mahendiran@jkkn.ac.in (28) | smmahashree@gmail.com (0, already inactive) |
| Mr. ARUN V P | arunvp@jkkn.ac.in (28) | veparun@outlook.com (0) |
| Ms.S.Kayathri | kayathri@jkkn.ac.in (26) | skbiocare@gmail.com (0) |
| Lavanya L | lavanya_l@jkkn.ac.in (25) | lavanya.lavan23@gmail.com (0, inactive) |
| Shaanthanu K | shaanthanu@jkkn.ac.in (22) | shaanthanu@gmail.com (0, inactive) |
| MANIMEGALAI G | manimegalai@jkkn.ac.in (21) | gmmanimegalai11420@gmail.com (0) |
| Dr. RAJKUMAR J | drrajkumar@jkkn.ac.in (18) | rajfeb24@gmail.com (0, inactive) |
| Tamilselvi D.K | tamilselvi.d@jkkn.ac.in (18) | pappatamil04@gmail.com (0) |
| SARAVANAN J | saravanan.j@jkkn.ac.in (16) | saravananj6102000@gmail.com (0) |
| MOUNIGA G | mouniga@jkkn.ac.in (15) | mounigaganesan98@gmail.com (0, inactive) |
| RAMYA B | ramya_b@jkkn.ac.in (15) | ramyabr2299@gmail.com (0, inactive) |
| DR. SENTHIL M | senthil.m@jkkn.ac.in (14) | senpharm@gmail.com (0, inactive) |
| MISS. THENMOZHI V | thenmozhi.v@jkkn.ac.in (14) | thenmozhipharm@gmail.com (0, inactive) |
| DHARSHINI DEVI M | dharshinidevi@jkkn.ac.in (11) | mdharshini02@gmail.com (0, inactive) |
| MR. JAYAPRAKASH N | jayaprakash@jkkn.ac.in (11) | jayaprakashbds@gmail.com (0) |
| Mrs.Janani P | jananip@jkkn.ac.in (11) | bscjanani3@gmail.com (0, inactive) |
| MRS.SANTHIYA B | santhiyab@jkkn.ac.in (11) | san1441994@gmail.com (0, inactive) |
| NIVETHITHA K | nivethitha24mscn@jkkn.ac.in (11) | nivethithak2@gmail.com (0, inactive) |
| PRIYADHARSHINI N | priyadharshini.n1@jkkn.ac.in (11) | priya7guru7@gmail.com (0, inactive) |
| Ravkishore KN | ravikisshore@jkkn.ac.in (8) | ashwinsrinath0@gmail.com (0, inactive) |
| Reshaf ismael | reshafismael@jkkn.ac.in (8) | dr.reshaf@gmail.com (0) |
| Yogesh Kumar TD | hodpedodontics@jkkn.ac.in (8) | kidodontist.yk@gmail.com (0) |
| Dr. N. Latha | hodphysics@jkkn.ac.in (2) | latha.n@jkkn.ac.in (0) |

## Category 2 — Genuine split, both rows active (REASSIGN students) — 4 people
Distinct students > largest single row, so students are spread across rows. Reassign to canonical.

| Person | KEEP (canonical) | MERGE FROM | Students to move | Distinct total |
|---|---|---|---|---|
| MRS. DEEPIKA R | deepikar1@jkkn.ac.in (28) | deepika.r@jkkn.ac.in (11) + deepiphy@gmail.com (0) | **11** | 39 |
| MRS. VENNILA A | vennila-a@jkkn.ac.in (23) | vennila.a@jkkn.ac.in (11) | **11** | 34 |
| MR.JASWANTH J | jaswanth@jkkn.ac.in (10) | jasdebute@gmail.com (10, SAME 10) | 0 (dedupe dup rows) | 10 |
| DR. VINOD THANGASWAMY S | vinodthangaswamy@jkkn.ac.in (9) | hodoralsurgery@jkkn.ac.in (9, SAME 9, inactive) | 0 (dedupe dup rows) | 9 |

## Category 3 — ⚠️ NEEDS HUMAN DECISION (student-bearing row is INACTIVE) — 2 people
The row holding the students is deactivated, and the official/active alternative has 0.
Do NOT auto-merge — confirm whether the person is still employed and which account is correct.

| Person | Row WITH students | Other row | Question |
|---|---|---|---|
| MRS. MEENA S | meenas@jkkn.ac.in (23, **inactive**) | meena.s@jkkn.ac.in (0, inactive) | Is she still active? If yes, reactivate meenas@ (canonical) — 23 students currently have no active mentor. |
| Dakshina Jothimurugan | drdakshinajothimurugan@gmail.com (8, **inactive**) | dakshina.j@jkkn.ac.in (0, inactive) | If active, make dakshina.j@ canonical, reactivate, move 8 students. Both rows currently inactive → 8 students unmentored. |

---

## Proposed SQL (idempotent, per canonical/duplicate pair) — NOT YET RUN
For each (canonical_mentor_id, duplicate_mentor_id) pair from Categories 1 & 2:

```sql
-- 1. Move students that are NOT already on the canonical row
UPDATE mentor_students ms
SET mentor_id = :canonical_mentor_id
WHERE ms.mentor_id = :duplicate_mentor_id
  AND NOT EXISTS (
    SELECT 1 FROM mentor_students c
    WHERE c.mentor_id = :canonical_mentor_id AND c.student_id = ms.student_id
  );

-- 2. Delete leftover duplicate rows (student already on canonical)
DELETE FROM mentor_students WHERE mentor_id = :duplicate_mentor_id;

-- 3. Deactivate the duplicate mentor row
UPDATE mentors SET is_active = false, updated_at = now() WHERE id = :duplicate_mentor_id;
```
The `trg_sync_mentor_total_students` trigger keeps `total_students` correct automatically.
Category 3 pairs are EXCLUDED until you decide; they may instead need the canonical row REACTIVATED.

## Expected outcome after Categories 1 & 2
- DEEPIKA shows 39, VENNILA 34, etc. — one row per person, list == detail.
- ~28 of the 38 "duplicate" stranded assignments resolved.
- Remaining: Category 3 (~31 students under MEENA + Dakshina) await your active/inactive decision,
  plus any other stranded students not tied to a duplicate (the 115 total includes departed staff).

## Open question for you
1. Confirm the canonical picks above (especially any where you know the person prefers a specific account).
2. Decide Category 3 (MEENA S, Dakshina) — reactivate & merge, or leave (they may have left the institution).
3. After approval I will run Categories 1 & 2 in a transaction and re-verify counts.
