'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { canEditWiki } from '@/lib/rbac';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Pencil, Sparkles, ChevronRight } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { createWikiPage, fetchWikiPages, updateWikiPage, wikiTemplates, type WikiPage } from '@/lib/queries';

type WikiForm = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  is_published: boolean;
  metadata: {
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
};

const initialForm: WikiForm = {
  slug: '',
  title: '',
  summary: '',
  content: '',
  is_published: true,
  metadata: {
    category: '',
    tags: [],
    featured: false,
  },
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
  const [form, setForm] = useState<WikiForm>(initialForm);

  const canEdit = canEditWiki(profile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchWikiPages();
    setPages(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('public:wiki_pages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_pages' }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => {
      const hay = `${page.title} ${page.slug} ${page.summary ?? ''} ${page.content}`.toLowerCase();
      return hay.includes(query);
    });
  }, [pages, q]);

  const openCreate = () => {
    setEditing(null);
    setWizardStep(1);
    setForm(initialForm);
    setEditorOpen(true);
  };

  const openEdit = (page: WikiPage) => {
    setEditing(page);
    setWizardStep(1);
    setForm({
      slug: page.slug,
      title: page.title,
      summary: page.summary || '',
      content: page.content,
      is_published: page.is_published,
      metadata: {
        category: page.metadata?.category || '',
        tags: page.metadata?.tags || [],
        featured: page.metadata?.featured || false,
      },
    });
    setEditorOpen(true);
  };

  const saveWiki = async () => {
    if (!profile) return;
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug || !form.title.trim()) return;

    if (editing) {
      await updateWikiPage(editing.id, {
        slug,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        content: form.content,
        is_published: form.is_published,
        metadata: {
          category: form.metadata.category,
          tags: form.metadata.tags,
          featured: form.metadata.featured,
        },
      });
      await logAudit({ event_type: 'wiki.updated', entity_type: 'wiki_page', entity_id: editing.id, action: 'update' });
    } else {
      const { data } = await createWikiPage({
        slug,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        content: form.content || '',
        is_published: form.is_published,
        created_by_auth_user_id: profile.id,
        metadata: {
          category: form.metadata.category,
          tags: form.metadata.tags,
          featured: form.metadata.featured,
        },
      });
      const created = data?.[0] as WikiPage | undefined;
      if (created?.id) {
        await logAudit({ event_type: 'wiki.created', entity_type: 'wiki_page', entity_id: created.id, action: 'insert' });
      }
    }

    setEditorOpen(false);
    await load();
  };

  return (
    <div className="min-h-full">
      <TopBar title="Wiki" subtitle="Knowledge base — policies, guides, FAQs" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-primary">Knowledge newsroom</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">A modern wiki designed like a newsroom.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Discover polished playbooks, release notes, policies, FAQs and team guides with curated templates, featured stories, and real-time update sync.
                </p>
              </div>
              {canEdit && (
                <Button className="w-full max-w-xs justify-center lg:w-auto" onClick={openCreate}>
                  <Plus size={16} />
                  New editorial page
                </Button>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Curated templates</span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">Featured stories</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Real-time updates</span>
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="overflow-hidden bg-slate-950 text-white">
              <CardHeader className="bg-slate-900">
                <CardTitle>Trending knowledge</CardTitle>
                <CardDescription>Most active categories from your shared knowledge base.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pages.slice(0, 8).map((page) => (
                  <div key={page.id} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:border-primary/70 transition-colors">
                    <p className="text-sm font-semibold text-white">{page.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{page.summary ? page.summary.substring(0, 90) : 'Internal wiki story'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Fast search</CardTitle>
                <CardDescription>Type any topic, policy, or workflow and the wiki updates instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {['Policy', 'How-to', 'Release', 'FAQ', 'Executive'].map((label) => (
                      <span key={label} className="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Browse guides built for clear reading, quick edits, and polished team storytelling.</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="relative max-w-xl">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inspiration, policy titles, or playbooks…" className="pl-9" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{pages.length} pages</span>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{filtered.length} matches</span>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">Loading updated wiki stories…</div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  {filtered.slice(0, 1).map((page) => (
                    <article key={page.id} className="group overflow-hidden rounded-[2rem] border border-border bg-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
                      <div className="p-8">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
                          <Sparkles size={14} />
                          <span>{page.metadata?.category || 'General'}</span>
                        </div>
                        <h3 className="mt-4 text-3xl font-semibold text-foreground">{page.title}</h3>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">{page.summary || page.content.slice(0, 160) + '...'}</p>
                        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{page.is_published ? 'Published' : 'Draft'}</span>
                          <span>•</span>
                          <span>{formatDistanceToNowStrict(new Date(page.updated_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 bg-slate-50 px-8 py-4">
                        <Button variant="outline" className="w-full justify-between" onClick={() => setReadPage(page)}>
                          Read the story
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </article>
                  ))}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.slice(1, 5).map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setReadPage(page)}
                        className="text-left rounded-3xl border border-border bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-lg font-semibold text-foreground">{page.title}</h4>
                          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{page.is_published ? 'Live' : 'Draft'}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-3">{page.summary || page.content.slice(0, 100) + '...'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                    <CardHeader>
                      <CardTitle>Trending topics</CardTitle>
                      <CardDescription>What your team reads most often.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {filtered.length === 0 ? (
                        <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">No topics yet</span>
                      ) : (
                        Array.from(new Set(filtered.map((page) => page.metadata?.category || 'General')))
                          .slice(0, 10)
                          .map((topic) => (
                            <span key={topic} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground">
                              {topic}
                            </span>
                          ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                    <CardHeader>
                      <CardTitle>Quick filters</CardTitle>
                      <CardDescription>Find policies, release notes, and records fast.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {['All', 'Policy', 'Guide', 'Release', 'FAQ', 'Executive'].map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setQ(name === 'All' ? '' : name)}
                            className="rounded-2xl border border-border bg-white px-4 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-primary/5"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-3xl border border-dashed border-border bg-muted/70 p-4 text-sm text-muted-foreground">
                        Start a new page with a framework that matches your story type and keep every team page crisp.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Editor's notes</CardTitle>
                <CardDescription>Use the template wizard to build beautiful articles faster.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {wikiTemplates.slice(0, 3).map((template) => (
                  <div key={template.key} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{template.label}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                        {template.key}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{template.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Featured stories</CardTitle>
                <CardDescription>Hand-picked knowledge articles to inspire your next page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pages.filter((page) => page.metadata?.featured).slice(0, 4).map((page) => (
                  <button key={page.id} type="button" onClick={() => setReadPage(page)} className="w-full text-left rounded-3xl border border-border bg-white p-4 text-sm hover:border-primary/60">
                    <div className="font-semibold text-foreground">{page.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{page.summary ?? 'Featured insight'}</div>
                  </button>
                ))}
                {pages.filter((page) => page.metadata?.featured).length === 0 && (
                  <p className="text-sm text-muted-foreground">Add featured articles for fast discovery.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog open={!!readPage} onOpenChange={(o) => !o && setReadPage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">{readPage?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">/{readPage?.slug}</p>
          </DialogHeader>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {readPage?.metadata?.category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {readPage.metadata.category}
              </span>
            )}
            {readPage?.metadata?.template && (
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
                {readPage.metadata.template}
              </span>
            )}
            {readPage?.metadata?.featured && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">
                Featured
              </span>
            )}
          </div>
          {readPage?.summary ? <p className="text-sm text-muted-foreground border-b border-border pb-3">{readPage.summary}</p> : null}
          <article className="prose prose-slate max-w-none dark:prose-invert pt-2">
            {readPage?.content.split(/\n{2,}/).map((block, index) => {
              if (!block.trim()) return null;
              if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
              if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
              if (block.startsWith('# ')) return <h1 key={index}>{block.slice(2)}</h1>;
              if (block.startsWith('> ')) return <blockquote key={index}>{block.slice(2)}</blockquote>;
              return <p key={index}>{block}</p>;
            })}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit wiki page' : 'New knowledge page'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Step {wizardStep} of 4</p>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">URL slug</label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. remote-work-policy" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Page title" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Template</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {wikiTemplates.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          summary: current.summary || template.summary,
                          content: current.content || template.content,
                          slug: current.slug || template.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        }));
                      }}
                      className="rounded-3xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-primary/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{template.label}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium">Summary</label>
                <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Short overview for cards and search" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Body</label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="mt-1" />
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Category</label>
                  <Input
                    value={form.metadata.category ?? ''}
                    onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, category: e.target.value } })}
                    placeholder="e.g. Policy, Guide, Release"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Tags</label>
                  <Input
                    value={form.metadata.tags?.join(', ') ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        metadata: {
                          ...form.metadata,
                          tags: e.target.value
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="Tag1, Tag2, Team"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border bg-muted/50 p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.metadata.featured ?? false}
                    onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, featured: e.target.checked } })}
                    className="rounded border-input"
                  />
                  Feature this page for homepage discovery
                </label>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4 py-2">
              <div className="rounded-3xl border border-border bg-background p-6">
                <h3 className="text-base font-semibold text-foreground">Review before publishing</h3>
                <p className="mt-2 text-sm text-muted-foreground">Check the title, slug, summary, and category. This is your team's primary source of truth.</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground">Title</p>
                    <p>{form.title || 'Untitled'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Slug</p>
                    <p>{form.slug || 'auto-generated'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Summary</p>
                    <p>{form.summary || 'No summary provided.'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Category</p>
                    <p>{form.metadata.category || 'General'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Featured</p>
                    <p>{form.metadata.featured ? 'Yes' : 'No'}</p>
                  </div>
                </div>
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
            {wizardStep < 4 ? (
              <Button
                type="button"
                onClick={() => setWizardStep((s) => s + 1)}
                disabled={wizardStep === 1 && (!form.slug.trim() || !form.title.trim())}
              >
                Next
              </Button>
            ) : (
              <Button type="button" onClick={() => void saveWiki()}>
                Save page
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
