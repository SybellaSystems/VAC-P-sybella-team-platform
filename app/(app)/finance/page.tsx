'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { FinancialRecord, Project } from '@/lib/database.types';
import { Plus, DollarSign, TrendingUp, TrendingDown, FileText, X, FolderKanban, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const typeColors: Record<string, string> = {
  income: 'bg-emerald-100 text-emerald-700',
  expense: 'bg-red-100 text-red-700',
  budget: 'bg-blue-100 text-blue-700',
  invoice: 'bg-amber-100 text-amber-700',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const emptyForm = (): Partial<FinancialRecord> & { project_id: string } => ({
  title: '', type: 'income', amount: 0, currency: 'USD', category: '', description: '',
  date: new Date().toISOString().split('T')[0], status: 'pending', project_id: '',
});

const COLORS = ['hsl(158,60%,40%)', 'hsl(0,72%,51%)', 'hsl(213,88%,40%)', 'hsl(35,82%,50%)'];

export default function FinancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const canManage = ['admin', 'director', 'finance'].includes(profile?.role || '');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: recs }, { data: projs }] = await Promise.all([
      supabase.from('financial_records').select('*').order('date', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
    ]);
    setRecords((recs as FinancialRecord[]) || []);
    setProjects((projs as Project[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('financial_records').insert({
      ...form,
      project_id: form.project_id || null,
      created_by: profile?.id,
    });
    if (error) { toast.error('Failed: ' + error.message); setSaving(false); return; }
    await loadAll();
    setSaving(false); setShowModal(false); setForm(emptyForm());
    toast.success('Financial record added');
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalBudget = records.filter(r => r.type === 'budget').reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const filtered = records.filter(r => {
    const matchType = filterType === 'all' || r.type === filterType;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchProject = filterProject === 'all' || r.project_id === filterProject;
    return matchType && matchStatus && matchProject;
  });

  // Per-project financial summary
  const projectFinancials = projects.map(p => {
    const projRecords = records.filter(r => r.project_id === p.id);
    const income = projRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const expense = projRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const budget = p.budget || 0;
    return { project: p, income, expense, budget, net: income - expense, count: projRecords.length };
  }).filter(pf => pf.count > 0 || pf.budget > 0);

  const monthlyData = (() => {
    const map: Record<string, { month: string; income: number; expense: number }> = {};
    records.forEach(r => {
      const month = r.date.slice(0, 7);
      if (!map[month]) map[month] = { month, income: 0, expense: 0 };
      if (r.type === 'income') map[month].income += r.amount;
      if (r.type === 'expense') map[month].expense += r.amount;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(d => ({
      ...d, month: new Date(d.month + '-01').toLocaleString('default', { month: 'short' }),
    }));
  })();

  const pieData = [
    { name: 'Income', value: totalIncome },
    { name: 'Expenses', value: totalExpense },
    { name: 'Budget', value: totalBudget },
  ].filter(d => d.value > 0);

  return (
    <div>
      <TopBar title="Finance" subtitle="Financial tracking linked to projects" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Income', value: `$${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Expenses', value: `$${totalExpense.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Net Profit', value: `$${netProfit.toLocaleString()}`, icon: DollarSign, color: netProfit >= 0 ? 'text-blue-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50' },
            { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Monthly Income vs Expenses</h3>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                  <Bar dataKey="income" fill="hsl(158,60%,40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Distribution</h3>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Financial Summary */}
        {projectFinancials.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Per-Project Financial Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Project</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Budget</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Income</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Expenses</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Net</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectFinancials.map(({ project, income, expense, budget, net, count }) => (
                    <tr key={project.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                      <td className="py-2.5 px-3"><div className="flex items-center gap-2">
                        <FolderKanban size={14} className="text-primary" />
                        <span className="font-medium text-foreground text-sm">{project.name}</span>
                      </div></td>
                      <td className="py-2.5 px-3 text-right text-sm font-medium text-blue-600">${budget.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-sm font-medium text-emerald-600">${income.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-sm font-medium text-red-600">${expense.toLocaleString()}</td>
                      <td className={`py-2.5 px-3 text-right text-sm font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${net.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Types</option>
              {['income', 'expense', 'budget', 'invoice'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['pending', 'approved', 'paid', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {canManage && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90">
              <Plus size={16} /> Add Record
            </button>
          )}
        </div>

        {/* Records table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Title</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Project</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No financial records found.</td></tr>
              )}
              {filtered.map(record => {
                const proj = record.project_id ? projectMap.get(record.project_id) : null;
                return (
                  <tr key={record.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground text-sm">{record.title}</p>
                      <p className="text-xs text-muted-foreground">{record.description}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {proj ? (
                        <button onClick={e => { e.stopPropagation(); router.push(`/projects/${proj.id}`); }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <FolderKanban size={12} /> {proj.name}
                          <ExternalLink size={10} />
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{record.category || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeColors[record.type]}`}>{record.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-bold ${record.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {record.type === 'expense' ? '-' : '+'}{record.currency} {record.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[record.status]}`}>{record.status}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add Financial Record</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Link to Project</label>
                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                  <option value="">No specific project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select value={form.type || 'income'} onChange={e => setForm({ ...form, type: e.target.value as FinancialRecord['type'] })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['income', 'expense', 'budget', 'invoice'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                  <input type="number" value={form.amount || 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                  <input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Salaries, Tools"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value as FinancialRecord['status'] })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['pending', 'approved', 'paid', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                  <select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['USD', 'EUR', 'RWF', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
