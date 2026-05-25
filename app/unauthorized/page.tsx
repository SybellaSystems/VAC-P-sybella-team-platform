'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/');
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="max-w-xl w-full rounded-3xl border border-border bg-white p-10 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-foreground">Access denied</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The notifications section is restricted to administrators only. You will be redirected to the workspace shortly.
        </p>
        <div className="mt-6">
          <Button onClick={() => router.replace('/')}>
            Return to workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
