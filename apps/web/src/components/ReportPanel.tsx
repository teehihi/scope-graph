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
    <div className="h-80 border-t border-slate-200 bg-white flex flex-col z-10 shadow-md">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50/70">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'items'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Affected Files ({report.affected_items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'risks'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Risks & Regressions ({report.risks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TestTube className="w-3.5 h-3.5 text-cyan-600" />
            <span>Suggested Tests ({report.suggested_tests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('brief')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'brief'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span>Coding Agent Brief</span>
          </button>
        </div>

        {/* Operational info */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
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
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Direct Changes ({directItems.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {directItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedFilePath === item.file_path
                          ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {item.file_path.split('/').pop()}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 truncate mb-1.5">{item.file_path}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indirect items */}
            {indirectItems.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Indirect / Downstream Dependents ({indirectItems.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {indirectItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectItem(item)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedFilePath === item.file_path
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {item.file_path.split('/').pop()}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 truncate mb-1.5">{item.file_path}</p>
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
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-amber-900"
              >
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
              >
                <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{test}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Implementation Brief */}
        {activeTab === 'brief' && (
          <div className="max-w-4xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Ready-to-use structured brief for AI coding agents (Claude Code, Codex, Cursor, etc.):
              </p>
              <button
                onClick={handleCopyBrief}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
