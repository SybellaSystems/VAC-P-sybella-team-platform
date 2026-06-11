import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('project_integrations')
    .select('id, platform, last_pushed_payload, last_pushed_at')
    .eq('project_id', projectId)
    .order('last_pushed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integrations: (data || []).map((x) => x) });
}

