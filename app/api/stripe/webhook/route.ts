import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const event = JSON.parse(body);
    const supabase = createServerSupabase();
    await logAudit({
      event_type: `stripe.webhook.${event.type ?? 'unknown'}`,
      action: 'webhook',
      details: JSON.stringify(event, null, 2),
    }, supabase);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
