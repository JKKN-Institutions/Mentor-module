/**
 * Counseling cycle types.
 *
 * A cycle is per-mentor and fully derived from session counts — no cycle
 * state is stored. Cycle N is complete for a mentor when every assigned
 * mentee has at least N completed counseling sessions. The mentor's current
 * cycle is therefore min(completed sessions across mentees) + 1.
 */

export interface CycleStat {
  cycle: number;
  counseled: number; // mentees with >= cycle completed sessions
  total: number; // total assigned mentees
  percent: number;
  complete: boolean;
}

export interface PendingStudent {
  id: string;
  name: string;
}

export interface CycleProgressRow {
  mentorId: string;
  mentorName: string;
  departmentId: string | null;
  totalMentees: number;
  /** Cycles fully completed (every mentee counseled that many times). */
  completedCycles: number;
  /** completedCycles + 1; 0 when the mentor has no mentees. */
  currentCycle: number;
  cycles: CycleStat[];
  /** Mentees still missing their current-cycle session. */
  pendingStudents: PendingStudent[];
}

export interface CycleProgressMeta {
  total: number;
  /** Highest cycle reached by any mentor in scope — drives the dynamic tabs. */
  maxCycle: number;
}
