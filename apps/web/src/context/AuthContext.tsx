import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { confirmCheckoutSession, fetchSubscription, revokeAccountSession, SubscriptionPlan } from '../api/client';

export interface User {
  name: string;
  email: string;
  isDemo: boolean;
  plan: SubscriptionPlan;
  avatarUrl?: string;
  username?: string;
  provider?: 'email' | 'github' | 'google' | 'demo';
  workspace?: string;
  role?: string;
  onboarded?: boolean;
  githubToken?: string;
  sessionToken?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    name?: string,
    isDemo?: boolean,
    avatarUrl?: string,
    provider?: 'email' | 'github' | 'google' | 'demo',
    username?: string,
    onboarded?: boolean,
    githubToken?: string,
    sessionToken?: string
  ) => void;
  loginAsDemo: () => void;
  updateUser: (updates: Partial<User>) => void;
  billingConfirmation: Exclude<SubscriptionPlan, 'free'> | null;
  dismissBillingConfirmation: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'scopegraph_auth_user';
const isSubscriptionPlan = (value: unknown): value is SubscriptionPlan =>
  value === 'free' || value === 'plus' || value === 'pro';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingConfirmation, setBillingConfirmation] = useState<Exclude<SubscriptionPlan, 'free'> | null>(null);
  const handledCheckoutSession = useRef<string | null>(null);
  const activeUserEmail = useRef<string | null>(null);
  activeUserEmail.current = user?.email.trim().toLowerCase() || null;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<User>;
        if (!parsed.isDemo && !parsed.sessionToken) {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
          return;
        }
        // Plan is billing state, so only the backend subscription record may grant it.
        // Older builds cached the plan in localStorage, which could mark unpaid users as paid.
        setUser({ ...parsed, plan: 'free' } as User);
      }
    } catch (e) {
      console.error('Failed to parse auth user', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (
    email: string,
    name?: string,
    isDemo = false,
    avatarUrl?: string,
    provider: 'email' | 'github' | 'google' | 'demo' = 'email',
    username?: string,
    onboarded?: boolean,
    githubToken?: string,
    sessionToken?: string
  ) => {
    const hasOnboarded =
      onboarded !== undefined
        ? onboarded
        : isDemo || localStorage.getItem(`scopegraph_onboarded_${email}`) === 'true';

    const savedGithubToken = githubToken || localStorage.getItem(`scopegraph_gh_token_${email}`) || undefined;
    const newUser: User = {
      name: name || (email.split('@')[0] ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') : 'Developer'),
      email,
      isDemo,
      plan: 'free',
      avatarUrl,
      provider,
      username,
      onboarded: hasOnboarded,
      githubToken: savedGithubToken,
      sessionToken,
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    if (hasOnboarded) {
      localStorage.setItem(`scopegraph_onboarded_${email}`, 'true');
    }
    if (savedGithubToken) {
      localStorage.setItem(`scopegraph_gh_token_${email}`, savedGithubToken);
    }
  };

  const loginAsDemo = () => {
    login('demo@scopegraph.top', 'Demo User', true, undefined, 'demo', undefined, true);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (updates.onboarded !== undefined && prev.email) {
        localStorage.setItem(`scopegraph_onboarded_${prev.email}`, String(updates.onboarded));
      }
      return updated;
    });
  };

  const logout = () => {
    if (user?.sessionToken) void revokeAccountSession(user.sessionToken).catch(() => undefined);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setBillingConfirmation(null);
  };

  const dismissBillingConfirmation = () => setBillingConfirmation(null);

  useEffect(() => {
    if (isLoading || !user?.email) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success' && params.get('session_id')) return;

    let cancelled = false;
    fetchSubscription(user.email)
      .then((subscription) => {
        if (!cancelled && isSubscriptionPlan(subscription.plan) && subscription.plan !== user.plan) {
          updateUser({ plan: subscription.plan });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoading, user?.email]);

  useEffect(() => {
    if (isLoading || !user?.email) return;
    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;
    const requestedPlan = params.get('plan');
    const sessionId = params.get('session_id');
    if (
      params.get('billing') !== 'success' ||
      !sessionId ||
      (requestedPlan !== 'plus' && requestedPlan !== 'pro') ||
      handledCheckoutSession.current === sessionId
    ) return;

    handledCheckoutSession.current = sessionId;
    const requestedEmail = user.email.trim().toLowerCase();
    confirmCheckoutSession(sessionId, user.email)
      .then((subscription) => {
        if (activeUserEmail.current === requestedEmail && subscription.plan === requestedPlan) {
          updateUser({ plan: subscription.plan });
          setBillingConfirmation(subscription.plan);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        currentUrl.searchParams.delete('billing');
        currentUrl.searchParams.delete('plan');
        currentUrl.searchParams.delete('session_id');
        window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      });
  }, [isLoading, user?.email]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        updateUser,
        billingConfirmation,
        dismissBillingConfirmation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
