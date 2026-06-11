'use client';

import { TopBar } from '@/components/layout/TopBar';

export default function AssetsPage() {
  return (
    <div>
      <TopBar title="Asset Vault" subtitle="Company assets, credentials and secured resources" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Asset vault</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A secure workspace for storing documents, credentials, code snippets, and team assets with role-based access.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            'Credential safe',
            'Policy documents',
            'Media and design assets',
            'Permission-aware sharing',
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
