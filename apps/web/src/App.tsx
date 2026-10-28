import React, { useEffect } from 'react';
import { useRouter } from './router';
import { useAuth } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { Onboarding } from './pages/Onboarding';
import { NotFound } from './pages/NotFound';
import { Dashboard } from './pages/app/Dashboard';
import { GraphPage } from './pages/app/Graph';
import { ImpactPage } from './pages/app/Impact';
import { RepositoriesPage } from './pages/app/Repositories';
import { SettingsPage } from './pages/app/Settings';

export const App: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Route Guard Effect
  useEffect(() => {
    if (isLoading) return;

    // 1. /app redirects to /app/dashboard
    if (pathname === '/app' || pathname === '/app/') {
      navigate('/app/dashboard');
      return;
    }

    // 2. Unauthenticated visits to /app/* or /onboarding redirect to /login
    if (pathname.startsWith('/app') || pathname === '/onboarding') {
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
    }

    // 3. Authenticated visits to /login or /register redirect
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      navigate('/app/dashboard');
      return;
    }
  }, [pathname, isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#151923]/20 border-t-[#151923] rounded-full animate-spin" />
      </div>
    );
  }

  // Public Routes
  if (pathname === '/' || pathname === '') {
    return <Landing />;
  }

  if (pathname === '/login') {
    return <Login />;
  }

  if (pathname === '/register') {
    return <Register />;
  }

  // OAuth Callback Route
  if (
    pathname === '/auth/callback/github' ||
    pathname === '/auth/callback/github/' ||
    pathname === '/auth/callback' ||
    pathname === '/auth/callback/'
  ) {
    return <AuthCallback />;
  }

  // Onboarding Route
  if (pathname === '/onboarding' || pathname === '/onboarding/') {
    if (!isAuthenticated) return null;
    return <Onboarding />;
  }

  // Authenticated App Routes
  if (pathname.startsWith('/app')) {
    if (!isAuthenticated) {
      // Guard handles redirect; render fallback while transitioning
      return null;
    }

    if (pathname === '/app/dashboard') {
      return <Dashboard />;
    }
    if (pathname === '/app/graph') {
      return <GraphPage />;
    }
    if (pathname === '/app/impact') {
      return <ImpactPage />;
    }
    if (pathname === '/app/repositories') {
      return <RepositoriesPage />;
    }
    if (pathname === '/app/settings') {
      return <SettingsPage />;
    }
  }

  // Explicit 404 or any unknown route -> NotFound
  return <NotFound />;
};
