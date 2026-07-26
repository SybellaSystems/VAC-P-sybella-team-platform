'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project, FinancialRecord, BudgetProposal } from '@/lib/database.types';
import { Landmark, TrendingUp, DollarSign, CreditCard, FolderKanban, Wallet, ArrowUpRight, ArrowDownRight, ExternalLink, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useRouter } from 'next/navigation';

export default function FinanceConsolePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgetProposals, setBudgetProposals] = useState<BudgetProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: recs }, { data: projs }, { data: bps }] = await Promise.all([
      supabase.from('financial_records').select('*').order('date', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
      supabase.from('budget_proposals').select('*').order('created_at', { ascending: false }),
    ]);
    setRecords((recs as FinancialRecord[]) || []);
    setProjects((projs as Project[]) || []);
    setBudgetProposals((bps as BudgetProposal[]) || []);
    setLoading(false);
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const totalRevenue = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpenses = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const pendingInvoices = records.filter(r => r.type === 'invoice' && r.status === 'pending');
  const netIncome = totalRevenue - totalExpenses;

  // Project financial health
  const projectHealth = projects.map(p => {
    const projRecords = records.filter(r => r.project_id === p.id);
    const income = projRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const expense = projRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const budget = p.budget || 0;
    const spent = p.spent || expense;
    const utilization = budget > 0 ? (spent / budget) * 100 : 0;
    const margin = income - expense;
    const healthScore = budget > 0 ? Math.max(0, Math.min(100, 100 - utilization + (margin > 0 ? 10 : -10))) : 50;
    return { project: p, income, expense, budget, spent, utilization, margin, healthScore, recordCount: projRecords.length };
  }).filter(ph => ph.recordCount > 0 || ph.budget > 0);

  const pendingBudgetProposals = budgetProposals.filter(b => b.status === 'pending');
  const approvedBudgetTotal = budgetProposals.filter(b => b.status === 'approved').reduce((s, b) => s + b.amount, 0);

  // Monthly trend
  const monthlyTrend = (() => {
    const map: Record<string, { month: string; revenue: number; expenses: number; net: number }> = {};
    records.forEach(r => {
      const month = r.date.slice(0, 7);
      if (!map[month]) map[month] = { month, revenue: 0, expenses: 0, net: 0 };
      if (r.type === 'income') map[month].revenue += r.amount;
      if (r.type === 'expense') map[month].expenses += r.amount;
      map[month].net = map[month].revenue - map[month].expenses;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(d => ({
      ...d, month: new Date(d.month + '-01').toLocaleString('default', { month: 'short' }),
    }));
  })();

  if (loading) return (<div><TopBar title="Finance Console" subtitle="Loading..." />
    <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></div>);

  return (
    <div>
      <TopBar title="Finance Console" subtitle="Financial operations linked to projects" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12%' },
            { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString()}`, icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50', trend: '-3%' },
            { label: 'Pending Invoices', value: pendingInvoices.length, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50', trend: `${pendingInvoices.length} unpaid` },
            { label: 'Net Income', value: `$${netIncome.toLocaleString()}`, icon: Landmark, color: netIncome >= 0 ? 'text-blue-600' : 'text-red-600', bg: netIncome >= 0 ? 'bg-blue-50' : 'bg-red-50', trend: netIncome >= 0 ? 'profit' : 'loss' },
          ].map(({ label, value, icon: Icon, color, bg, trend }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}><Icon size={20} className={color} /></div>
                <span className="text-xs font-semibold text-muted-foreground">{trend}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Budget Proposals Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3"><Wallet size={16} className="text-primary" /><h3 className="font-semibold text-foreground text-sm">Budget Proposals</h3></div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending</span><span className="font-semibold text-amber-600">{pendingBudgetProposals.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Approved Total</span><span className="font-semibold text-emerald-600">${approvedBudgetTotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Proposals</span><span className="font-semibold text-foreground">{budgetProposals.length}</span></div>
            </div>
            <button onClick={() => router.push('/budget')} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1">
              Manage proposals <ExternalLink size={10} />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3"><FolderKanban size={16} className="text-primary" /><h3 className="font-semibold text-foreground text-sm">Project Budgets</h3></div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Allocated</span><span className="font-semibold text-blue-600">${projects.reduce((s, p) => s + (p.budget || 0), 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Spent</span><span className="font-semibold text-red-600">${projects.reduce((s, p) => s + (p.spent || 0), 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Active Projects</span><span className="font-semibold text-foreground">{projects.filter(p => p.status === 'active').length}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3"><Activity size={16} className="text-primary" /><h3 className="font-semibold text-foreground text-sm">Quick Actions</h3></div>
            <div className="space-y-1.5">
              <button onClick={() => router.push('/finance')} className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg transition-colors">View all financial records</button>
              <button onClick={() => router.push('/budget')} className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg transition-colors">Review budget proposals</button>
              <button onClick={() => router.push('/projects')} className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted rounded-lg transition-colors">View project budgets</button>
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Revenue, Expenses & Net Income Trend</h3>
          {monthlyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No financial data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}K`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(158,60%,40%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" stroke="hsl(213,88%,55%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Project Financial Health Table */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Project Financial Health</h3>
          {projectHealth.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No project financial data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Project</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Budget</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Spent</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Income</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Margin</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Utilization</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectHealth.map(({ project, income, expense, budget, spent, utilization, margin, healthScore }) => (
                    <tr key={project.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                      <td className="py-3 px-3"><div className="flex items-center gap-2">
                        <FolderKanban size={14} className="text-primary" />
                        <span className="font-medium text-foreground text-sm">{project.name}</span>
                      </div></td>
                      <td className="py-3 px-3 text-right text-sm font-medium text-blue-600">${budget.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-sm font-medium text-red-600">${spent.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-sm font-medium text-emerald-600">${income.toLocaleString()}</td>
                      <td className={`py-3 px-3 text-right text-sm font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${margin.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-muted rounded-full">
                            <div className={`h-1.5 rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, utilization)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{utilization.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${healthScore >= 70 ? 'bg-emerald-100 text-emerald-700' : healthScore >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {healthScore.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Invoices */}
        {pendingInvoices.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Pending Invoices</h3>
            <div className="space-y-2">
              {pendingInvoices.map(inv => {
                const proj = inv.project_id ? projectMap.get(inv.project_id) : null;
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-lg">
                    <CreditCard size={16} className="text-amber-600" />
                    <div className="flex-1"><p className="text-sm font-medium text-foreground">{inv.title}</p>
                      <p className="text-xs text-muted-foreground">{proj ? proj.name : 'No project'}</p></div>
                    <span className="text-sm font-bold text-amber-700">{inv.currency} {inv.amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
