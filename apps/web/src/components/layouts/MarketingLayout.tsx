import React from 'react';
import { Link } from '../../router';
import { ScopeGraphLogoMark } from '../BrandIcons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, AVAILABLE_LANGUAGES, Language } from '../../context/LanguageContext';
import { Github, ArrowRight, Sparkles, Globe } from 'lucide-react';

interface MarketingLayoutProps {
  children: React.ReactNode;
  onOpenUpgradeModal?: () => void;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children, onOpenUpgradeModal }) => {
  const { isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* Slim Top Bar */}
      <header className="h-16 border-b border-[#E4E7E1] bg-[#F7F8F5]/90 backdrop-blur sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <ScopeGraphLogoMark size={36} dark={false} className="shrink-0 group-hover:scale-105 transition-transform" />
          <span className="font-extrabold text-xl tracking-[-0.5px] text-[#151923]">
            ScopeGraph
          </span>
        </Link>

        {/* Center / Right Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#8B929E]">
          <a href="#how-it-works" className="hover:text-[#151923] transition-colors">
            How it works
          </a>
          <a href="#what-you-get" className="hover:text-[#151923] transition-colors">
            Features
          </a>
          <a href="#mcp" className="hover:text-[#151923] transition-colors">
            MCP Agent
          </a>
          <a href="#demo" className="hover:text-[#151923] transition-colors">
            Demo
          </a>
          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="text-[#151923] font-bold hover:text-[#526BEE] flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>{t('pricing.nav_title')}</span>
            </button>
          )}
        </nav>

        {/* Auth CTA & Language buttons */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative flex items-center gap-1 bg-white border border-[#E4E7E1] rounded-xl px-2 py-1 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-[#8B929E]" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
              className="bg-transparent text-xs font-bold text-[#151923] outline-none cursor-pointer pr-1"
            >
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.code.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {isAuthenticated ? (
            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-white hover:bg-[#526BEE] hover:shadow-md hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
            >
              <span>Go to App</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B]" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-block text-xs font-semibold px-3 py-2 text-[#151923] hover:text-[#526BEE] transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="group flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E4E7E1] bg-white py-12 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <ScopeGraphLogoMark size={28} dark={false} />
            <div>
              <span className="font-extrabold text-sm tracking-[-0.5px] text-[#151923]">
                ScopeGraph
              </span>
              <p className="text-xs text-[#8B929E]">
                Understand the impact before you change the code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8B929E]">
            {onOpenUpgradeModal && (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="font-semibold hover:text-[#151923] transition-colors cursor-pointer"
              >
                {t('pricing.nav_title')}
              </button>
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#151923] transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
            <span className="text-slate-300">•</span>
            <span>Built for Modern Engineering Teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
