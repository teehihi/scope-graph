import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Globe,
  Server,
  Database,
  Shield,
  TestTube,
  FileCode,
  ArrowRight,
  Zap,
  Plus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LayerType } from '../types';

export interface ClusterNodeData {
  clusterId: string;
  name: string;
  layer: LayerType;
  fileCount: number;
  symbolCount: number;
  previewFiles: string[];
  impactCount: number;
  isExpanded?: boolean;
  onExplore?: (clusterId: string) => void;
  onToggleExpand?: (clusterId: string) => void;
}

const LAYER_CONFIG = {
  api: {
    icon: Globe,
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800',
    borderHover: 'hover:border-indigo-500',
    label: 'API / Presentation',
  },
  service: {
    icon: Server,
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    borderHover: 'hover:border-emerald-500',
    label: 'Services / Business Logic',
  },
  model: {
    icon: Database,
    bg: 'bg-purple-50 border-purple-200 text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    borderHover: 'hover:border-purple-500',
    label: 'Data Access / Models',
  },
  core: {
    icon: Shield,
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    borderHover: 'hover:border-amber-500',
    label: 'Core / Security / Infrastructure',
  },
  test: {
    icon: TestTube,
    bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-800',
    borderHover: 'hover:border-cyan-500',
    label: 'Test Suites & Verification',
  },
  module: {
    icon: FileCode,
    bg: 'bg-slate-50 border-slate-200 text-slate-700',
    badge: 'bg-slate-100 text-slate-800',
    borderHover: 'hover:border-slate-500',
    label: 'Module / Subsystem',
  },
};

export const ClusterNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const { t } = useLanguage();
  const clusterData = data as unknown as ClusterNodeData;
  const layerConf = LAYER_CONFIG[clusterData.layer] || LAYER_CONFIG.module;
  const Icon = layerConf.icon;

  const hasImpact = (clusterData.impactCount || 0) > 0;
  const isHovered = (data as any)?.isHovered;
  const isConnected = (data as any)?.isConnected;
  const isAnyHovered = (data as any)?.isAnyHovered;

  const showHandles = isHovered || isConnected;
  const handleTopClass = `!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-top-[4px] transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`;
  const handleBottomClass = `!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-bottom-[4px] transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`;
  const handleLeftClass = `!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-left-[4px] transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`;
  const handleRightClass = `!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-right-[4px] transition-opacity duration-150 ${showHandles ? '!opacity-100' : '!opacity-0'}`;

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clusterData.onToggleExpand) {
      clusterData.onToggleExpand(clusterData.clusterId);
    } else if (clusterData.onExplore) {
      clusterData.onExplore(clusterData.clusterId);
    }
  };

  let stateClasses = `border-[#E4E7E1] ${layerConf.borderHover}`;
  if (selected || isHovered) {
    stateClasses = 'border-[#526BEE] ring-4 ring-[#526BEE]/20 shadow-xl scale-[1.01]';
  } else if (isConnected) {
    stateClasses = 'border-[#526BEE] ring-2 ring-[#526BEE]/40 shadow-md';
  } else if (hasImpact) {
    stateClasses = 'border-[#151923] ring-2 ring-[#C7F36B]/80';
  }

  const opacityClass = isAnyHovered && !isHovered && !isConnected ? 'opacity-70' : 'opacity-100';

  return (
    <div
      onClick={handleExpand}
      className={`group w-[320px] rounded-2xl border-2 bg-white p-4 shadow-sm hover:shadow-xl transition-[border-color,box-shadow,opacity,transform] duration-150 cursor-pointer select-none relative ${stateClasses} ${opacityClass}`}
    >
      {/* Top connection ports */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-left"
        style={{ left: '25%' }}
        className={handleTopClass}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-left-src"
        style={{ left: '25%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-top-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ left: '50%' }}
        className={handleTopClass}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-src"
        style={{ left: '50%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-top-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-right"
        style={{ left: '75%' }}
        className={handleTopClass}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right-src"
        style={{ left: '75%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-top-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleLeftClass}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-left-[4px] opacity-0 pointer-events-none"
      />

      {/* Cluster Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg border ${layerConf.bg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${layerConf.badge}`}
          >
            {layerConf.label}
          </span>
        </div>

        {hasImpact && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1 shadow-2xs">
            <Zap className="w-3 h-3 text-[#151923]" />
            <span>{clusterData.impactCount} {t('drawer.impact')}</span>
          </span>
        )}
      </div>

      {/* Cluster Title */}
      <h4 className="text-sm font-extrabold text-[#151923] group-hover:text-[#526BEE] transition-colors truncate mb-1">
        {clusterData.name}
      </h4>

      {/* Stats Line */}
      <div className="text-[11px] font-semibold text-[#8B929E] mb-3">
        <span>
          {clusterData.fileCount} {t('graph.cluster_files')}
        </span>
        <span className="mx-1.5">•</span>
        <span>
          {clusterData.symbolCount} {t('graph.cluster_symbols')}
        </span>
      </div>

      {/* Preview Files Pill List */}
      {clusterData.previewFiles && clusterData.previewFiles.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 pt-2.5 border-t border-slate-100 max-h-[52px] overflow-hidden">
          {clusterData.previewFiles.slice(0, 3).map((f, i) => (
            <span
              key={i}
              className="text-[10px] font-mono bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[130px]"
              title={f}
            >
              {f}
            </span>
          ))}
          {clusterData.fileCount > 3 && (
            <span className="text-[10px] font-medium text-slate-400 self-center">
              +{clusterData.fileCount - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#E4E7E1] text-xs font-bold text-[#526BEE] group-hover:text-[#151923] transition-colors">
        <span className="flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>{t('graph.expand_cluster')}</span>
        </span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </div>

      {/* Bottom connection ports */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left"
        style={{ left: '25%' }}
        className={handleBottomClass}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left-tgt"
        style={{ left: '25%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-bottom-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: '50%' }}
        className={handleBottomClass}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-tgt"
        style={{ left: '50%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-bottom-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{ left: '75%' }}
        className={handleBottomClass}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-right-tgt"
        style={{ left: '75%' }}
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-bottom-[4px] opacity-0 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleRightClass}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-tgt"
        className="!w-2 !h-2 !bg-[#526BEE] !border-2 !border-white z-10 !-right-[4px] opacity-0 pointer-events-none"
      />
    </div>
  );
});

ClusterNode.displayName = 'ClusterNode';
