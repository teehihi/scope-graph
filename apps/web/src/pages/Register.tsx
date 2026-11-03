import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthLayout } from '../components/layouts/AuthLayout';
import {
  UserCheck, ArrowRight, AlertCircle, HelpCircle, Info,
  Eye, EyeOff, Mail, RotateCcw, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { GitHubIcon, GoogleIcon } from '../components/BrandIcons';
import { DemoInfoModal } from '../components/DemoInfoModal';
import {
  registerSendOtp,
  registerVerifyOtp,
  resendOtp,
  warmAuthApi,
} from '../api/client';

type Step = 'form' | 'otp' | 'success';

export const Register: React.FC = () => {
  const { navigate } = useRouter();
  const { login, loginAsDemo } = useAuth();
  const { t } = useLanguage();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [step, setStep] = useState<Step>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Wake a sleeping API while the user fills in the registration form.
  useEffect(() => {
    void warmAuthApi().catch(() => undefined);
  }, []);

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await registerSendOtp(email.trim(), name.trim(), password);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpError(null);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = text[i] || '';
    setOtpDigits(next);
    const focusIdx = Math.min(text.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setOtpError('Please enter the full 6-digit code.');
      return;
    }
    setIsLoading(true);
    setOtpError(null);
    try {
      const result = await registerVerifyOtp(email.trim(), otp, name.trim(), password);
      // Log the user in client-side
      login(
        result.user.email,
        result.user.name,
        false,
        result.user.avatar_url,
        'email',
        result.user.username,
        false, // not onboarded yet
      );
      setStep('success');
      setTimeout(() => navigate('/onboarding'), 1200);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    try {
      await resendOtp(email.trim(), name.trim());
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code.');
    }
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
      sessionStorage.setItem('scopegraph_oauth_provider', 'github');
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email%20repo`;
      return;
    }
    if (provider === 'Google') {
      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '68011630163-6ce0k7lnlmp7stvn3cae2r6lpbnmccta.apps.googleusercontent.com';
      const redirectUri = `${window.location.origin}/auth/callback/google`;
      sessionStorage.setItem('scopegraph_oauth_provider', 'google');
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
      return;
    }
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

  // ----- OTP STEP -----
  if (step === 'otp' || step === 'success') {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Enter the 6-digit code we sent to your inbox"
        footerText="Already have an account?"
        footerLinkText="Log in"
        footerLinkTo="/login"
      >
        <div className="space-y-5 font-sans">
          {step === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-full bg-[#C7F36B]/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#151923]" />
              </div>
              <p className="text-sm font-bold text-[#151923]">Account verified!</p>
              <p className="text-[11px] text-[#8B929E]">Setting up your workspace…</p>
            </div>
          ) : (
            <>
              {/* Email indicator */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs text-[#151923]">
                <Mail className="w-4 h-4 text-[#8B929E] shrink-0" />
                <span>Code sent to <span className="font-semibold">{email}</span></span>
                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtpDigits(['', '', '', '', '', '']); }}
                  className="ml-auto text-[#8B929E] hover:text-[#151923] transition-colors cursor-pointer"
                  aria-label="Change email"
                >
                  Edit
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-[#8B929E]">{t('auth.register.check_email_hint')}</p>

              {/* Error */}
              {otpError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* OTP digit boxes */}
              <div>
                <label className="text-xs font-semibold text-[#151923] mb-2 block">Verification code</label>
                <div
                  className="flex gap-2 justify-between"
                  onPaste={handleOtpPaste}
                >
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-full aspect-square text-center text-lg font-bold rounded-xl border transition-all focus:outline-none focus:ring-2
                        ${digit
                          ? 'border-[#151923] bg-white ring-[#151923] text-[#151923]'
                          : 'border-[#E4E7E1] bg-[#F7F8F5] focus:ring-[#151923] text-[#151923]'
                        } ${otpError ? 'border-rose-400' : ''}`}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpDigits.join('').length < 6}
                className="group w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify &amp; Create Account</span>
                  </>
                )}
              </button>

              {/* Resend */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8B929E]">
                <span>Didn't receive it?</span>
                {resendCooldown > 0 ? (
                  <span className="font-semibold text-[#151923]">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="flex items-center gap-1 font-semibold text-[#151923] hover:text-[#C7F36B] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resend code
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </AuthLayout>
    );
  }

  // ----- REGISTRATION FORM STEP -----
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

        {/* OAuth Notice */}
        {oauthNotice && (
          <div className="p-3.5 rounded-xl bg-[#EDF0F7] border border-[#151923]/15 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2 text-[#151923]">
              <Info className="w-4 h-4 shrink-0 text-[#151923] mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">{oauthNotice} Sign-up</span> is configured for Cloud Production. For this hackathon demo, you can register instantly with simulated {oauthNotice} or test the 1-click Demo Account.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => confirmMockOAuth(oauthNotice as 'GitHub' | 'Google')}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] transition-colors cursor-pointer"
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

        {/* Divider */}
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#151923]">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all placeholder:text-[#8B929E]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B929E] hover:text-[#151923] p-1 rounded-md transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                <span>Continue</span>
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

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="group w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white text-[#151923] border border-[#E4E7E1] hover:bg-[#C7F36B] hover:text-[#151923] hover:border-[#C7F36B] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4 text-inherit transition-colors" />
          <span>Continue with demo account (demo@scopegraph.dev)</span>
        </button>

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

      <DemoInfoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onConfirmDemo={handleDemoLogin}
      />
    </AuthLayout>
  );
};
