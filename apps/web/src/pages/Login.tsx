import React, { useState } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layouts/AuthLayout';
import { UserCheck, ArrowRight, AlertCircle, HelpCircle, Info, Eye, EyeOff } from 'lucide-react';
import { GitHubIcon, GoogleIcon } from '../components/BrandIcons';
import { DemoInfoModal } from '../components/DemoInfoModal';

export const Login: React.FC = () => {
  const { navigate, search } = useRouter();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Parse redirect destination
  const redirectTarget = new URLSearchParams(search).get('redirect') || '/app/dashboard';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(email.trim());
      setIsLoading(false);
      navigate(redirectTarget);
    }, 400);
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsDemo();
      setIsLoading(false);
      navigate('/app/dashboard');
    }, 300);
  };

  const handleOAuthLogin = (provider: 'GitHub' | 'Google') => {
    if (provider === 'GitHub') {
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23lifjNq0eAxACh6IW';
      const redirectUri = `${window.location.origin}/auth/callback/github`;
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email%20repo`;
      return;
    }
    // Show cloud notice for Google
    setOauthNotice(provider);
  };

  const confirmMockOAuth = (provider: 'GitHub' | 'Google') => {
    setIsLoading(true);
    setTimeout(() => {
      if (provider === 'GitHub') {
        login('developer@github.com', 'GitHub Developer');
      } else {
        login('developer@gmail.com', 'Google User');
      }
      setIsLoading(false);
      navigate(redirectTarget);
    }, 300);
  };

  return (
    <AuthLayout
      title="Welcome to ScopeGraph"
      subtitle="Understand the impact before you change the code"
      footerText="Don't have an account?"
      footerLinkText="Create account"
      footerLinkTo="/register"
    >
      <div className="space-y-4 font-sans">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth Notice Modal / Alert */}
        {oauthNotice && (
          <div className="p-3.5 rounded-xl bg-[#EDF0F7] border border-[#151923]/15 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2 text-[#151923]">
              <Info className="w-4 h-4 shrink-0 text-[#151923] mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">{oauthNotice} OAuth</span> is configured for Cloud Production. For this hackathon demo, you can test with simulated {oauthNotice} credentials or use the 1-click Demo Account.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => confirmMockOAuth(oauthNotice as 'GitHub' | 'Google')}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] transition-colors cursor-pointer"
              >
                Sign in as {oauthNotice} user →
              </button>
              <button
                type="button"
                onClick={() => setOauthNotice(null)}
                className="text-[11px] px-2.5 py-1.5 text-[#8B929E] hover:text-[#151923] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Social OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleOAuthLogin('GitHub')}
            disabled={isLoading}
            className="group w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#E4E7E1] bg-white text-[#151923] hover:bg-[#151923] hover:text-[#F7F8F5] hover:border-[#151923] hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <GitHubIcon className="w-4 h-4 text-inherit transition-colors" />
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin('Google')}
            disabled={isLoading}
            className="group w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#E4E7E1] bg-white text-[#151923] hover:bg-[#F7F8F5] hover:border-[#8B929E] hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>Google</span>
          </button>
        </div>

        {/* Divider: OR EMAIL */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E4E7E1]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-[#8B929E] tracking-wider">
            <span className="bg-white px-2">or continue with email</span>
          </div>
        </div>

        {/* Traditional Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thiennn@vng.com"
              required
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B929E] hover:text-[#151923] p-1 rounded-md transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Log in with Email</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
              </>
            )}
          </button>
        </form>

        {/* Divider: OR DEMO */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E4E7E1]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-[#8B929E] tracking-wider">
            <span className="bg-white px-2">or quick demo</span>
          </div>
        </div>

        {/* Demo Mode Button: Icon and Text change color together seamlessly with Electric Lime */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="group w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white text-[#151923] border border-[#E4E7E1] hover:bg-[#C7F36B] hover:text-[#151923] hover:border-[#C7F36B] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4 text-inherit transition-colors" />
          <span>Continue with demo account</span>
        </button>

        {/* Interactive Lead Link to Modal: Soft Lime hover highlight, matching buttons */}
        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8B929E] hover:text-[#151923] hover:bg-[#C7F36B]/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8B929E] group-hover:text-[#151923] transition-colors" />
            <span className="underline underline-offset-2 decoration-[#8B929E]/60 group-hover:decoration-[#151923]">
              What is Demo Mode? Learn what's included
            </span>
          </button>
        </div>
      </div>

      {/* Demo Information Modal */}
      <DemoInfoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onConfirmDemo={handleDemoLogin}
      />
    </AuthLayout>
  );
};
