import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '../types';
import {
  Globe,
  Server,
  Database,
  Shield,
  TestTube,
  FileCode,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LAYER_THEMES: Record<
  string,
  {
    headerBg: string;
    badgeBg: string;
    icon: typeof Globe;
    label: string;
  }
> = {
  api: {
    headerBg: 'bg-[#2B6CB0]', // dbdiagram classic blue
    badgeBg: 'bg-blue-400/30 text-white',
    icon: Globe,
    label: 'API',
  },
  service: {
    headerBg: 'bg-[#0F766E]', // teal/emerald
    badgeBg: 'bg-teal-400/30 text-white',
    icon: Server,
    label: 'SERVICE',
  },
  model: {
    headerBg: 'bg-[#6D28D9]', // purple database
    badgeBg: 'bg-purple-400/30 text-white',
    icon: Database,
    label: 'MODEL',
  },
  core: {
    headerBg: 'bg-[#B45309]', // amber infrastructure
    badgeBg: 'bg-amber-400/30 text-white',
    icon: Shield,
    label: 'CORE',
  },
  test: {
    headerBg: 'bg-[#0E7490]', // cyan verification
    badgeBg: 'bg-cyan-400/30 text-white',
    icon: TestTube,
    label: 'TEST',
  },
  module: {
    headerBg: 'bg-[#334155]', // slate module
    badgeBg: 'bg-slate-400/30 text-white',
    icon: FileCode,
    label: 'MODULE',
  },
};

export const ScopeNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { t } = useLanguage();
  const nodeData = data as unknown as NodeData;
  const theme = LAYER_THEMES[nodeData.layer] || LAYER_THEMES.module;
  const Icon = theme.icon;

  const isDirect = nodeData.impact_status === 'direct';
  const isIndirect = nodeData.impact_status === 'indirect';
  const isHovered = (data as any)?.isHovered;
  const isConnected = (data as any)?.isConnected;
  const isAnyHovered = (data as any)?.isAnyHovered;

  // dbdiagram card styling with dynamic state rings
  const isExternalRelated = (data as any)?.isExternalRelated;
  const relationRole = (data as any)?.relationRole;

  let borderClass = 'border-[#CBD5E1] shadow-sm hover:border-[#3182CE] hover:shadow-md';
  if (selected || isHovered) {
    borderClass = 'border-[#3182CE] ring-4 ring-[#3182CE]/20 shadow-xl';
  } else if (isConnected) {
    borderClass = 'border-[#3182CE] ring-2 ring-[#3182CE]/50 shadow-md';
  } else if (isDirect) {
    borderClass = 'border-[#151923] ring-2 ring-[#C7F36B] shadow-md';
  } else if (isIndirect) {
    borderClass = 'border-[#3182CE] ring-1 ring-[#3182CE]/40 shadow-sm';
  } else if (isExternalRelated) {
    borderClass = 'border-dashed border-slate-300 bg-slate-50/40 shadow-xs hover:border-[#3182CE]';
  }

  const opacityClass = isAnyHovered && !isHovered && !isConnected ? 'opacity-70' : 'opacity-100';
  const showHandles = isHovered || isConnected;

  // Display top symbols inside the card like dbdiagram fields
  const displaySymbols = (nodeData.symbols || []).slice(0, 5);
  const remainingCount = (nodeData.symbol_count || 0) - displaySymbols.length;

  return (
    <div
      className={`group w-72 rounded-xl border bg-white overflow-hidden transition-[border-color,box-shadow,opacity] duration-150 select-none cursor-grab active:cursor-grabbing ${borderClass} ${opacityClass}`}
    >
      {/* Left connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={`!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-left-[4px] z-20 transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-left-[4px] z-20 opacity-0 pointer-events-none"
      />

      {/* Top connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-top-[4px] z-20 transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-src"
        className="!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-top-[4px] z-20 opacity-0 pointer-events-none"
      />

      {/* dbdiagram-style solid colored top banner */}
      <div className={`px-3.5 py-2.5 flex items-center justify-between text-white ${theme.headerBg}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
          <span className="font-bold text-xs truncate tracking-wide" title={nodeData.label}>
            {nodeData.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isDirect && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#C7F36B] text-[#151923] flex items-center gap-1 shadow-2xs">
              <Zap className="w-2.5 h-2.5 fill-current" />
              {t('graph.trigger_node')}
            </span>
          )}
          {isIndirect && !isDirect && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-white/20 text-white">
              {t('drawer.indirect_target')}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${theme.badgeBg}`}>
            {theme.label}
          </span>
        </div>
      </div>

      {/* External relation role ribbon when viewed in cluster drill-down */}
      {isExternalRelated && relationRole && (
        <div
          className={`px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide border-b ${
            relationRole === 'upstream'
              ? 'bg-blue-50/80 text-blue-700 border-blue-100'
              : 'bg-slate-100/80 text-slate-600 border-slate-200'
          }`}
        >
          <span className="font-bold">{relationRole === 'upstream' ? '↗' : '↘'}</span>
          <span>
            {relationRole === 'upstream' ? t('graph.upstream_callers') : t('graph.downstream_deps')}
          </span>
        </div>
      )}

      {/* dbdiagram-style field/symbol rows */}
      <div className="divide-y divide-slate-100 text-xs">
        {displaySymbols.length > 0 ? (
          displaySymbols.map((sym, idx) => (
            <div
              key={idx}
              className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#3182CE] shrink-0" />
                <span className="font-mono text-[11px] text-[#1E293B] truncate" title={sym}>
                  {sym}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 pl-2 shrink-0">
                {sym.startsWith('test_') ? 'test' : sym[0] === sym[0]?.toUpperCase() && !sym.includes('(') ? 'class' : 'fn'}
              </span>
            </div>
          ))
        ) : (
          <div className="px-3.5 py-2 text-[11px] text-slate-400 italic">
            {nodeData.path}
          </div>
        )}

        {remainingCount > 0 && (
          <div className="px-3.5 py-1 text-[10px] font-medium text-slate-400 bg-slate-50/60 text-center font-mono">
            +{remainingCount} {t('repo.symbols')}
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      <div className="px-3.5 py-1.5 bg-[#F8FAFC] border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span className="truncate max-w-[170px]" title={nodeData.path}>
          {nodeData.path}
        </span>
        <span className="font-mono font-bold text-slate-600 shrink-0">
          {nodeData.symbol_count} {t('repo.symbols')}
        </span>
      </div>

      {/* Right connection handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={`!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-right-[4px] z-20 transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-tgt"
        className="!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-right-[4px] z-20 opacity-0 pointer-events-none"
      />

      {/* Bottom connection handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-bottom-[4px] z-20 transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-tgt"
        className="!w-2 !h-2 !bg-[#3182CE] !border-2 !border-white !rounded-full !-bottom-[4px] z-20 opacity-0 pointer-events-none"
      />
    </div>
  );
});

ScopeNode.displayName = 'ScopeNode';
