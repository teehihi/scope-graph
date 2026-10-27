import React from 'react';
import { Link } from '../../router';
import { ScopeGraphLogoMark } from '../BrandIcons';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* Centred Card, max 420px */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E4E7E1] shadow-xl shadow-slate-200/50 p-8 space-y-6">
        {/* Top Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link to="/" className="inline-block hover:scale-105 transition-transform">
            <ScopeGraphLogoMark size={48} dark={false} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#151923] tracking-tight">{title}</h1>
            <p className="text-xs text-[#8B929E] mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Form Body */}
        {children}

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-[#E4E7E1]">
          <p className="text-xs text-[#8B929E]">
            {footerText}{' '}
            <Link
              to={footerLinkTo}
              className="font-bold text-[#151923] hover:bg-[#C7F36B] px-1.5 py-0.5 rounded-md transition-all underline underline-offset-2 decoration-[#151923]"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </div>

      {/* Back to marketing site */}
      <div className="mt-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8B929E] hover:text-[#151923] hover:bg-[#C7F36B]/25 px-2.5 py-1 rounded-lg transition-all"
        >
          ← Back to ScopeGraph home
        </Link>
      </div>
    </div>
  );
};
