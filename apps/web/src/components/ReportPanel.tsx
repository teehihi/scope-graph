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
} from 'lucide-react';
import { AnalysisReport, ImpactItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ReportPanelProps {
  report: AnalysisReport;
  onSelectItem: (item: ImpactItem) => void;
  selectedFilePath?: string;
  briefMarkdown?: string;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({
  report,
  onSelectItem,
  selectedFilePath,
  briefMarkdown,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'items' | 'risks' | 'tests' | 'brief'>('items');
  const [copied, setCopied] = useState(false);

  const directItems = report.affected_items.filter((i) => i.impact_type === 'direct');
  const indirectItems = report.affected_items.filter((i) => i.impact_type === 'indirect');
  const potentialItems = report.potential_impacts || [];

  const handleCopyBrief = () => {
    if (!briefMarkdown) return;
    navigator.clipboard.writeText(briefMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAffected = report.affected_items.length + potentialItems.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full bg-white border-t border-[#E4E7E1] shadow-xs overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center border-b border-[#E4E7E1] px-3 sm:px-6 bg-[#F7F8F5] shrink-0 max-w-full min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-2 min-w-0 max-w-full flex-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'items'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('report.tab_affected')}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'items' ? 'bg-[#C7F36B] text-[#151923]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalAffected}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'risks'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>{t('report.tab_risks')}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'risks' ? 'bg-[#F5A623] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {report.risks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'tests'
                ? 'bg-[#151923] text-white shadow-xs'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-200/60'
            }`}
          >
            <TestTube className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>{t('report.tab_tests')}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'tests' ? 'bg-[#526BEE] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {report.suggested_tests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-w-0 max-w-full">
        {/* Tab 1: Affected Files */}
        {activeTab === 'items' && (
          <div className="space-y-4 min-w-0 max-w-full animate-fade-in">
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
                      <div>
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
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.simple_explanation?.summary || item.reason}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Verified Fact
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
                          ? 'border-[#526BEE] bg-[#526BEE]/5 shadow-md'
                          : 'border-[#E4E7E1] hover:border-[#526BEE]/60 bg-white hover:shadow-md'
                      }`}
                    >
                      <div>
                        {/* Path breadcrumb */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/20 shrink-0">
                            Check this
                          </span>
                        </div>
                        {/* File Name */}
                        <h4 className="font-mono text-xs sm:text-sm font-extrabold text-[#151923] truncate mb-1">
                          {item.symbol ? `${item.file_path.split('/').pop()} :: ${item.symbol}` : item.file_path.split('/').pop()}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.simple_explanation?.summary || item.reason}
                        </p>
                        {item.simple_explanation?.recommended_check && (
                          <div className="mt-2 p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-snug">
                            <strong className="font-bold">{t('report.recommended_check')}: </strong>
                            <span>{item.simple_explanation.recommended_check}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-slate-400">Downstream Path</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 3: Potential items (Chưa chắc / Danh sách cần rà soát thêm) */}
            {potentialItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B929E]" />
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

        {/* Tab 3: Suggested Tests */}
        {activeTab === 'tests' && (
          <div className="max-w-4xl space-y-2 animate-fade-in">
            {report.suggested_tests.map((test, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs text-[#151923] transition-all hover:border-[#526BEE]/40 hover:bg-white hover:shadow-xs"
              >
                <CheckCircle className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{test}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Implementation Brief */}
        {activeTab === 'brief' && (
          <div className="max-w-5xl space-y-3 flex-1 flex flex-col min-h-0 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#526BEE]" />
                <p className="text-xs text-slate-600 font-medium">
                  {t('report.brief_description')}
                </p>
              </div>
              <button
                onClick={handleCopyBrief}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
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
