'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer } from '@/lib/database.types';
import { Plus, Search, Building2, Mail, Phone, Globe, DollarSign, X, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  prospect: 'bg-blue-100 text-blue-700',
  churned: 'bg-red-100 text-red-600',
};

const emptyForm = (): Partial<Customer> => ({
  name: '', email: '', phone: '', company: '', country: '', status: 'active', total_contract_value: 0, notes: '',
});

export default function CustomersPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const canManage = ['admin','director','manager','sales'].includes(profile?.role || '');

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    if (!supabase) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name?.trim()) return;
    if (!supabase) return;
    setSaving(true);
    await supabase.from('customers').insert({ ...form, created_by: profile?.id });
    await loadCustomers();
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  };

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalValue = customers.reduce((sum, c) => sum + (c.total_contract_value || 0), 0);
  const activeCount = customers.filter(c => c.status === 'active').length;

  return (
    <div>
      <TopBar title="Customers" subtitle={`${customers.length} total · $${(totalValue/1000).toFixed(0)}K total contract value`} />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: customers.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active', value: activeCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Prospects', value: customers.filter(c => c.status === 'prospect').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Value', value: `$${(totalValue/1000).toFixed(0)}K`, color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Building2 size={18} className={color} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary w-52"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              {['active','inactive','prospect','churned'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
            >
              <Plus size={16} />
              Add Customer
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Country</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Contract Value</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4" colSpan={6}>
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No customers found.{canManage && <> <button onClick={() => setShowModal(true)} className="text-primary hover:underline">Add one</button>.</>}
                  </td>
                </tr>
              )}
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(customer)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{customer.country || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[customer.status]}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">
                    <span className="text-sm font-semibold text-foreground">
                      ${(customer.total_contract_value || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add Customer</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                  <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
                  <input value={form.company || ''} onChange={e => setForm({ ...form, company: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Country</label>
                  <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value as Customer['status'] })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['active','inactive','prospect','churned'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contract Value ($)</label>
                <input type="number" value={form.total_contract_value || 0} onChange={e => setForm({ ...form, total_contract_value: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xl font-bold">{selected.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{selected.name}</p>
                <p className="text-sm text-muted-foreground">{selected.company}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: selected.email },
                { icon: Phone, label: 'Phone', value: selected.phone },
                { icon: Globe, label: 'Country', value: selected.country },
                { icon: DollarSign, label: 'Contract Value', value: `$${(selected.total_contract_value || 0).toLocaleString()}` },
              ].map(({ icon: Icon, label, value }) => value ? (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Icon size={15} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                </div>
              ) : null)}
              {selected.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
