'use client';

import Link from 'next/link';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Scale, BookOpen, PieChart } from 'lucide-react';

const legalRoles = new Set(['legal_counsel', 'admin', 'director']);

export default function LegalPage() {
  useDocumentTitle('Legal | VAC-P');
  const { profile } = useAuth();

  if (!profile?.role || !legalRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Legal workspace" subtitle="Counsel & compliance" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          This workspace is for legal counsel and executive oversight.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Legal workspace" subtitle="Policies, equity visibility, knowledge base" />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Centralize contracts and policy in the wiki, track cap table visibility under Shares, and coordinate with finance on linked budgets.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/wiki"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <BookOpen className="text-primary" size={22} />
            <span className="font-semibold text-sm">Wiki &amp; policies</span>
            <span className="text-xs text-muted-foreground">Author and publish internal guidance</span>
          </Link>
          <Link
            href="/shares"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <PieChart className="text-primary" size={22} />
            <span className="font-semibold text-sm">Shares register</span>
            <span className="text-xs text-muted-foreground">Read-only visibility per RLS</span>
          </Link>
          <Link
            href="/budget"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 transition-colors flex flex-col gap-2"
          >
            <Scale className="text-primary" size={22} />
            <span className="font-semibold text-sm">Budgets</span>
            <span className="text-xs text-muted-foreground">Commercial commitments</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
