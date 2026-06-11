'use client';

import { TopBar } from '@/components/layout/TopBar';

export default function QualityPage() {
  return (
    <div>
      <TopBar title="Quality & Stabilization" subtitle="Testing, validation, and release readiness" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Testing & stabilization</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track release readiness with smoke tests, regression checklists, and deployment validation workflows.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            'Baseline end-to-end checks',
            'Release readiness dashboard',
            'Regression and smoke workflows',
            'Rollback and audit tracking',
          ].map((item) => (
            <div key={item} className="rounded-3xl border border-border bg-slate-50 p-4">
              <p className="font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
