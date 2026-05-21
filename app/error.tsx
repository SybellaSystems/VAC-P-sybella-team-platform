'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-monitoring';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void reportError(error, { info: 'App router error boundary' });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-4 text-sm text-slate-300">We captured the issue and are working on a fix.</p>
        <div className="mt-6 rounded-2xl bg-slate-800 p-4 text-xs text-slate-300">
          <p className="font-semibold">Error</p>
          <pre className="whitespace-pre-wrap break-words">{error.message}</pre>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button variant="default" onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </div>
    </div>
  );
}
