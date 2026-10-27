import React, { useState } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layouts/AuthLayout';
import { UserCheck, ArrowRight, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { GitHubIcon, GoogleIcon } from '../components/BrandIcons';
import { DemoInfoModal } from '../components/DemoInfoModal';

export const Register: React.FC = () => {
  const { navigate } = useRouter();
  const { login, loginAsDemo } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(email.trim(), name.trim());
      setIsLoading(false);
      navigate('/app/dashboard');
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
      navigate('/app/dashboard');
    }, 300);
  };

  return (
    <AuthLayout
      title="Create your ScopeGraph account"
      subtitle="Analyze codebase dependencies and blast radius"
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkTo="/login"
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
          <div className="p-3.5 rounded-xl bg-[#EDF0F7] border border-[#526BEE]/30 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2 text-[#151923]">
              <Info className="w-4 h-4 shrink-0 text-[#526BEE] mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">{oauthNotice} Sign-up</span> is configured for Cloud Production. For this hackathon demo, you can register instantly with simulated {oauthNotice} or test the 1-click Demo Account.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => confirmMockOAuth(oauthNotice as 'GitHub' | 'Google')}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#526BEE] text-white hover:bg-[#151923] transition-colors cursor-pointer"
              >
                Sign up with {oauthNotice} →
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              required
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@company.com"
              required
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
            />
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
                <span>Create Account</span>
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

        {/* Demo Mode Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="group w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#526BEE] hover:text-white hover:border-[#526BEE] hover:shadow-md hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4 text-inherit transition-colors" />
          <span>Continue with demo account (demo@scopegraph.dev)</span>
        </button>

        {/* Interactive Lead Link to Modal */}
        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8B929E] hover:text-[#526BEE] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8B929E] group-hover:text-[#526BEE] transition-colors" />
            <span className="underline underline-offset-2">What is Demo Mode? Learn what's included</span>
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
