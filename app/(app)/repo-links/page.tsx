'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, ExternalLink, Trash2 } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import type { Role } from '@/lib/database.types';

type RepoLink = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  link_type: string | null;
  created_by_auth_user_id?: string | null;
};

const canEdit = (role: Role | undefined) =>
  !!role && ['admin', 'director', 'manager', 'marketing_manager', 'developer'].includes(role);

export default function RepoLinksPage() {
  useDocumentTitle('Repo links | VAC-P');
  const { profile } = useAuth();
  const [links, setLinks] = useState<RepoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RepoLink | null>(null);
  const [form, setForm] = useState({ title: '', url: '', description: '', link_type: 'DOCUMENT' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('repo_links').select('*').order('created_at', { ascending: false });
    setLinks((data as RepoLink[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!profile || !form.title.trim() || !form.url.trim()) return;
    if (editing) {
      await supabase
        .from('repo_links')
        .update({
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim() || null,
          link_type: form.link_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      await logAudit({ event_type: 'repo.updated', entity_type: 'repo_link', entity_id: editing.id, action: 'update' });
    } else {
      const { data } = await supabase
        .from('repo_links')
        .insert({
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim() || null,
          link_type: form.link_type,
          created_by_auth_user_id: profile.id,
        })
        .select('id')
        .maybeSingle();
      if (data?.id) await logAudit({ event_type: 'repo.created', entity_type: 'repo_link', entity_id: data.id, action: 'insert' });
    }
    setOpen(false);
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this link?')) return;
    await supabase.from('repo_links').delete().eq('id', id);
    await logAudit({ event_type: 'repo.deleted', entity_type: 'repo_link', entity_id: id, action: 'delete' });
    await load();
  };

  const edit = (l: RepoLink) => {
    setEditing(l);
    setForm({
      title: l.title,
      url: l.url,
      description: l.description || '',
      link_type: l.link_type || 'DOCUMENT',
    });
    setOpen(true);
  };

  return (
    <div className="min-h-full">
      <TopBar title="Repo links" subtitle="Drive folders, specs, and external docs" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        {canEdit(profile?.role) && (
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setForm({ title: '', url: '', description: '', link_type: 'DOCUMENT' });
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Add link
          </Button>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.id} className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-1">
                    {l.title}
                    <ExternalLink size={14} className="shrink-0" />
                  </a>
                  {l.description ? <p className="text-sm text-muted-foreground mt-1">{l.description}</p> : null}
                  <p className="text-[10px] uppercase text-muted-foreground mt-2">{l.link_type}</p>
                </div>
                {canEdit(profile?.role) && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => edit(l)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void remove(l.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit link' : 'New link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            <select
              className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white"
              value={form.link_type}
              onChange={(e) => setForm({ ...form, link_type: e.target.value })}
            >
              <option value="DOCUMENT">Document</option>
              <option value="DRIVE">Drive</option>
              <option value="REPO">Repository</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!form.title.trim() || !form.url.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
