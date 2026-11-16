'use client';

import dynamic from 'next/dynamic';

const SybellaLoader = dynamic(
  () => import('@sybellasystems/ui').then((module) => module.SybellaLoader),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
        role="status"
        aria-label="Loading"
      />
    ),
  }
);

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
