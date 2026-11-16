'use client';

export function SybellaLoadingState({
  text,
  subtext,
}: {
  text: string;
  subtext?: string;
}) {
  return (
    <div className="flex min-h-64 items-center justify-center bg-slate-50 p-6">
      <div role="status" aria-live="polite" className="flex max-w-full flex-col items-center gap-3 text-center">
        <div
          aria-hidden="true"
          className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700 motion-reduce:animate-none"
        />
        <p className="text-sm font-semibold text-slate-800">{text}</p>
        {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
      </div>
    </div>
  );
}
