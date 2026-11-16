'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';

type Provider = 'google' | 'github' | 'azure';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authError: string | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (provider: Provider) => Promise<{ error: Error | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  authError: null,
  profileError: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signInWithProvider: async () => ({ error: null }),
  sendPasswordResetEmail: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const requestId = ++profileRequestId.current;
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (requestId !== profileRequestId.current) return;
      if (error) {
        console.error('Unable to load the authenticated user profile:', error.message);
        setProfile(null);
        setProfileError('Your account is signed in, but your VAC-P profile could not be loaded. Please retry or contact an administrator.');
        return;
      }
      if (!data) {
        setProfile(null);
        setProfileError('No VAC-P profile is associated with this account. Please contact an administrator.');
        return;
      }
      setProfile(data as Profile);
    } catch (error) {
      if (requestId !== profileRequestId.current) return;
      console.error('Unable to load the authenticated user profile:', error);
      setProfile(null);
      setProfileError('Your account is signed in, but your VAC-P profile could not be loaded. Please retry or contact an administrator.');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [fetchProfile, user]);

  useEffect(() => {
    let active = true;
    let authEventVersion = 0;

    const loadProfile = async (userId: string) => {
      await fetchProfile(userId);
      if (active && activeUserId.current === userId) setLoading(false);
    };

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active || authEventVersion > 0) return;
        if (error) throw error;

        const nextSession = data.session;
        const nextUser = nextSession?.user ?? null;
        activeUserId.current = nextUser?.id ?? null;
        setSession(nextSession);
        setUser(nextUser);
        setAuthError(null);
        if (nextUser) {
          setLoading(true);
          await loadProfile(nextUser.id);
        } else {
          setProfile(null);
          setProfileError(null);
          setLoading(false);
        }
      } catch (error) {
        if (!active || authEventVersion > 0) return;
        console.error('Unable to initialize Supabase authentication:', error);
        activeUserId.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setAuthError(error instanceof Error ? error.message : 'Unable to initialize authentication.');
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventVersion += 1;
      const nextUser = nextSession?.user ?? null;
      const previousUserId = activeUserId.current;
      const nextUserId = nextUser?.id ?? null;
      activeUserId.current = nextUserId;
      setSession(nextSession);
      setUser(nextUser);
      setAuthError(null);

      if (!nextUser) {
        profileRequestId.current += 1;
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && previousUserId === nextUserId) return;
      if (previousUserId !== nextUserId) {
        profileRequestId.current += 1;
        setProfile(null);
        setProfileError(null);
      }
      setLoading(true);
      void Promise.resolve().then(() => loadProfile(nextUser.id));
    });

    void initializeSession();
    return () => {
      active = false;
      profileRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithProvider = async (provider: Provider) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error: error as Error | null };
  };

  const sendPasswordResetEmail = async (email: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Unable to sign out from Supabase:', error.message);
      return;
    }
    setProfile(null);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, authError, profileError, loading, signIn, signInWithProvider, sendPasswordResetEmail, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
