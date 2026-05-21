'use client';

import { Bell, Search, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { fetchRecentNotifications, fetchUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from '@/lib/queries';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof fetchRecentNotifications>>['data']>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadCounts = async () => {
    if (!profile) return;
    const { count } = await fetchUnreadNotificationCount(profile.id);
    setUnreadCount(count ?? 0);
  };

  const loadNotifications = async () => {
    if (!profile) return;
    const { data } = await fetchRecentNotifications(profile.id);
    setNotifications(data ?? []);
  };

  useEffect(() => {
    if (!profile) return;
    void loadCounts();
    const channel = supabase
      .channel(`notifications:user:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => {
          void loadCounts();
          if (notificationsOpen) void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile, notificationsOpen]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read),
    [notifications]
  );
  const latestNotificationRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const latest = notifications[0];
    if (!latest || latest.id === latestNotificationRef.current) return;
    latestNotificationRef.current = latest.id;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(latest.title, {
          body: latest.message,
          icon: '/favicon.ico',
        });
      }
    }

    toast({ title: latest.title, description: latest.message });
  }, [notifications, toast]);

  const toggleNotifications = async () => {
    setNotificationsOpen((open) => !open);
    if (!notificationsOpen) {
      await loadNotifications();
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    void loadCounts();
    void loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    await markAllNotificationsRead(profile.id);
    void loadCounts();
    void loadNotifications();
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-14 md:top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary w-48"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-96 overflow-hidden rounded-3xl border border-border bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unreadNotifications.length} new</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  Mark all read
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={async () => {
                        await handleMarkRead(notification.id);
                        if (notification.link) window.location.href = notification.link;
                      }}
                      className="w-full text-left border-b border-border px-4 py-3 hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        {!notification.is_read && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                      {notification.link ? (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
                          <span>View</span>
                          <ChevronRight size={14} />
                        </div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground">{greeting()},</p>
            <p className="text-xs text-muted-foreground">{profile?.full_name?.split(' ')[0]}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
