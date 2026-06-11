'use client';

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

interface PersistentCollapsibleProps {
  prefKey: string;
  title: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}

export function PersistentCollapsible({ prefKey, title, open, onToggle, children }: PersistentCollapsibleProps) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <div className="rounded-2xl border border-border bg-white/5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-slate-900 transition-colors"
            aria-expanded={open}
          >
            <span>{title}</span>
            <ChevronRight className={open ? 'rotate-90 transition-transform' : 'transition-transform'} size={16} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
