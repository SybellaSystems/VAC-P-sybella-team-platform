'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { PersistentCollapsible } from '@/components/ui/PersistentCollapsible';
import { TopBar } from '@/components/layout/TopBar';
import { ProjectAnalyticsDashboard } from '@/components/ProjectAnalyticsDashboard';
import type { Project, Task } from '@/lib/database.types';
import { LayoutGrid, Users, FolderKanban } from 'lucide-react';

export default function ProjectOfficePage() {
  useDocumentTitle('Project office | VAC-P');
  const { profile } = useAuth();
  const { prefs, setPref } = useUiPreferences();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<{ open: number; blocked: number }>({ open: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);

  const projectHealthOpen = useMemo(() => prefs.collapsedSections?.projectHealth !== true, [prefs.collapsedSections]);
  const recentProjectsOpen = useMemo(() => prefs.collapsedSections?.projectOfficeRecent !== true, [prefs.collapsedSections]);
  const analyticsOpen = useMemo(() => prefs.collapsedSections?.projectOfficeAnalytics !== true, [prefs.collapsedSections]);
  const featuredProjectId = useMemo(() => projects[0]?.id ?? null, [projects]);

  useEffect(() => {
    if (profile?.role !== 'manager') {
      setLoading(false);
      return;
    }
    void (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

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
        <PersistentCollapsible
          prefKey="projectHealth"
          title="Project health"
          open={projectHealthOpen}
          onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, projectHealth: !next })}
        >
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
        </PersistentCollapsible>

        <div className="flex flex-wrap gap-2">
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
            Open Projects →
          </Link>
          <Link href="/project-office/boards" className="text-sm font-medium text-primary hover:underline">
            Project boards →
          </Link>
          <Link href="/team" className="text-sm font-medium text-primary hover:underline">
            Team →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <PersistentCollapsible
            prefKey="projectOfficeRecent"
            title="Recent projects"
            open={recentProjectsOpen}
            onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, projectOfficeRecent: !next })}
          >
            <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <ul className="divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex justify-between gap-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </PersistentCollapsible>
        )}

        {featuredProjectId && (
          <PersistentCollapsible
            prefKey="projectOfficeAnalytics"
            title="Project analytics"
            open={analyticsOpen}
            onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, projectOfficeAnalytics: !next })}
          >
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Analytics for the most recently updated project, surfaced for portfolio decision-making.
              </p>
              <ProjectAnalyticsDashboard projectId={featuredProjectId} />
            </div>
          </PersistentCollapsible>
        )}
      </div>
    </div>
  );
}
