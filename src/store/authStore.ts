'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  session: unknown | null;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: unknown | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    heardFrom: string,
    isAffiliate: boolean,
    referralCode?: string | null,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,
  success: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),

  signup: async (email, password, firstName, lastName, phone, heardFrom, isAffiliate, referralCode) => {
    set({ isLoading: true, error: null, success: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          heard_from: heardFrom,
          is_affiliate: isAffiliate,
        },
      },
    });
    if (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
    // Fire-and-forget referral attribution — user account is created regardless
    if (referralCode && data.user?.id) {
      fetch('/api/auth/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, referralCode }),
      }).catch(() => {/* non-critical */});
    }
    set({ isLoading: false, success: 'Account created! Check your email to confirm.' });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
    set({ user: data.user as User, session: data.session, isLoading: false, success: 'Welcome back!' });
  },

  logout: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, session: null, isLoading: false });
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setUser(session?.user as User | null);
});