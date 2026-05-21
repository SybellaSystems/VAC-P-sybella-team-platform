'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PLANS = [
  {
    key: 'starter',
    title: 'Starter',
    price: '$49',
    description: 'Up to 10 users, basic project and notifications support.',
    benefits: ['10 users', '10 projects', 'Email support', 'Basic analytics'],
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$199',
    description: 'Unlimited users, advanced reporting, and premium notifications.',
    benefits: ['Unlimited users', 'Unlimited projects', 'API access', 'Priority support'],
  },
];

export default function BillingPage() {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [company, setCompany] = useState(profile?.department || '');
  const [projectGoal, setProjectGoal] = useState('Align team budgets, approval flows, and delivery milestones.');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const activePlan = useMemo(() => PLANS.find((plan) => plan.key === selectedPlan) ?? PLANS[0], [selectedPlan]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || 'Unable to create checkout session.');
    } catch (error) {
      toast({ title: 'Billing failed', description: error instanceof Error ? error.message : 'Unable to start checkout.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <TopBar title="Billing" subtitle="Subscriptions, payments, and plan management" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-primary">Payments engine</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">Move from internal finance tracking to a real subscription system.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose a subscription tier, review billing details, and convert your workspace into a monetized SaaS plan.
              </p>
            </div>
            <Button onClick={() => setStep(1)} className="w-full max-w-xs justify-center md:w-auto">Update plan</Button>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
          <div className="space-y-4">
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Subscription wizard</CardTitle>
                <CardDescription>Complete checkout in three progressive steps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl border border-dashed border-border bg-muted/50 p-4">
                  <p className="text-sm font-semibold text-foreground">Step {step} of 3</p>
                  <p className="text-xs text-muted-foreground">{step === 1 ? 'Pick the plan that suits your team.' : step === 2 ? 'Tell us how you use VAC-P.' : 'Review and confirm your billing plan.'}</p>
                </div>

                {step === 1 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan.key)}
                        className={`rounded-3xl border p-6 text-left transition ${selectedPlan === plan.key ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/40'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold text-foreground">{plan.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                          </div>
                          <p className="text-2xl font-semibold text-foreground">{plan.price}</p>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {plan.benefits.map((benefit) => (
                            <li key={benefit}>• {benefit}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-foreground">Company or team name</label>
                      <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company or team" className="mt-2" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Billing summary note</label>
                      <Textarea value={projectGoal} onChange={(e) => setProjectGoal(e.target.value)} rows={5} className="mt-2" />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-border bg-white p-5">
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{activePlan.title}</p>
                      <p className="text-sm text-muted-foreground">{activePlan.price} / month</p>
                    </div>
                    <div className="rounded-3xl border border-border bg-white p-5">
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="mt-1 text-foreground">{company || 'Not set'}</p>
                    </div>
                    <div className="rounded-3xl border border-border bg-white p-5">
                      <p className="text-sm text-muted-foreground">Billing note</p>
                      <p className="mt-1 text-foreground">{projectGoal}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" disabled={step === 1} onClick={() => setStep((prev) => Math.max(prev - 1, 1))}>
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={() => setStep((prev) => Math.min(prev + 1, 3))}>Next</Button>
                  ) : (
                    <Button onClick={handleCheckout} disabled={loading}>
                      {loading ? 'Processing…' : `Pay ${activePlan.price}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Why billing matters</CardTitle>
                <CardDescription>Track subscriptions, invoices, and plan changes from one place.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Use a real payment flow to convert internal teams into paying customers.</p>
                <p>Stripe checkout will create a subscription session for your chosen plan.</p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Billing status</CardTitle>
                <CardDescription>Current workspace and user details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Workspace</strong>: {profile?.department || 'Unassigned'}</p>
                <p><strong>Owner</strong>: {profile?.full_name || 'Unknown'}</p>
                <p><strong>Email</strong>: {profile?.email || 'Unknown'}</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Billing quick actions</CardTitle>
                <CardDescription>Get a simple subscription experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="secondary" onClick={() => toast({ title: 'Billing note', description: 'You can manage subscriptions with Stripe checkout once configured.' })}>
                  Send billing notice
</Button>
                <p className="text-sm text-muted-foreground">If Stripe is configured, checkout will route you to a live payment flow.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
