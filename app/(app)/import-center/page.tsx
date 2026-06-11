'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { PersistentCollapsible } from '@/components/ui/PersistentCollapsible';

export default function ImportCenterPage() {
  const { prefs, setPref } = useUiPreferences();
  const open = useMemo(() => prefs.collapsedSections?.['importCenterDetails'] !== true, [prefs.collapsedSections]);

  return (
    <div>
      <TopBar title="Import Center" subtitle="Data tables, CSV/XLSX import, and workspace imports" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Import Center</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A central hub for importing spreadsheets, mapping columns, and syncing bulk data into budgets, customers, and projects.
          </p>
        </div>
        <PersistentCollapsible
          prefKey="importCenterDetails"
          title="Import workflows"
          open={open}
          onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, importCenterDetails: !next })}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              'CSV/Excel import jobs',
              'Schema-aware mappings',
              'Preview and validate rows',
              'Audit import history',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-slate-50 p-4">
                <p className="font-medium">{item}</p>
              </div>
            ))}
          </div>
        </PersistentCollapsible>
      </div>
    </div>
  );
}
