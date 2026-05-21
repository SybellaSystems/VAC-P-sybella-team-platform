import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { to, subject, html, text, from } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required email fields.' }, { status: 400 });
    }

    await sendTransactionalEmail({ to, subject, html, text, from });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, { status: 500 });
  }
}
