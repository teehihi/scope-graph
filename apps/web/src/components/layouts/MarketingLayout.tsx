import React, { useState } from 'react';
import { useRouter, Link } from '../../router';
import { ScopeGraphLogoMark } from '../BrandIcons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Github, ArrowRight, Sparkles } from 'lucide-react';
import { LanguageSelectorDropdown } from '../LanguageSelectorDropdown';
import { UpgradeModal } from '../UpgradeModal';

interface MarketingLayoutProps {
  children: React.ReactNode;
  onOpenUpgradeModal?: () => void;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children, onOpenUpgradeModal }) => {
  const { isAuthenticated, loginAsDemo } = useAuth();
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleOpenPricing = () => {
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal();
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

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
          <Link to="/" className="hover:text-[#151923] transition-colors">
            {t('landing.nav_home')}
          </Link>
          <Link to="/?section=features" className="hover:text-[#151923] transition-colors">
            {t('landing.nav_features')}
          </Link>
          <Link to="/?section=mcp-section" className="hover:text-[#151923] transition-colors">
            {t('landing.nav_mcp')}
          </Link>
          <Link to="/docs" className="hover:text-[#151923] transition-colors">
            {t('docs.title')}
          </Link>
          <button
            type="button"
            onClick={handleOpenPricing}
            className="group text-[#8B929E] hover:text-[#526BEE] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8B929E] group-hover:text-[#526BEE] transition-colors" />
            <span>{t('landing.nav_pricing')}</span>
          </button>
        </nav>

        {/* Auth CTA & Language buttons */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <LanguageSelectorDropdown variant="rounded" />

          {isAuthenticated ? (
            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-white hover:bg-[#526BEE] hover:shadow-md hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
            >
              <span>{t('nav.dashboard')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B]" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-block text-xs font-semibold px-3 py-2 text-[#151923] hover:text-[#526BEE] transition-colors"
              >
                {t('landing.nav_login')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  loginAsDemo();
                  navigate('/app/dashboard');
                }}
                className="group flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <span>{t('landing.nav_signup')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Upgrade / Pricing Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

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
            <Link to="/docs" className="font-semibold hover:text-[#151923] transition-colors">
              {t('docs.title')}
            </Link>
            <Link to="/privacy" className="font-semibold hover:text-[#151923] transition-colors">
              {t('privacy.title')}
            </Link>
            <Link to="/terms" className="font-semibold hover:text-[#151923] transition-colors">
              {t('terms.title')}
            </Link>
            <button
              type="button"
              onClick={handleOpenPricing}
              className="font-semibold hover:text-[#151923] transition-colors cursor-pointer"
            >
              {t('landing.nav_pricing')}
            </button>
            <a
              href="https://github.com/teehihi/scope-graph"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#151923] transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
