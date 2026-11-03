import React from 'react';
import { Link } from '../router';
import { useLanguage } from '../context/LanguageContext';
import { MarketingLayout } from '../components/layouts/MarketingLayout';
import { BookOpen, Network, Cpu, ShieldCheck, Terminal, ArrowLeft, ArrowRight } from 'lucide-react';

export const Documentation: React.FC = () => {
  const { t } = useLanguage();

  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#151923] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ScopeGraph</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-[#E4E7E1] pb-8 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151923] text-[#C7F36B] text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <BookOpen className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>Docs v1.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#151923] tracking-tight mb-3">
            {t('docs.title')}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            {t('docs.subtitle')}
          </p>

          {/* Quick Jump Links */}
          <div className="flex flex-wrap gap-2.5 mt-6">
            <a
              href="#overview"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-xs font-bold text-[#151923] hover:border-[#151923] transition-colors shadow-2xs"
            >
              # {t('docs.section_overview_title')}
            </a>
            <a
              href="#architecture"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-xs font-bold text-[#151923] hover:border-[#151923] transition-colors shadow-2xs"
            >
              # {t('docs.nav_architecture')}
            </a>
            <a
              href="#mcp"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-xs font-bold text-[#151923] hover:border-[#151923] transition-colors shadow-2xs"
            >
              # {t('docs.nav_mcp')}
            </a>
            <a
              href="#security"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-xs font-bold text-[#151923] hover:border-[#151923] transition-colors shadow-2xs"
            >
              # {t('docs.nav_security')}
            </a>
          </div>
        </div>

        {/* Section 1: Overview */}
        <section id="overview" className="mb-14 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#151923] text-[#C7F36B] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-[#C7F36B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#151923]">
              {t('docs.section_overview_title')}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
            {t('docs.section_overview_desc')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E4E7E1] shadow-xs">
              <h3 className="font-bold text-sm text-[#151923] mb-2 flex items-center gap-2">
                <Network className="w-4 h-4 text-[#526BEE]" />
                <span>Deterministic AST Parsing</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                Python AST • Classes • Methods • FastAPI/Flask Routes • SQLAlchemy Models • Call Hierarchy
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E4E7E1] shadow-xs">
              <h3 className="font-bold text-sm text-[#151923] mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E5484D]" />
                <span>Anti-Hallucination Gate</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                EvidenceValidator • Exact Line Snippets • Strict Rejection of Ghost Files
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Architecture */}
        <section id="architecture" className="mb-14 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#151923] text-[#C7F36B] flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-[#C7F36B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#151923]">
              {t('docs.section_arch_title')}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
            {t('docs.section_arch_desc')}
          </p>

          <div className="bg-[#151923] p-5 sm:p-6 rounded-2xl text-slate-300 font-mono text-xs overflow-x-auto shadow-xl border border-slate-800">
            <div className="text-slate-500 mb-2">// 7-Step Analysis Pipeline</div>
            <ol className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">01. Interpret</span>
                <span className="text-slate-400">Extract requirements and target architectural layers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">02. Retrieve</span>
                <span className="text-slate-400">Match seed symbols against indexed PostgreSQL repository</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">03. Traverse</span>
                <span className="text-slate-400">NetworkX bidirectional dependency cascade calculation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">04. Reason</span>
                <span className="text-slate-400">Multi-pass LLM reasoning (Meta LLaMA 3.3 / Baseten / Modal)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">05. Review</span>
                <span className="text-slate-400">Adversarial self-critique checking false-positive cascade claims</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">06. Ground</span>
                <span className="text-slate-400">Anti-Hallucination Gate validates real files, symbols and lines</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#C7F36B] font-bold">07. Brief</span>
                <span className="text-slate-400">Emit structured JSON report and agent implementation checklist</span>
              </li>
            </ol>
          </div>
        </section>

        {/* Section 3: MCP Protocol */}
        <section id="mcp" className="mb-14 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#151923] text-[#C7F36B] flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4 text-[#C7F36B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#151923]">
              {t('docs.section_mcp_title')}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
            {t('docs.section_mcp_desc')}
          </p>

          <div className="bg-white p-6 rounded-2xl border border-[#E4E7E1] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#151923]">// claude_desktop_config.json (Remote SSE)</h3>
            <pre className="bg-[#151923] text-[#C7F36B] p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "scopegraph": {
      "url": "https://scopegraph.vercel.app/mcp/sse"
    }
  }
}`}
            </pre>
            <div className="text-xs text-slate-500 font-mono space-y-1">
              <p>• <span className="font-bold text-[#151923]">analyze_change</span>: Returns direct/indirect impact, risks & suggested tests</p>
              <p>• <span className="font-bold text-[#151923]">get_relevant_context</span>: Fetches verified symbol definitions and code previews</p>
              <p>• <span className="font-bold text-[#151923]">suggest_tests</span>: Generates regression specifications from existing tests</p>
            </div>
          </div>
        </section>

        {/* Section 4: Security */}
        <section id="security" className="mb-14 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#151923] text-[#C7F36B] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#C7F36B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#151923]">
              {t('docs.section_security_title')}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
            {t('docs.section_security_desc')}
          </p>

          <div className="bg-[#F7F8F5] p-5 rounded-2xl border border-[#E4E7E1] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-[#151923]">
                {t('privacy.title')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('privacy.subtitle')}
              </p>
            </div>
            <Link
              to="/privacy"
              className="px-4 py-2 bg-[#151923] hover:bg-[#C7F36B] text-white hover:text-[#151923] rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>{t('landing.footer_privacy')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
};
