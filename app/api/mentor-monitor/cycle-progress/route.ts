import { createAdminClient } from '@/lib/supabase/server';
import { resolveAnalyticsScope } from '@/lib/services/mentor/session-analytics-scope';
import { ok, err } from '@/lib/utils/api-response';
import type { CycleProgressRow, CycleStat } from '@/lib/types/cycle';

export const dynamic = 'force-dynamic';

// Safety cap — a mentor with a pathological session count shouldn't produce
// an unbounded cycles array (and the UI can't render 100 tabs anyway).
const MAX_CYCLES = 20;

// PostgREST caps responses at 1000 rows; page through so institution-wide
// queries (2.8k mentor_students, 3.6k sessions) aren't silently truncated.
const PAGE_SIZE = 1000;

type PageQuery<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAllPages<T>(buildQuery: PageQuery<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const resolution = await resolveAnalyticsScope(sp);
    if (!resolution.ok) return err(resolution.error, resolution.status);

    const { filters } = resolution.scope;
    const supabase = createAdminClient();

    // Mentors in scope — same tier-forced filters as the other monitor tabs.
    let mentorQuery = supabase
      .from('mentors')
      .select('id, department_id, institution_id, user:users!inner(full_name)')
      .eq('is_active', true)
      .order('id');

    if (filters.scopedMentorId) {
      mentorQuery = mentorQuery.eq('id', filters.scopedMentorId);
    } else if (filters.institutionId) {
      mentorQuery = mentorQuery.eq('institution_id', filters.institutionId);
    }
    if (filters.departmentId) {
      mentorQuery = mentorQuery.eq('department_id', filters.departmentId);
    }

    const { data: mentors, error: mentorErr } = await mentorQuery;
    if (mentorErr) return err(mentorErr.message, 500);
    if (!mentors || mentors.length === 0) return ok([], { total: 0, maxCycle: 0 });

    const mentorIds = mentors.map((m) => m.id);

    // Assignments with student names (for the pending list).
    type AssignmentRow = {
      mentor_id: string;
      student_id: string;
      student: { id: string; name: string | null } | { id: string; name: string | null }[] | null;
    };
    const assignments = await fetchAllPages<AssignmentRow>((from, to) =>
      supabase
        .from('mentor_students')
        .select('mentor_id, student_id, student:students(id, name)')
        .in('mentor_id', mentorIds)
        .order('id')
        .range(from, to)
    );

    // Completed sessions only — a scheduled session hasn't counseled anyone
    // yet, so it doesn't advance a cycle. Cycles are intentionally all-time:
    // a cycle is a per-mentor round, not a date window, so the monitor's
    // date filters don't apply here.
    type SessionRow = { mentor_id: string; student_id: string | null };
    const sessions = await fetchAllPages<SessionRow>((from, to) =>
      supabase
        .from('counseling_sessions')
        .select('mentor_id, student_id')
        .eq('status', 'completed')
        .in('mentor_id', mentorIds)
        .order('id')
        .range(from, to)
    );

    // mentor → student → completed-session count
    const sessionCounts = new Map<string, Map<string, number>>();
    for (const s of sessions) {
      if (!s.student_id) continue;
      let perStudent = sessionCounts.get(s.mentor_id);
      if (!perStudent) {
        perStudent = new Map();
        sessionCounts.set(s.mentor_id, perStudent);
      }
      perStudent.set(s.student_id, (perStudent.get(s.student_id) ?? 0) + 1);
    }

    // mentor → mentees
    const menteesByMentor = new Map<string, { id: string; name: string }[]>();
    for (const a of assignments) {
      const student = Array.isArray(a.student) ? a.student[0] : a.student;
      if (!menteesByMentor.has(a.mentor_id)) menteesByMentor.set(a.mentor_id, []);
      menteesByMentor.get(a.mentor_id)!.push({
        id: a.student_id,
        name: student?.name ?? 'Unknown student',
      });
    }

    let maxCycle = 0;
    const rows: CycleProgressRow[] = mentors.map((m) => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      const mentorName = (user as { full_name?: string } | null)?.full_name ?? 'Unknown';
      const mentees = menteesByMentor.get(m.id) ?? [];
      const perStudent = sessionCounts.get(m.id);

      if (mentees.length === 0) {
        return {
          mentorId: m.id,
          mentorName,
          departmentId: m.department_id ?? null,
          totalMentees: 0,
          completedCycles: 0,
          currentCycle: 0,
          cycles: [],
          pendingStudents: [],
        };
      }

      const counts = mentees.map((s) => perStudent?.get(s.id) ?? 0);
      const completedCycles = Math.min(MAX_CYCLES, Math.min(...counts));
      const maxReached = Math.min(MAX_CYCLES, Math.max(...counts));
      const currentCycle = Math.min(MAX_CYCLES, completedCycles + 1);

      // Show every cycle anyone has touched, plus the in-progress one.
      const upTo = Math.max(currentCycle, maxReached);
      const cycles: CycleStat[] = [];
      for (let c = 1; c <= upTo; c++) {
        const counseled = counts.filter((n) => n >= c).length;
        cycles.push({
          cycle: c,
          counseled,
          total: mentees.length,
          percent: Math.round((counseled / mentees.length) * 100),
          complete: counseled === mentees.length,
        });
      }
      maxCycle = Math.max(maxCycle, upTo);

      const pendingStudents = mentees.filter(
        (s) => (perStudent?.get(s.id) ?? 0) < currentCycle
      );

      return {
        mentorId: m.id,
        mentorName,
        departmentId: m.department_id ?? null,
        totalMentees: mentees.length,
        completedCycles,
        currentCycle,
        cycles,
        pendingStudents,
      };
    });

    // Furthest-along mentors first; within a cycle, highest progress first.
    rows.sort((a, b) =>
      b.completedCycles - a.completedCycles ||
      (b.cycles[b.currentCycle - 1]?.percent ?? 0) - (a.cycles[a.currentCycle - 1]?.percent ?? 0)
    );

    return ok(rows, { total: rows.length, maxCycle });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return err(message, 500);
  }
}
