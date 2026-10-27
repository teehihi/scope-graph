import React from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { MarketingLayout } from '../components/layouts/MarketingLayout';
import {
  ArrowRight,
  Network,
  FileCode,
  ShieldCheck,
  Zap,
  FolderGit2,
  Cpu,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAsDemo } = useAuth();

  const handleLaunchDemo = () => {
    loginAsDemo();
    navigate('/app/dashboard');
  };

  return (
    <MarketingLayout>
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-20 px-6 sm:px-12 max-w-6xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#151923] tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6">
          Understand the impact before you change the code.
        </h1>

        <p className="text-base sm:text-lg text-[#8B929E] max-w-2xl mx-auto leading-relaxed mb-8">
          ScopeGraph builds a complete dependency graph across your APIs, services, data models,
          and tests — giving developers and AI coding agents evidence-backed blast radius analysis.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
          <button
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold px-7 py-3.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-xl hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
          >
            <span>Try the Live Demo</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-1 transition-all duration-200" />
          </button>
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto text-xs font-semibold px-6 py-3.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:border-[#151923] hover:bg-[#F7F8F5] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm cursor-pointer"
          >
            Create Account
          </button>
        </div>

        {/* Real Product Graph Preview Mockup Card */}
        <div className="relative rounded-2xl border-2 border-[#E4E7E1] bg-white shadow-2xl overflow-hidden text-left p-6 sm:p-8">
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E4E7E1]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="ml-2 font-mono text-xs text-[#8B929E]">
                repo: sample-auth-user-service • 14 files indexed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B]">
                2 Directly Affected
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30">
                1 Indirect Path
              </span>
            </div>
          </div>

          {/* Clean 4-Column Layered Flow Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            {/* Column 1: API */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                API Routes
              </span>
              <div className="p-3.5 rounded-xl border-2 border-[#151923] bg-white ring-2 ring-[#C7F36B] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    POST /verify-email
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EBFACD] text-[#151923]">
                    Trigger
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#151923]">verification.py</div>
                <div className="text-[10px] text-[#8B929E] font-mono">app/api/verification.py</div>
              </div>
            </div>

            {/* Column 2: Service */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                Services
              </span>
              <div className="p-3.5 rounded-xl border-2 border-[#526BEE] bg-white ring-2 ring-[#526BEE]/20 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    SERVICE
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#526BEE]/10 text-[#526BEE]">
                    Affected
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#151923]">user_service.py</div>
                <div className="text-[10px] text-[#8B929E] font-mono">app/services/user_service.py</div>
              </div>
            </div>

            {/* Column 3: Model */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                Data Models
              </span>
              <div className="p-3.5 rounded-xl border-2 border-[#E4E7E1] bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                    MODEL
                  </span>
                  <span className="text-[9px] font-bold text-[#8B929E]">Unchanged</span>
                </div>
                <div className="font-mono text-xs font-bold text-[#151923]">user.py</div>
                <div className="text-[10px] text-[#8B929E] font-mono">app/models/user.py</div>
              </div>
            </div>

            {/* Column 4: Tests */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                Suggested Tests
              </span>
              <div className="p-3.5 rounded-xl border-2 border-[#526BEE] bg-white ring-2 ring-[#526BEE]/20 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                    TEST
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#526BEE]/10 text-[#526BEE]">
                    Must Run
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#151923]">test_auth.py</div>
                <div className="text-[10px] text-[#8B929E] font-mono">tests/test_auth.py</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (3 STEPS) */}
      <section id="how-it-works" className="py-20 border-t border-[#E4E7E1] bg-white">
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
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#151923] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#151923]">Load a Repository</h3>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Ingest any codebase archive (or 1-click sample repo). ScopeGraph extracts AST symbols,
                API endpoints, callers, and test mappings into a structured graph index.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-[#151923] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#151923]">Describe the Change</h3>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Provide your proposed change in plain English, e.g. &ldquo;Require email verification
                before users can change their email address&rdquo;.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-[#F7F8F5] space-y-4">
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

      {/* 3. WHAT YOU GET */}
      <section id="what-you-get" className="py-20 border-t border-[#E4E7E1] bg-[#F7F8F5]">
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
            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Network className="w-5 h-5 text-[#526BEE]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Layered Dependency Graph</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Clean orthogonal routing connecting API routes, services, models, and tests without crossed edges or truncated badges.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Zap className="w-5 h-5 text-[#C7F36B]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Direct vs Indirect Blast Radius</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Distinguishes between files that must be modified directly versus downstream callers and callers-of-callers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">AST-Verified Evidence</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Every impact claim references exact symbols, function declarations, and line numbers validated against the parsed AST.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <FileCode className="w-5 h-5 text-[#526BEE]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Targeted Test Suggestions</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Know exactly which unit and integration test suites cover the affected paths before running a full test matrix.
              </p>
            </div>

            <div id="mcp" className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923] w-fit">
                <Cpu className="w-5 h-5 text-[#151923]" />
              </div>
              <h4 className="font-bold text-sm text-[#151923]">Model Context Protocol (MCP)</h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                Exposes tools for Cursor, Claude Desktop, and CLI coding agents to query the graph and trace dependencies autonomously.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#E4E7E1] bg-white space-y-3">
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

      {/* 4. DEMO STRIP */}
      <section id="demo" className="py-16 border-t border-[#E4E7E1] bg-[#151923] text-white">
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
            onClick={handleLaunchDemo}
            className="group flex items-center gap-2 text-xs font-bold px-7 py-3.5 rounded-xl bg-[#C7F36B] text-[#151923] hover:bg-[#526BEE] hover:text-white hover:shadow-xl hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0 cursor-pointer"
          >
            <span>Launch Instant Demo</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>
        </div>
      </section>
    </MarketingLayout>
  );
};
