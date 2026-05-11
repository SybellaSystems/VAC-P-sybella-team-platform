export type Role = 'admin' | 'director' | 'manager' | 'developer' | 'designer' | 'qa' | 'sales' | 'hr' | 'finance';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string;
  department: string;
  phone: string;
  location: string;
  bio: string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  status: 'active' | 'inactive' | 'prospect' | 'churned';
  total_contract_value: number;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  customer_id: string | null;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'direct';
  created_by: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'report' | 'escalation';
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  sender?: Profile;
};

export type AccountabilityReport = {
  id: string;
  member_id: string;
  report_date: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  completed_tasks: string;
  planned_tasks: string;
  blockers: string;
  notes: string;
  status: 'submitted' | 'reviewed' | 'approved' | 'flagged';
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialRecord = {
  id: string;
  title: string;
  type: 'income' | 'expense' | 'budget' | 'invoice';
  amount: number;
  currency: string;
  category: string;
  project_id: string | null;
  description: string;
  date: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'task' | 'message';
  is_read: boolean;
  link: string;
  created_at: string;
};

export type ProjectAssignment = {
  id: string;
  project_id: string;
  member_id: string;
  role_in_project: string;
  assigned_at: string;
};

// Supabase Database type - uses any for simplicity with the supabase-js client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
