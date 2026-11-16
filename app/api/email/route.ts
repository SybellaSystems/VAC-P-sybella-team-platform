import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email';
import { authorizeAdmin } from '@/lib/server/authorize-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
 const authorization = await authorizeAdmin(request);

if (authorization.response) {
  return authorization.response;
}

  try {
    const { to, subject, html, text, from } = await request.json();
    if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
      typeof subject !== 'string' || !subject.trim() ||
      typeof html !== 'string' || !html.trim()) {
      return NextResponse.json({ error: 'Missing required email fields.' }, { status: 400 });
    }

    await sendTransactionalEmail({ to, subject: subject.trim().slice(0, 200), html, text, from });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send email.' }, { status: 500 });
  }
}