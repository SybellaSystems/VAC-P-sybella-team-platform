'use client';

import { SybellaLoader } from '@sybellasystems/ui';

export function SybellaLoadingState({
  text,
  subtext,
}: {
  text: string;
  subtext?: string;
}) {
  return (
    <div className="flex min-h-64 items-center justify-center bg-slate-50 p-6">
      <SybellaLoader
        size={112}
        text={text}
        subtext={subtext}
        showLabel
        className="max-w-full"
      />
    </div>
  );
}
