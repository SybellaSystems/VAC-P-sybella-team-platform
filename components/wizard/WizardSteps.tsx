'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProjectWizardData } from '@/lib/wizard-types';
import {
  PROJECT_TYPE_LABELS,
  PROJECT_ROLE_LABELS,
  DEFAULT_MILESTONES,
  DEFAULT_PHASES,
  DEFAULT_INFORMATION_CHECKLIST,
} from '@/lib/wizard-types';
import {
  StepHeader,
  TextField,
  TextArea,
  SelectField,
  OptionCard,
  ListInput,
  TagInput,
} from './WizardFields';
import type { Profile, Customer, BudgetProposal } from '@/lib/database.types';
import { Briefcase, Building2, Handshake, Wrench, FlaskConical, Code as Code2, Server, Megaphone, Users, Scale, Search, Plus, Trash2, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Calendar, DollarSign, FolderOpen, ClipboardCheck, MessageSquare, ListTree, TriangleAlert, GitBranch, Link2, Mail, Phone, Globe, User } from 'lucide-react';

const PROJECT_TYPE_ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Building2,
  Handshake,
  Wrench,
  FlaskConical,
  Code2,
  Server,
  Megaphone,
  Users,
  Scale,
};

interface StepProps {
  data: ProjectWizardData;
  update: (patch: Partial<ProjectWizardData>) => void;
}

