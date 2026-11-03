import React, { useState, useEffect } from 'react';
import { Link } from '../router';
import { useLanguage } from '../context/LanguageContext';
import { MarketingLayout } from '../components/layouts/MarketingLayout';
import {
  Shield,
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  Mail,
  ArrowLeft,
  ArrowRight,
  Printer,
  FileCheck2,
  Server,
  Layers,
  BookOpen,
} from 'lucide-react';

export const Privacy: React.FC = () => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('section-1');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'section-1',
        'section-2',
        'section-3',
        'section-4',
        'section-5',
        'section-6',
        'section-7',
        'section-8',
        'section-9',
        'section-10',
      ];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 220 && rect.bottom >= 100) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const sectionsList = [
    { id: 'section-1', titleKey: 'privacy.s1_title' },
    { id: 'section-2', titleKey: 'privacy.s2_title' },
    { id: 'section-3', titleKey: 'privacy.s3_title' },
    { id: 'section-4', titleKey: 'privacy.s4_title' },
    { id: 'section-5', titleKey: 'privacy.s5_title' },
    { id: 'section-6', titleKey: 'privacy.s6_title' },
    { id: 'section-7', titleKey: 'privacy.s7_title' },
    { id: 'section-8', titleKey: 'privacy.s8_title' },
    { id: 'section-9', titleKey: 'privacy.s9_title' },
    { id: 'section-10', titleKey: 'privacy.s10_title' },
  ];

  return (
    <MarketingLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Top Breadcrumb & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E7E1] pb-6 mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#151923] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ScopeGraph</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#151923]">{t('privacy.title')}</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4E7E1] text-xs font-bold text-[#151923] hover:border-[#151923] hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('privacy.download_btn')}</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#151923] text-[#C7F36B] text-[11px] font-mono font-bold tracking-wide">
              <Shield className="w-3 h-3 text-[#C7F36B]" />
              <span>{t('privacy.badge')}</span>
            </div>
          </div>
        </div>

        {/* Hero Title Section */}
        <div className="max-w-4xl mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#151923] tracking-tight mb-4 leading-tight">
            {t('privacy.title')}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mb-4">
            {t('privacy.subtitle')}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F7F8F5] border border-[#E4E7E1] px-2.5 py-1 rounded-md font-bold text-[#151923]">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              {t('privacy.last_updated')}
            </span>
            <span>•</span>
            <span>GDPR, CCPA/CPRA & SOC 2 Aligned</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Strict Zero AI Model Training Guarantee</span>
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left Sticky Sidebar (Table of Contents) */}
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 lg:self-start space-y-6 z-30 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            {/* Navigation Card */}
            <div className="bg-white rounded-2xl border border-[#E4E7E1] p-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#E4E7E1] text-[#151923]">
                  <Layers className="w-4 h-4 text-[#526BEE]" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    {t('privacy.toc_title')}
                  </span>
                </div>
                <nav className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                  {sectionsList.map((sec, idx) => {
                    const isActive = activeSection === sec.id;
                    return (
                      <a
                        key={sec.id}
                        href={`#${sec.id}`}
                        className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                          isActive
                            ? 'bg-[#151923] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-[#151923] hover:bg-[#F7F8F5]'
                        }`}
                      >
                        <span
                          className={`font-mono text-[10px] w-4 text-center shrink-0 ${
                            isActive ? 'text-[#C7F36B] font-bold' : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate">{t(sec.titleKey).replace(/^\d+\.\s*/, '')}</span>
                      </a>
                    );
                  })}
                </nav>
              </div>

              {/* DPO Contact Card */}
              <div className="bg-[#F7F8F5] rounded-2xl border border-[#E4E7E1] p-5">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E4E7E1] flex items-center justify-center text-[#151923] mb-3 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="text-xs font-extrabold text-[#151923] mb-1">
                  {t('privacy.contact_card_title')}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  {t('privacy.contact_card_desc')}
                </p>
                <a
                  href="mailto:privacy@scopegraph.top"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#151923] hover:text-[#526BEE] hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>privacy@scopegraph.top</span>
                </a>
              </div>
          </aside>

          {/* Right Main Content */}
          <main className="flex-1 min-w-0 space-y-10">
            {/* Section 1 */}
            <section id="section-1" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#151923] text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[#C7F36B]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s1_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                {t('privacy.s1_desc')}
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s2_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                {t('privacy.s2_desc')}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
                  <p className="text-xs font-bold text-[#151923] mb-1">Identity & OAuth</p>
                  <p className="text-[11px] text-slate-500">Read-only tokens from GitHub or Google for authentication.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
                  <p className="text-xs font-bold text-[#151923] mb-1">AST Graphs & Edges</p>
                  <p className="text-[11px] text-slate-500">Symbol names, signatures, class hierarchies, and route calls.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
                  <p className="text-xs font-bold text-[#151923] mb-1">MCP Telemetry</p>
                  <p className="text-[11px] text-slate-500">Execution performance logs, tool timings, and blast radius stats.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
                  <p className="text-xs font-bold text-[#151923] mb-1">Billing via Stripe</p>
                  <p className="text-[11px] text-slate-500">PCI-DSS compliant payment processing. No raw card numbers stored.</p>
                </div>
              </div>
            </section>

            {/* Section 3: Prominent Zero-Training Guarantee Callout */}
            <section id="section-3" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#151923] shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C7F36B] text-[#151923] text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-bl-xl">
                Guaranteed
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#C7F36B] text-[#151923] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s3_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed mb-4">
                {t('privacy.s3_desc')}
              </p>
              <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs text-slate-600 leading-relaxed font-mono">
                Prompt data ephemeral • No foundational LLM weights training • Strict enterprise privacy boundaries
              </div>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s4_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s4_desc')}
              </p>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s5_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s5_desc')}
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s6_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s6_desc')}
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s7_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s7_desc')}
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s8_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s8_desc')}
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s9_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t('privacy.s9_desc')}
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#151923] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#151923]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#151923]">
                  {t('privacy.s10_title')}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                {t('privacy.s10_desc')}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs font-mono font-bold text-[#151923]">
                <Mail className="w-4 h-4 text-[#526BEE]" />
                <span>privacy@scopegraph.top</span>
              </div>
            </section>

            {/* Navigation Footer */}
            <div className="pt-8 border-t border-[#E4E7E1] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/docs"
                className="w-full sm:w-auto p-4 rounded-xl bg-white border border-[#E4E7E1] hover:border-[#151923] flex items-center gap-3 transition-all shadow-2xs group"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#151923] group-hover:-translate-x-0.5 transition-transform" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Previous</p>
                  <p className="text-xs font-bold text-[#151923]">{t('docs.title')}</p>
                </div>
              </Link>
              <Link
                to="/terms"
                className="w-full sm:w-auto p-4 rounded-xl bg-white border border-[#E4E7E1] hover:border-[#151923] flex items-center justify-between sm:justify-start gap-3 transition-all shadow-2xs group"
              >
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Legal Document</p>
                  <p className="text-xs font-bold text-[#151923]">{t('terms.title')}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#151923] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </main>
        </div>
      </div>
    </MarketingLayout>
  );
};
