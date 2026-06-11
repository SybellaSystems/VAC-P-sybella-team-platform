import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { createServerSupabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured.' }, { status: 500 });
  }

  // verify signature: header format `t=timestamp,v1=signature[,v1=]`
  const parts = sig.split(',').reduce((acc: any, p) => {
    const [k, v] = p.split('=');
    acc[k] = acc[k] ? acc[k].concat([v]) : [v];
    return acc;
  }, {});
  const t = parts.t && parts.t[0];
  const v1 = parts.v1 && parts.v1[0];
  if (!t || !v1) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(`${t}.${body}`).digest('hex');
  const provided = v1;
  const safeEq = (a: string, b: string) => {
    try {
      const ab = Buffer.from(a, 'hex');
      const bb = Buffer.from(b, 'hex');
      if (ab.length !== bb.length) return false;
      return crypto.timingSafeEqual(ab, bb);
    } catch {
      return false;
    }
  };

  if (!safeEq(expected, provided)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

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
