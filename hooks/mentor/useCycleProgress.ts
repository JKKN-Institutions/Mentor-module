'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuthRetry } from '@/lib/utils/fetch-with-auth-retry';
import type { CycleProgressRow } from '@/lib/types/cycle';

/**
 * Cycle progress for mentors in the caller's scope.
 * The API applies tier scoping server-side (resolveAnalyticsScope):
 * mentors get their own row, HODs their department, admins their institution.
 */
export function useCycleProgress() {
  const [rows, setRows] = useState<CycleProgressRow[]>([]);
  const [maxCycle, setMaxCycle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuthRetry('/api/mentor-monitor/cycle-progress', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load cycle progress (${res.status})`);
      const json = await res.json();
      setRows(json?.data ?? []);
      setMaxCycle(json?.meta?.maxCycle ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cycle progress');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { rows, maxCycle, loading, error, refetch: fetchProgress };
}
