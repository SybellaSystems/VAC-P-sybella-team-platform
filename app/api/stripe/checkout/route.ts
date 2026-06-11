import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { requireUser } from '@/lib/serverAuth';

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { plan } = await request.json();

    const supabase = createServerSupabase();
    await requireUser(supabase);

    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe secret key is not configured.' }, { status: 500 });
    }

    const priceId = plan === 'pro'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER;

    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price ID is not configured for the selected plan.' }, { status: 500 });
    }

    const form = new URLSearchParams();
    form.append('mode', 'subscription');
    form.append('line_items[0][price]', priceId);
    form.append('line_items[0][quantity]', '1');
    form.append('success_url', `${baseUrl}/billing?completed=true`);
    form.append('cancel_url', `${baseUrl}/billing?cancelled=true`);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message ?? 'Stripe checkout creation failed.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create Stripe session.' }, { status: 500 });
  }
}
