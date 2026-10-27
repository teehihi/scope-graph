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
} from 'lucide-react';
import { AnalysisReport, ImpactItem } from '../types';
import { RoleAiAgentIcon, StatusCompletedIcon } from './BrandIcons';

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
    <div className="h-80 border-t border-[#E4E7E1] bg-white flex flex-col z-10 shadow-md">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-[#E4E7E1] px-6 bg-[#F7F8F5]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'items'
                ? 'border-[#151923] text-[#151923] bg-white'
                : 'border-transparent text-[#8B929E] hover:text-[#151923]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Affected Files ({report.affected_items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'risks'
                ? 'border-[#151923] text-[#151923] bg-white'
                : 'border-transparent text-[#8B929E] hover:text-[#151923]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>Risks & Regressions ({report.risks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-[#151923] text-[#151923] bg-white'
                : 'border-transparent text-[#8B929E] hover:text-[#151923]'
            }`}
          >
            <TestTube className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>Suggested Tests ({report.suggested_tests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'brief'
                ? 'border-[#151923] text-[#151923] bg-white'
                : 'border-transparent text-[#8B929E] hover:text-[#151923]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>Coding Agent Brief</span>
          </button>
        </div>

        {/* Operational info */}
        <div className="flex items-center gap-2 text-[11px] text-[#151923] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#EDF0F7] text-[#151923] border border-[#E4E7E1]">
            <StatusCompletedIcon size={14} />
            <span className="font-semibold text-[10px]">Analysis Complete</span>
          </div>
          <span>•</span>
          <span>{report.operational_metadata?.model || 'Meta AI'}</span>
          <span>•</span>
          <span>{report.operational_metadata?.execution_time_seconds || 0}s</span>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6">
        {/* Tab 1: Affected Files */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            {/* Direct items */}
            {directItems.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#151923] mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#151923]" />
                  Direct Changes / Triggers ({directItems.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {directItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedFilePath === item.file_path
                          ? 'border-[#151923] bg-[#F7F8F5] ring-2 ring-[#C7F36B]'
                          : 'border-[#E4E7E1] hover:border-[#8B929E] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-[#151923] truncate">
                          {item.file_path.split('/').pop()}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBFACD] text-[#151923] border border-[#C7F36B]">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#8B929E] truncate mb-1.5">{item.file_path}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.reason}</p>
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
                  Affected Paths / Downstream Dependents ({indirectItems.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {indirectItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedFilePath === item.file_path
                          ? 'border-[#526BEE] bg-[#526BEE]/5 ring-2 ring-[#526BEE]/30'
                          : 'border-[#E4E7E1] hover:border-[#8B929E] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-[#151923] truncate">
                          {item.file_path.split('/').pop()}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#8B929E] truncate mb-1.5">{item.file_path}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Risks */}
        {activeTab === 'risks' && (
          <div className="max-w-4xl space-y-2">
            {report.risks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 text-xs text-[#151923]"
              >
                <ShieldAlert className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{risk}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Suggested Tests */}
        {activeTab === 'tests' && (
          <div className="max-w-4xl space-y-2">
            {report.suggested_tests.map((test, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-xs text-[#151923]"
              >
                <CheckCircle className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{test}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Implementation Brief */}
        {activeTab === 'brief' && (
          <div className="max-w-4xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RoleAiAgentIcon size={22} />
                <p className="text-xs text-slate-600 font-medium">
                  Ready-to-use structured brief for AI coding agents (Claude Code, Codex, Cursor, etc.):
                </p>
              </div>
              <button
                onClick={handleCopyBrief}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#C7F36B]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Brief for Agent'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-56">
              <code>{briefMarkdown || 'Brief is being generated...'}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
