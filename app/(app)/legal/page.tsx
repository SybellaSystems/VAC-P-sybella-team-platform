'use client';

import { useEffect, useState, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Scale, TriangleAlert as AlertTriangle, FolderOpen, Plus, Pencil, Trash2, Search, CircleAlert as AlertCircle, Calendar, Building2 } from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type LegalDocument = {
  id: string;
  title: string;
  document_type: string;
  status: string;
  counterparty: string;
  effective_date: string;
  expiry_date: string;
  summary: string;
  file_url: string;
  created_at: string;
};

type LegalMatter = {
  id: string;
  title: string;
  matter_type: string;
  priority: string;
  status: string;
  description: string;
  counterparty: string;
  opened_date: string;
  closed_date: string;
  created_at: string;
};

type Profile = { id: string; full_name: string };

/* --------------------------- Constants ---------------------------- */

const DOC_TYPES = [
  'contract',
  'policy',
  'agreement',
  'compliance',
  'ip',
  'regulatory',
] as const;

const DOC_STATUS = [
  'draft',
  'review',
  'approved',
  'active',
  'expired',
  'archived',
] as const;

const DOC_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-700',
  policy: 'bg-violet-100 text-violet-700',
  agreement: 'bg-teal-100 text-teal-700',
  compliance: 'bg-amber-100 text-amber-700',
  ip: 'bg-pink-100 text-pink-700',
  regulatory: 'bg-indigo-100 text-indigo-700',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-600',
};

const MATTER_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const MATTER_STATUS = ['open', 'in_progress', 'resolved', 'closed'] as const;
const MATTER_TYPES = [
  'litigation',
  'transaction',
  'compliance',
  'ip',
  'employment',
  'contract',
  'regulatory',
  'other',
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const MATTER_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
};

/* ----------------------------- Page ------------------------------- */

