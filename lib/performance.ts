import type {
  PerformanceEntry,
  PerformanceEntryItem,
  PerformancePerson,
  PerformanceSnapshot,
} from '@/lib/performance-types';

export type MeasurementDirection = 'higher' | 'lower' | 'binary';

export function calculateAchievementPercent(
  actual: number,
  target: number,
  direction: MeasurementDirection
): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target < 0) return null;

  if (direction === 'binary') {
    return actual >= target ? 100 : 0;
  }

  if (direction === 'lower') {
    if (target === 0) return actual <= 0 ? 100 : 0;
    if (actual <= 0) return 100;
    return (target / actual) * 100;
  }

  if (target === 0) return actual >= 0 ? 100 : 0;
  return (actual / target) * 100;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

export function recentMonthKeys(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

export type PerformanceResult = {
  entry: PerformanceEntry;
  item: PerformanceEntryItem;
  person: PerformancePerson | undefined;
  achievement: number;
};

export type PerformanceSummary = {
  activePeople: number;
  activeKpis: number;
  activeObjectives: number;
  approvedEntriesThisMonth: number;
  pendingEntries: number;
  averageAchievement: number | null;
  results: PerformanceResult[];
  monthlyTrend: { key: string; label: string; achievement: number | null; reports: number }[];
  departmentPerformance: { name: string; averageAchievement: number | null; resultCount: number }[];
  kpiPerformance: { id: string; title: string; unit: string; averageAchievement: number; resultCount: number }[];
};

export function summarizePerformance(
  snapshot: PerformanceSnapshot,
  now = new Date(),
  monthCount = 6
): PerformanceSummary {
  const entriesById = new Map(snapshot.entries.map((entry) => [entry.id, entry]));
  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const approvedEntries = snapshot.entries.filter((entry) => entry.status === 'approved');
  const pendingEntries = snapshot.entries.filter((entry) => entry.status === 'pending').length;
  const results: PerformanceResult[] = snapshot.items.flatMap((item) => {
    const entry = entriesById.get(item.entry_id);
    if (!entry || entry.status !== 'approved' || item.number_value === null) return [];
    const achievement = calculateAchievementPercent(
      item.number_value,
      item.target_value,
      item.measurement_direction
    );
    if (achievement === null) return [];
    return [{ entry, item, person: peopleById.get(entry.user_id), achievement }];
  });

  const currentResults = results.filter((result) => monthKey(result.entry.entry_date) === currentMonth);
  const achievementAverage = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  const monthlyTrend = recentMonthKeys(monthCount, now).map((key) => {
    const monthResults = results.filter((result) => monthKey(result.entry.entry_date) === key);
    return {
      key,
      label: monthLabel(key),
      achievement: achievementAverage(monthResults.map((result) => result.achievement)),
      reports: new Set(monthResults.map((result) => result.entry.id)).size,
    };
  });

  const byDepartment = new Map<string, number[]>();
  results.forEach((result) => {
    const department = result.person?.department || 'Unassigned';
    byDepartment.set(department, [...(byDepartment.get(department) || []), result.achievement]);
  });

  const byKpi = new Map<string, PerformanceResult[]>();
  results.forEach((result) => {
    byKpi.set(result.item.kpi_id, [...(byKpi.get(result.item.kpi_id) || []), result]);
  });

  const activeDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    activePeople: snapshot.people.length,
    activeKpis: snapshot.kpis.filter((kpi) =>
      kpi.is_active && kpi.active_from <= activeDate && (!kpi.active_until || kpi.active_until >= activeDate)
    ).length,
    activeObjectives: snapshot.objectives.filter((objective) => objective.status === 'active').length,
    approvedEntriesThisMonth: new Set(
      approvedEntries.filter((entry) => monthKey(entry.entry_date) === currentMonth).map((entry) => entry.id)
    ).size,
    pendingEntries,
    averageAchievement: achievementAverage(currentResults.map((result) => result.achievement)),
    results,
    monthlyTrend,
    departmentPerformance: Array.from(byDepartment, ([name, values]) => ({
      name,
      averageAchievement: achievementAverage(values),
      resultCount: values.length,
    })).sort((a, b) => (b.averageAchievement || 0) - (a.averageAchievement || 0)),
    kpiPerformance: Array.from(byKpi, ([id, values]) => ({
      id,
      title: values[0].item.kpi_title,
      unit: values[0].item.unit,
      averageAchievement: achievementAverage(values.map((value) => value.achievement)) || 0,
      resultCount: values.length,
    })).sort((a, b) => b.averageAchievement - a.averageAchievement),
  };
}
