import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { requireUser, requireRole } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const { title, message, type = 'info' } = await request.json();
    const user = await requireUser(supabase);
    await requireRole(supabase, user.id, ['admin', 'owner', 'operations']);
    if (!title || !message) {
      return NextResponse.json({ error: 'Missing title or message.' }, { status: 400 });
    }

    const { data: profiles, error } = await supabase.from('profiles').select('id').eq('is_active', true);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = (profiles ?? []).map((profile: { id: string }) => profile.id);
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No active users found to broadcast.' }, { status: 400 });
    }

    await supabase.from('notifications').insert(
      userIds.map((user_id) => ({
        user_id,
        title,
        message,
        type,
        is_read: false,
        link: '',
      }))
    );

    return NextResponse.json({ success: true, delivered: userIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to broadcast notification.' }, { status: 500 });
  }
}
