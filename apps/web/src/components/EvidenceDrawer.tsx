import React from 'react';
import { X, FileCode, ShieldCheck } from 'lucide-react';
import { NodeData, ImpactItem } from '../types';

interface EvidenceDrawerProps {
  selectedNode: NodeData | null;
  impactItem?: ImpactItem | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  selectedNode,
  impactItem,
  onClose,
}) => {
  if (!selectedNode) return null;

  const isDirect = selectedNode.impact_status === 'direct';
  const isIndirect = selectedNode.impact_status === 'indirect';

  return (
    <div className="w-96 border-l border-slate-200 bg-white flex flex-col h-full shadow-lg z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-sky-600 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 truncate" title={selectedNode.path}>
              {selectedNode.label}
            </h3>
            <p className="text-[10px] font-mono text-slate-500 truncate" title={selectedNode.path}>
              {selectedNode.path}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Impact Status Banner */}
        <div
          className={`p-3 rounded-xl border ${
            isDirect
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : isIndirect
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between font-semibold mb-1">
            <span className="uppercase tracking-wider text-[10px]">
              {isDirect ? 'Direct Impact' : isIndirect ? 'Indirect Impact' : 'No Impact Detected'}
            </span>
            {impactItem && (
              <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded border border-current">
                {Math.round(impactItem.confidence * 100)}% Confidence
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed">
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
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <div className="text-[11px]">
              <span className="font-semibold">Repository-Grounded Fact: </span>
              {impactItem.is_verified_fact
                ? 'Validated against actual AST symbol & path index.'
                : 'Inferred semantic dependency.'}
            </div>
          </div>
        )}

        {/* Source Code Snippet */}
        {impactItem?.evidence_snippet && (
          <div>
            <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Source Evidence Excerpt</span>
              {impactItem.line_start && (
                <span className="font-mono text-[10px] text-slate-500">
                  Lines {impactItem.line_start}–{impactItem.line_end || impactItem.line_start + 15}
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
              Indexed Symbols ({selectedNode.symbols.length})
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
            <div className="font-semibold text-slate-700 mb-1.5">Detected API Endpoints</div>
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
