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

  let containerBorder = 'border-slate-200 bg-white hover:border-slate-300';
  if (selected) {
    containerBorder = 'border-sky-600 ring-2 ring-sky-500/20 bg-white';
  } else if (isDirect) {
    containerBorder = 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-500/20 shadow-sm';
  } else if (isIndirect) {
    containerBorder = 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/10 shadow-sm';
  }

  return (
    <div
      className={`w-64 rounded-xl border p-3.5 shadow-sm transition-all duration-150 cursor-pointer ${containerBorder}`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />

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
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
            Direct
          </span>
        )}
        {isIndirect && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Indirect
          </span>
        )}
      </div>

      {/* File Label */}
      <div className="font-semibold text-xs text-slate-900 truncate mb-1" title={nodeData.path}>
        {nodeData.label}
      </div>

      {/* Relative path */}
      <div className="font-mono text-[10px] text-slate-500 truncate mb-2.5" title={nodeData.path}>
        {nodeData.path}
      </div>

      {/* Meta stats */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100">
        <span>{nodeData.symbol_count} symbols</span>
        {nodeData.endpoints && nodeData.endpoints.length > 0 && (
          <span className="font-mono text-[10px] bg-slate-100 px-1 rounded text-slate-700">
            {nodeData.endpoints[0].method} {nodeData.endpoints[0].route || ''}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  );
});

ScopeNode.displayName = 'ScopeNode';
