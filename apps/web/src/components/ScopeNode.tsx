import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '../types';
import { Globe, Server, Database, Shield, TestTube, FileCode } from 'lucide-react';

const LAYER_CONFIG = {
  api: {
    icon: Globe,
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800',
    label: 'API',
  },
  service: {
    icon: Server,
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Service',
  },
  model: {
    icon: Database,
    bg: 'bg-purple-50 border-purple-200 text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    label: 'Model',
  },
  core: {
    icon: Shield,
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Core',
  },
  test: {
    icon: TestTube,
    bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-800',
    label: 'Test',
  },
  module: {
    icon: FileCode,
    bg: 'bg-slate-50 border-slate-200 text-slate-700',
    badge: 'bg-slate-100 text-slate-800',
    label: 'Module',
  },
};

export const ScopeNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const layerConf = LAYER_CONFIG[nodeData.layer] || LAYER_CONFIG.module;
  const Icon = layerConf.icon;

  const isDirect = nodeData.impact_status === 'direct';
  const isIndirect = nodeData.impact_status === 'indirect';

  let containerBorder = 'border-[#E4E7E1] bg-white hover:border-[#8B929E]';
  if (selected) {
    containerBorder = 'border-[#526BEE] ring-2 ring-[#526BEE]/40 bg-white shadow-md';
  } else if (isDirect) {
    containerBorder = 'border-[#151923] bg-white shadow-md';
  } else if (isIndirect) {
    containerBorder = 'border-[#526BEE] bg-white shadow-sm';
  }

  return (
    <div
      className={`w-72 rounded-xl border-2 p-3.5 shadow-sm transition-colors cursor-grab active:cursor-grabbing select-none ${containerBorder}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[#526BEE] !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`p-1 rounded-md border ${layerConf.bg}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${layerConf.badge}`}>
            {layerConf.label}
          </span>
        </div>

        {/* Impact Badge */}
        {isDirect && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#151923]" />
            Trigger
          </span>
        )}
        {isIndirect && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#526BEE]" />
            Affected
          </span>
        )}
      </div>

      {/* File Label */}
      <div className="font-semibold text-xs text-[#151923] truncate mb-1" title={nodeData.path}>
        {nodeData.label}
      </div>

      {/* Relative path */}
      <div className="font-mono text-[10px] text-[#8B929E] truncate mb-2.5" title={nodeData.path}>
        {nodeData.path}
      </div>

      {/* Meta stats & Full Endpoint badge */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E4E7E1]">
        <div className="flex items-center justify-between text-[11px] text-[#8B929E]">
          <span>{nodeData.symbol_count} symbols</span>
          <span className="uppercase text-[9px] font-semibold tracking-wider text-slate-400">
            {nodeData.layer}
          </span>
        </div>

        {nodeData.endpoints && nodeData.endpoints.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nodeData.endpoints.map((ep, idx) => (
              <span
                key={idx}
                className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[#151923] font-medium break-all"
                title={`${ep.method} ${ep.route || ep.name}`}
              >
                <strong className="text-[#526BEE]">{ep.method}</strong> {ep.route || ep.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[#526BEE] !border-2 !border-white" />
    </div>
  );
});

ScopeNode.displayName = 'ScopeNode';