// ============================================================
// STEP 1: Project Type
// ============================================================
export function Step1ProjectType({ data, update }: StepProps) {
  const types = Object.keys(PROJECT_TYPE_LABELS) as (keyof typeof PROJECT_TYPE_LABELS)[];
  return (
    <div>
      <StepHeader
        step={1}
        title="Select Project Type"
        description="This determines how VAC-P behaves throughout the project lifecycle."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((type) => {
          const Icon = PROJECT_TYPE_ICON_MAP[type] || Briefcase;
          return (
            <OptionCard
              key={type}
              selected={data.project_type === type}
              onClick={() => update({ project_type: type })}
              icon={<Icon size={20} />}
              title={PROJECT_TYPE_LABELS[type]}
            />
          );
        })}
      </div>
      {data.project_type === 'internal' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Internal projects skip customer-related steps since there is no external client.
          </p>
        </div>
      )}
      {data.project_type === 'customer' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Customer projects require an owner/customer in the next step.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 2: Owner
// ============================================================
export function Step2Owner({ data, update }: StepProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setCustomers((data as Customer[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const nc = data.new_customer;
  const setNc = (patch: Partial<typeof nc>) =>
    update({ new_customer: { ...nc, ...patch } });

  return (
    <div>
      <StepHeader
        step={2}
        title="Project Owner"
        description="Who owns this project? Select an existing customer, create a new one, or mark it as internal."
      />
      {data.project_type === 'internal' && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <Building2 size={32} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Sybella Internal Project</p>
          <p className="text-xs text-slate-500 mt-1">
            No external customer needed. The project will be owned by Sybella Systems internally.
          </p>
        </div>
      )}
      {data.project_type !== 'internal' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <OptionCard
              selected={data.owner_type === 'existing'}
              onClick={() => update({ owner_type: 'existing' })}
              icon={<Building2 size={20} />}
              title="Existing Customer"
              description="Search and select from CRM"
            />
            <OptionCard
              selected={data.owner_type === 'new'}
              onClick={() => update({ owner_type: 'new' })}
              icon={<Plus size={20} />}
              title="New Customer"
              description="Create a new customer record"
            />
            <OptionCard
              selected={data.owner_type === 'internal'}
              onClick={() => update({ owner_type: 'internal' })}
              icon={<Briefcase size={20} />}
              title="Sybella Internal"
              description="Internal ownership"
            />
          </div>

          {data.owner_type === 'existing' && (
            <div>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {loading && (
                  <p className="text-sm text-slate-400 text-center py-4">Loading customers...</p>
                )}
                {!loading && filtered.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No customers found.</p>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update({ existing_customer_id: c.id })}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      data.existing_customer_id === c.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-sm font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {c.company || '—'} · {c.country || '—'}
                        </p>
                      </div>
                      {data.existing_customer_id === c.id && (
                        <CheckCircle size={18} className="text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.owner_type === 'new' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  After saving, this customer will automatically sync to HR, Finance, CRM, and the Customer module.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Company Name" required value={nc.name} onChange={(v) => setNc({ name: v })} placeholder="ABC Hotel Ltd" />
                <TextField label="Industry" value={nc.industry} onChange={(v) => setNc({ industry: v })} placeholder="Hospitality" />
                <TextField label="Country" value={nc.country} onChange={(v) => setNc({ country: v })} placeholder="Rwanda" />
                <TextField label="City" value={nc.city} onChange={(v) => setNc({ city: v })} placeholder="Kigali" />
                <TextField label="TIN" value={nc.tin} onChange={(v) => setNc({ tin: v })} placeholder="123456789" />
                <TextField label="Registration Number" value={nc.registration_number} onChange={(v) => setNc({ registration_number: v })} />
                <TextField label="Website" value={nc.website} onChange={(v) => setNc({ website: v })} placeholder="https://..." />
                <TextField label="Email" type="email" value={nc.email} onChange={(v) => setNc({ email: v })} />
                <TextField label="Phone" value={nc.phone} onChange={(v) => setNc({ phone: v })} />
                <TextField label="Physical Address" value={nc.physical_address} onChange={(v) => setNc({ physical_address: v })} />
                <TextField label="Postal Address" value={nc.postal_address} onChange={(v) => setNc({ postal_address: v })} />
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3">Contact Person</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label="Contact Name" value={nc.contact_person_name} onChange={(v) => setNc({ contact_person_name: v })} />
                  <TextField label="Position" value={nc.contact_position} onChange={(v) => setNc({ contact_position: v })} />
                  <TextField label="Contact Email" type="email" value={nc.contact_email} onChange={(v) => setNc({ contact_email: v })} />
                  <TextField label="Contact Phone" value={nc.contact_phone} onChange={(v) => setNc({ contact_phone: v })} />
                  <TextField label="Billing Contact" value={nc.billing_contact} onChange={(v) => setNc({ billing_contact: v })} />
                  <TextField label="Finance Contact" value={nc.finance_contact} onChange={(v) => setNc({ finance_contact: v })} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// STEP 3: Project Information
// ============================================================
export function Step3Information({ data, update }: StepProps) {
  return (
    <div>
      <StepHeader
        step={3}
        title="Project Information"
        description="Basic details about the project. The project code is generated automatically."
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Project Name" required value={data.name} onChange={(v) => update({ name: v })} placeholder="Customer Portal v2" />
          <TextField label="Project Code" value={data.project_code} onChange={(v) => update({ project_code: v })} placeholder="Auto-generated" hint="Leave empty to auto-generate" />
          <TextField label="Department" value={data.department} onChange={(v) => update({ department: v })} placeholder="Engineering" />
          <TextField label="Category" value={data.category} onChange={(v) => update({ category: v })} placeholder="Web Application" />
          <SelectField
            label="Priority"
            value={data.priority}
            onChange={(v) => update({ priority: v as any })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            Planning (automatic)
          </span>
        </div>
        <TextArea label="Description" value={data.description} onChange={(v) => update({ description: v })} placeholder="Describe the project..." rows={4} />
        <ListInput label="Objectives" items={data.objectives} onChange={(items) => update({ objectives: items })} placeholder="What should this project achieve?" />
        <ListInput label="Expected Deliverables" items={data.deliverables} onChange={(items) => update({ deliverables: items })} placeholder="What will be delivered?" />
        <ListInput label="Success Criteria" items={data.success_criteria} onChange={(items) => update({ success_criteria: items })} placeholder="How will success be measured?" />
        <TagInput label="Tags" tags={data.tags} onChange={(tags) => update({ tags })} placeholder="e.g. React, Hospitality" />
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Financial Planning
// ============================================================
export function Step4Financial({ data, update }: StepProps) {
  const [budgets, setBudgets] = useState<BudgetProposal[]>([]);
  const b = data.budget;
  const setB = (patch: Partial<typeof b>) => update({ budget: { ...b, ...patch } });

  useEffect(() => {
    supabase
      .from('budget_proposals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => setBudgets((data as BudgetProposal[]) || []));
  }, []);

  const costKeys = Object.keys(b.estimated_costs);
  const totalCost = Object.values(b.estimated_costs).reduce((s, v) => s + (Number(v) || 0), 0);
  const netPrice = b.customer_price - b.discount + b.taxes;
  const grossProfit = netPrice - totalCost;
  const margin = netPrice > 0 ? (grossProfit / netPrice) * 100 : 0;

  return (
    <div>
      <StepHeader
        step={4}
        title="Financial Planning"
        description="Set up the project budget, pricing, and estimated costs. Finance will receive a pending project record."
      />
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Budget Source</label>
          <div className="grid grid-cols-3 gap-3">
            <OptionCard selected={b.budget_source === 'existing'} onClick={() => setB({ budget_source: 'existing' })} title="Existing Budget" />
            <OptionCard selected={b.budget_source === 'new'} onClick={() => setB({ budget_source: 'new' })} title="Create New Budget" />
            <OptionCard selected={b.budget_source === 'skip'} onClick={() => setB({ budget_source: 'skip' })} title="Skip" />
          </div>
        </div>

        {b.budget_source === 'existing' && (
          <SelectField
            label="Select Budget"
            value={b.existing_budget_id}
            onChange={(v) => setB({ existing_budget_id: v })}
            options={[
              { value: '', label: '— Select —' },
              ...budgets.map((bg) => ({ value: bg.id, label: `${bg.title} (${bg.currency} ${bg.amount})` })),
            ]}
          />
        )}

        {b.budget_source === 'new' && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label="Budget Name" value={b.budget_name} onChange={(v) => setB({ budget_name: v })} placeholder="Q2 Marketing Budget" />
              <TextField label="Department" value={b.department} onChange={(v) => setB({ department: v })} />
              <SelectField
                label="Currency"
                value={b.currency}
                onChange={(v) => setB({ currency: v })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'RWF', label: 'RWF' },
                  { value: 'GBP', label: 'GBP' },
                ]}
              />
              <TextField label="Estimated Cost" type="number" value={String(b.estimated_cost)} onChange={(v) => setB({ estimated_cost: Number(v) })} />
              <TextField label="Reserve" type="number" value={String(b.reserve)} onChange={(v) => setB({ reserve: Number(v) })} />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={b.approval_needed} onChange={(e) => setB({ approval_needed: e.target.checked })} className="rounded" />
                  Approval Needed
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Project Price</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TextField label="Customer Price" type="number" value={String(b.customer_price)} onChange={(v) => setB({ customer_price: Number(v) })} />
            <TextField label="Discount" type="number" value={String(b.discount)} onChange={(v) => setB({ discount: Number(v) })} />
            <TextField label="Taxes" type="number" value={String(b.taxes)} onChange={(v) => setB({ taxes: Number(v) })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Revenue</label>
              <div className="px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                {b.currency} {netPrice.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Estimated Costs</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {costKeys.map((key) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{key}</label>
                <input
                  type="number"
                  value={String(b.estimated_costs[key] || 0)}
                  onChange={(e) =>
                    setB({ estimated_costs: { ...b.estimated_costs, [key]: Number(e.target.value) } })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 rounded-xl text-white">
          <div>
            <p className="text-xs text-slate-400">Total Cost</p>
            <p className="text-lg font-bold">{b.currency} {totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Revenue</p>
            <p className="text-lg font-bold text-emerald-400">{b.currency} {netPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Gross Profit</p>
            <p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {b.currency} {grossProfit.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Margin %</p>
            <p className={`text-lg font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {margin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Documentation
// ============================================================
export function Step5Documentation({ data, update }: StepProps) {
  const docs = data.documents;
  const setDocs = (d: typeof docs) => update({ documents: d });

  const addDoc = () => {
    setDocs([...docs, { name: '', document_type: 'other', url: '', description: '' }]);
  };
  const updateDoc = (i: number, patch: Partial<(typeof docs)[0]>) => {
    const next = [...docs];
    next[i] = { ...next[i], ...patch };
    setDocs(next);
  };
  const removeDoc = (i: number) => setDocs(docs.filter((_, idx) => idx !== i));

  const docTypes = [
    'proposal', 'quotation', 'contract', 'scope', 'requirements',
    'design', 'meeting_minutes', 'invoice', 'purchase_order',
    'research', 'wireframes', 'ui', 'api_docs', 'other',
  ];

  return (
    <div>
      <StepHeader
        step={5}
        title="Documentation"
        description="Upload or link project documents. Each file is automatically classified into the project repository."
      />
      <div className="space-y-4">
        <div className="space-y-3">
          {docs.map((doc, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">Document {i + 1}</span>
                <button type="button" onClick={() => removeDoc(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Name" value={doc.name} onChange={(v) => updateDoc(i, { name: v })} placeholder="Signed Contract" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select
                    value={doc.document_type}
                    onChange={(e) => updateDoc(i, { document_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                  >
                    {docTypes.map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <TextField label="URL" value={doc.url} onChange={(v) => updateDoc(i, { url: v })} placeholder="https://..." />
                <TextField label="Description" value={doc.description} onChange={(v) => updateDoc(i, { description: v })} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addDoc} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80">
            <Plus size={16} /> Add document
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Git Repository (Optional)</p>
          <TextField label="Repository URL" value={data.git_repo_url} onChange={(v) => update({ git_repo_url: v })} placeholder="https://github.com/..." />
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Documentation Links</p>
          <div className="space-y-2">
            {data.doc_links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={link.name}
                  onChange={(e) => {
                    const next = [...data.doc_links];
                    next[i] = { ...next[i], name: e.target.value };
                    update({ doc_links: next });
                  }}
                  placeholder="Name (e.g. Figma)"
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={link.url}
                  onChange={(e) => {
                    const next = [...data.doc_links];
                    next[i] = { ...next[i], url: e.target.value };
                    update({ doc_links: next });
                  }}
                  placeholder="URL"
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="button" onClick={() => update({ doc_links: data.doc_links.filter((_, idx) => idx !== i) })} className="px-2.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => update({ doc_links: [...data.doc_links, { name: '', url: '' }] })} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80">
              <Plus size={16} /> Add link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 6: Requirements
// ============================================================
export function Step6Requirements({ data, update }: StepProps) {
  const r = data.requirements;
  const setR = (patch: Partial<typeof r>) => update({ requirements: { ...r, ...patch } });

  const toggleInfo = (item: string) => {
    const list = r.information_needed;
    setR({
      information_needed: list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item],
    });
  };

  return (
    <div>
      <StepHeader
        step={6}
        title="Customer Requirements"
        description="Track approvals needed, brand assets, credentials, and a live checklist of pending information."
      />
      <div className="space-y-5">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
            <input type="checkbox" checked={r.approval_needed} onChange={(e) => setR({ approval_needed: e.target.checked })} className="rounded" />
            Does this project need customer approval?
          </label>
          {r.approval_needed && (
            <TextField label="Approval Person" value={r.approval_person} onChange={(v) => setR({ approval_person: v })} placeholder="Who needs to approve?" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Brand Assets Available</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['logo', 'fonts', 'colors', 'photos', 'videos'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setR({ brand_assets: { ...r.brand_assets, [key]: !r.brand_assets[key] } })}
                className={`p-3 rounded-lg border-2 text-center transition-all capitalize text-sm ${
                  r.brand_assets[key] ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Credentials Required</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['hosting', 'domain', 'email', 'server', 'cloud', 'analytics', 'payment', 'social_media'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setR({ credentials_required: { ...r.credentials_required, [key]: !r.credentials_required[key] } })}
                className={`p-3 rounded-lg border-2 text-center transition-all capitalize text-sm ${
                  r.credentials_required[key] ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {key.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Information Still Needed (Live Checklist)</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DEFAULT_INFORMATION_CHECKLIST.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleInfo(item)}
                className={`p-2.5 rounded-lg border-2 text-center transition-all text-sm ${
                  r.information_needed.includes(item) ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Selected items become a live checklist on the project.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 7: Team Assignment
// ============================================================
export function Step7Team({ data, update }: StepProps) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [workloads, setWorkloads] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name').then(({ data }) => {
      const profs = (data as Profile[]) || [];
      setMembers(profs);
      // Calculate workload for each
      profs.forEach((p) => {
        supabase.from('project_assignments').select('id', { count: 'exact' }).eq('member_id', p.id).then(({ count }) => {
          setWorkloads((prev) => ({ ...prev, [p.id]: count ?? 0 }));
        });
      });
    });
  }, []);

  const roles = Object.keys(PROJECT_ROLE_LABELS) as (keyof typeof PROJECT_ROLE_LABELS)[];
  const team = data.team;
  const setTeam = (t: typeof team) => update({ team: t });

  const addRole = (role: keyof typeof PROJECT_ROLE_LABELS) => {
    if (team.some((t) => t.role === role)) return;
    setTeam([...team, { role, member_id: null, member_name: '', permissions: ['read'], current_projects: 0, availability: 100 }]);
  };
  const updateMember = (i: number, member_id: string) => {
    const next = [...team];
    const member = members.find((m) => m.id === member_id);
    next[i] = {
      ...next[i],
      member_id,
      member_name: member?.full_name || '',
      current_projects: workloads[member_id] ?? 0,
      availability: Math.max(0, 100 - (workloads[member_id] ?? 0) * 15),
    };
    setTeam(next);
  };
  const togglePermission = (i: number, perm: string) => {
    const next = [...team];
    const perms = next[i].permissions;
    next[i].permissions = perms.includes(perm as any) ? perms.filter((p) => p !== perm) : [...perms, perm as any];
    setTeam(next);
  };
  const removeRole = (i: number) => setTeam(team.filter((_, idx) => idx !== i));

  const allPermissions = ['read', 'write', 'approve', 'manage', 'finance', 'hr'];

  return (
    <div>
      <StepHeader
        step={7}
        title="Team Assignment"
        description="Select team members from HR. Workload and availability are shown to prevent over-assignment."
      />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => addRole(role)}
              disabled={team.some((t) => t.role === role)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + {PROJECT_ROLE_LABELS[role]}
            </button>
          ))}
        </div>

        {team.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No team members added yet. Click a role above to add one.</p>
          </div>
        )}

        {team.map((assignment, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">{PROJECT_ROLE_LABELS[assignment.role]}</span>
              <button type="button" onClick={() => removeRole(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign Member</label>
                <select
                  value={assignment.member_id || ''}
                  onChange={(e) => updateMember(i, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Select —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              {assignment.member_id && (
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Current Projects</p>
                    <p className="text-sm font-semibold text-slate-700">{assignment.current_projects}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Availability</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${assignment.availability < 30 ? 'bg-red-500' : assignment.availability < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${assignment.availability}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{assignment.availability}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {assignment.member_id && assignment.availability < 30 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={12} /> This person has low availability. Consider reassigning.
              </div>
            )}
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-600 mb-1.5">Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {allPermissions.map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePermission(i, perm)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-all ${
                      assignment.permissions.includes(perm as any)
                        ? 'bg-primary text-white'
                        : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {perm}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STEP 8: Timeline
// ============================================================
export function Step8Timeline({ data, update }: StepProps) {
  const milestones = data.milestones.length > 0 ? data.milestones : DEFAULT_MILESTONES;
  const setMilestones = (m: typeof milestones) => update({ milestones: m });

  const updateMilestone = (i: number, patch: Partial<(typeof milestones)[0]>) => {
    const next = [...milestones];
    next[i] = { ...next[i], ...patch };
    setMilestones(next);
  };

  return (
    <div>
      <StepHeader
        step={8}
        title="Timeline"
        description="Set project dates and milestones. Default milestones are pre-loaded."
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextField label="Project Start" type="date" value={data.start_date} onChange={(v) => update({ start_date: v })} />
          <TextField label="Expected Finish" type="date" value={data.end_date} onChange={(v) => update({ end_date: v })} />
          <TextField label="Deployment Date" type="date" value={data.deployment_date} onChange={(v) => update({ deployment_date: v })} />
          <TextField label="Warranty End" type="date" value={data.warranty_end} onChange={(v) => update({ warranty_end: v })} />
          <TextField label="Support End" type="date" value={data.support_end} onChange={(v) => update({ support_end: v })} />
          <TextField label="Maintenance End" type="date" value={data.maintenance_end} onChange={(v) => update({ maintenance_end: v })} />
        </div>

        <div className="pt-3 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Milestones</p>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-xs font-bold">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{m.name}</p>
                </div>
                <input
                  type="date"
                  value={m.target_date}
                  onChange={(e) => updateMilestone(i, { target_date: e.target.value })}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 9: Work Breakdown Structure
// ============================================================
export function Step9WBS({ data, update }: StepProps) {
  const phases = data.phases.length > 0 ? data.phases : DEFAULT_PHASES;
  const setPhases = (p: typeof phases) => update({ phases: p });

  const updatePhase = (i: number, patch: Partial<(typeof phases)[0]>) => {
    const next = [...phases];
    next[i] = { ...next[i], ...patch };
    setPhases(next);
  };

  const addTask = (pi: number) => {
    const next = [...phases];
    next[pi].tasks = [...next[pi].tasks, { title: '', description: '', estimated_hours: 0, owner_id: null, subtasks: [] }];
    setPhases(next);
  };
  const updateTask = (pi: number, ti: number, patch: Partial<(typeof phases)[0]['tasks'][0]>) => {
    const next = [...phases];
    next[pi].tasks[ti] = { ...next[pi].tasks[ti], ...patch };
    setPhases(next);
  };
  const removeTask = (pi: number, ti: number) => {
    const next = [...phases];
    next[pi].tasks = next[pi].tasks.filter((_, idx) => idx !== ti);
    setPhases(next);
  };

  return (
    <div>
      <StepHeader
        step={9}
        title="Work Breakdown Structure"
        description="Create phases and tasks immediately. Supports Gantt charts, Kanban boards, and workload planning."
      />
      <div className="space-y-4">
        {phases.map((phase, pi) => (
          <div key={pi} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold">
                {pi + 1}
              </div>
              <p className="text-sm font-semibold text-slate-700">{phase.name}</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">{phase.description}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <TextField label="Start" type="date" value={phase.start_date} onChange={(v) => updatePhase(pi, { start_date: v })} />
              <TextField label="End" type="date" value={phase.end_date} onChange={(v) => updatePhase(pi, { end_date: v })} />
            </div>
            <div className="space-y-2">
              {phase.tasks.map((task, ti) => (
                <div key={ti} className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Task {ti + 1}</span>
                    <button type="button" onClick={() => removeTask(pi, ti)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <TextField label="Title" value={task.title} onChange={(v) => updateTask(pi, ti, { title: v })} placeholder="Task title" />
                    <TextField label="Est. Hours" type="number" value={String(task.estimated_hours)} onChange={(v) => updateTask(pi, ti, { estimated_hours: Number(v) })} />
                  </div>
                  <div className="mt-2">
                    <TextArea label="Description" value={task.description} onChange={(v) => updateTask(pi, ti, { description: v })} rows={2} />
                  </div>
                  <div className="mt-2">
                    <ListInput label="Subtasks / Checklist" items={task.subtasks} onChange={(items) => updateTask(pi, ti, { subtasks: items })} placeholder="Subtask" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addTask(pi)} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80">
                <Plus size={14} /> Add task to {phase.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STEP 10: Risks
// ============================================================
export function Step10Risks({ data, update }: StepProps) {
  const [members, setMembers] = useState<Profile[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name').then(({ data }) => setMembers((data as Profile[]) || []));
  }, []);

  const risks = data.risks;
  const setRisks = (r: typeof risks) => update({ risks: r });
  const addRisk = () => setRisks([...risks, { risk: '', probability: 'medium', impact: 'medium', owner_id: null, mitigation: '' }]);
  const updateRisk = (i: number, patch: Partial<(typeof risks)[0]>) => {
    const next = [...risks];
    next[i] = { ...next[i], ...patch };
    setRisks(next);
  };
  const removeRisk = (i: number) => setRisks(risks.filter((_, idx) => idx !== i));

  const deps = data.dependencies;
  const setDeps = (d: typeof deps) => update({ dependencies: d });
  const addDep = () => setDeps([...deps, { description: '', dependency_type: 'external', due_date: '' }]);
  const updateDep = (i: number, patch: Partial<(typeof deps)[0]>) => {
    const next = [...deps];
    next[i] = { ...next[i], ...patch };
    setDeps(next);
  };
  const removeDep = (i: number) => setDeps(deps.filter((_, idx) => idx !== i));

  const depTypes = ['customer', 'payment', 'hosting', 'domain', 'government', 'internal', 'other'];

  return (
    <div>
      <StepHeader
        step={10}
        title="Risks & Dependencies"
        description="Register project risks and external dependencies that could impact delivery."
      />
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Risk Register</p>
          <div className="space-y-3">
            {risks.map((risk, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Risk {i + 1}</span>
                  <button type="button" onClick={() => removeRisk(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <TextField label="Risk" value={risk.risk} onChange={(v) => updateRisk(i, { risk: v })} placeholder="What could go wrong?" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Probability</label>
                      <select value={risk.probability} onChange={(e) => updateRisk(i, { probability: e.target.value as any })} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Impact</label>
                      <select value={risk.impact} onChange={(e) => updateRisk(i, { impact: e.target.value as any })} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
                      <select value={risk.owner_id || ''} onChange={(e) => updateRisk(i, { owner_id: e.target.value || null })} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white">
                        <option value="">—</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <TextArea label="Mitigation" value={risk.mitigation} onChange={(v) => updateRisk(i, { mitigation: v })} rows={2} />
                </div>
              </div>
            ))}
            <button type="button" onClick={addRisk} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80">
              <Plus size={16} /> Add risk
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Dependencies</p>
          <div className="space-y-3">
            {deps.map((dep, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Dependency {i + 1}</span>
                  <button type="button" onClick={() => removeDep(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <TextField label="Description" value={dep.description} onChange={(v) => updateDep(i, { description: v })} placeholder="Waiting for customer..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select value={dep.dependency_type} onChange={(e) => updateDep(i, { dependency_type: e.target.value as any })} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white">
                      {depTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <TextField label="Due Date" type="date" value={dep.due_date} onChange={(v) => updateDep(i, { due_date: v })} />
                </div>
              </div>
            ))}
            <button type="button" onClick={addDep} className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80">
              <Plus size={16} /> Add dependency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 11: Communication
// ============================================================
export function Step11Communication({ data, update }: StepProps) {
  const c = data.communication;
  const setC = (patch: Partial<typeof c>) => update({ communication: { ...c, ...patch } });

  const channels = ['Email', 'WhatsApp', 'VAC-P', 'Phone', 'Meetings'];

  return (
    <div>
      <StepHeader
        step={11}
        title="Communication"
        description="Define how the project team and stakeholders will communicate."
      />
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Preferred Communication Channels</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  const list = c.channels;
                  setC({ channels: list.includes(ch) ? list.filter((x) => x !== ch) : [...list, ch] });
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  c.channels.includes(ch) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Frequency</label>
          <select
            value={c.meeting_frequency}
            onChange={(e) => setC({ meeting_frequency: e.target.value as any })}
            className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={c.automatic_reminders} onChange={(e) => setC({ automatic_reminders: e.target.checked })} className="rounded" />
            Enable automatic reminders
          </label>
        </div>

        <ListInput
          label="Notification Recipients"
          items={c.notification_recipients}
          onChange={(items) => setC({ notification_recipients: items })}
          placeholder="Email or name"
        />

        <ListInput
          label="Escalation Contacts"
          items={c.escalation_contacts}
          onChange={(items) => setC({ escalation_contacts: items })}
          placeholder="Name or email for escalations"
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 12: Review
// ============================================================
export function Step12Review({ data }: StepProps) {
  const readiness = Math.round(
    ([
      [!!data.name, 10],
      [!!data.description, 5],
      [data.objectives.length > 0, 5],
      [data.deliverables.length > 0, 5],
      [data.success_criteria.length > 0, 5],
      [!!data.start_date, 5],
      [!!data.end_date, 5],
      [data.team.length > 0, 10],
      [data.team.some((t) => t.role === 'project_manager' && t.member_id), 10],
      [data.milestones.length > 0, 5],
      [data.phases.length > 0, 5],
      [data.phases.some((p) => p.tasks.length > 0), 5],
      [data.budget.budget_source !== 'skip' || data.budget.customer_price > 0, 5],
      [data.documents.length > 0, 5],
      [data.risks.length > 0 || data.project_type === 'internal', 5],
      [data.communication.channels.length > 0, 5],
    ] as [boolean, number][]).reduce((score, [passed, weight]) => {
      return score + (passed ? weight : 0);
    }, 0)
  );

  const totalCost = Object.values(data.budget.estimated_costs).reduce((s, v) => s + (Number(v) || 0), 0);
  const netPrice = data.budget.customer_price - data.budget.discount + data.budget.taxes;
  const grossProfit = netPrice - totalCost;
  const margin = netPrice > 0 ? (grossProfit / netPrice) * 100 : 0;

  const warnings: string[] = [];
  if (!data.name) warnings.push('Project name is required');
  if (!data.start_date) warnings.push('Start date not set');
  if (!data.end_date) warnings.push('End date not set');
  if (data.project_type !== 'internal' && data.owner_type === 'existing' && !data.existing_customer_id)
    warnings.push('No existing customer selected');
  if (data.project_type !== 'internal' && data.owner_type === 'new' && !data.new_customer.name)
    warnings.push('New customer name is empty');
  if (data.team.length === 0) warnings.push('No team members assigned');
  if (!data.team.some((t) => t.role === 'project_manager' && t.member_id))
    warnings.push('No project manager assigned');
  if (data.budget.customer_price > 0 && grossProfit < 0)
    warnings.push('Project has negative projected profit');

  return (
    <div>
      <StepHeader
        step={12}
        title="Review & Create"
        description="Review everything before creating the project. Missing information is highlighted."
      />
      <div className="space-y-4">
        {/* Readiness Score */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-300">Project Readiness Score</p>
            <p className="text-3xl font-bold">{readiness}%</p>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${
                readiness >= 80 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${readiness}%` }}
            />
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Warnings ({warnings.length})</p>
            </div>
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500" /> {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Project</p>
            <p className="text-sm font-bold text-slate-800">{data.name || 'Untitled'}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">Type: {data.project_type.replace('_', ' ')}</p>
            <p className="text-xs text-slate-500">Priority: {data.priority}</p>
            {data.project_code && <p className="text-xs text-slate-500">Code: {data.project_code}</p>}
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Financials</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Revenue:</span><span className="font-semibold text-emerald-600">{data.budget.currency} {netPrice.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Costs:</span><span className="font-semibold text-red-600">{data.budget.currency} {totalCost.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Profit:</span><span className={`font-semibold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{data.budget.currency} {grossProfit.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Margin:</span><span className="font-semibold">{margin.toFixed(1)}%</span></div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Team ({data.team.filter(t => t.member_id).length})</p>
            {data.team.filter(t => t.member_id).length === 0 ? (
              <p className="text-xs text-slate-400">No team assigned</p>
            ) : (
              <div className="space-y-1">
                {data.team.filter(t => t.member_id).map((t, i) => (
                  <p key={i} className="text-xs text-slate-600">{PROJECT_ROLE_LABELS[t.role]}: {t.member_name}</p>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Timeline</p>
            <p className="text-xs text-slate-600">Start: {data.start_date || '—'}</p>
            <p className="text-xs text-slate-600">End: {data.end_date || '—'}</p>
            <p className="text-xs text-slate-600">Milestones: {data.milestones.length}</p>
            <p className="text-xs text-slate-600">Phases: {data.phases.length}</p>
          </div>
        </div>

        {/* What will be created */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-800 mb-2">VAC-P will automatically create:</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
            {[
              'Project record',
              'Unique project code',
              'Customer (if new)',
              'Budget proposal',
              'Finance records',
              'Team assignments + notifications',
              'Default phases & milestones',
              'Tasks & subtasks',
              'Risk register',
              'Dependencies',
              'Document repository',
              'Communication channel',
              'Activity timeline',
              'Requirements checklist',
            ].map((item, i) => (
              <p key={i} className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-blue-600" /> {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
