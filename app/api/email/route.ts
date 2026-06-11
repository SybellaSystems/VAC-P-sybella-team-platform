import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email';
import { createServerSupabase } from '@/lib/supabase';
import { requireUser, requireRole } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const { to, subject, html, text, from } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required email fields.' }, { status: 400 });
    }
    const supabase = createServerSupabase();
    const user = await requireUser(supabase);
    await requireRole(supabase, user.id, ['admin', 'owner', 'operations']);

    await sendTransactionalEmail({ to, subject, html, text, from });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unable to send email.';
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 });
  }
}
