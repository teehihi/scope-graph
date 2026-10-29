import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { ScopeGraphLogoMark } from '../components/BrandIcons';
import { Loader } from '../components/Loader';
import { AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const { navigate, search } = useRouter();
  const { user: currentUser, login, updateUser } = useAuth();
  const hasExchangedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get('code');
    const errorParam = params.get('error_description') || params.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(errorParam);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code provided in the callback URL.');
      return;
    }

    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const exchangeCode = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const endpoint = `${apiUrl}/api/v1/auth/github`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to exchange GitHub authorization code');
        }

        const user = data.user;
        setUserName(user.name || user.username || 'Developer');
        setStatus('success');

        const oauthAction = sessionStorage.getItem('scopegraph_oauth_action');
        sessionStorage.removeItem('scopegraph_oauth_action');

        // Check if user was already in a session and simply linking GitHub (e.g. from Demo or Email account)
        if (oauthAction === 'link_account' && currentUser) {
          // Keep current identity (Demo User or Email user), attach GitHub token and metadata
          updateUser({
            githubToken: data.access_token,
            username: user.username,
          });
          if (currentUser.email) {
            localStorage.setItem(`scopegraph_gh_token_${currentUser.email}`, data.access_token);
          }
        } else {
          // Regular "Login with GitHub" flow
          const hasOnboarded =
            localStorage.getItem(`scopegraph_onboarded_${user.email}`) === 'true';

          login(
            user.email,
            user.name,
            false,
            user.avatar_url,
            'github',
            user.username,
            hasOnboarded,
            data.access_token
          );
        }

        // Check if there is a saved return URL from where the user started OAuth (e.g. /app/repositories)
        const returnUrl = sessionStorage.getItem('scopegraph_auth_return_url');
        sessionStorage.removeItem('scopegraph_auth_return_url');

        // Redirect to previous return URL if present, onboarding if new user, or dashboard if already onboarded
        setTimeout(() => {
          if (returnUrl) {
            navigate(returnUrl);
          } else if (currentUser?.onboarded) {
            navigate('/app/dashboard');
          } else {
            navigate('/onboarding');
          }
        }, 800);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.message || 'An unexpected error occurred during GitHub authentication.'
        );
      }
    };

    exchangeCode();
  }, [search, login, navigate]);

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E4E7E1] shadow-xl p-8 space-y-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <ScopeGraphLogoMark size={48} dark={false} />
          <h1 className="text-xl font-bold text-[#151923] tracking-tight">
            GitHub Authentication
          </h1>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="pt-1 pb-4 space-y-4 flex flex-col items-center justify-center">
            <Loader color="#151923" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#151923]">
                Verifying authorization...
              </p>
              <p className="text-[11px] text-[#8B929E]">
                Connecting to GitHub and loading your profile.
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="py-8 space-y-4 flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-[#C7F36B]/30 text-[#151923] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#151923]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#151923]">
                Welcome back, {userName}!
              </p>
              <p className="text-[11px] text-[#8B929E]">
                Redirecting to your dependency graph...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="py-4 space-y-4 text-left animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Authentication Failed</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold py-2 px-4 rounded-xl border border-[#E4E7E1] bg-white text-[#8B929E] hover:text-[#151923] hover:bg-[#F7F8F5] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
