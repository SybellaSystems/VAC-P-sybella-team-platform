import { supabase } from '@/lib/supabase';

export type TransactionalEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export type NotificationEmailPayload = {
  to: string;
  name?: string;
  actionUrl?: string;
  body: string;
  reason?: string;
};

const sendGridApiKey = process.env.SENDGRID_API_KEY;
const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@vac-p.app';

function buildPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function buildHtmlTemplate(title: string, content: string, actionLabel?: string, actionUrl?: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      .container { max-width: 700px; margin: 0 auto; padding: 24px; }
      .card { background: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); }
      h1 { margin-top: 0; color: #1d4ed8; }
      p { line-height: 1.75; }
      .button { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; background: #1d4ed8; color: #ffffff; border-radius: 14px; text-decoration: none; font-weight: 600; }
      .footer { margin-top: 24px; color: #64748b; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <h1>${title}</h1>
        ${content}
        ${actionUrl ? `<p><a class="button" href="${actionUrl}">${actionLabel || 'View details'}</a></p>` : ''}
        <div class="footer">Sent by VAC-P | Sybella Systems operational workspace.</div>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendTransactionalEmail(params: TransactionalEmailParams) {
  if (!sendGridApiKey) {
    throw new Error('SENDGRID_API_KEY is not configured.');
  }

  const body = {
    personalizations: [
      {
        to: [{ email: params.to }],
      },
    ],
    from: { email: params.from || sendGridFromEmail },
    subject: params.subject,
    content: [
      { type: 'text/plain', value: params.text ?? buildPlainText(params.html) },
      { type: 'text/html', value: params.html },
    ],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (process.env.ENABLE_EMAIL_QUEUE === 'true') {
      await queueEmail(params);
      return false;
    }
    throw new Error(`SendGrid error ${response.status}: ${errorText}`);
  }

  return true;
}

export async function queueEmail(params: TransactionalEmailParams) {
  try {
    await supabase.from('email_queue').insert({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text ?? buildPlainText(params.html),
      from: params.from ?? sendGridFromEmail,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export function buildOnboardingEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'Welcome to VAC-P',
    `<p>Hi ${payload.name ?? 'there'},</p><p>Welcome to the operational command center. Your account is now ready, and your team can collaborate across accountability, approvals, and customer workflows.</p><p>${payload.body}</p>`,
    'Open VAC-P',
    payload.actionUrl
  );

  return {
    subject: 'Welcome to VAC-P',
    html,
    text: payload.body,
  };
}

export function buildPasswordResetEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'Password reset request',
    `<p>Hi ${payload.name ?? 'there'},</p><p>We received a request to reset your password for VAC-P.</p><p>${payload.body}</p>`,
    'Reset password',
    payload.actionUrl
  );

  return {
    subject: 'Reset your VAC-P password',
    html,
    text: payload.body,
  };
}

export function buildAuthAlertEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'New sign-in activity',
    `<p>Hi ${payload.name ?? 'there'},</p><p>We detected a recent authentication event for your account.</p><p>${payload.body}</p>`,
    'Review activity',
    payload.actionUrl
  );

  return {
    subject: 'VAC-P security alert',
    html,
    text: payload.body,
  };
}

export function buildTaskAssignmentEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'A task has been assigned to you',
    `<p>Hi ${payload.name ?? 'there'},</p><p>${payload.body}</p>`,
    'View task',
    payload.actionUrl
  );

  return {
    subject: 'New task assignment in VAC-P',
    html,
    text: payload.body,
  };
}

export function buildApprovalEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'Approval needed',
    `<p>Hi ${payload.name ?? 'there'},</p><p>${payload.body}</p>`,
    'Review approval',
    payload.actionUrl
  );

  return {
    subject: 'Approval request from VAC-P',
    html,
    text: payload.body,
  };
}

export function buildBudgetApprovalEmail(payload: NotificationEmailPayload) {
  const html = buildHtmlTemplate(
    'Budget approval required',
    `<p>Hi ${payload.name ?? 'there'},</p><p>${payload.body}</p>`,
    'Review budget',
    payload.actionUrl
  );

  return {
    subject: 'Budget approval needed',
    html,
    text: payload.body,
  };
}
