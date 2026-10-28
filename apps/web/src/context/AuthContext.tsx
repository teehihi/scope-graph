import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  name: string;
  email: string;
  isDemo: boolean;
  avatarUrl?: string;
  username?: string;
  provider?: 'email' | 'github' | 'google' | 'demo';
  workspace?: string;
  role?: string;
  onboarded?: boolean;
  githubToken?: string;
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
    githubToken?: string
  ) => void;
  loginAsDemo: () => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'scopegraph_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
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
    githubToken?: string
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
      avatarUrl,
      provider,
      username,
      onboarded: hasOnboarded,
      githubToken: savedGithubToken,
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
    login('demo@scopegraph.dev', 'Demo User', true, undefined, 'demo', undefined, true);
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
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsDemo,
        updateUser,
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
