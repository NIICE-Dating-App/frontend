// providers/ProfileProvider.tsx
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Profile = {
  id: string;
  full_name: string | null;
  birthdate: string | null;
  gender: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
};

type ProfileContextType = {
  session: import('@supabase/supabase-js').Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ProfileContextType['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // load user profile from Supabase
  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (error) console.warn('Profile load error:', error.message);
    setProfile(data ?? null);
  };

  // initial session + profile load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session ?? null;
      setSession(sess);
      if (sess?.user) loadProfile(sess.user.id);
      setLoading(false);
    });

    // listen for login/logout changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) loadProfile(sess.user.id);
      else setProfile(null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
