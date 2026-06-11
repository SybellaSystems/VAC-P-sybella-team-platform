'use client';

import React, { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUiPreferences } from '@/hooks/use-ui-preferences';

export default function ThemeToggle() {
  const { prefs, setPref } = useUiPreferences();
  const theme = prefs?.theme || (typeof window !== 'undefined' && localStorage.getItem('ui:theme')) || 'light';

  useEffect(() => {
    const t = prefs?.theme || (typeof window !== 'undefined' && localStorage.getItem('ui:theme')) || 'light';
    if (typeof document !== 'undefined') {
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [prefs]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      if (typeof window !== 'undefined') localStorage.setItem('ui:theme', next);
    } catch (err) {}
    setPref('theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
