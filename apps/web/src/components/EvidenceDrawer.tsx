import React from 'react';
import { X, FileCode, ShieldCheck, AlertCircle, GitBranch, CheckCircle2 } from 'lucide-react';
import { NodeData, ImpactItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface EvidenceDrawerProps {
  selectedNode: NodeData | null;
  impactItem?: ImpactItem | null;
  onClose: () => void;
  isDesktopInline?: boolean;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  selectedNode,
  impactItem,
  onClose,
  isDesktopInline = false,
}) => {
  const { t } = useLanguage();
  if (!selectedNode) return null;

  const isDirect = selectedNode.impact_status === 'direct';
  const isIndirect = selectedNode.impact_status === 'indirect';

  return (
    <div
      className={
        isDesktopInline
          ? 'w-full h-full bg-white flex flex-col min-h-0 overflow-hidden'
          : 'fixed inset-y-0 right-0 w-full sm:w-96 border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl z-50 overflow-hidden'
      }
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-[#E4E7E1] flex items-center justify-between bg-[#F7F8F5]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4 text-[#526BEE]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-[#8B929E] block truncate">
              {selectedNode.path}
            </span>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#151923] truncate" title={selectedNode.path}>
              {selectedNode.label}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-xl text-slate-500 hover:text-[#151923] hover:bg-slate-200/70 active:bg-slate-300 transition-colors touch-manipulation cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Close panel"
          title="Close panel"
        >
          <X className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Impact Status Banner */}
        <div
          className={`p-3.5 rounded-xl border ${
            isDirect
              ? 'bg-[#151923] border-[#151923] text-white shadow-sm'
              : isIndirect
              ? 'bg-[#526BEE]/5 border-[#526BEE]/30 text-[#151923]'
              : 'bg-[#F7F8F5] border-[#E4E7E1] text-[#151923]'
          }`}
        >
          <div className="flex items-center justify-between font-semibold mb-1.5">
            <span className="uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-bold">
              {isDirect ? (
                <AlertCircle className="w-4 h-4 text-[#C7F36B] shrink-0" />
              ) : isIndirect ? (
                <GitBranch className="w-4 h-4 text-[#526BEE] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#8B929E] shrink-0" />
              )}
              <span className={isDirect ? 'text-[#C7F36B]' : isIndirect ? 'text-[#526BEE]' : 'text-[#8B929E]'}>
                {isDirect ? t('drawer.direct_target') : isIndirect ? t('drawer.indirect_target') : t('drawer.unchanged')}
              </span>
            </span>
            {impactItem && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isDirect ? 'bg-[#151923] border-[#C7F36B] text-[#C7F36B]' : 'bg-white border-[#E4E7E1] text-[#151923]'}`}>
                {Math.round(impactItem.confidence * 100)}% {t('drawer.confidence')}
              </span>
            )}
          </div>
          <p className={`text-[11px] leading-relaxed ${isDirect ? 'text-slate-200' : 'text-slate-600'}`}>
            {impactItem?.reason ||
              (isDirect
                ? 'This module is a direct code change target for the proposed requirement.'
                : isIndirect
                ? 'This module depends on or is called by directly modified services.'
                : 'This module is indexed in the repository dependency graph.')}
          </p>
        </div>

        {/* Evidence Verification Badge */}
        {impactItem && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-emerald-800">{t('drawer.grounded_fact')} </span>
              <span className="text-emerald-700">
                {impactItem.is_verified_fact
                  ? t('drawer.grounded_ast')
                  : t('drawer.inferred_desc')}
              </span>
            </div>
          </div>
        )}

        {/* Source Code Snippet */}
        {impactItem?.evidence_snippet && (
          <div>
            <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{t('drawer.evidence_snippet')}</span>
              {impactItem.line_start && (
                <span className="font-mono text-[10px] text-slate-500">
                  {t('drawer.lines')} {impactItem.line_start}–{impactItem.line_end || impactItem.line_start + 15}
                </span>
              )}
            </div>
            <pre className="font-mono text-[11px] bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
              <code>{impactItem.evidence_snippet}</code>
            </pre>
          </div>
        )}

        {/* Defined Symbols */}
        {selectedNode.symbols && selectedNode.symbols.length > 0 && (
          <div>
            <div className="font-semibold text-slate-700 mb-1.5">
              {t('drawer.symbols_endpoints')} ({selectedNode.symbols.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedNode.symbols.map((sym, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {sym}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Endpoints */}
        {selectedNode.endpoints && selectedNode.endpoints.length > 0 && (
          <div>
            <div className="font-semibold text-slate-700 mb-1.5">{t('drawer.detected_endpoints')}</div>
            <div className="space-y-1">
              {selectedNode.endpoints.map((ep, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px]"
                >
                  <span className="font-bold text-sky-700 px-1 rounded bg-sky-100 text-[10px]">
                    {ep.method}
                  </span>
                  <span className="text-slate-800 truncate">{ep.route || ep.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
