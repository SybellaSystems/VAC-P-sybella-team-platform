'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, ExternalLink, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import type { Role } from '@/lib/database.types';

// ── Types ──────────────────────────────────────────────────────────────────

type RepoLink = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  link_type: string | null;
  created_by_auth_user_id?: string | null;
};

type LinkFormState = {
  title: string;
  url: string;
  description: string;
  link_type: string;
};

const DEFAULT_FORM: LinkFormState = {
  title: '',
  url: '',
  description: '',
  link_type: 'DOCUMENT',
};

const LINK_TYPE_OPTIONS = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'DRIVE', label: 'Drive' },
  { value: 'REPO', label: 'Repository' },
  { value: 'OTHER', label: 'Other' },
] as const;

// ── RBAC ───────────────────────────────────────────────────────────────────

const EDIT_ROLES = new Set<Role>([
  'admin',
  'director',
  'manager',
  'marketing_manager',
  'developer',
]);

function canEdit(role: Role | undefined): role is Role {
  return !!role && EDIT_ROLES.has(role);
}

// ── URL Validation ─────────────────────────────────────────────────────────

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function RepoLinksPage() {
  useDocumentTitle('Repo links | VAC-P');
  const { profile } = useAuth();

  // State
  const [links, setLinks] = useState<RepoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RepoLink | null>(null);
  const [form, setForm] = useState<LinkFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const isEditor = canEdit(profile?.role);

  // ── Data loading ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('repo_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLinks((data as RepoLink[]) ?? []);
    } catch (err) {
      console.error('Failed to load repo links:', err);
      setError('Failed to load links. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Form handlers ─────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
  };

  const openEditDialog = (link: RepoLink) => {
    setEditing(link);
    setForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      link_type: link.link_type || 'DOCUMENT',
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(DEFAULT_FORM);
    setError(null);
  };

  const isFormValid = form.title.trim().length > 0 && isValidUrl(form.url.trim());

  // ── CRUD operations ───────────────────────────────────────────────────

  const save = async () => {
    if (!profile || !isFormValid) return;

    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      link_type: form.link_type,
    };

    try {
      if (editing) {
        const { error: updateError } = await supabase
          .from('repo_links')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);

        if (updateError) throw updateError;

        await logAudit({
          event_type: 'repo.updated',
          entity_type: 'repo_link',
          entity_id: editing.id,
          action: 'update',
        });
      } else {
        const { data, error: insertError } = await supabase
          .from('repo_links')
          .insert({
            ...payload,
            created_by_auth_user_id: profile.id,
          })
          .select('id')
          .maybeSingle();

        if (insertError) throw insertError;

        if (data?.id) {
          await logAudit({
            event_type: 'repo.created',
            entity_type: 'repo_link',
            entity_id: data.id,
            action: 'insert',
          });
        }
      }

      closeDialog();
      await load();
    } catch (err) {
      console.error('Failed to save repo link:', err);
      setError('Failed to save link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this link?')) return;

    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('repo_links')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await logAudit({
        event_type: 'repo.deleted',
        entity_type: 'repo_link',
        entity_id: id,
        action: 'delete',
      });

      await load();
    } catch (err) {
      console.error('Failed to delete repo link:', err);
      setError('Failed to delete link. Please try again.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full">
      <TopBar title="Repo links" subtitle="Drive folders, specs, and external docs" />

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              `${links.length} link${links.length !== 1 ? 's' : ''} found`
            )}
          </div>
          {isEditor && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
            <ExternalLink className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">No links found</p>
            <p className="text-sm">Add your first repository link to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{link.title}</h3>
                    {link.link_type && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {link.link_type}
                      </span>
                    )}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground truncate block"
                  >
                    {link.url}
                  </a>
                  {link.description && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {link.description}
                    </p>
                  )}
                </div>
                {isEditor && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(link)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Link' : 'Add New Link'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                placeholder="Enter link title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) =>
                  setForm({ ...form, url: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="description"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="link_type" className="text-sm font-medium">
                Link Type
              </label>
              <select
                id="link_type"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white"
                value={form.link_type}
                onChange={(e) =>
                  setForm({ ...form, link_type: e.target.value })
                }
              >
                <option value="DOCUMENT">Document</option>
                <option value="DRIVE">Drive</option>
                <option value="REPO">Repository</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={!form.title.trim() || !form.url.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}