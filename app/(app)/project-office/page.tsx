'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import type { Project, Task } from '@/lib/database.types';
import { LayoutGrid, Users, FolderKanban } from 'lucide-react';

export default function ProjectOfficePage() {
  useDocumentTitle('Project office | VAC-P');
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<{ open: number; blocked: number }>({ open: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'manager') {
      setLoading(false);
      return;
    }
    void (async () => {
      const [{ data: projs }, { data: tasks }] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(30),
        supabase.from('tasks').select('id, status').limit(500),
      ]);
      setProjects((projs as Project[]) ?? []);
      const list = (tasks as Pick<Task, 'status'>[]) ?? [];
      setTaskStats({
        open: list.filter((t) => !['done', 'cancelled'].includes(t.status)).length,
        blocked: list.filter((t) => t.status === 'blocked').length,
      });
      setLoading(false);
    })();
  }, [profile?.role]);

  if (profile?.role !== 'manager') {
    return (
      <div className="min-h-full">
        <TopBar title="Project office" subtitle="PMO overview" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          The project office is reserved for managers. Use Projects for your delivery work.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Project office" subtitle="Portfolio health at a glance" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
            <LayoutGrid className="text-primary" size={22} />
            <div>
              <p className="text-2xl font-bold">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Tracked projects</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
            <Users className="text-amber-600" size={22} />
            <div>
              <p className="text-2xl font-bold">{taskStats.open}</p>
              <p className="text-xs text-muted-foreground">Open tasks (sample)</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
            <FolderKanban className="text-destructive" size={22} />
            <div>
              <p className="text-2xl font-bold">{taskStats.blocked}</p>
              <p className="text-xs text-muted-foreground">Blocked tasks</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
            Open Projects →
          </Link>
          <Link href="/budget" className="text-sm font-medium text-primary hover:underline">
            Budgets →
          </Link>
          <Link href="/team" className="text-sm font-medium text-primary hover:underline">
            Team →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold px-4 py-3 border-b border-border bg-muted/30">Recent projects</h2>
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id} className="px-4 py-3 flex justify-between gap-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
