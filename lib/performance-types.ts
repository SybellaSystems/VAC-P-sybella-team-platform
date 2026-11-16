export type PerformancePerson = {
  id: string;
  full_name: string;
  role: string;
  department: string;
  is_active: boolean;
};

export type PerformanceDepartment = {
  id: string;
  name: string;
};

export type PerformanceKpi = {
  id: string;
  title: string;
  target: number;
  unit: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  category: string;
  measurement_direction: 'higher' | 'lower' | 'binary';
  objective_id: string | null;
  is_active: boolean;
  active_from: string;
  active_until: string | null;
};

export type PerformanceEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
};

export type PerformanceEntryItem = {
  id: string;
  entry_id: string;
  kpi_id: string;
  kpi_title: string;
  unit: string;
  target_value: number;
  number_value: number | null;
  proof_url: string | null;
  note: string;
  measurement_direction: 'higher' | 'lower' | 'binary';
  category: string;
  objective_id: string | null;
  objective_title: string | null;
};

export type PerformanceObjective = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  department: string;
  status: string;
  end_date: string | null;
  quarter: string;
  year: number;
  owner_id: string | null;
  department_id: string | null;
};

export type PerformanceSnapshot = {
  people: PerformancePerson[];
  departments: PerformanceDepartment[];
  kpis: PerformanceKpi[];
  entries: PerformanceEntry[];
  items: PerformanceEntryItem[];
  objectives: PerformanceObjective[];
};
