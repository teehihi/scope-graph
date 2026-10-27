import React from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import {
  RotateCcw,
  ArrowRight,
  Network,
  Zap,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { navigate } = useRouter();
  const {
    activeRepo,
    repositories,
    setActiveRepo,
    loadSample,
    isLoadingSample,
    analysisReport,
    runAnalysisRequirement,
  } = useRepo();

  const directCount = analysisReport
    ? analysisReport.affected_items.filter((i) => i.impact_type === 'direct').length
    : 0;
  const indirectCount = analysisReport
    ? analysisReport.affected_items.filter((i) => i.impact_type === 'indirect').length
    : 0;
  const testCount = analysisReport ? analysisReport.suggested_tests.length : 0;

  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Code intelligence and change impact summary"
      actions={
        <div className="flex items-center gap-2">
          {repositories.length > 0 && (
            <select
              value={activeRepo?.id || ''}
              onChange={(e) => {
                const found = repositories.find((r) => r.id === e.target.value);
                if (found) setActiveRepo(found);
              }}
              className="text-xs font-semibold bg-slate-50 border border-[#E4E7E1] rounded-xl px-3 py-2 text-[#151923] focus:outline-none focus:ring-2 focus:ring-[#151923]"
            >
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.stats?.file_count || 0} files)
                </option>
              ))}
            </select>
          )}
          <button
            onClick={loadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isLoadingSample ? 'Loading Demo...' : 'Reload Demo Repo'}</span>
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
        {/* Active Repository Card Banner */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-[#151923]">
                Active Ingestion
              </span>
              <span className="text-xs text-[#8B929E] font-mono">
                ID: {activeRepo?.id || 'sample-auth-service'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#151923] tracking-tight">
              {activeRepo?.name || 'Sample Auth & User Service'}
            </h2>
            <p className="text-xs text-[#8B929E]">
              {activeRepo?.stats?.file_count || 14} files • {activeRepo?.stats?.symbol_count || 32} AST symbols indexed
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/graph')}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-all shadow-sm"
            >
              <Network className="w-4 h-4 text-[#C7F36B]" />
              <span>Explore Graph</span>
            </button>
            <button
              onClick={() => navigate('/app/impact')}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-all"
            >
              <Zap className="w-4 h-4 text-[#526BEE]" />
              <span>Run Impact Analysis</span>
            </button>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider">Total Indexed Files</span>
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-[#151923]">
              {activeRepo?.stats?.file_count || 14}
            </div>
            <p className="text-[11px] text-[#8B929E]">APIs, services, models, tests</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider">Direct Triggers</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#151923] ring-2 ring-[#C7F36B]" />
            </div>
            <div className="text-2xl font-extrabold text-[#151923]">
              {directCount > 0 ? directCount : '—'}
            </div>
            <p className="text-[11px] text-[#8B929E]">Must be modified for change</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider">Affected Callers</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#526BEE]" />
            </div>
            <div className="text-2xl font-extrabold text-[#526BEE]">
              {indirectCount > 0 ? indirectCount : '—'}
            </div>
            <p className="text-[11px] text-[#8B929E]">Downstream dependents</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider">Suggested Tests</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#151923]">
              {testCount > 0 ? testCount : '—'}
            </div>
            <p className="text-[11px] text-[#8B929E]">Suites covering blast radius</p>
          </div>
        </div>

        {/* Scout Assistant Helper Card & Quick Start Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Preset Requirement Analysis */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#151923]">Ready-to-Run Change Analyses</h3>
                <p className="text-xs text-[#8B929E]">
                  Click any benchmark requirement to trigger instant blast radius reasoning:
                </p>
              </div>
              <Zap className="w-4 h-4 text-[#526BEE]" />
            </div>

            <div className="space-y-2.5">
              {[
                {
                  req: 'Require email verification before users can change their email address.',
                  desc: 'Triggers verification API, affects user_service.py and test suites.',
                },
                {
                  req: 'Add rate limiting to authentication and login endpoints.',
                  desc: 'Affects auth.py route handlers and security configuration.',
                },
                {
                  req: 'Implement password reset token expiration and invalidation.',
                  desc: 'Modifies verification_token.py data model and service logic.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    runAnalysisRequirement(item.req);
                    navigate('/app/impact');
                  }}
                  className="p-3.5 rounded-xl border border-[#E4E7E1] hover:border-[#151923] hover:bg-[#F7F8F5] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-[#151923] group-hover:text-[#526BEE] transition-colors">
                      {item.req}
                    </p>
                    <p className="text-[11px] text-[#8B929E]">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8B929E] group-hover:text-[#151923] group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Scout Guide card */}
          <div className="p-6 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/scout-default.svg"
                  alt="Scout"
                  className="w-12 h-12 shrink-0 drop-shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#151923]">Meet Scout</h4>
                  <p className="text-[11px] text-[#8B929E]">Your Codebase Guide</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scout analyzes relationships across modules, APIs, database models, and tests so
                you and your AI coding agents understand what may break before changing code.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/app/graph')}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-3 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors"
              >
                <span>View Full Graph →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
