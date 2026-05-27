'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import type { Task } from '@/lib/database.types';
import { ClipboardList, FolderKanban, ChevronRight } from 'lucide-react';

const deliveryRoles = new Set(['developer', 'designer', 'qa']);

export default function MyWorkPage() {
  useDocumentTitle('My work | VAC-P');
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<(Task & { projects?: { name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !deliveryRoles.has(profile.role)) {
      setLoading(false);
      return;
    }
    void (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('assigned_to', profile.id)
        .order('updated_at', { ascending: false })
        .limit(40);

      setTasks((data as (Task & { projects?: { name: string } | null })[]) ?? []);
      setLoading(false);
    })();
  }, [profile?.id, profile?.role]);

  if (!profile?.role || !deliveryRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="My work" subtitle="Delivery workspace" />
        <div className="p-6 max-w-md mx-auto text-center text-muted-foreground text-sm">
          This area is for delivery roles (developer, designer, QA). Your role uses other hubs in the sidebar.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="My work" subtitle="Tasks assigned to you" />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted/40"
          >
            <FolderKanban size={16} />
            Projects
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
          <Link
            href="/accountability"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted/40"
          >
            <ClipboardList size={16} />
            Accountability
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No tasks assigned yet. Ask your manager in Messages or check Projects.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(t.projects as { name?: string } | null)?.name ?? 'Project'} · {t.status} · {t.priority}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
