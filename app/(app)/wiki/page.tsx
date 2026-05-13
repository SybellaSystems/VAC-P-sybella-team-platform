'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { canEditWiki } from '@/lib/rbac';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Pencil, BookOpen } from 'lucide-react';
import { logAudit } from '@/lib/audit';

type WikiPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  is_published: boolean;
};

export default function WikiPageRoute() {
  useDocumentTitle('Wiki | VAC-P');
  const { profile } = useAuth();
  const [q, setQ] = useState('');
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [readPage, setReadPage] = useState<WikiPage | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WikiPage | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState({ slug: '', title: '', summary: '', content: '', is_published: true });

  const canEdit = canEditWiki(profile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_pages').select('*').order('updated_at', { ascending: false });
    setPages((data as WikiPage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((p) => {
      const hay = `${p.title} ${p.slug} ${p.summary ?? ''} ${p.content}`.toLowerCase();
      return hay.includes(query);
    });
  }, [pages, q]);

  const openCreate = () => {
    setEditing(null);
    setWizardStep(1);
    setForm({ slug: '', title: '', summary: '', content: '', is_published: true });
    setEditorOpen(true);
  };

  const openEdit = (p: WikiPage) => {
    setEditing(p);
    setWizardStep(1);
    setForm({
      slug: p.slug,
      title: p.title,
      summary: p.summary || '',
      content: p.content,
      is_published: p.is_published,
    });
    setEditorOpen(true);
  };

  const saveWiki = async () => {
    if (!profile) return;
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug || !form.title.trim()) return;
    if (editing) {
      await supabase
        .from('wiki_pages')
        .update({
          slug,
          title: form.title.trim(),
          summary: form.summary.trim() || null,
          content: form.content,
          is_published: form.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      await logAudit({ event_type: 'wiki.updated', entity_type: 'wiki_page', entity_id: editing.id, action: 'update' });
    } else {
      const { data } = await supabase
        .from('wiki_pages')
        .insert({
          slug,
          title: form.title.trim(),
          summary: form.summary.trim() || null,
          content: form.content || '',
          is_published: form.is_published,
          created_by_auth_user_id: profile.id,
        })
        .select('id')
        .maybeSingle();
      if (data?.id) await logAudit({ event_type: 'wiki.created', entity_type: 'wiki_page', entity_id: data.id, action: 'insert' });
    }
    setEditorOpen(false);
    await load();
  };

  return (
    <div className="min-h-full">
      <TopBar title="Wiki" subtitle="Knowledge base — policies, guides, FAQs" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wiki…" className="pl-9" />
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus size={16} />
              New page
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setReadPage(p)}
                className="text-left bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 hover:shadow transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <BookOpen size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">{p.is_published ? 'Live' : 'Draft'}</span>
                </div>
                <h3 className="font-semibold text-foreground mt-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.summary || p.slug}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!readPage} onOpenChange={(o) => !o && setReadPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">{readPage?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">/{readPage?.slug}</p>
          </DialogHeader>
          {readPage?.summary ? <p className="text-sm text-muted-foreground border-b border-border pb-3">{readPage.summary}</p> : null}
          <article className="prose prose-sm prose-slate max-w-none dark:prose-invert pt-2 whitespace-pre-wrap">
            {readPage?.content}
          </article>
          <DialogFooter className="gap-2 sm:gap-0">
            {canEdit && readPage && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  openEdit(readPage);
                  setReadPage(null);
                }}
              >
                <Pencil size={14} />
                Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => setReadPage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit page' : 'New wiki page'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Step {wizardStep} of 3</p>
          </DialogHeader>
          {wizardStep === 1 && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium">URL slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. remote-work-policy" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Page title" className="mt-1" />
              </div>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium">Summary</label>
                <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Short blurb for listings" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Body</label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} className="mt-1 font-mono text-xs" />
              </div>
            </div>
          )}
          {wizardStep === 3 && (
            <div className="space-y-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="rounded border-input"
                />
                Published (visible to whole org)
              </label>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p>
                  <strong>{form.title}</strong> · /{form.slug}
                </p>
                <p className="text-muted-foreground line-clamp-3">{form.summary || 'No summary'}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {wizardStep > 1 ? (
              <Button type="button" variant="outline" onClick={() => setWizardStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button
                type="button"
                onClick={() => setWizardStep((s) => s + 1)}
                disabled={wizardStep === 1 && (!form.slug.trim() || !form.title.trim())}
              >
                Next
              </Button>
            ) : (
              <Button type="button" onClick={() => void saveWiki()}>
                Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
