'use client';

import { Bell, Search, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { profile } = useAuth();
  const {
    notifications,
    unreadCount,
    unreadNotifications,
    loading: notificationsLoading,
    notificationsOpen,
    setNotificationsOpen,
    refreshNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      await refreshNotifications();
    }
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
            aria-expanded={notificationsOpen}
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
                  <p className="text-xs text-muted-foreground">
                    {notificationsLoading ? 'Refreshing...' : `${unreadNotifications.length} new`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  Mark all read
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading notifications…</div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={async () => {
                        await markRead(notification.id);
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
