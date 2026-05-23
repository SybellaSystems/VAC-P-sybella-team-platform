import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchExternalIntegrationData } from '@/lib/integrations';

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const url = new URL(request.url);
  const live = url.searchParams.get('live') === 'true';

  const { data, error } = await supabase
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integrations = (data || []) as any[];
  const payload = await Promise.all(
    integrations.map(async (integration) => {
      const sanitized: any = { ...integration, credentials: null };

      // Always provide last pushed data (if present)
      if (sanitized.last_pushed_payload !== undefined) {
        sanitized.pushed_data = sanitized.last_pushed_payload;
      }

      if (live) {
        try {
          sanitized.live_data = await fetchExternalIntegrationData(integration);
          sanitized.last_synced_at = new Date().toISOString();
          await supabase
            .from('project_integrations')
            .update({ last_synced_at: sanitized.last_synced_at })
            .eq('id', integration.id);
        } catch (err) {
          sanitized.live_data = { error: err instanceof Error ? err.message : 'Unable to fetch live data' };
        }
      }

      return sanitized;
    })
  );

  return NextResponse.json({ integrations: payload });
}
