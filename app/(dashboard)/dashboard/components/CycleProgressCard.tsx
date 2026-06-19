'use client';

import { useMemo } from 'react';
import { RotateCw, CheckCircle2 } from 'lucide-react';
import { useCycleProgress } from '@/hooks/mentor/useCycleProgress';

/**
 * Dashboard cycle card. Scope comes from the API:
 * - a mentor gets one row → personal current-cycle progress
 * - HOD / admin get many rows → per-cycle completion distribution
 */
export function CycleProgressCard() {
  const { rows, maxCycle, loading } = useCycleProgress();

  const scoped = useMemo(() => rows.filter((r) => r.totalMentees > 0), [rows]);

  // Distribution for multi-mentor scopes: how many mentors completed each cycle.
  const distribution = useMemo(() => {
    const cycles = Math.min(Math.max(maxCycle, 1), 6); // show at most 6 bars
    return Array.from({ length: cycles }, (_, i) => {
      const c = i + 1;
      const done = scoped.filter((r) => r.cycles[c - 1]?.complete).length;
      return { cycle: c, done, total: scoped.length };
    });
  }, [scoped, maxCycle]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-neutral-200 p-6 h-48 animate-pulse" />;
  }

  if (scoped.length === 0) return null;

  const single = scoped.length === 1 ? scoped[0] : null;
  const currentStat = single ? single.cycles[single.currentCycle - 1] : null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <RotateCw className="w-4 h-4 text-[#0b6d41]" />
        <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">
          Counseling Cycles
        </h3>
      </div>

      {single ? (
        // Mentor view — own cycle progress
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0b6d41]/10 text-[#0b6d41] text-sm font-semibold">
              Cycle {single.currentCycle}
            </span>
            <span className="text-xs text-neutral-500">
              {single.completedCycles} cycle{single.completedCycles === 1 ? '' : 's'} completed
            </span>
          </div>
          {currentStat && (
            <>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-[#0b6d41] transition-all duration-500"
                  style={{ width: `${currentStat.percent}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500">
                {currentStat.counseled} of {currentStat.total} mentees counseled this cycle
                {single.pendingStudents.length > 0 && (
                  <> · <span className="text-amber-600 font-medium">{single.pendingStudents.length} pending</span></>
                )}
              </p>
            </>
          )}
        </div>
      ) : (
        // HOD / admin view — distribution across mentors
        <div className="space-y-2.5">
          {distribution.map((d) => {
            const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
            return (
              <div key={d.cycle}>
                <div className="flex justify-between text-xs text-neutral-600 mb-1">
                  <span className="font-medium">Cycle {d.cycle}</span>
                  <span className="flex items-center gap-1">
                    {pct === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {d.done}/{d.total} mentors · {pct}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 80 ? '#0b6d41' : pct >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
