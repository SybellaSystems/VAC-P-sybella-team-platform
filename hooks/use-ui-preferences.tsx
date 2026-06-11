'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type UiPreferences = {
  theme?: 'light' | 'dark';
  collapsedSections?: Record<string, boolean>;
  settingsOpen?: boolean;
  [key: string]: any;
};

export function useUiPreferences() {
  const { profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<UiPreferences>({});

  useEffect(() => {
    try {
      const local = typeof window !== 'undefined' ? localStorage.getItem('ui:preferences') : null;
      if (profile?.ui_preferences) {
        setPrefs(profile.ui_preferences as UiPreferences);
      } else if (local) {
        setPrefs(JSON.parse(local));
      }
    } catch (err) {
      console.error('ui prefs parse error', err);
    }
  }, [profile]);

  const save = useCallback(async (next: UiPreferences) => {
    setPrefs(next);
    try {
      if (typeof window !== 'undefined') localStorage.setItem('ui:preferences', JSON.stringify(next));
      if (profile?.id) {
        await supabase.from('profiles').update({ ui_preferences: next }).eq('id', profile.id);
        await refreshProfile();
      }
    } catch (err) {
      console.error('Failed saving ui preferences', err);
    }
  }, [profile, refreshProfile]);

  const setPref = useCallback((k: string, v: any) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      void save(next);
      return next;
    });
  }, [save]);

  return { prefs, setPref, save };
}
