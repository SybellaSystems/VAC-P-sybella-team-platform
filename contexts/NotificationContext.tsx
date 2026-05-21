'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRecentNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '@/lib/queries';
import type { Notification } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export type NotificationPreferences = {
  browser: boolean;
  email: boolean;
  dnd: boolean;
};

export interface NotificationContextType {
  notifications: Notification[];
  unreadNotifications: Notification[];
  unreadCount: number;
  loading: boolean;
  notificationsOpen: boolean;
  setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  preferences: NotificationPreferences;
  setPreferences: (preferences: NotificationPreferences) => void;
  refreshCounts: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  error: string | null;
  lastSyncedAt: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  browser: true,
  email: true,
  dnd: false,
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadNotifications: [],
  unreadCount: 0,
  loading: false,
  notificationsOpen: false,
  setNotificationsOpen: () => {},
  preferences: DEFAULT_PREFERENCES,
  setPreferences: async () => {},
  refreshCounts: async () => {},
  refreshNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  error: null,
  lastSyncedAt: null,
});

const PREFERENCE_STORAGE_KEY = 'vacp-notification-preferences';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const latestNotificationRef = useRef<string | null>(null);

  const normalizeNotifications = (items: Notification[] | null): Notification[] => items ?? [];

  const persistPreferences = (nextPreferences: NotificationPreferences) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(nextPreferences));
    }
    setPreferencesState(nextPreferences);
  };

  const savePreferences = async (nextPreferences: NotificationPreferences) => {
    persistPreferences(nextPreferences);

    if (profile?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ notification_preferences: nextPreferences })
          .eq('id', profile.id);
      } catch {
        // ignore server update failures, local preferences remain available
      }
    }
  };

  const refreshCounts = async () => {
    if (!profile?.id) return;
    try {
      const { count } = await fetchUnreadNotificationCount(profile.id);
      setUnreadCount(count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh notification counts.');
    }
  };

  const refreshNotifications = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data } = await fetchRecentNotifications(profile.id);
      setNotifications(normalizeNotifications(data));
      setLastSyncedAt(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId: string) => {
    if (!notificationId) return;
    await markNotificationRead(notificationId);
    await refreshCounts();
    if (notificationsOpen) {
      await refreshNotifications();
    }
  };

  const markAllRead = async () => {
    if (!profile?.id) return;
    await markAllNotificationsRead(profile.id);
    await refreshCounts();
    if (notificationsOpen) {
      await refreshNotifications();
    }
  };

  useEffect(() => {
    const loadPreferences = () => {
      if (profile?.notification_preferences) {
        setPreferencesState({
          ...DEFAULT_PREFERENCES,
          ...profile.notification_preferences,
        });
        return;
      }

      if (typeof window === 'undefined') return;
      const persisted = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
      if (!persisted) return;

      try {
        const parsed = JSON.parse(persisted) as NotificationPreferences;
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch {
        setPreferencesState(DEFAULT_PREFERENCES);
      }
    };

    loadPreferences();
  }, [profile?.notification_preferences]);

  useEffect(() => {
    if (!profile?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    let isMounted = true;

    void (async () => {
      await Promise.all([refreshCounts(), refreshNotifications()]);
      if (isMounted) setLoading(false);
    })();

    const channel = supabase
      .channel(`notifications:user:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        async (payload) => {
          await refreshCounts();
          if (notificationsOpen) {
            await refreshNotifications();
          }

          const incoming = payload?.new as Notification | null;
          if (!incoming || incoming.user_id !== profile.id) return;
          if (!preferences.browser || preferences.dnd) return;

          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
            if (Notification.permission === 'granted') {
              new Notification(incoming.title, {
                body: incoming.message,
                icon: '/favicon.ico',
              });
            }
          }

          if (latestNotificationRef.current !== incoming.id) {
            latestNotificationRef.current = incoming.id;
            toast({ title: incoming.title, description: incoming.message });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, notificationsOpen, preferences.browser, preferences.dnd, toast]);

  const unreadNotifications = useMemo(
    () => notifications?.filter((notification) => !notification.is_read) ?? [],
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadNotifications,
        unreadCount,
        loading,
        notificationsOpen,
        setNotificationsOpen,
        preferences,
        setPreferences: savePreferences,
        refreshCounts,
        refreshNotifications,
        markRead,
        markAllRead,
        error,
        lastSyncedAt,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
