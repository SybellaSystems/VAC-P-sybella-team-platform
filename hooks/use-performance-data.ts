'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  PerformanceEntry,
  PerformanceEntryItem,
  PerformanceKpi,
  PerformanceObjective,
  PerformancePerson,
  PerformanceSnapshot,
  PerformanceDepartment,
} from '@/lib/performance-types';

function getHistoryStart(monthCount: number): string {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
  return `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
}

export function usePerformanceData(monthCount = 6) {
  const [data, setData] = useState<PerformanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = getHistoryStart(monthCount);
      const [peopleResult, departmentResult, kpiResult, entryResult, objectiveResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role, department, is_active').eq('is_active', true).order('full_name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('daily_kpis').select('id, title, target, unit, user_id, frequency, category, measurement_direction, objective_id, is_active, active_from, active_until').order('title'),
        supabase.from('daily_entries').select('id, user_id, entry_date, status, submitted_at').gte('entry_date', startDate).order('entry_date', { ascending: false }).limit(2000),
        supabase.from('objectives').select('id, title, description, level, department, status, end_date, quarter, year, owner_id, department_id').order('end_date'),
      ]);

      const firstError = peopleResult.error || departmentResult.error || kpiResult.error || entryResult.error || objectiveResult.error;
      if (firstError) throw firstError;

      const entries = (entryResult.data || []) as PerformanceEntry[];
      const entryIds = entries.map((entry) => entry.id);
      const itemResult = entryIds.length
        ? await supabase.from('daily_entry_items').select('id, entry_id, kpi_id, kpi_title, unit, target_value, number_value, proof_url, note, measurement_direction, category, objective_id, objective_title').in('entry_id', entryIds)
        : { data: [], error: null };
      if (itemResult.error) throw itemResult.error;

      setData({
        people: (peopleResult.data || []) as PerformancePerson[],
        departments: (departmentResult.data || []) as PerformanceDepartment[],
        kpis: (kpiResult.data || []) as PerformanceKpi[],
        entries,
        items: (itemResult.data || []) as PerformanceEntryItem[],
        objectives: (objectiveResult.data || []) as PerformanceObjective[],
      });
    } catch (loadError) {
      console.error('Unable to load VAC-P performance data:', loadError);
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [monthCount]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
