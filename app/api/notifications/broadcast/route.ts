import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/server/authorize-admin';

export async function POST(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('response' in authorization) return authorization.response;

  try {
    const { title, message, type = 'info' } = await request.json();
    if (typeof title !== 'string' || !title.trim() || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing title or message.' }, { status: 400 });
    }

    const { data: profiles, error } = await authorization.service.from('profiles').select('id').eq('is_active', true);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = (profiles ?? []).map((profile: { id: string }) => profile.id);
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No active users found to broadcast.' }, { status: 400 });
    }

    const { error: insertError } = await authorization.service.from('notifications').insert(
      userIds.map((user_id) => ({
        user_id,
        title: title.trim().slice(0, 160),
        message: message.trim().slice(0, 2000),
        type,
        is_read: false,
        link: '',
      }))
    );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, delivered: userIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to broadcast notification.' }, { status: 500 });
  }
}