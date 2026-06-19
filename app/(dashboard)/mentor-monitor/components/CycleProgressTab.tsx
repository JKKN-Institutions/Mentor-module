'use client';

import { Fragment, useMemo, useState } from 'react';
import { RotateCw, CheckCircle2, Clock, Users2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CycleProgressRow } from '@/lib/types/cycle';

interface CycleProgressTabProps {
  data: CycleProgressRow[];
  loading: boolean;
}

function cycleStatus(row: CycleProgressRow, cycle: number) {
  const stat = row.cycles[cycle - 1];
  if (!stat) return { label: 'Not started', cls: 'bg-neutral-100 text-neutral-500' };
  if (stat.complete) return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  if (stat.counseled > 0) return { label: 'In progress', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Not started', cls: 'bg-neutral-100 text-neutral-500' };
}

export default function CycleProgressTab({ data, loading }: CycleProgressTabProps) {
  // Tabs are dynamic: one per cycle anyone in scope has reached.
  const maxCycle = useMemo(
    () => Math.max(1, ...data.map((r) => r.cycles.length)),
    [data],
  );
  const [selectedCycle, setSelectedCycle] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cycle = Math.min(selectedCycle, maxCycle);

  const summary = useMemo(() => {
    const withMentees = data.filter((r) => r.totalMentees > 0);
    const completed = withMentees.filter((r) => r.cycles[cycle - 1]?.complete).length;
    const inProgress = withMentees.filter((r) => {
      const s = r.cycles[cycle - 1];
      return s && !s.complete && s.counseled > 0;
    }).length;
    const notStarted = withMentees.length - completed - inProgress;
    return { mentors: withMentees.length, completed, inProgress, notStarted };
  }, [data, cycle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-[#0b6d41]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 py-16 text-center">
        <RotateCw className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
        <p className="text-sm text-neutral-500">No mentors in scope</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dynamic cycle pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: maxCycle }, (_, i) => i + 1).map((c) => {
          const isActive = c === cycle;
          return (
            <button
              key={c}
              onClick={() => setSelectedCycle(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-[#0b6d41] text-white border-[#0b6d41]'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-[#0b6d41] hover:text-[#0b6d41]'
              }`}
            >
              Cycle {c}
            </button>
          );
        })}
        <span className="text-xs text-neutral-400 ml-1">
          All-time · completed sessions only
        </span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 flex items-center gap-3 border border-neutral-200">
          <Users2 className="w-5 h-5 text-neutral-500 shrink-0" />
          <div>
            <p className="text-xl font-bold text-neutral-800">{summary.mentors}</p>
            <p className="text-xs text-neutral-500">Mentors with mentees</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-emerald-700">{summary.completed}</p>
            <p className="text-xs text-emerald-600">Completed Cycle {cycle}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3 border border-amber-100">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xl font-bold text-amber-700">{summary.inProgress}</p>
            <p className="text-xs text-amber-600">In progress</p>
          </div>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3 flex items-center gap-3 border border-neutral-200">
          <RotateCw className="w-5 h-5 text-neutral-500 shrink-0" />
          <div>
            <p className="text-xl font-bold text-neutral-700">{summary.notStarted}</p>
            <p className="text-xs text-neutral-500">Not started</p>
          </div>
        </div>
      </div>

      {/* Per-mentor table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3 font-semibold">Mentor</th>
              <th className="px-4 py-3 font-semibold text-center">Mentees</th>
              <th className="px-4 py-3 font-semibold text-center">Current cycle</th>
              <th className="px-4 py-3 font-semibold w-1/3">Cycle {cycle} progress</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Pending</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const stat = row.cycles[cycle - 1];
              const status = cycleStatus(row, cycle);
              const isExpanded = expanded === row.mentorId;
              const showPending = row.currentCycle === cycle && row.pendingStudents.length > 0;
              return (
                <Fragment key={row.mentorId}>
                  <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-medium text-neutral-800">{row.mentorName}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{row.totalMentees}</td>
                    <td className="px-4 py-3 text-center">
                      {row.totalMentees > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0b6d41]/10 text-[#0b6d41] text-xs font-semibold">
                          Cycle {row.currentCycle}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {stat ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${stat.percent}%`,
                                background: stat.complete ? '#0b6d41' : stat.percent >= 50 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500 whitespace-nowrap">
                            {stat.counseled}/{stat.total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-xs">
                          {row.totalMentees === 0 ? 'No mentees assigned' : 'Not reached'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {showPending ? (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : row.mentorId)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0b6d41] hover:underline"
                        >
                          {row.pendingStudents.length}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && showPending && (
                    <tr className="border-b border-neutral-100 bg-neutral-50/40">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                          Pending in Cycle {row.currentCycle}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.pendingStudents.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-xs text-neutral-700"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
