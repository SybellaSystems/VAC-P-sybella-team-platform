import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

// External systems call this to push data into VAC-P.
// Expected headers:
//   x-vacp-secret: <shared secret>
// Body:
//   {
//     project_id: string (uuid),
//     integration_id?: string (uuid),
//     platform?: string,
//     payload: any,
//     metadata?: any
//   }
export async function POST(request: Request) {
  const secret = process.env.VACP_INTEGRATIONS_WEBHOOK_SECRET;
  const provided = request.headers.get('x-vacp-secret');

  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { project_id, integration_id, platform, payload, metadata } = body as {
    project_id?: string;
    integration_id?: string;
    platform?: string;
    payload?: any;
    metadata?: any;
  };

  if (!project_id || typeof project_id !== 'string') {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  if (integration_id && typeof integration_id !== 'string') {
    return NextResponse.json({ error: 'integration_id must be a string uuid' }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ error: 'payload is required' }, { status: 400 });
  }

  // Find integration row (prefer integration_id, else match project_id + platform)
  let integrationRow: any = null;
  if (integration_id) {
    const { data, error } = await supabase
      .from('project_integrations')
      .select('*')
      .eq('id', integration_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    integrationRow = data;
  } else {
    if (!platform) {
      return NextResponse.json({ error: 'platform is required when integration_id is not provided' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('project_integrations')
      .select('*')
      .eq('project_id', project_id)
      .eq('platform', platform)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    integrationRow = data;
  }

  if (!integrationRow) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  const pushed_at = new Date().toISOString();

  // Store last pushed data on the integration row.
  const { error: updateErr } = await supabase
    .from('project_integrations')
    .update({
      last_synced_at: pushed_at,
      // Keep metadata updates for backward compatibility
      metadata: { ...(integrationRow.metadata || {}), ...(metadata || {}), pushed: true },

    })
    .eq('id', integrationRow.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Store last pushed payload
  const { error: payloadErr } = await supabase
    .from('project_integrations')
    .update({
      last_pushed_payload: payload,
      last_pushed_at: pushed_at,
      metadata: { ...(integrationRow.metadata || {}), ...(metadata || {}), pushed: true },
    })
    .eq('id', integrationRow.id);

  if (payloadErr) {
    return NextResponse.json({ error: payloadErr.message }, { status: 500 });
  }


  await logAudit({
    event_type: 'integrations.webhook_push',
    entity_type: 'project',
    entity_id: project_id,
    action: 'push',
    details: `integration_id=${integrationRow.id} platform=${integrationRow.platform}`,
    metadata: { payload_summary: typeof payload === 'object' ? Object.keys(payload || {}) : String(payload).slice(0, 200) },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, integration_id: integrationRow.id, pushed_at });
}

