import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UpgradeModal } from '../components/UpgradeModal';
import { ScopeGraphLogoMark } from '../components/BrandIcons';
import { LanguageSelectorDropdown } from '../components/LanguageSelectorDropdown';
import { FloatingAssistant } from '../components/FloatingAssistant';
import { useHideHeaderOnScroll } from '../hooks/useHideHeaderOnScroll';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Sparkles, Code2, ShieldCheck, ArrowRight, Zap, Play, Network, FlaskConical } from 'lucide-react';

export const Landing: React.FC = () => {
  const { navigate, search } = useRouter();
  const { user, isAuthenticated, loginAsDemo } = useAuth();
  const { t } = useLanguage();

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHeaderVisible = useHideHeaderOnScroll();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const targetSection =
      params.get('section') || (window.location.hash ? window.location.hash.replace('#', '') : null);
    if (targetSection) {
      setTimeout(() => {
        scrollToSection(targetSection);
      }, 150);
    }
    if (params.get('pricing') === 'true') {
      setIsUpgradeModalOpen(true);
    }
  }, [search]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: false,
      easing: 'ease-out-cubic',
    });
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleLaunchDemo = () => {
    if (!isAuthenticated) {
      loginAsDemo();
    }
    navigate('/app/dashboard');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="font-['Poppins',sans-serif] text-slate-700 bg-white antialiased overflow-x-clip max-md:touch-pan-y selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* 1. NAVBAR (ScopeGraph Branding) — sticky, hides on scroll down, returns on scroll up */}
      <div
        className={`w-full text-slate-800 bg-[#F7F8F5] border-b border-[#E4E7E1]/60 sticky top-0 z-50 transition-transform duration-300 will-change-transform ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-screen-xl px-4 sm:px-6 mx-auto flex items-center justify-between py-4 relative">
          {/* Left: Brand Logo */}
          <div className="flex items-center shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <ScopeGraphLogoMark size={36} dark={false} className="shrink-0 group-hover:scale-105 transition-transform" />
              <span className="font-extrabold text-2xl tracking-tight text-[#151923]">
                ScopeGraph
              </span>
            </Link>
          </div>

          {/* Desktop Center: Navigation Links (Mathematically Centered in Header) */}
          <nav className="hidden md:flex items-center justify-center gap-1.5 lg:gap-2.5 md:absolute md:left-1/2 md:-translate-x-1/2">
            <a
              href="#"
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer"
            >
              {t('landing.nav_home')}
            </a>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-left"
            >
              {t('landing.nav_features')}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mcp-section')}
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-left"
            >
              {t('landing.nav_mcp')}
            </button>
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="group text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#151923] transition-colors" />
              <span>{t('landing.nav_pricing')}</span>
            </button>
          </nav>

          {/* Desktop Right: Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0">
            <LanguageSelectorDropdown showActiveFlag={false} />

            {isAuthenticated && user ? (
              <Link
                to="/app/dashboard"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#E4E7E1] bg-white hover:border-[#151923] hover:bg-slate-50 transition-all shadow-2xs group"
                title={user.name || user.username || 'Dashboard'}
              >
                <img
                  src={user.avatarUrl || '/default-avatar.webp'}
                  alt={user.name || 'User avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-[#E4E7E1] shadow-2xs shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/default-avatar.webp';
                  }}
                />
                <span className="text-sm font-bold text-[#151923] max-w-[140px] lg:max-w-[180px] truncate group-hover:text-[#526BEE] transition-colors leading-tight">
                  {user.name || user.username || 'Developer'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8B929E] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all mr-0.5 shrink-0" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2 text-sm text-center bg-white text-[#151923] border border-[#E4E7E1] rounded-full font-bold shadow-2xs hover:border-[#151923] hover:bg-slate-50 transition-all"
                >
                  {t('landing.nav_login')}
                </Link>

                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="group px-5 py-2 text-sm text-center bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] rounded-full font-bold shadow-sm hover:shadow-md hover:shadow-[#C7F36B]/25 transform transition hover:scale-105 duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{t('landing.nav_signup')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] transition-colors" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            className="rounded-lg md:hidden focus:outline-none focus:shadow-outline p-2 text-slate-700 hover:text-black shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
              {!isMobileMenuOpen ? (
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden px-6 pt-2 pb-6 border-t border-[#E4E7E1]/60 flex flex-col gap-2 bg-[#F7F8F5]">
            <a
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer"
            >
              {t('landing.nav_home')}
            </a>
            <button
              type="button"
              onClick={() => {
                scrollToSection('features');
                setIsMobileMenuOpen(false);
              }}
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer text-left"
            >
              {t('landing.nav_features')}
            </button>
            <button
              type="button"
              onClick={() => {
                scrollToSection('mcp-section');
                setIsMobileMenuOpen(false);
              }}
              className="text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer text-left"
            >
              {t('landing.nav_mcp')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsUpgradeModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="group text-sm font-bold text-[#151923] hover:bg-[#C7F36B] hover:text-[#151923] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#151923] transition-colors" />
              <span>{t('landing.nav_pricing')}</span>
            </button>

            <div className="flex flex-col gap-3 pt-3 border-t border-[#E4E7E1]/60">
              <LanguageSelectorDropdown showActiveFlag={false} />

              {isAuthenticated && user ? (
                <Link
                  to="/app/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E4E7E1] bg-white group hover:border-[#151923] transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatarUrl || '/default-avatar.webp'}
                      alt={user.name || 'User avatar'}
                      className="w-9 h-9 rounded-full object-cover border border-[#E4E7E1] shadow-2xs shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.webp';
                      }}
                    />
                    <span className="text-sm font-bold text-[#151923] truncate">
                      {user.name || user.username || 'Developer'}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8B929E] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all mr-1 shrink-0" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full py-2 text-sm text-center bg-white text-[#151923] border border-[#E4E7E1] rounded-full font-bold shadow-2xs hover:border-[#151923] hover:bg-slate-50 transition-all"
                  >
                    {t('landing.nav_login')}
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLaunchDemo();
                    }}
                    className="group w-full py-2 text-sm text-center bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] rounded-full font-bold shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>{t('landing.nav_signup')}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] transition-colors" />
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>

      {/* 2. HERO SECTION (ScopeGraph Warm White & Brand Colors) */}
      <div className="bg-[#F7F8F5] pt-6 sm:pt-10 overflow-visible">
        <div className="max-w-screen-xl px-6 sm:px-8 mx-auto flex flex-col lg:flex-row items-center pb-8 sm:pb-12 lg:pb-16">
          {/* Left Col */}
          <div className="flex flex-col w-full lg:w-7/12 xl:w-[58%] justify-center lg:pt-4 items-start text-center lg:text-left mb-10 lg:mb-0 relative z-40 lg:pr-6">
            <h1
              data-aos="fade-right"
              data-aos-once="true"
              className="my-3 text-4xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.12] tracking-tight text-[#151923]"
            >
              <span className="text-[#C7F36B]">
                {t('landing.hero_title_accent')}
              </span>{' '}
              {t('landing.hero_title_main')}
            </h1>

            <p
              data-aos="fade-down"
              data-aos-once="true"
              data-aos-delay="300"
              className="leading-relaxed text-lg sm:text-xl mb-8 text-slate-600 max-w-2xl"
            >
              {t('landing.hero_subtitle')}
            </p>

            <div
              data-aos="fade-up"
              data-aos-once="true"
              data-aos-delay="700"
              className="w-full flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 relative z-40"
            >
              <button
                type="button"
                onClick={handleLaunchDemo}
                className="group w-full sm:w-auto bg-[#151923] hover:bg-[#C7F36B] text-[#F7F8F5] hover:text-[#151923] text-lg font-bold rounded-full py-4 px-9 focus:outline-none transform transition hover:scale-105 duration-300 ease-in-out cursor-pointer shadow-lg hover:shadow-[#C7F36B]/30 flex items-center justify-center gap-2"
              >
                <span>{isAuthenticated ? t('nav.dashboard') : t('landing.hero_btn_join')}</span>
                <ArrowRight className="w-5 h-5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-1 transition-all" />
              </button>

              <div
                onClick={() => scrollToSection('features')}
                className="group flex items-center justify-center space-x-3 focus:outline-none cursor-pointer py-2 px-1"
              >
                <div
                  aria-label="Explore Architecture"
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md border border-[#E4E7E1] group-hover:border-[#151923] group-hover:shadow-lg group-hover:scale-105 transition-all shrink-0 cursor-pointer"
                >
                  <Play className="w-5 h-5 text-[#151923] fill-[#151923] ml-0.5 transition-transform group-hover:scale-110" />
                </div>
                <span className="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-[#151923] transition-colors whitespace-nowrap">
                  {t('landing.hero_btn_watch')}
                </span>
              </div>
            </div>
          </div>

          {/* Right Col: Transparent Developer Cutout Under Curved Wave */}
          <div className="w-full lg:w-5/12 xl:w-[42%] relative mt-6 lg:mt-0 flex justify-center lg:justify-end" id="girl">
            <div className="relative w-full max-w-[480px] sm:max-w-[540px] lg:max-w-[580px] ml-auto translate-y-6 sm:translate-y-10 lg:translate-y-14 -mb-6 sm:-mb-10 lg:-mb-14 lg:translate-x-6 xl:translate-x-12">
              <img
                data-aos="fade-up"
                data-aos-once="true"
                className="w-full relative z-10 drop-shadow-2xl"
                src="/brand/hero-developer-cutout.png"
                alt="ScopeGraph Software Engineer"
              />

              {/* FLOATING BADGE 1: 14 Files Indexed (Top Left - Clear of developer head) */}
              <div
                data-aos="fade-up"
                data-aos-delay="300"
                data-aos-once="true"
                className="hidden lg:block absolute -top-8 -left-6 lg:-left-12 xl:-left-16 floating-4 z-20 scale-90 xl:scale-100 origin-top-left"
              >
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C7F36B]/30 border border-[#C7F36B]/60 flex items-center justify-center text-[#151923] shrink-0">
                    <Code2 className="w-4 h-4 text-[#151923]" />
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-xs text-[#151923] whitespace-nowrap">
                      {t('landing.hero_badge_files')}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                      {t('landing.hero_badge_files_sub')}
                    </p>
                  </div>
                </div>
              </div>

              {/* FLOATING BADGE 2: Scout AI Active (Top Right - Clear of developer head) */}
              <div
                data-aos="fade-up"
                data-aos-delay="400"
                data-aos-once="true"
                className="hidden lg:block absolute -top-10 -right-4 lg:-right-8 xl:-right-12 floating z-20 scale-90 xl:scale-100 origin-top-right"
              >
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-2">
                  <img
                    src="/brand/scout/scout-celebration.svg"
                    alt="Scout AI Mascot"
                    className="w-8 h-8 shrink-0 drop-shadow-xs"
                  />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                      <p className="font-extrabold text-xs text-[#151923] whitespace-nowrap">
                        {t('landing.hero_badge_scout')}
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-[#151923] whitespace-nowrap">
                      {t('landing.hero_badge_scout_sub')}
                    </p>
                  </div>
                </div>
              </div>

              {/* FLOATING BADGE 3: Blast Radius Protection (Bottom Left - Clear of laptop & chest) */}
              <div
                data-aos="fade-up"
                data-aos-delay="500"
                data-aos-once="true"
                className="hidden lg:block absolute bottom-8 lg:bottom-14 xl:bottom-20 -left-6 lg:-left-14 xl:-left-20 floating z-30 max-w-[210px] xl:max-w-[220px] scale-90 xl:scale-100 origin-bottom-left"
              >
                <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200/80 text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
                    <p className="font-extrabold text-xs text-[#151923]">
                      {t('landing.hero_badge_blast')}
                    </p>
                  </div>
                  <div className="inline-block bg-rose-50 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-rose-200/70 mb-2">
                    {t('landing.hero_badge_blast_detail')}
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchDemo}
                    className="w-full py-1.5 px-3 bg-[#151923] hover:bg-[#C7F36B] text-white hover:text-[#151923] text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center block shadow-xs"
                  >
                    {t('landing.hero_badge_blast_action')} →
                  </button>
                </div>
              </div>

              {/* FLOATING BADGE 4: Zero Hallucinations Grounded (Bottom Right - Clear of body & thumbs-up) */}
              <div
                data-aos="fade-up"
                data-aos-delay="600"
                data-aos-once="true"
                className="hidden lg:block absolute bottom-8 lg:bottom-14 xl:bottom-22 -right-4 lg:-right-8 xl:-right-12 floating-4 z-30 scale-90 xl:scale-100 origin-bottom-right"
              >
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-xs text-[#151923] whitespace-nowrap">
                      {t('landing.hero_badge_evidence')}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                      {t('landing.hero_badge_evidence_sub')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skilline Signature Bottom Curved Wave (z-30 on top of the person's bottom) */}
        <div className="text-white -mt-10 sm:-mt-14 lg:-mt-20 z-30 relative pointer-events-none">
          <svg
            className="xl:h-36 xl:w-full"
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M600,112.77C268.63,112.77,0,65.52,0,7.23V120H1200V7.23C1200,65.52,931.37,112.77,600,112.77Z"
              fill="currentColor"
            />
          </svg>
          <div className="bg-white w-full h-12 -mt-px"></div>
        </div>
      </div>

      {/* 3. MAIN CONTAINER */}
      <div className="container px-4 lg:px-8 mx-auto max-w-screen-xl text-slate-700 overflow-x-hidden">
        {/* Trusted By */}
        <div className="max-w-4xl mx-auto pt-6">
          <h2 className="text-center mb-6 text-slate-400 font-semibold tracking-wide text-xs sm:text-sm uppercase">
            {t('landing.trusted_by')}
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-y-6 gap-x-8 sm:gap-x-10 px-2 sm:px-4 transition-all">
            <img className="h-6 sm:h-7 object-contain shrink-0" src="/skilline/company/meta.svg" alt="Meta" />
            <img className="h-7 sm:h-8 object-contain shrink-0" src="/skilline/company/baseten.svg" alt="Baseten" />
            <img className="h-6 sm:h-7 object-contain shrink-0" src="/skilline/company/modal.png" alt="Modal" />
            <img className="h-6 sm:h-7 object-contain shrink-0" src="/skilline/company/github.svg" alt="GitHub" />
            <img className="h-6 sm:h-7 object-contain shrink-0" src="/skilline/company/google.svg" alt="Google" />
            <img className="h-6 sm:h-7 object-contain shrink-0 transform translate-y-0.5" src="/skilline/company/amazon.svg" alt="Amazon" />
          </div>
        </div>

        {/* All-In-One Code Intelligence */}
        <div id="features" data-aos="flip-up" className="max-w-xl mx-auto text-center mt-24">
          <h2 className="font-extrabold text-[#151923] my-3 text-3xl tracking-tight">
            {t('landing.all_in_one_title')}{' '}
            <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.all_in_one_highlight')}</span>
          </h2>
          <p className="leading-relaxed text-slate-500 text-base">
            {t('landing.all_in_one_desc')}
          </p>
        </div>

        {/* 3 Signature Cards with ScopeGraph Brand Kit Accents */}
        <div className="grid md:grid-cols-3 gap-14 md:gap-6 mt-20">
          {/* Card 1: ScopeGraph Primary (#151923 & #C7F36B) */}
          <div data-aos="fade-up" className="bg-white shadow-xl hover:shadow-2xl transition-shadow p-6 text-center rounded-2xl border border-slate-100">
            <div className="bg-[#151923] rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-lg shadow-[#151923]/25 transform -translate-y-12">
              <Network className="w-7 h-7 text-[#C7F36B] stroke-[2.2]" />
            </div>
            <h3 className="font-bold text-xl mb-3 lg:px-6 text-[#151923]">
              {t('landing.feature_graph_title')}
            </h3>
            <p className="px-3 text-slate-500 text-sm leading-relaxed">
              {t('landing.feature_graph_desc')}
            </p>
          </div>

          {/* Card 2: Brand Red / Anti-Hallucination Evidence Gate (#E5484D) */}
          <div data-aos="fade-up" data-aos-delay="150" className="bg-white shadow-xl hover:shadow-2xl transition-shadow p-6 text-center rounded-2xl border border-slate-100">
            <div style={{ background: '#E5484D' }} className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-lg shadow-[#E5484D]/30 transform -translate-y-12">
              <ShieldCheck className="w-7 h-7 text-white stroke-[2.2]" />
            </div>
            <h3 className="font-bold text-xl mb-3 lg:px-6 text-[#151923]">
              {t('landing.feature_evidence_title')}
            </h3>
            <p className="px-3 text-slate-500 text-sm leading-relaxed">
              {t('landing.feature_evidence_desc')}
            </p>
          </div>

          {/* Card 3: Emerald / Tests (#10B981) */}
          <div data-aos="fade-up" data-aos-delay="300" className="bg-white shadow-xl hover:shadow-2xl transition-shadow p-6 text-center rounded-2xl border border-slate-100">
            <div style={{ background: '#10B981' }} className="rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-lg shadow-[#10B981]/30 transform -translate-y-12">
              <FlaskConical className="w-7 h-7 text-white stroke-[2.2]" />
            </div>
            <h3 className="font-bold text-xl mb-3 lg:px-6 text-[#151923]">
              {t('landing.feature_tests_title')}
            </h3>
            <p className="px-3 text-slate-500 text-sm leading-relaxed">
              {t('landing.feature_tests_desc')}
            </p>
          </div>
        </div>

        {/* What is ScopeGraph? (2 Personas Cards) */}
        <div className="mt-28">
          <div data-aos="flip-down" className="text-center max-w-screen-md mx-auto">
            <h2 className="text-3xl font-extrabold mb-4 text-[#151923]">
              {t('landing.what_is_title')}{' '}
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.what_is_scopegraph')}</span>
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              {t('landing.what_is_desc')}
            </p>
          </div>

          <div data-aos="fade-up" className="flex flex-col md:flex-row justify-center gap-6 lg:gap-8 mt-10">
            {/* Persona 1: Developers */}
            <div className="relative md:w-5/12 rounded-3xl overflow-hidden shadow-xl border border-slate-200 group">
              <img className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500" src="/skilline/Rectangle 19.png" alt="For Developers" />
              <div className="absolute bg-gradient-to-t from-[#151923]/95 via-[#151923]/60 to-transparent bottom-0 left-0 right-0 w-full h-full p-8 flex flex-col justify-end">
                <div className="w-12 h-12 rounded-2xl bg-[#151923] border border-slate-700 flex items-center justify-center mb-3 shadow-md">
                  <img src="/brand/roles/role-developer.svg" alt="Dev" className="w-6 h-6 text-white" />
                </div>
                <h3 className="uppercase text-white font-extrabold text-lg lg:text-xl mb-2">
                  {t('landing.for_developers')}
                </h3>
                <p className="text-slate-300 text-xs mb-4 line-clamp-2">
                  {t('landing.for_developers_desc')}
                </p>
                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="rounded-full bg-white text-[#151923] hover:bg-[#C7F36B] text-xs lg:text-sm px-6 py-3 w-full font-bold focus:outline-none transform transition hover:scale-102 duration-300 cursor-pointer shadow-md border border-[#E4E7E1]"
                >
                  {t('landing.btn_demo')}
                </button>
              </div>
            </div>

            {/* Persona 2: AI Agents */}
            <div className="relative md:w-5/12 rounded-3xl overflow-hidden shadow-xl border border-slate-200 group">
              <img className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500" src="/skilline/Rectangle 21.png" alt="For AI Agents" />
              <div className="absolute bg-gradient-to-t from-[#151923]/95 via-[#151923]/60 to-transparent bottom-0 left-0 right-0 w-full h-full p-8 flex flex-col justify-end">
                <div className="w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center mb-3 shadow-md">
                  <img src="/brand/roles/role-ai-agent.svg" alt="Agent" className="w-6 h-6 text-white" />
                </div>
                <h3 className="uppercase text-white font-extrabold text-lg lg:text-xl mb-2">
                  {t('landing.for_agents')}
                </h3>
                <p className="text-slate-300 text-xs mb-4 line-clamp-2">
                  {t('landing.for_agents_desc')}
                </p>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="rounded-full text-[#151923] bg-[#C7F36B] hover:bg-[#bbf054] text-xs lg:text-sm px-6 py-3 w-full font-bold focus:outline-none transform transition hover:scale-102 duration-300 cursor-pointer shadow-md"
                >
                  {t('landing.nav_pricing')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section 4: Physical classroom -> Everything you can do... */}
        <div className="sm:flex items-center sm:space-x-12 mt-36">
          <div data-aos="fade-right" className="sm:w-1/2 relative">
            <h2 className="font-extrabold text-2xl sm:text-3xl relative z-10 text-[#151923] lg:pr-10 leading-snug">
              {t('landing.title_prefix')},{' '}
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block font-extrabold shadow-xs">
                {t('landing.title_suffix')}
              </span>
            </h2>
            <p className="py-5 lg:pr-24 text-slate-500 text-base leading-relaxed">
              {t('landing.description')}
            </p>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="font-bold text-[#151923] hover:text-slate-600 flex items-center gap-1.5 cursor-pointer text-base group"
            >
              <span>{t('landing.btn_demo')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div data-aos="fade-left" className="sm:w-1/2 relative mt-10 sm:mt-0">
            <div style={{ background: '#C7F36B' }} className="floating w-24 h-24 absolute rounded-2xl z-0 -top-4 -left-4 opacity-75"></div>
            <img className="rounded-2xl z-20 relative w-full shadow-xl border border-slate-100" src="/skilline/teacher-explaining.png" alt="" />
            <button
              type="button"
              onClick={handleLaunchDemo}
              aria-label="Play demo"
              className="bg-white w-14 h-14 rounded-full flex items-center justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 focus:outline-none hover:scale-110 duration-300 ease-in-out z-30 shadow-xl border border-slate-200 cursor-pointer text-[#151923] group"
            >
              <Play className="w-6 h-6 text-[#151923] fill-[#151923] ml-1 transition-transform group-hover:scale-110" />
            </button>
            <div style={{ background: '#C7F36B' }} className="floating-4 w-36 h-36 absolute rounded-2xl z-10 -bottom-4 -right-4 opacity-75"></div>
          </div>
        </div>

        {/* Feature Section 5: A user interface designed for... */}
        <div className="md:flex mt-40 md:space-x-12 items-center">
          <div data-aos="fade-down" className="md:w-7/12 relative">
            <div style={{ background: '#C7F36B' }} className="w-32 h-32 rounded-full absolute z-0 left-4 -top-12 animate-pulse opacity-60"></div>
            <div style={{ background: '#7CC7FF' }} className="w-6 h-6 rounded-full absolute z-0 left-36 -top-12 animate-ping"></div>
            <img className="relative z-20 floating w-full rounded-2xl shadow-xl border border-slate-100" src="/skilline/vcall.png" alt="" />
            <div style={{ background: '#C7F36B' }} className="w-36 h-36 rounded-full absolute z-0 right-16 -bottom-2 animate-pulse opacity-25"></div>
            <div style={{ background: '#E5484D' }} className="w-6 h-6 rounded-full absolute z-0 right-52 bottom-1 animate-ping"></div>
          </div>

          <div data-aos="fade-down" className="md:w-5/12 mt-16 md:mt-0 text-slate-600">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#151923] lg:pr-24 leading-snug">
              {t('landing.ui_designed_title')}{' '}
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.ui_designed_highlight')}</span>
            </h2>

            <div className="flex items-start space-x-4 my-6">
              <div className="flex-shrink-0 bg-[#C7F36B]/30 border border-[#C7F36B]/60 rounded-2xl p-3 flex items-center justify-center text-[#151923] mt-0.5">
                <Code2 className="w-5 h-5 text-[#151923]" />
              </div>
              <p className="text-sm sm:text-base leading-relaxed">{t('landing.ui_row1')}</p>
            </div>

            <div className="flex items-start space-x-4 my-6">
              <div className="flex-shrink-0 bg-emerald-50 rounded-2xl p-3 flex items-center justify-center text-emerald-600 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-sm sm:text-base leading-relaxed">{t('landing.ui_row2')}</p>
            </div>

            <div className="flex items-start space-x-4 my-6">
              <div className="flex-shrink-0 bg-[#C7F36B]/40 rounded-2xl p-3 flex items-center justify-center text-[#151923] mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-sm sm:text-base leading-relaxed">{t('landing.ui_row3')}</p>
            </div>
          </div>
        </div>

        {/* Feature Section 6: Tools For Teachers And Learners */}
        <div className="flex flex-col md:flex-row items-center md:space-x-12 mt-28">
          <div data-aos="fade-right" className="md:w-1/2 lg:pl-10">
            <h2 className="text-[#151923] font-extrabold text-2xl sm:text-3xl lg:pr-32 leading-snug">
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.tools_title')}</span>{' '}
              {t('landing.tools_highlight')}
            </h2>
            <p className="text-slate-500 my-4 lg:pr-20 text-base leading-relaxed">
              {t('landing.tools_desc')}
            </p>
          </div>
          <img data-aos="fade-left" className="md:w-1/2 rounded-2xl shadow-xl border border-slate-100" src="/skilline/girl-with-books.png" alt="Engineering tools" />
        </div>

        {/* Feature Section 7: Assessments, Quizzes, Tests */}
        <div className="mt-28 flex flex-col-reverse md:flex-row items-center md:space-x-12">
          <div data-aos="fade-right" className="md:w-6/12">
            <img className="md:w-11/12 rounded-2xl shadow-xl border border-slate-100" src="/skilline/true-false.png" alt="Deterministic Evidence" />
          </div>
          <div data-aos="fade-left" className="md:w-6/12 md:transform md:-translate-y-10">
            <h2 className="font-extrabold text-[#151923] text-2xl sm:text-3xl lg:pr-40 leading-snug">
              {t('landing.assessments_title')}, <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.assessments_highlight')}</span>
            </h2>
            <p className="text-slate-500 my-5 lg:pr-32 text-base leading-relaxed">
              {t('landing.assessments_desc')}
            </p>
          </div>
        </div>

        {/* Feature Section 8: Architecture Management Tools */}
        <div className="flex flex-col md:flex-row items-center mt-20">
          <div data-aos="fade-right" className="md:w-5/12">
            <h2 className="text-[#151923] font-extrabold text-2xl sm:text-3xl leading-snug lg:pr-20">
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.gradebook_title')}</span>{' '}
              {t('landing.gradebook_highlight')}
            </h2>
            <p className="my-5 lg:pr-14 text-slate-500 text-base leading-relaxed">
              {t('landing.gradebook_desc')}
            </p>
          </div>
          <img data-aos="fade-left" className="md:w-7/12 rounded-2xl shadow-xl border border-slate-100" src="/skilline/gradebook.png" alt="Architecture Gradebook" />
        </div>

        {/* Feature Section 9: One-on-One FastMCP Agent Streaming */}
        <div id="mcp-section" className="mt-28 flex flex-col-reverse md:flex-row items-center md:space-x-12">
          <div data-aos="fade-right" className="md:w-7/12">
            <img className="md:w-11/12 rounded-2xl shadow-xl border border-slate-100" src="/skilline/discussion.png" alt="FastMCP Discussions" />
          </div>
          <div data-aos="fade-left" className="md:w-5/12">
            <h2 className="font-extrabold text-[#151923] text-2xl sm:text-3xl lg:pr-32 leading-snug">
              {t('landing.discussion_title')}{' '}
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.discussion_highlight')}</span>
            </h2>
            <p className="text-slate-500 my-5 lg:pr-14 text-base leading-relaxed">
              {t('landing.discussion_desc')}
            </p>
          </div>
        </div>

        {/* Centered Button: See more features */}
        <button
          type="button"
          data-aos="flip-up"
          onClick={() => setIsUpgradeModalOpen(true)}
          className="px-8 py-3.5 border-2 border-[#151923] text-[#151923] hover:bg-[#151923] hover:text-[#F7F8F5] font-bold my-16 focus:outline-none transform transition hover:scale-105 duration-300 ease-in-out rounded-full mx-auto block cursor-pointer shadow-xs"
        >
          {t('landing.btn_see_more')}
        </button>

        {/* Section 10: INTEGRATIONS */}
        <div className="mt-24 flex flex-col md:flex-row items-start md:space-x-12">
          <div data-aos="zoom-in-right" className="md:w-6/12">
            <img className="md:w-9/12 mx-auto rounded-2xl shadow-xl border border-slate-100" src="/skilline/integrations.png" alt="Platform Integrations" />
          </div>
          <div data-aos="zoom-in-left" className="md:w-6/12 mt-8 md:mt-0">
            <div className="flex items-center space-x-16 mb-4 relative">
              <span className="border-t-2 border-[#151923] w-12 absolute"></span>
              <h3 className="text-[#151923] tracking-widest text-xs font-bold pl-14">
                {t('landing.integrations_badge')}
              </h3>
            </div>
            <h2 className="font-extrabold text-[#151923] text-2xl sm:text-3xl lg:pr-32 leading-snug">
              {t('landing.integrations_title')}{' '}
              <span className="bg-[#C7F36B] text-[#151923] px-2.5 py-0.5 rounded-xl inline-block">{t('landing.integrations_highlight')}</span>
            </h2>
            <p className="text-slate-500 my-5 lg:pr-20 text-base leading-relaxed">
              {t('landing.integrations_desc')}
            </p>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="px-7 py-3 border-2 border-[#151923] text-[#151923] hover:bg-[#151923] hover:text-[#F7F8F5] font-bold my-3 focus:outline-none transform transition hover:scale-105 duration-300 ease-in-out rounded-full cursor-pointer shadow-xs"
            >
              {t('landing.integrations_btn')}
            </button>
          </div>
        </div>

        {/* Section 11: TESTIMONIAL */}
        <div className="mt-28 flex flex-col-reverse md:flex-row items-start md:space-x-12">
          <div data-aos="zoom-in-right" className="md:w-5/12">
            <div className="flex items-center space-x-16 mb-4 relative">
              <span className="border-t-2 border-[#151923] w-12 absolute"></span>
              <h3 className="text-[#151923] tracking-widest text-xs font-bold pl-14">
                {t('landing.testimonial_badge')}
              </h3>
            </div>
            <h2 className="font-extrabold text-[#151923] text-2xl sm:text-3xl lg:pr-24 leading-snug">
              {t('landing.testimonial_title')}
            </h2>
            <p className="text-slate-500 my-4 lg:pr-20 text-base leading-relaxed">
              {t('landing.testimonial_desc1')}
            </p>
            <p className="text-slate-500 my-4 lg:pr-20 text-base leading-relaxed">
              {t('landing.testimonial_desc2')}
            </p>
            <p className="text-slate-500 my-4 lg:pr-20 text-base leading-relaxed">
              {t('landing.testimonial_desc3')}
            </p>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="flex items-center space-x-3 pl-5 border-2 border-[#151923] text-[#151923] font-bold my-5 focus:outline-none transform transition hover:scale-105 duration-300 ease-in-out rounded-full cursor-pointer group"
            >
              <span>{t('landing.testimonial_btn')}</span>
              <div className="bg-[#151923] text-white h-12 w-12 rounded-full flex items-center justify-center group-hover:bg-[#C7F36B] group-hover:text-[#151923] transition-colors">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
          <div data-aos="zoom-in-left" className="md:w-7/12 mb-8 md:mb-0">
            <img className="md:w-10/12 mx-auto rounded-2xl shadow-xl border border-slate-100" src="/skilline/testimonials.png" alt="Testimonials" />
          </div>
        </div>

        {/* Section 12: Latest News and Resources */}
        <div data-aos="zoom-in" className="mt-28 text-center">
          <h2 className="text-[#151923] text-3xl font-extrabold tracking-tight">
            {t('landing.news_title')}
          </h2>
          <p className="text-slate-500 my-3 text-base">
            {t('landing.news_desc')}
          </p>
        </div>

        <div data-aos="zoom-in-up" className="my-14 flex flex-col lg:flex-row lg:space-x-16">
          <div className="lg:w-6/12 bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <img className="w-full mb-6 rounded-2xl object-cover h-64" src="/skilline/laptop-news.png" alt="News feature" />
            <span className="bg-[#C7F36B]/30 text-[#151923] font-bold px-3 py-1 text-xs rounded-full">
              {t('landing.news_badge_news')}
            </span>
            <h3 className="text-[#151923] font-extrabold my-3 text-xl leading-snug">
              {t('landing.news_card1_title')}
            </h3>
            <p className="text-slate-500 mb-4 text-sm leading-relaxed">
              {t('landing.news_card1_desc')}
            </p>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="font-bold text-[#151923] hover:text-slate-600 flex items-center gap-1 cursor-pointer text-sm group"
            >
              <span>{t('landing.news_read_more')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="lg:w-7/12 flex flex-col justify-between mt-10 space-y-6 lg:space-y-0 lg:mt-0">
            <div className="flex space-x-5 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-4/12 shrink-0">
                <div className="relative">
                  <img className="rounded-xl w-full h-24 object-cover" src="/skilline/children-laptop.png" alt="News card" />
                  <span className="absolute bottom-1 right-1 bg-[#10B981]/20 text-emerald-800 font-bold px-2 py-0.5 text-[10px] rounded-md hidden sm:block backdrop-blur-xs">
                    {t('landing.news_badge_press')}
                  </span>
                </div>
              </div>
              <div className="w-8/12">
                <h4 className="text-[#151923] text-sm sm:text-base font-bold leading-snug">
                  {t('landing.news_card2_title')}
                </h4>
                <p className="text-slate-500 my-1 text-xs leading-relaxed line-clamp-2">
                  {t('landing.news_card2_desc')}
                </p>
              </div>
            </div>

            <div className="flex space-x-5 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-4/12 shrink-0">
                <div className="relative">
                  <img className="rounded-xl w-full h-24 object-cover" src="/skilline/girl-laptop.png" alt="News card" />
                  <span className="absolute bottom-1 right-1 bg-[#151923]/15 text-[#151923] font-bold px-2 py-0.5 text-[10px] rounded-md hidden sm:block backdrop-blur-xs">
                    {t('landing.news_badge_news')}
                  </span>
                </div>
              </div>
              <div className="w-8/12">
                <h4 className="text-[#151923] text-sm sm:text-base font-bold leading-snug">
                  {t('landing.news_card3_title')}
                </h4>
                <p className="text-slate-500 my-1 text-xs leading-relaxed line-clamp-2">
                  {t('landing.news_card3_desc')}
                </p>
              </div>
            </div>

            <div className="flex space-x-5 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-4/12 shrink-0">
                <div className="relative">
                  <img className="rounded-xl w-full h-24 object-cover" src="/skilline/cat-laptop.png" alt="News card" />
                  <span className="absolute bottom-1 right-1 bg-[#151923]/15 text-[#151923] font-bold px-2 py-0.5 text-[10px] rounded-md hidden sm:block backdrop-blur-xs">
                    {t('landing.news_badge_news')}
                  </span>
                </div>
              </div>
              <div className="w-8/12">
                <h4 className="text-[#151923] text-sm sm:text-base font-bold leading-snug">
                  {t('landing.news_card4_title')}
                </h4>
                <p className="text-slate-500 my-1 text-xs leading-relaxed line-clamp-2">
                  {t('landing.news_card4_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOOTER (ScopeGraph Deep Ink Branding) */}
      <footer className="mt-32 bg-[#151923] text-slate-400">
        <div className="max-w-screen-md mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row justify-center text-white items-center gap-4 text-center sm:text-left mb-10">
            <div className="flex items-center gap-3">
              <ScopeGraphLogoMark size={36} dark={true} className="shrink-0" />
              <span className="font-extrabold text-2xl tracking-tight text-white">ScopeGraph</span>
            </div>
            <span className="hidden sm:block border-l border-slate-700 h-6 mx-2" />
            <span className="text-sm font-medium text-slate-400">
              {t('landing.footer_tagline')}
            </span>
          </div>

          <div className="text-center pb-12">
            <label htmlFor="footer-subscribe-email" className="text-slate-300 font-bold block mb-3 text-sm">
              {t('landing.footer_subscribe_label')}
            </label>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <input
                id="footer-subscribe-email"
                type="email"
                placeholder={t('landing.footer_email_placeholder')}
                className="rounded-full py-2.5 px-5 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-[#C7F36B] text-sm flex-grow"
              />
              <button
                type="button"
                onClick={handleLaunchDemo}
                className="bg-[#C7F36B] hover:bg-[#bbf054] text-[#151923] font-bold px-7 py-2.5 rounded-full cursor-pointer transition-colors shadow-md text-sm whitespace-nowrap"
              >
                {t('landing.footer_subscribe_btn')}
              </button>
            </div>
          </div>

          <div className="flex items-center text-slate-400 text-xs sm:text-sm justify-center flex-wrap gap-4 pt-6 border-t border-slate-800">
            <Link to="/docs" className="hover:text-white transition-colors">
              {t('landing.footer_careers')}
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/privacy" className="hover:text-white transition-colors">
              {t('landing.footer_privacy')}
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/terms" className="hover:text-white transition-colors">
              {t('landing.footer_terms')}
            </Link>
          </div>

          <div className="text-center text-slate-500 text-xs mt-8 space-y-2">
            <p>
              {t('landing.footer_copyright')}
            </p>
            <p className="text-[11px] text-slate-600">
              {t('landing.footer_code_by')} <span className="font-semibold text-slate-400">{t('landing.footer_code_author')}</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Upgrade / Pricing Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
      <FloatingAssistant />
    </div>
  );
};
