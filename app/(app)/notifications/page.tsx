'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const {
    preferences,
    setPreferences,
    refreshNotifications,
    unreadCount,
    notifications,
    loading: notificationsLoading,
  } = useNotifications();
  const [broadcastMessage, setBroadcastMessage] = useState('Your team has a new update in the platform.');
  const [subject, setSubject] = useState('Welcome to VAC-P');
  const [recipient, setRecipient] = useState(profile?.email ?? '');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.email) {
      setRecipient(profile.email);
    }
  }, [profile?.email]);

  useEffect(() => {
    if (profile) {
      void refreshNotifications();
    }
  }, [profile, refreshNotifications]);

  const sendWelcomeEmail = async () => {
    if (!recipient) {
      toast({ title: 'Recipient required', description: 'Please provide a valid email address.' });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject,
          html: `<p>Hi ${profile?.full_name ?? 'team'},</p><p>Welcome to VAC-P. This transactional email confirms your access to our operational workspace and notification service.</p>`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send email.');
      toast({ title: 'Email queued', description: 'Transactional email sent successfully.' });
    } catch (error) {
      toast({ title: 'Email failed', description: error instanceof Error ? error.message : 'Unable to send transactional email.' });
    } finally {
      setSending(false);
    }
  };

  const broadcastNotification = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Platform update', message: broadcastMessage, type: 'info' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to broadcast notification.');
      toast({ title: 'Broadcast sent', description: `Delivered to ${data.delivered} active users.` });
      void refreshNotifications();
    } catch (error) {
      toast({ title: 'Broadcast failed', description: error instanceof Error ? error.message : 'Unable to broadcast notification.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-full">
      <TopBar title="Notifications" subtitle="Preferences, broadcasts, and email service" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-primary">Notification center</p>
                <h2 className="mt-3 text-3xl font-semibold text-foreground">Control how your team receives alerts.</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {profile ? `${profile.full_name} • ${profile.role}` : 'Loading preferences...'}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Card className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <CardHeader>
                  <CardTitle>Preference center</CardTitle>
                  <CardDescription>Select channels and quiet times for notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted/50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Browser push</p>
                      <p className="text-sm text-muted-foreground">Show in-app and browser notifications when new alerts arrive.</p>
                    </div>
                    <Switch checked={preferences.browser} onCheckedChange={(checked) => setPreferences({ ...preferences, browser: checked })} />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted/50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Email delivery</p>
                      <p className="text-sm text-muted-foreground">Send important notifications via transactional email.</p>
                    </div>
                    <Switch checked={preferences.email} onCheckedChange={(checked) => setPreferences({ ...preferences, email: checked })} />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted/50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Do not disturb</p>
                      <p className="text-sm text-muted-foreground">Pause non-critical alerts during quiet hours.</p>
                    </div>
                    <Switch checked={preferences.dnd} onCheckedChange={(checked) => setPreferences({ ...preferences, dnd: checked })} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <CardHeader>
                  <CardTitle>Send a transactional email</CardTitle>
                  <CardDescription>Test the new email service integration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">Recipient</label>
                    <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="team@example.com" className="mt-2" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Subject</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to VAC-P" className="mt-2" />
                  </div>
                  <Button onClick={sendWelcomeEmail} disabled={sending}>
                    {sending ? 'Sending...' : 'Send welcome email'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <CardHeader>
                  <CardTitle>Broadcast announcement</CardTitle>
                  <CardDescription>Publish a notification to all active users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">Message</label>
                    <Textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} rows={5} className="mt-2" />
                  </div>
                  <Button onClick={broadcastNotification} disabled={sending}>
                    {sending ? 'Sending...' : 'Broadcast to workspace'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
              <CardHeader>
                <CardTitle>Why this matters</CardTitle>
                <CardDescription>Real notifications reduce refresh and improve adoption.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Browser notifications keep users connected without constant polling.</p>
                <p>Transactional email support enables password resets, invites, and alerts.</p>
                <p>Broadcast controls let admins send company-wide announcements.</p>
                <p>{`Current inbox: ${notifications.length} recent notifications, ${unreadCount} unread.`}</p>
              </CardContent>
            </Card>
            {notificationsLoading && (
              <Card className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                <CardHeader>
                  <CardTitle>Refreshing</CardTitle>
                  <CardDescription>Notifications are kept in sync in real time.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Fetching the latest delivery state from your workspace.</CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
