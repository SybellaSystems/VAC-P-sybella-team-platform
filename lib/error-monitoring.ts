import { logAudit } from '@/lib/audit';

export async function reportError(error: unknown, options?: { info?: string; metadata?: Record<string, unknown> }) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const stack = error instanceof Error ? error.stack : undefined;

  try {
    await logAudit({
      event_type: 'app.error',
      action: 'capture',
      details: message,
      metadata: {
        ...options?.metadata,
        info: options?.info,
        stack,
      },
    });
  } catch {
    // swallow audit failures
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Captured error:', error);
  }
}
