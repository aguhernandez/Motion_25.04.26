import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSatelliteAuth } from '../hooks/useSatelliteAuth';
import type { HubUser } from '../hooks/useSatelliteAuth';
import { supabase } from '../lib/supabase';

export type { HubUser };
export type MembershipSlug = 'inicia' | 'intermediate' | 'pro';

export interface Profile {
  id: string;
  hub_user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'coach' | 'athlete';
}

export function hasAIAccess(membershipSlug?: MembershipSlug): boolean {
  return membershipSlug === 'intermediate' || membershipSlug === 'pro';
}

export function hasMembershipAccess(userSlug: MembershipSlug | undefined, requiredSlugs: MembershipSlug[]): boolean {
  if (!userSlug) return false;
  return requiredSlugs.includes(userSlug);
}

const DEV_MODE_KEY = 'biomechanic_lab_dev_mode';

function getDevModePreference(): boolean {
  if (import.meta.env.VITE_FORCE_DEV_MODE === 'true') return true;
  const stored = localStorage.getItem(DEV_MODE_KEY);
  if (stored !== null) return stored === 'true';
  return false;
}

interface AuthContextType {
  user: HubUser | null;
  profile: Profile | null;
  loading: boolean;
  hasToken: boolean;
  isDevMode: boolean;
  login: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  setDevProfile: (profile: Profile) => void;
  toggleDevMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: hubUser, loading: hubLoading, hasToken, login: hubLogin, loginWithCredentials: hubLoginWithCredentials, logout: hubLogout } = useSatelliteAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(getDevModePreference);
  const [devUser, setDevUser] = useState<HubUser | null>(null);
  const [devProfile, setDevProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isDevMode && hubUser && !hubLoading) {
      syncProfile(hubUser);
    }
  }, [hubUser, hubLoading, isDevMode]);

  const syncProfile = async (hubUser: HubUser) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('hub_user_id', hubUser.id)
        .maybeSingle();

      if (existing) {
        setProfile(existing);
        return;
      }

      const normalizedRole = hubUser.role === 'trainer' ? 'coach' : hubUser.role;

      const { data: created } = await supabase
        .from('profiles')
        .insert({
          hub_user_id: hubUser.id,
          email: hubUser.email,
          full_name: hubUser.name ?? hubUser.email,
          role: normalizedRole,
        })
        .select()
        .single();

      if (created) setProfile(created);
    } catch (error) {
      console.error('Profile sync failed:', error);
    }
  };

  const setDevProfile = (p: Profile) => {
    setDevProfileState(p);
    setDevUser({
      id: p.id,
      email: p.email,
      name: p.full_name,
      role: p.role === 'coach' ? 'trainer' : p.role as HubUser['role'],
      membership_slug: 'pro',
      membership_name: 'Asciende Pro (Dev)',
    });
  };

  const toggleDevMode = (enabled: boolean) => {
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    if (!enabled) {
      hubLogin();
    } else {
      window.location.reload();
    }
  };

  const login = () => {
    if (isDevMode) return;
    hubLogin();
  };

  const loginWithCredentials = async (email: string, password: string): Promise<{ error?: string }> => {
    if (isDevMode) return {};
    return hubLoginWithCredentials(email, password);
  };

  const logout = () => {
    if (isDevMode) {
      setDevProfileState(null);
      setDevUser(null);
      return;
    }
    hubLogout();
  };

  const effectiveUser = isDevMode ? devUser : hubUser;
  const effectiveProfile = isDevMode ? devProfile : profile;
  const effectiveLoading = isDevMode ? false : hubLoading;
  const effectiveHasToken = isDevMode ? !!devUser : hasToken;

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      profile: effectiveProfile,
      loading: effectiveLoading,
      hasToken: effectiveHasToken,
      isDevMode,
      login,
      loginWithCredentials,
      logout,
      setDevProfile,
      toggleDevMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
