import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  TestTube,
  CheckCircle,
  Copy,
  Check,
  ShieldAlert,
  Zap,
  Sparkles,
  Send,
  MessageSquare,
  ListCheck,
} from 'lucide-react';
import { AnalysisReport, ImpactItem, FollowUpResponse } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { askFollowUpQuestion } from '../api/client';

interface ReportPanelProps {
  report: AnalysisReport;
  onSelectItem: (item: ImpactItem) => void;
  selectedFilePath?: string;
  briefMarkdown?: string;
  activeRepoId?: string | null;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({
  report,
  onSelectItem,
  selectedFilePath,
  briefMarkdown,
  activeRepoId,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'items' | 'risks' | 'tests' | 'brief'>('items');
  const [copied, setCopied] = useState(false);

  // Follow-up Q&A State
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState<FollowUpResponse | null>(null);
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);

  // Manual tests checklist check state
  const [checkedManualTests, setCheckedManualTests] = useState<Record<number, boolean>>({});

  const directItems = report.affected_items.filter((i) => i.impact_type === 'direct');
  const indirectItems = report.affected_items.filter((i) => i.impact_type === 'indirect');
  const potentialItems = report.potential_impacts || [];

  const handleCopyBrief = () => {
    if (!briefMarkdown) return;
    navigator.clipboard.writeText(briefMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || !activeRepoId || isAskingFollowUp) return;
    setIsAskingFollowUp(true);
    try {
      const res = await askFollowUpQuestion(
        activeRepoId,
        followUpQuestion.trim(),
        selectedFilePath,
        undefined,
        language
      );
      setFollowUpAnswer(res);
    } catch {
      // Graceful fallback
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  const toggleManualTest = (idx: number) => {
    setCheckedManualTests((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const totalAffected = report.affected_items.length + potentialItems.length;

  return (
    <div className="flex flex-col min-w-0 w-full max-w-full bg-white border-t border-[#E4E7E1] shadow-xs">
      {/* Tab Header */}
      <div className="flex items-center border-b border-[#E4E7E1] px-3 sm:px-6 bg-[#F7F8F5] shrink-0 max-w-full min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-2 min-w-0 max-w-full flex-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('report.tab_affected')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'items' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#151923]'
              }`}
            >
              {totalAffected}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'risks'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>{t('report.tab_risks')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'risks' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#151923]'
              }`}
            >
              {report.risks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <TestTube className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('report.tab_tests')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'tests' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#151923]'
              }`}
            >
              {(report.plain_test_checklist?.length || 0) + report.suggested_tests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'brief'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>{t('report.tab_brief')}</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-4 sm:p-6 space-y-6 min-w-0 max-w-full">
        {/* Tab 1: Affected Files */}
        {activeTab === 'items' && (
          <div className="space-y-5 min-w-0 max-w-full animate-fade-in">
            {/* Top Impact Story Card for Vibecoders (Feature 2.1) */}
            {report.impact_story && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#151923] via-[#1E2536] to-[#151923] text-white shadow-md border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-[#C7F36B] text-[#151923] font-bold">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C7F36B]">
                      {t('report.story_title')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                    {t('report.grounded_checked_badge')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-slate-100 font-medium">
                  {report.impact_story.story}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-700/80 text-xs">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
                    <div className="text-[10px] font-bold text-[#C7F36B] uppercase">
                      {t('report.what_to_do_first')}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {report.impact_story.what_to_do_first}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
                    <div className="text-[10px] font-bold text-amber-400 uppercase">
                      {t('report.what_might_break')}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {report.impact_story.what_might_break}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 text-xs bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[11px] font-mono text-slate-300 truncate">
                    <span className="text-[#C7F36B] font-bold">{t('report.tab_brief')}: </span>
                    <span>{report.impact_story.action_for_agent || t('report.tab_brief_desc')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('brief')}
                    className="px-2.5 py-1 rounded-lg bg-[#C7F36B]/20 hover:bg-[#C7F36B]/30 text-[#C7F36B] border border-[#C7F36B]/40 font-sans text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{t('report.tab_brief')}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* Multimodal Visual Context Grounding Banner */}
            {report.visual_context && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-[#526BEE] text-white">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-[#151923]">
                      {t('report.visual_context_title')}
                    </span>
                  </div>
                  {report.visual_context.screen_type && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-700 font-semibold shadow-2xs">
                      {t('report.screen_type')}: {report.visual_context.screen_type}
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-slate-600">
                  {t('report.visual_observation_note')}
                </p>

                {report.visual_context.uncertainties && report.visual_context.uncertainties.length > 0 && (
                  <div className="text-[11px] text-amber-800">
                    <span className="font-semibold">{t('report.uncertainty_note')}: </span>
                    {report.visual_context.uncertainties.join(' ')}
                  </div>
                )}

                {report.visual_context.visible_elements && report.visual_context.visible_elements.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                    <span className="text-[11px] text-[#8B929E] font-medium">
                      {t('report.detected_elements')}:
                    </span>
                    {report.visual_context.visible_elements.map((el, i) => (
                      <span key={i} className="text-[11px] font-mono bg-white border border-[#E4E7E1] px-2 py-0.5 rounded-md text-slate-700">
                        {el}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tier 1: Direct items (Chắc chắn ảnh hưởng) */}
            {directItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#151923] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D]" />
                    <span>{t('report.tier_direct')} ({directItems.length})</span>
                  </div>
                  <span className="text-[10px] text-[#8B929E] hidden sm:inline">
                    {t('report.tier_direct_desc')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {directItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col justify-between ${
                        selectedFilePath === item.file_path
                          ? 'border-[#151923] bg-[#F7F8F5] shadow-md'
                          : 'border-[#E4E7E1] hover:border-[#151923]/60 bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* Path breadcrumb + Symbol */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/20 shrink-0">
                            Direct
                          </span>
                        </div>
                        {/* File / Symbol Name */}
                        <h4 className="font-mono text-xs sm:text-sm font-extrabold text-[#151923] truncate mb-1">
                          {item.symbol ? `${item.file_path.split('/').pop()} :: ${item.symbol}` : item.file_path.split('/').pop()}
                        </h4>

                        {/* User-visible screen location & consequence for vibecoders (Feature 2.2) */}
                        {item.simple_explanation?.screen_location && (
                          <div className="p-2 rounded-lg bg-red-50/50 border border-red-100 text-[11px] space-y-0.5">
                            <div className="font-bold text-[#E5484D] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" />
                              <span>{item.simple_explanation.screen_location}</span>
                            </div>
                            {item.simple_explanation.user_consequence && (
                              <p className="text-slate-700 text-[10px] leading-snug">
                                {item.simple_explanation.user_consequence}
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.simple_explanation?.summary || item.reason}
                        </p>

                        {/* Why it matters & Recommended Check */}
                        {item.simple_explanation?.why_it_matters && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            <strong className="text-slate-700">{t('report.why_it_matters')}: </strong>
                            {item.simple_explanation.why_it_matters}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {t('report.grounded_checked_badge')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 2: Indirect items (Có thể ảnh hưởng — Nên kiểm tra thêm chỗ này) */}
            {indirectItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#526BEE] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#526BEE]" />
                    <span>{t('report.tier_indirect')} ({indirectItems.length})</span>
                  </div>
                  <span className="text-[10px] text-[#8B929E] hidden sm:inline">
                    {t('report.tier_indirect_desc')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {indirectItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col justify-between ${
                        selectedFilePath === item.file_path
                          ? 'border-[#526BEE] bg-[#F7F8F5] shadow-md'
                          : 'border-[#E4E7E1] hover:border-[#526BEE]/60 bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* Path breadcrumb */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/20 shrink-0">
                            Indirect
                          </span>
                        </div>
                        {/* File / Symbol Name */}
                        <h4 className="font-mono text-xs sm:text-sm font-extrabold text-[#151923] truncate mb-1">
                          {item.symbol ? `${item.file_path.split('/').pop()} :: ${item.symbol}` : item.file_path.split('/').pop()}
                        </h4>

                        {/* User-visible screen location & consequence for vibecoders */}
                        {item.simple_explanation?.screen_location && (
                          <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] space-y-0.5">
                            <div className="font-bold text-[#526BEE] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#526BEE]" />
                              <span>{item.simple_explanation.screen_location}</span>
                            </div>
                            {item.simple_explanation.user_consequence && (
                              <p className="text-slate-700 text-[10px] leading-snug">
                                {item.simple_explanation.user_consequence}
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.simple_explanation?.summary || item.reason}
                        </p>

                        {item.simple_explanation?.why_it_matters && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            <strong className="text-slate-700">{t('report.why_it_matters')}: </strong>
                            {item.simple_explanation.why_it_matters}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {t('report.grounded_checked_badge')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 3: Potential items */}
            {potentialItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span>{t('report.tier_potential')} ({potentialItems.length})</span>
                  </div>
                  <span className="text-[10px] text-[#8B929E] hidden sm:inline">
                    {t('report.tier_potential_desc')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {potentialItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col justify-between ${
                        selectedFilePath === item.file_path
                          ? 'border-[#8B929E] bg-slate-50 shadow-md'
                          : 'border-dashed border-[#E4E7E1] hover:border-[#8B929E] bg-slate-50/40 hover:bg-white hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Path breadcrumb */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 shrink-0">
                            Potential
                          </span>
                        </div>
                        {/* File Name */}
                        <h4 className="font-mono text-xs sm:text-sm font-bold text-slate-800 truncate mb-1">
                          {item.file_path.split('/').pop()}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.simple_explanation?.summary || item.reason || 'Unconfirmed potential impact from graph proximity.'}
                        </p>
                        {item.simple_explanation?.uncertainty && (
                          <p className="text-[10px] text-amber-700/90 mt-1 italic">
                            * {item.simple_explanation.uncertainty}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 text-[10px]">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-slate-400">Unconfirmed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Grounded Follow-up Q&A for Vibecoders (Feature 2.3) */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#526BEE] text-white">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-[#151923]">
                    {t('report.qa_title')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8B929E] bg-[#F7F8F5] px-2 py-0.5 rounded-md border border-[#E4E7E1]">
                  Grounded in AST Call Traces
                </span>
              </div>

              <form onSubmit={handleAskFollowUp} className="flex items-center gap-2">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder={t('report.qa_placeholder')}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:outline-none focus:border-[#151923] font-medium"
                />
                <button
                  type="submit"
                  disabled={!followUpQuestion.trim() || isAskingFollowUp}
                  className="px-4 py-2.5 rounded-xl bg-[#151923] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {isAskingFollowUp ? (
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isAskingFollowUp ? t('report.qa_asking') : t('report.qa_btn')}</span>
                </button>
              </form>

              {/* Quick Preset Questions for Vibecoders */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                <span className="text-[11px] text-[#8B929E] font-medium">{t('report.qa_suggested')}:</span>
                <button
                  type="button"
                  onClick={() => setFollowUpQuestion(t('report.qa_preset_1'))}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F8F5] hover:bg-slate-200 border border-[#E4E7E1] text-slate-700 text-[11px] cursor-pointer"
                >
                  {t('report.qa_preset_1')}
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpQuestion(t('report.qa_preset_2'))}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F8F5] hover:bg-slate-200 border border-[#E4E7E1] text-slate-700 text-[11px] cursor-pointer"
                >
                  {t('report.qa_preset_2')}
                </button>
              </div>

              {followUpAnswer && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 space-y-2 animate-fade-in">
                  <div className="font-bold text-[#526BEE] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Scout Grounded Answer</span>
                  </div>
                  <p className="leading-relaxed font-medium">{followUpAnswer.answer}</p>
                  {followUpAnswer.screen_consequence && (
                    <div className="text-[11px] font-mono text-slate-700 bg-white/90 p-2 rounded-lg border border-blue-200">
                      ⚠️ <strong className="text-amber-700">UI Breakage: </strong> {followUpAnswer.screen_consequence}
                    </div>
                  )}
                  {followUpAnswer.callers && followUpAnswer.callers.length > 0 && (
                    <div className="text-[10px] font-mono text-[#8B929E]">
                      Direct callers in code: {followUpAnswer.callers.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Risks */}
        {activeTab === 'risks' && (
          <div className="max-w-4xl space-y-2 animate-fade-in">
            {report.risks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-xs text-[#151923] transition-all hover:bg-[#F5A623]/15 hover:shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{risk}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Suggested Tests (Plain Checklist + Automated Suites, Feature 2.4) */}
        {activeTab === 'tests' && (
          <div className="max-w-4xl space-y-5 animate-fade-in">
            {/* Plain Language Manual Acceptance Checklist for Vibecoders */}
            {report.plain_test_checklist && report.plain_test_checklist.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#151923] flex items-center gap-1.5">
                    <ListCheck className="w-4 h-4 text-[#526BEE]" />
                    <span>{t('report.manual_checklist_title')}</span>
                  </div>
                  <span className="text-[11px] text-[#8B929E]">
                    {t('report.manual_checklist_subtitle')}
                  </span>
                </div>

                <div className="space-y-2">
                  {report.plain_test_checklist.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleManualTest(idx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        checkedManualTests[idx]
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-500 line-through'
                          : 'bg-white border-[#E4E7E1] hover:border-[#151923]/40 shadow-2xs'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedManualTests[idx]}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-bold text-xs text-[#151923]">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          <strong>{t('report.step_action')}: </strong> {item.action}
                        </div>
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-md border border-emerald-200/60 leading-snug">
                          <strong>{t('report.step_expected')}: </strong> {item.expected}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automated Test Suites */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E]">
                {t('report.automated_test_suites')} ({report.suggested_tests.length})
              </div>
              {report.suggested_tests.map((test, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs text-[#151923] transition-all hover:border-[#526BEE]/40 hover:bg-white hover:shadow-xs"
                >
                  <CheckCircle className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-mono">{test}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Implementation Brief */}
        {activeTab === 'brief' && (
          <div className="max-w-5xl space-y-3 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#526BEE]" />
                <p className="text-xs text-slate-600 font-medium">
                  {t('report.brief_description')}
                </p>
              </div>
              <button
                onClick={handleCopyBrief}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#C7F36B]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('report.copied') : t('report.copy_btn')}</span>
              </button>
            </div>
            <pre className="font-mono text-xs bg-[#151923] text-slate-100 p-4 sm:p-5 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner min-h-[280px]">
              <code>{briefMarkdown || t('report.generating')}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
