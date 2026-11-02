import React, { useState } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MarketingLayout } from '../components/layouts/MarketingLayout';
import { UpgradeModal } from '../components/UpgradeModal';
import {
  ArrowRight,
  Network,
  FileCode,
  ShieldCheck,
  Zap,
  FolderGit2,
  Cpu,
  Sparkles,
  Check,
  Code2,
  Layers,
  Terminal,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAsDemo } = useAuth();
  const { t } = useLanguage();

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'diff' | 'brief'>('graph');
  const [selectedNode, setSelectedNode] = useState<string>('verification.py');

  const handleLaunchDemo = () => {
    loginAsDemo();
    navigate('/app/dashboard');
  };

  return (
    <MarketingLayout onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}>
      {/* 1. HERO SECTION WITH AMBIENT GLOW */}
      <section className="relative pt-16 pb-20 px-6 sm:px-12 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Ambient Gradient Halos */}
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-[#C7F36B]/20 via-[#526BEE]/15 to-transparent blur-3xl pointer-events-none rounded-full"
        />

        {/* Hackathon Pill Announcement */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E4E7E1] shadow-xs mb-6 hover:border-[#151923] transition-all cursor-default group">
          <span className="w-2 h-2 rounded-full bg-[#151923] animate-pulse" />
          <span className="text-[11px] font-bold text-[#151923] tracking-wide">
            {t('landing.badge_meta')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C7F36B] text-[#151923] font-extrabold">
            NEW
          </span>
        </div>

        {/* Dynamic Modern Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#151923] tracking-tight leading-[1.12] max-w-4xl mx-auto mb-6">
          {t('landing.title_prefix')}{' '}
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#151923] via-[#526BEE] to-[#151923] underline decoration-[#C7F36B] decoration-wavy decoration-2 underline-offset-8">
            {t('landing.title_highlight')}
          </span>{' '}
          {t('landing.title_suffix')}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#8B929E] max-w-2xl mx-auto leading-relaxed mb-8">
          {t('landing.description')}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <button
            type="button"
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold px-7 py-3.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-xl hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
          >
            <span>{t('landing.btn_demo')}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-1 transition-all duration-200" />
          </button>

          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold px-6 py-3.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:border-[#526BEE] hover:bg-[#526BEE]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>{t('landing.btn_pricing')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto text-xs font-semibold px-6 py-3.5 rounded-xl bg-transparent text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/40 transition-all duration-200 cursor-pointer"
          >
            {t('landing.btn_register')}
          </button>
        </div>

        {/* INTERACTIVE SIMULATOR CARD */}
        <div className="relative rounded-3xl border-2 border-[#E4E7E1] bg-white shadow-2xl overflow-hidden text-left transition-all duration-300">
          {/* Card Top Header & Interactive Tab Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#E4E7E1] bg-[#F7F8F5]/50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 font-mono text-xs text-[#8B929E] hidden sm:inline">
                sample-auth-user-service • 14 files indexed
              </span>
            </div>

            {/* Simulator Switcher Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E4E7E1] shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-[#151923] text-white shadow-xs'
                    : 'text-[#8B929E] hover:text-[#151923]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('landing.tab_graph')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'diff'
                    ? 'bg-[#151923] text-white shadow-xs'
                    : 'text-[#8B929E] hover:text-[#151923]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{t('landing.tab_diff')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('brief')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'brief'
                    ? 'bg-[#151923] text-white shadow-xs'
                    : 'text-[#8B929E] hover:text-[#151923]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{t('landing.tab_brief')}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: INTERACTIVE GRAPH PREVIEW */}
          {activeTab === 'graph' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#8B929E]">Active Seed:</span>
                  <span className="font-mono font-bold text-[#151923] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                    POST /verify-email (Email Verification Flow)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B]">
                    2 Directly Affected
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30">
                    1 Downstream Call
                  </span>
                </div>
              </div>

              {/* 4 Interactive Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-stretch">
                {/* Column 1: API */}
                <div
                  onClick={() => setSelectedNode('verification.py')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedNode === 'verification.py'
                      ? 'border-[#151923] bg-white shadow-md ring-2 ring-[#151923]/10 -translate-y-1'
                      : 'border-[#E4E7E1] bg-[#F7F8F5] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      API ROUTE
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EBFACD] text-[#151923]">
                      Direct Impact
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#151923]">verification.py</div>
                  <div className="text-[10px] text-[#8B929E] font-mono mt-0.5">app/api/verification.py</div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Symbols: 3</span>
                    <span className="text-[#526BEE] font-bold text-[10px]">Calls User Service →</span>
                  </div>
                </div>

                {/* Column 2: Service */}
                <div
                  onClick={() => setSelectedNode('user_service.py')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedNode === 'user_service.py'
                      ? 'border-[#526BEE] bg-white shadow-md ring-2 ring-[#526BEE]/20 -translate-y-1'
                      : 'border-[#E4E7E1] bg-[#F7F8F5] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      SERVICE
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#526BEE]/10 text-[#526BEE]">
                      Downstream
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#151923]">user_service.py</div>
                  <div className="text-[10px] text-[#8B929E] font-mono mt-0.5">app/services/user_service.py</div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Line 84: update_user()</span>
                    <span className="text-amber-600 font-bold text-[10px]">Risk: Auth Token</span>
                  </div>
                </div>

                {/* Column 3: Model */}
                <div
                  onClick={() => setSelectedNode('user.py')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedNode === 'user.py'
                      ? 'border-[#8B929E] bg-white shadow-md -translate-y-1'
                      : 'border-[#E4E7E1] bg-[#F7F8F5] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      DATA MODEL
                    </span>
                    <span className="text-[9px] font-bold text-[#8B929E]">Unchanged</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#151923]">user.py</div>
                  <div className="text-[10px] text-[#8B929E] font-mono mt-0.5">app/models/user.py</div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    SQLAlchemy Schema Safe
                  </div>
                </div>

                {/* Column 4: Tests */}
                <div
                  onClick={() => setSelectedNode('test_auth.py')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedNode === 'test_auth.py'
                      ? 'border-[#526BEE] bg-white shadow-md ring-2 ring-[#526BEE]/20 -translate-y-1'
                      : 'border-[#E4E7E1] bg-[#F7F8F5] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                      TEST SUITE
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Must Run
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#151923]">test_auth.py</div>
                  <div className="text-[10px] text-[#8B929E] font-mono mt-0.5">tests/test_auth.py</div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Target: test_verify()</span>
                    <span className="text-emerald-600 font-bold text-[10px]">Passes locally</span>
                  </div>
                </div>
              </div>

              {/* Node Explanation Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#151923]">Selected Evidence:</span>
                  <span className="font-mono text-slate-700">{selectedNode}</span>
                  <span className="text-slate-400">—</span>
                  <span className="text-[#8B929E]">
                    {selectedNode === 'verification.py' && 'Contains endpoint route handlers requiring email token validation.'}
                    {selectedNode === 'user_service.py' && 'Downstream caller invoked by auth service; requires updating user verification state.'}
                    {selectedNode === 'user.py' && 'ORM Declarative Base model with email verified boolean column.'}
                    {selectedNode === 'test_auth.py' && 'Regression unit test suite testing token validation and expiration.'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#526BEE] hover:underline cursor-pointer hidden md:inline">
                  View in Graph Visualizer →
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: AST CODE DIFF PREVIEW */}
          {activeTab === 'diff' && (
            <div className="p-6 font-mono text-xs bg-[#151923] text-slate-200 overflow-x-auto">
              <div className="text-slate-400 mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>diff --git a/app/api/verification.py b/app/api/verification.py</span>
                <span className="text-[#C7F36B]">AST-grounded changes</span>
              </div>
              <div className="space-y-1">
                <div className="text-slate-500">@@ -38,7 +38,12 @@ router = APIRouter()</div>
                <div className="text-slate-300"> async def request_verification(email: str, db: Session = Depends(get_db)):</div>
                <div className="text-slate-300">     user = db.query(User).filter(User.email == email).first()</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                  +    # Grounded: Check existing token timestamp before issue
                </div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                  +    if user.is_verified:
                </div>
                <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                  +        raise HTTPException(status_code=400, detail=&quot;User already verified&quot;)
                </div>
                <div className="text-slate-300">     token = generate_secure_token()</div>
                <div className="text-slate-300">     await send_verification_email(user.email, token)</div>
              </div>
            </div>
          )}

          {/* TAB 3: MCP AGENT BRIEF PREVIEW */}
          {activeTab === 'brief' && (
            <div className="p-6 font-mono text-xs bg-[#151923] text-slate-200 overflow-x-auto">
              <div className="text-slate-400 mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>FastMCP analyze_change(repo_id=&quot;sample-auth-service&quot;)</span>
                <span className="text-[#526BEE]">Output ready for Cursor & Claude Code</span>
              </div>
              <pre className="text-slate-300 leading-relaxed">
{`{
  "requirement": "Require email verification before user email update",
  "direct_impact_files": ["app/api/verification.py"],
  "indirect_impact_files": ["app/services/user_service.py"],
  "regression_risks": [
    "Unverified tokens may bypass update_email unless verified flag is checked"
  ],
  "suggested_tests": ["tests/test_auth.py::test_verify_email_flow"],
  "grounded_metrics": { "claims_verified": 4, "hallucinations_rejected": 0 }
}`}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* 2. STATS & ARCHITECTURAL METRICS STRIP */}
      <section className="py-12 border-y border-[#E4E7E1] bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#151923]">
              {t('landing.stat_grounded_val')}
            </div>
            <div className="text-xs font-bold text-[#151923]">{t('landing.stat_grounded_lbl')}</div>
            <div className="text-[11px] text-[#8B929E] leading-relaxed">
              {t('landing.stat_grounded_desc')}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#526BEE]">
              {t('landing.stat_speed_val')}
            </div>
            <div className="text-xs font-bold text-[#151923]">{t('landing.stat_speed_lbl')}</div>
            <div className="text-[11px] text-[#8B929E] leading-relaxed">
              {t('landing.stat_speed_desc')}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#151923]">
              {t('landing.stat_ai_val')}
            </div>
            <div className="text-xs font-bold text-[#151923]">{t('landing.stat_ai_lbl')}</div>
            <div className="text-[11px] text-[#8B929E] leading-relaxed">
              {t('landing.stat_ai_desc')}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#151923]">
              {t('landing.stat_mcp_val')}
            </div>
            <div className="text-xs font-bold text-[#151923]">{t('landing.stat_mcp_lbl')}</div>
            <div className="text-[11px] text-[#8B929E] leading-relaxed">
              {t('landing.stat_mcp_desc')}
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (3 STEPS) */}
      <section id="how-it-works" className="py-20 border-b border-[#E4E7E1] bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526BEE]">Workflow</span>
            <h2 className="text-3xl font-extrabold text-[#151923] tracking-tight mt-1">
              How ScopeGraph Works
            </h2>
            <p className="text-xs sm:text-sm text-[#8B929E] mt-2">
              From natural-language requirement to grounded codebase blast radius in three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#151923] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#151923]">Load a Repository</h3>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Ingest any codebase archive (or 1-click sample repo). ScopeGraph extracts AST symbols,
                API endpoints, callers, and test mappings into a structured graph index.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#151923] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#151923]">Describe the Change</h3>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Provide your proposed change via text, realtime voice streaming, or UI screenshot. ScopeGraph grounds the intent directly into AST nodes.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#151923] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-[#151923]">Inspect Impact & Evidence</h3>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                View affected files, risk warnings, suggested test suites, and copy a structured
                implementation brief ready for Claude Code, Cursor, or Codex.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHAT YOU GET (CAPABILITIES) */}
      <section id="what-you-get" className="py-20 border-b border-[#E4E7E1] bg-[#F7F8F5]">
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#526BEE]">Capabilities</span>
            <h2 className="text-3xl font-extrabold text-[#151923] tracking-tight mt-1">
              Concrete Code Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-[#8B929E] mt-2">
              Evidence-grounded outputs designed for serious software engineers and autonomous agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Network className="w-5 h-5 text-[#526BEE]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Layered Dependency Graph</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Clean orthogonal routing connecting API routes, services, models, and tests without crossed edges or truncated badges.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Zap className="w-5 h-5 text-[#C7F36B]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Direct vs Indirect Blast Radius</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Distinguishes between files that must be modified directly versus downstream callers and callers-of-callers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">AST-Verified Evidence</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Every impact claim references exact symbols, function declarations, and line numbers validated against the parsed AST.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <FileCode className="w-5 h-5 text-[#526BEE]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Targeted Test Suggestions</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Know exactly which unit and integration test suites cover the affected paths before running a full test matrix.
              </p>
            </div>

            <div id="mcp" className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Cpu className="w-5 h-5 text-[#151923]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Model Context Protocol (MCP)</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Exposes tools for Cursor, Claude Desktop, and CLI coding agents to query the graph and trace dependencies autonomously.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3 hover:shadow-md transition-all">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <FolderGit2 className="w-5 h-5 text-slate-700" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Zero-Friction Ingestion</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Instant sample repository pre-loaded with Auth & User microservices, plus drag-and-drop ZIP upload for custom codebases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING TEASER SECTION */}
      <section className="py-20 border-b border-[#E4E7E1] bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#526BEE]">
            {t('pricing.nav_title')}
          </span>
          <h2 className="text-3xl font-extrabold text-[#151923] tracking-tight mt-1">
            {t('pricing.modal_title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8B929E] max-w-xl mx-auto mt-2 mb-12">
            {t('pricing.modal_desc')}
          </p>

          {/* Quick Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto mb-10">
            {/* Free */}
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5]">
              <div className="text-xs font-bold text-[#8B929E] uppercase tracking-wider">
                {t('pricing.free_title')}
              </div>
              <div className="text-2xl font-extrabold text-[#151923] my-2">
                {t('pricing.free_price')}
              </div>
              <p className="text-xs text-[#8B929E] mb-4">{t('pricing.free_desc')}</p>
              <div className="text-xs font-semibold text-[#151923] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('pricing.feature_scans_free')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('pricing.feature_ai_free')}</span>
                </div>
              </div>
            </div>

            {/* Plus */}
            <div className="p-6 rounded-2xl border-2 border-[#151923] bg-white shadow-lg relative">
              <span className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-[#151923] text-[#C7F36B] text-[9px] font-extrabold tracking-wider">
                {t('pricing.plus_badge')}
              </span>
              <div className="text-xs font-bold text-[#526BEE] uppercase tracking-wider">
                {t('pricing.plus_title')}
              </div>
              <div className="text-2xl font-extrabold text-[#151923] my-2">
                {t('pricing.plus_price_monthly')} <span className="text-xs text-[#8B929E] font-normal">{t('pricing.plus_period')}</span>
              </div>
              <p className="text-xs text-[#8B929E] mb-4">{t('pricing.plus_desc')}</p>
              <div className="text-xs font-semibold text-[#151923] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#526BEE]" />
                  <span>{t('pricing.feature_scans_plus')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#526BEE]" />
                  <span>{t('pricing.feature_vision_plus')}</span>
                </div>
              </div>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5]">
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                {t('pricing.pro_title')}
              </div>
              <div className="text-2xl font-extrabold text-[#151923] my-2">
                {t('pricing.pro_price_monthly')} <span className="text-xs text-[#8B929E] font-normal">{t('pricing.pro_period')}</span>
              </div>
              <p className="text-xs text-[#8B929E] mb-4">{t('pricing.pro_desc')}</p>
              <div className="text-xs font-semibold text-[#151923] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('pricing.feature_ai_pro')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('pricing.feature_models_pro')}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#151923] text-white hover:bg-[#526BEE] text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span>{t('pricing.modal_title')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 6. DEMO STRIP */}
      <section id="demo" className="py-16 bg-[#151923] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C7F36B] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#C7F36B]">
                Instant Demo Available
              </span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              Sample Auth &amp; User Service (14 files)
            </h3>
            <p className="text-xs text-[#8B929E] max-w-xl">
              Explore the full interactive dependency graph and run impact reasoning with no configuration or API keys required.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunchDemo}
            className="group flex items-center gap-2 text-xs font-bold px-7 py-3.5 rounded-xl bg-[#C7F36B] text-[#151923] hover:bg-[#526BEE] hover:text-white hover:shadow-xl hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0 cursor-pointer"
          >
            <span>Launch Instant Demo</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>
        </div>
      </section>

      {/* UPGRADE ACCOUNT MODAL */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </MarketingLayout>
  );
};
