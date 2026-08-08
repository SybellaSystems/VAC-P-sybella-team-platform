import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const event = JSON.parse(body);
    await logAudit({
      action: 'webhook',
      entity_type: 'stripe',
      details: JSON.stringify({ type: event.type ?? 'unknown' }),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}