'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function ServiceWorkerRegister() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let refreshing = false;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          toast({
            title: 'Update ready',
            description: 'A new version of VAC-P is ready to load.',
            action: (
              <ToastAction asChild altText="Refresh application">
                <button type="button" onClick={() => window.location.reload()}>
                  Refresh
                </button>
              </ToastAction>
            ),
          });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast({
                title: 'New version installed',
                description: 'Refresh to apply the latest platform updates.',
                action: (
                  <ToastAction asChild altText="Reload application">
                    <button type="button" onClick={() => window.location.reload()}>
                      Reload
                    </button>
                  </ToastAction>
                ),
              });
            }
          });
        });
      })
      .catch(() => {
        toast({ title: 'PWA registration failed', description: 'Service worker registration did not complete successfully.' });
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, [toast]);

  return null;
}