export default function LegalPage() {
  const { profile } = useAuth();

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [matters, setMatters] = useState<LegalMatter[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // document UI
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [docDialog, setDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [docForm, setDocForm] = useState<Partial<LegalDocument>>({});
  const [savingDoc, setSavingDoc] = useState(false);

  // matter UI
  const [matterSearch, setMatterSearch] = useState('');
  const [matterStatusFilter, setMatterStatusFilter] = useState('all');
  const [matterDialog, setMatterDialog] = useState(false);
  const [editingMatter, setEditingMatter] = useState<LegalMatter | null>(null);
  const [matterForm, setMatterForm] = useState<Partial<LegalMatter>>({});
  const [savingMatter, setSavingMatter] = useState(false);

  const canManage = ['admin', 'director', 'manager', 'legal_counsel'].includes(
    profile?.role || ''
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [docs, mats, prof] = await Promise.all([
        supabase.from('legal_documents').select('*').order('created_at', { ascending: false }),
        supabase.from('legal_matters').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name').order('full_name'),
      ]);
      if (docs.error) throw docs.error;
      if (mats.error) throw mats.error;
      if (prof.error) throw prof.error;
      setDocuments((docs.data as LegalDocument[]) || []);
      setMatters((mats.data as LegalMatter[]) || []);
      setProfiles((prof.data as Profile[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load legal data');
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------- Documents ---------------------------- */

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchType = docTypeFilter === 'all' || d.document_type === docTypeFilter;
      const q = docSearch.toLowerCase();
      const matchSearch =
        !q ||
        d.title?.toLowerCase().includes(q) ||
        d.counterparty?.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [documents, docTypeFilter, docSearch]);

  function openNewDoc() {
    setEditingDoc(null);
    setDocForm({
      title: '',
      document_type: 'contract',
      status: 'draft',
      counterparty: '',
      effective_date: '',
      expiry_date: '',
      summary: '',
      file_url: '',
    });
    setDocDialog(true);
  }

  function openEditDoc(d: LegalDocument) {
    setEditingDoc(d);
    setDocForm({ ...d });
    setDocDialog(true);
  }

  async function saveDoc() {
    if (!docForm.title?.trim()) return;
    setSavingDoc(true);
    try {
      const payload = {
        title: docForm.title,
        document_type: docForm.document_type,
        status: docForm.status,
        counterparty: docForm.counterparty,
        effective_date: docForm.effective_date || null,
        expiry_date: docForm.expiry_date || null,
        summary: docForm.summary,
        file_url: docForm.file_url,
      };
      if (editingDoc) {
        const { error } = await supabase
          .from('legal_documents')
          .update(payload)
          .eq('id', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('legal_documents').insert({
          ...payload,
          created_by: profile?.id,
        });
        if (error) throw error;
      }
      setDocDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save document');
    } finally {
      setSavingDoc(false);
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document?')) return;
    const { error } = await supabase.from('legal_documents').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* --------------------------- Matters ----------------------------- */

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      const matchStatus = matterStatusFilter === 'all' || m.status === matterStatusFilter;
      const q = matterSearch.toLowerCase();
      const matchSearch =
        !q ||
        m.title?.toLowerCase().includes(q) ||
        m.counterparty?.toLowerCase().includes(q) ||
        m.matter_type?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [matters, matterStatusFilter, matterSearch]);

  function openNewMatter() {
    setEditingMatter(null);
    setMatterForm({
      title: '',
      matter_type: 'contract',
      priority: 'medium',
      status: 'open',
      description: '',
      counterparty: '',
      opened_date: new Date().toISOString().slice(0, 10),
      closed_date: '',
    });
    setMatterDialog(true);
  }

  function openEditMatter(m: LegalMatter) {
    setEditingMatter(m);
    setMatterForm({ ...m });
    setMatterDialog(true);
  }

  async function saveMatter() {
    if (!matterForm.title?.trim()) return;
    setSavingMatter(true);
    try {
      const payload = {
        title: matterForm.title,
        matter_type: matterForm.matter_type,
        priority: matterForm.priority,
        status: matterForm.status,
        description: matterForm.description,
        counterparty: matterForm.counterparty,
        opened_date: matterForm.opened_date || null,
        closed_date: matterForm.status === 'closed' ? matterForm.closed_date || null : null,
      };
      if (editingMatter) {
        const { error } = await supabase
          .from('legal_matters')
          .update(payload)
          .eq('id', editingMatter.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('legal_matters').insert({
          ...payload,
          created_by: profile?.id,
        });
        if (error) throw error;
      }
      setMatterDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save matter');
    } finally {
      setSavingMatter(false);
    }
  }

  async function deleteMatter(id: string) {
    if (!confirm('Delete this matter?')) return;
    const { error } = await supabase.from('legal_matters').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* ---------------------------- Stats ------------------------------ */

  const totalDocs = documents.length;
  const activeDocs = documents.filter((d) => d.status === 'active').length;
  const openMatters = matters.filter(
    (m) => m.status === 'open' || m.status === 'in_progress'
  ).length;
  const criticalMatters = matters.filter((m) => m.priority === 'critical').length;

  /* --------------------------- Render ------------------------------- */

  return (
    <div>
      <TopBar title="Legal" subtitle="Legal documents and compliance" />
      <div className="p-4 sm:p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Documents</CardDescription>
              <CardTitle className="text-2xl">{totalDocs}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Documents</CardDescription>
              <CardTitle className="text-2xl">{activeDocs}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="h-4 w-4 text-emerald-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open Matters</CardDescription>
              <CardTitle className="text-2xl">{openMatters}</CardTitle>
            </CardHeader>
            <CardContent>
              <FolderOpen className="h-4 w-4 text-amber-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical Matters</CardDescription>
              <CardTitle className="text-2xl">{criticalMatters}</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="matters">Matters</TabsTrigger>
          </TabsList>

          {/* ----------------------- Documents ----------------------- */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="pl-9 w-52"
                  />
                </div>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <Button onClick={openNewDoc}>
                  <Plus size={16} className="mr-1.5" /> Add Document
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 mb-1">No documents found</p>
                    <p className="text-xs text-slate-400">
                      {canManage ? 'Add your first legal document.' : 'Documents will appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Document</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Counterparty</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Effective</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Expiry</th>
                          {canManage && <th className="px-5 py-3 w-20" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredDocs.map((d) => (
                          <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-foreground">{d.title}</p>
                              {d.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{d.summary}</p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge className={DOC_TYPE_COLORS[d.document_type] || 'bg-slate-100 text-slate-700'}>
                                {d.document_type}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge className={DOC_STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-700'}>
                                {d.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">
                              {d.counterparty || '—'}
                            </td>
                            <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                              {d.effective_date ? new Date(d.effective_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                              {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '—'}
                            </td>
                            {canManage && (
                              <td className="px-5 py-3.5">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDoc(d)}>
                                    <Pencil size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteDoc(d.id)}>
                                    <Trash2 size={14} className="text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------ Matters ------------------------ */}
          <TabsContent value="matters" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={matterSearch}
                    onChange={(e) => setMatterSearch(e.target.value)}
                    placeholder="Search matters..."
                    className="pl-9 w-52"
                  />
                </div>
                <Select value={matterStatusFilter} onValueChange={setMatterStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {MATTER_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <Button onClick={openNewMatter}>
                  <Plus size={16} className="mr-1.5" /> Add Matter
                </Button>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </CardContent>
              </Card>
            ) : filteredMatters.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Scale className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-1">No legal matters found</p>
                  <p className="text-xs text-slate-400">
                    {canManage ? 'Add your first legal matter.' : 'Matters will appear here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredMatters.map((m) => (
                  <Card key={m.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{m.title}</CardTitle>
                          <CardDescription className="capitalize">
                            {m.matter_type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={PRIORITY_COLORS[m.priority] || 'bg-slate-100 text-slate-700'}>
                            {m.priority}
                          </Badge>
                          <Badge className={MATTER_STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-700'}>
                            {m.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {m.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                      )}
                      {m.counterparty && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 size={12} />
                          <span className="truncate">{m.counterparty}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        <span>
                          Opened {m.opened_date ? new Date(m.opened_date).toLocaleDateString() : '—'}
                          {m.closed_date && ` · Closed ${new Date(m.closed_date).toLocaleDateString()}`}
                        </span>
                      </div>
                      {canManage && (
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" onClick={() => openEditMatter(m)}>
                            <Pencil size={13} className="mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteMatter(m.id)}>
                            <Trash2 size={13} className="mr-1 text-red-500" /> Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* --------------------- Document Dialog -------------------- */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Document' : 'Add Document'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Update document details.' : 'Add a new legal document.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={docForm.title || ''}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={docForm.document_type || 'contract'}
                  onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={docForm.status || 'draft'}
                  onValueChange={(v) => setDocForm({ ...docForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Counterparty</Label>
              <Input
                value={docForm.counterparty || ''}
                onChange={(e) => setDocForm({ ...docForm, counterparty: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Effective Date</Label>
                <Input
                  type="date"
                  value={docForm.effective_date ? docForm.effective_date.slice(0, 10) : ''}
                  onChange={(e) => setDocForm({ ...docForm, effective_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input
                  type="date"
                  value={docForm.expiry_date ? docForm.expiry_date.slice(0, 10) : ''}
                  onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Summary</Label>
              <Textarea
                value={docForm.summary || ''}
                onChange={(e) => setDocForm({ ...docForm, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">File URL</Label>
              <Input
                value={docForm.file_url || ''}
                onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveDoc} disabled={savingDoc}>
              {savingDoc ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------- Matter Dialog ---------------------- */}
      <Dialog open={matterDialog} onOpenChange={setMatterDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMatter ? 'Edit Matter' : 'Add Matter'}</DialogTitle>
            <DialogDescription>
              {editingMatter ? 'Update matter details.' : 'Create a new legal matter.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={matterForm.title || ''}
                onChange={(e) => setMatterForm({ ...matterForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Matter Type</Label>
                <Select
                  value={matterForm.matter_type || 'contract'}
                  onValueChange={(v) => setMatterForm({ ...matterForm, matter_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATTER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={matterForm.priority || 'medium'}
                  onValueChange={(v) => setMatterForm({ ...matterForm, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATTER_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={matterForm.status || 'open'}
                onValueChange={(v) => setMatterForm({ ...matterForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATTER_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Counterparty</Label>
              <Input
                value={matterForm.counterparty || ''}
                onChange={(e) => setMatterForm({ ...matterForm, counterparty: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Opened Date</Label>
                <Input
                  type="date"
                  value={matterForm.opened_date ? matterForm.opened_date.slice(0, 10) : ''}
                  onChange={(e) => setMatterForm({ ...matterForm, opened_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Closed Date</Label>
                <Input
                  type="date"
                  value={matterForm.closed_date ? matterForm.closed_date.slice(0, 10) : ''}
                  onChange={(e) => setMatterForm({ ...matterForm, closed_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={matterForm.description || ''}
                onChange={(e) => setMatterForm({ ...matterForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveMatter} disabled={savingMatter}>
              {savingMatter ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
