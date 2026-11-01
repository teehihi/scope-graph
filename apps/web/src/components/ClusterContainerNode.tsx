import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Globe,
  Server,
  Database,
  Shield,
  TestTube,
  FileCode,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LayerType } from '../types';

export interface ClusterContainerData {
  clusterId: string;
  name: string;
  layer: LayerType;
  fileCount: number;
  symbolCount: number;
  impactCount: number;
  isExpanded: boolean;
  onToggleCollapse?: (clusterId: string) => void;
}

const LAYER_CONFIG = {
  api: {
    icon: Globe,
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    container: 'border-indigo-200 bg-indigo-50/30',
    label: 'API / Presentation',
  },
  service: {
    icon: Server,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    container: 'border-emerald-200 bg-emerald-50/30',
    label: 'Services / Business Logic',
  },
  model: {
    icon: Database,
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    container: 'border-purple-200 bg-purple-50/30',
    label: 'Data Access / Models',
  },
  core: {
    icon: Shield,
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    container: 'border-amber-200 bg-amber-50/30',
    label: 'Core / Security',
  },
  test: {
    icon: TestTube,
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    container: 'border-cyan-200 bg-cyan-50/30',
    label: 'Test Suites',
  },
  module: {
    icon: FileCode,
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    container: 'border-slate-200 bg-slate-50/40',
    label: 'Module Subsystem',
  },
};

export const ClusterContainerNode: React.FC<NodeProps> = memo(({ data }) => {
  const { t } = useLanguage();
  const cData = data as unknown as ClusterContainerData;
  const layerConf = LAYER_CONFIG[cData.layer] || LAYER_CONFIG.module;
  const Icon = layerConf.icon;

  const hasImpact = (cData.impactCount || 0) > 0;

  return (
    <div
      className={`w-full h-full rounded-3xl border-2 transition-all duration-300 relative shadow-xs pointer-events-none select-none ${layerConf.container}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3.5 !h-3.5 !bg-[#526BEE] !border-2 !border-white pointer-events-auto !-top-[7px]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3.5 !h-3.5 !bg-[#526BEE] !border-2 !border-white pointer-events-auto !-left-[7px]"
      />

      {/* Container Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md rounded-t-3xl pointer-events-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <Icon className="w-4 h-4 text-[#526BEE]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#151923] truncate">
                {cData.name}
              </h3>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${layerConf.badge}`}
              >
                {layerConf.label}
              </span>
            </div>
            <span className="text-[11px] font-medium text-[#8B929E]">
              {cData.fileCount} {t('graph.cluster_files')} • {cData.symbolCount} {t('graph.cluster_symbols')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasImpact && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1 shadow-2xs">
              <Zap className="w-3 h-3 text-[#151923]" />
              <span>{cData.impactCount} {t('drawer.impact')}</span>
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              cData.onToggleCollapse?.(cData.clusterId);
            }}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151923] transition-colors border border-slate-200"
            title={t('graph.collapse_cluster')}
          >
            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            <span className="hidden sm:inline">{t('graph.collapse_cluster')}</span>
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3.5 !h-3.5 !bg-[#526BEE] !border-2 !border-white pointer-events-auto !-bottom-[7px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3.5 !h-3.5 !bg-[#526BEE] !border-2 !border-white pointer-events-auto !-right-[7px]"
      />
    </div>
  );
});

ClusterContainerNode.displayName = 'ClusterContainerNode';
