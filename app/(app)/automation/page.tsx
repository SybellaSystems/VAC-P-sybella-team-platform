'use client';

import { TopBar } from '@/components/layout/TopBar';

export default function AutomationPage() {
  return (
    <div>
      <TopBar title="Automation Hub" subtitle="Rules, reminders, and workflow automation" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Automation engine</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build repeatable automation across approvals, task reminders, notifications, and reporting.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            'Scheduled workflows',
            'Rule-based triggers',
            'Email and Slack alerts',
            'Batch and queue actions',
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
