import React, { useState } from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { GraphCanvas } from '../../components/GraphCanvas';
import { RepoSelectorDropdown } from '../../components/RepoSelectorDropdown';
import {
  RotateCcw,
  ArrowRight,
  Network,
  Zap,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Terminal,
  FileCode,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Node } from '@xyflow/react';

export const Dashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const {
    activeRepo,
    loadSample,
    isLoadingSample,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedLayer,
    setSelectedLayer,
    focusSubgraph,
    setFocusSubgraph,
    analysisReport,
    runAnalysisRequirement,
    requirement,
    setRequirement,
    isAnalyzing,
    setSelectedNodeData,
    setSelectedImpactItem,
  } = useRepo();

  const [copiedMcp, setCopiedMcp] = useState(false);
  const [promptText, setPromptText] = useState(
    requirement || t('dash.default_req')
  );

  const formatCategory = (category: string) => {
    switch (category) {
      case 'API Endpoint':
        return t('tier.api_endpoint');
      case 'Domain Service':
        return t('tier.domain_service');
      case 'Data Model':
        return t('tier.data_model');
      case 'API Route':
        return t('tier.api_route');
      case 'Test Suite':
        return t('tier.test_suite');
      case 'Core / Security':
        return t('tier.core_security');
      default:
        return category;
    }
  };

  const mcpCommand = `claude mcp add scopegraph -- python -m app.mcp.server`;

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(mcpCommand);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const handleNodeClick = (_e: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as any);
    navigate('/app/graph');
  };

  const handleSimulate = async (reqToRun?: string) => {
    const target = reqToRun || promptText;
    if (!target.trim()) return;
    setRequirement(target);
    await runAnalysisRequirement(target);
  };

  const handleViewFullImpact = async () => {
    if (!analysisReport) {
      await handleSimulate(requirement || promptText);
    }
    navigate('/app/impact');
  };

  const handleInspectItem = async (item: any) => {
    if (!analysisReport) {
      await handleSimulate(requirement || promptText);
    }
    setSelectedImpactItem(item);
    const found = nodes.find((n) => (n.data as any)?.path === item.file_path);
    if (found) {
      setSelectedNodeData(found.data as any);
    }
    navigate('/app/impact');
  };

  // Metric counts
  const directCount = analysisReport
    ? analysisReport.affected_items.filter((i) => i.impact_type === 'direct').length
    : 2;
  const indirectCount = analysisReport
    ? analysisReport.affected_items.filter((i) => i.impact_type === 'indirect').length
    : 1;
  const testCount = analysisReport ? analysisReport.suggested_tests.length : 3;
  const impactedCount = directCount + indirectCount;

  // Table items: either from analysisReport or baseline architectural components
  const displayItems = analysisReport?.affected_items && analysisReport.affected_items.length > 0
    ? analysisReport.affected_items
    : [
        {
          file_path: 'app/api/verification.py',
          impact_type: 'direct' as const,
          category: 'API Endpoint',
          reason: t('dash.mock_reason1'),
          confidence: 0.98,
          is_verified_fact: true,
        },
        {
          file_path: 'app/services/user_service.py',
          impact_type: 'direct' as const,
          category: 'Domain Service',
          reason: t('dash.mock_reason2'),
          confidence: 0.95,
          is_verified_fact: true,
        },
        {
          file_path: 'app/models/user.py',
          impact_type: 'indirect' as const,
          category: 'Data Model',
          reason: t('dash.mock_reason3'),
          confidence: 0.92,
          is_verified_fact: true,
        },
        {
          file_path: 'app/api/auth.py',
          impact_type: 'indirect' as const,
          category: 'API Route',
          reason: t('dash.mock_reason4'),
          confidence: 0.9,
          is_verified_fact: true,
        },
      ];

  return (
    <AppLayout
      title={t('dash.title')}
      subtitle={t('dash.subtitle')}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <RepoSelectorDropdown />
          <button
            onClick={loadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors shadow-xs disabled:opacity-50 shrink-0"
            title={t('dash.reload_demo')}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSample ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoadingSample ? t('dash.resetting') : t('dash.reload_demo')}</span>
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-4 sm:space-y-6">
        {/* Sleek Repository Meta Strip (Clean, developer-grade) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#8B929E] px-1 py-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono font-bold text-[#151923] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeRepo?.name || 'Sample Auth & User Service'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              main
            </span>
            <span className="text-slate-300">•</span>
            <span>{nodes.length || 14} {t('dash.files_indexed')}</span>
            <span className="text-slate-300">•</span>
            <span>Python 3.13 / FastAPI + SQLAlchemy</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {t('dash.ast_active')}
            </span>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Directly Affected */}
          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs flex flex-col justify-between space-y-2 hover:border-[#151923] transition-colors">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#151923]">{t('dash.direct_affected')}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#151923]">{directCount}</span>
              <span className="text-xs text-[#8B929E] font-medium">{t('dash.files')}</span>
            </div>
            <p className="text-[11px] text-[#8B929E]">{t('dash.direct_sub')}</p>
          </div>

          {/* 2. Indirectly Affected */}
          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs flex flex-col justify-between space-y-2 hover:border-[#151923] transition-colors">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#151923]">{t('dash.indirect_affected')}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#151923]">{indirectCount}</span>
              <span className="text-xs text-[#8B929E] font-medium">{t('dash.callers')}</span>
            </div>
            <p className="text-[11px] text-[#8B929E]">{t('dash.indirect_sub')}</p>
          </div>

          {/* 3. Suggested Tests */}
          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs flex flex-col justify-between space-y-2 hover:border-[#151923] transition-colors">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#151923]">{t('dash.suggested_tests')}</span>
              <ShieldCheck className="w-4 h-4 text-[#526BEE]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#151923]">{testCount}</span>
              <span className="text-xs text-[#8B929E] font-medium">{t('dash.suites')}</span>
            </div>
            <p className="text-[11px] text-[#8B929E]">{t('dash.tests_sub')}</p>
          </div>

          {/* 4. Grounding Fact Ratio */}
          <div className="p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs flex flex-col justify-between space-y-2 hover:border-[#151923] transition-colors">
            <div className="flex items-center justify-between text-[#8B929E]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#151923]">{t('dash.hallucination_gate')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700">100%</span>
              <span className="text-xs text-emerald-600 font-medium">{t('dash.grounded')}</span>
            </div>
            <p className="text-[11px] text-[#8B929E]">{t('dash.gate_sub')}</p>
          </div>
        </div>

        {/* Central Cockpit: Dependency Graph Preview (Left) + AI Agent Hub (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Interactive Dependency Graph Preview (7 cols / ~60%) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4E7E1] shadow-xs flex flex-col overflow-hidden min-h-[480px]">
            {/* Header */}
            <div className="p-4 px-5 border-b border-[#E4E7E1] flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#526BEE]" />
                <h3 className="text-sm font-bold text-[#151923]">{t('dash.graph_preview')}</h3>
                <span className="text-xs text-[#8B929E]">
                  ({nodes.length || 14} {t('repo.files')} • {edges.length || 18} edges)
                </span>
              </div>
              <button
                onClick={() => navigate('/app/graph')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#526BEE] hover:text-blue-800 transition-colors"
              >
                <span>{t('dash.full_canvas')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 w-full h-[420px] relative bg-[#F7F8F5]">
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                focusSubgraph={focusSubgraph}
                onToggleFocusSubgraph={() => setFocusSubgraph(!focusSubgraph)}
                impactedCount={impactedCount}
              />
            </div>
          </div>

          {/* Right Column: AI Agent Cockpit & Change Simulator (5 cols / ~40%) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E4E7E1] shadow-xs p-5 flex flex-col justify-between space-y-5">
            {/* Top: Scout Agent Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/brand/scout-default.svg"
                    alt="Scout Mascot"
                    className="w-10 h-10 shrink-0 drop-shadow-xs"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#151923]">{t('dash.scout_agent')}</h3>
                    <p className="text-[11px] text-[#8B929E]">{t('dash.scout_guide')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('dash.mcp_active')}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {t('dash.scout_desc')}
              </p>

              {/* Progress Checklist */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#C7F36B] flex items-center justify-center text-[10px] font-black text-[#151923]">
                    ✓
                  </span>
                  <span>{t('dash.step1')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#C7F36B] flex items-center justify-center text-[10px] font-black text-[#151923]">
                    ✓
                  </span>
                  <span>{t('dash.step2')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#C7F36B] flex items-center justify-center text-[10px] font-black text-[#151923]">
                    ✓
                  </span>
                  <span>{t('dash.step3')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#C7F36B] flex items-center justify-center text-[10px] font-black text-[#151923]">
                    ✓
                  </span>
                  <span>{t('dash.step4')}</span>
                </div>
              </div>
            </div>

            {/* Middle: Change Simulator Launcher */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-bold text-[#151923] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#526BEE]" />
                <span>{t('dash.simulate_change')}</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSimulate();
                  }}
                  placeholder={t('dash.input_placeholder')}
                  className="w-full text-xs bg-slate-50 border border-[#E4E7E1] rounded-xl px-3.5 py-2.5 text-[#151923] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#151923] pr-24 font-sans"
                />
                <button
                  onClick={() => handleSimulate()}
                  disabled={isAnalyzing || !promptText.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#151923] text-white hover:bg-slate-800 font-bold text-xs transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 text-[#C7F36B] ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? t('dash.tracing') : t('dash.run_btn')}</span>
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: t('dash.preset_email_label'), req: t('dash.preset_email_req') },
                  { label: t('dash.preset_rate_label'), req: t('dash.preset_rate_req') },
                  { label: t('dash.preset_token_label'), req: t('dash.preset_token_req') },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPromptText(item.req);
                      handleSimulate(item.req);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#EBFACD] text-slate-700 hover:text-[#151923] transition-colors border border-slate-200"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom: Claude Code / Cursor MCP Snippet */}
            <div className="pt-2 border-t border-[#E4E7E1] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#8B929E]">
                <span className="font-bold flex items-center gap-1 text-[#151923]">
                  <Terminal className="w-3.5 h-3.5 text-[#526BEE]" />
                  Claude Code & Cursor CLI
                </span>
                <span className="font-mono text-[10px]">MCP Tool</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-[#151923] text-white p-2.5 rounded-xl border border-slate-800 font-mono text-xs">
                <span className="text-[#C7F36B] select-none">$</span>
                <span className="text-slate-200 select-all truncate text-[11px]">
                  {mcpCommand}
                </span>
                <button
                  onClick={handleCopyMcp}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-slate-300 hover:text-white shrink-0"
                  title="Copy command"
                >
                  {copiedMcp ? <Check className="w-3.5 h-3.5 text-[#C7F36B]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Affected Components / Blast Radius Breakdown Table */}
        <div className="bg-white rounded-2xl border border-[#E4E7E1] shadow-xs overflow-hidden">
          <div className="p-4 px-5 border-b border-[#E4E7E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#151923]">
                  {t('dash.affected_title')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {displayItems.length} {t('dash.references')}
                </span>
              </div>
              <p className="text-xs text-[#8B929E] mt-0.5">
                {t('dash.ast_traces_for')}: <span className="font-medium text-slate-700 font-mono">"{requirement || t('dash.default_req')}"</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewFullImpact}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#526BEE] text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <span>{isAnalyzing ? t('dash.tracing') : t('dash.view_full_diff')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E4E7E1] text-[#8B929E] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-5 whitespace-nowrap">{t('dash.col_component')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('dash.col_tier')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('dash.col_type')}</th>
                  <th className="py-3 px-4 min-w-[260px]">{t('dash.col_rationale')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('dash.col_status')}</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">{t('dash.col_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {displayItems.map((item, idx) => {
                  const isDirect = item.impact_type === 'direct';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-800 font-semibold flex items-center gap-2 whitespace-nowrap">
                        <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{item.file_path}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium whitespace-nowrap">
                          {formatCategory(item.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${
                            isDirect
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isDirect ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{isDirect ? t('dash.direct_trigger') : t('dash.downstream_caller')}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 min-w-[260px] max-w-md leading-relaxed" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap shrink-0">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{t('dash.fact_verified')}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleInspectItem(item)}
                          disabled={isAnalyzing}
                          className="inline-flex items-center text-xs font-bold text-[#526BEE] hover:text-blue-800 hover:underline disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          {t('dash.inspect')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
