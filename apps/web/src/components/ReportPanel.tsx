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

  const handleCopyBrief = () => {
    if (!briefMarkdown) return;
    navigator.clipboard.writeText(briefMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              {report.affected_items.length}
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
            {/* Direct items */}
            {directItems.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#151923] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#151923]" />
                  {t('report.direct_triggers')} ({directItems.length})
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
                        {/* Path breadcrumb + Confidence */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBFACD] text-[#151923] border border-[#C7F36B] shrink-0">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        {/* File Name - stepped down with clean spacing */}
                        <h4 className="font-mono text-xs sm:text-sm font-extrabold text-[#151923] truncate mb-1.5">
                          {item.file_path.split('/').pop()}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.reason}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-slate-400">Direct</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indirect items */}
            {indirectItems.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#526BEE] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#526BEE]" />
                  {t('report.affected_paths')} ({indirectItems.length})
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
                        {/* Path breadcrumb + Confidence */}
                        <div className="flex items-center justify-between mb-1 gap-2 text-[10px] font-mono text-[#8B929E]">
                          <span className="truncate">{item.file_path}</span>
                          <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30 shrink-0">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        {/* File Name - stepped down with clean spacing */}
                        <h4 className="font-mono text-xs sm:text-sm font-extrabold text-[#151923] truncate mb-1.5">
                          {item.file_path.split('/').pop()}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.reason}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-[#526BEE] font-semibold flex items-center gap-1">
                          <span>{t('drawer.view_evidence')}</span>
                          <span aria-hidden="true">&rarr;</span>
                        </span>
                        <span className="font-mono text-slate-400">Downstream</span>
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
