export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = params.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@vac-p.app';
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured.');
  }

  const body = {
    personalizations: [
      {
        to: [{ email: params.to }],
      },
    ],
    from: { email: fromEmail },
    subject: params.subject,
    content: [
      { type: 'text/plain', value: params.text ?? params.html.replace(/<[^>]+>/g, '') },
      { type: 'text/html', value: params.html },
    ],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${text}`);
  }

  return true;
}
