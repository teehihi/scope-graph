import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe, Server, Database, Shield, TestTube, FileCode, Box } from 'lucide-react';
import { LayerType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ClusterInfo {
  id: string;
  name: string;
  layer: LayerType;
  files: any[];
}

interface ClusterSelectorDropdownProps {
  clusters: ClusterInfo[];
  activeClusterId: string | null;
  onSelectCluster: (clusterId: string) => void;
}

const LAYER_CONFIG = {
  api: {
    icon: Globe,
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    tagBg: 'bg-indigo-100 text-indigo-800',
    label: 'API',
  },
  service: {
    icon: Server,
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    tagBg: 'bg-emerald-100 text-emerald-800',
    label: 'Service',
  },
  model: {
    icon: Database,
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-700',
    tagBg: 'bg-purple-100 text-purple-800',
    label: 'Model',
  },
  core: {
    icon: Shield,
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
    tagBg: 'bg-amber-100 text-amber-800',
    label: 'Core',
  },
  test: {
    icon: TestTube,
    badgeBg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    tagBg: 'bg-cyan-100 text-cyan-800',
    label: 'Test',
  },
  module: {
    icon: FileCode,
    badgeBg: 'bg-slate-50 border-slate-200 text-slate-700',
    tagBg: 'bg-slate-100 text-slate-800',
    label: 'Module',
  },
};

export const ClusterSelectorDropdown: React.FC<ClusterSelectorDropdownProps> = ({
  clusters,
  activeClusterId,
  onSelectCluster,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCluster = clusters.find((c) => c.id === activeClusterId) || clusters[0];
  const activeConf = activeCluster ? (LAYER_CONFIG[activeCluster.layer] || LAYER_CONFIG.module) : LAYER_CONFIG.module;
  const ActiveIcon = activeConf.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!clusters || clusters.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Sleek Custom Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-semibold bg-white border border-[#E4E7E1] rounded-xl px-2.5 sm:px-3 py-1.5 text-[#151923] shadow-2xs hover:border-[#526BEE] hover:bg-slate-50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#526BEE]/20 active:scale-95"
        aria-expanded={isOpen}
      >
        <div className={`p-1 rounded-md border ${activeConf.badgeBg}`}>
          <ActiveIcon className="w-3 h-3" />
        </div>
        <span className="font-bold truncate max-w-[160px] sm:max-w-[200px]">
          {activeCluster ? activeCluster.name : t('graph.view_clusters')}
        </span>
        {activeCluster && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {activeCluster.files.length}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8B929E] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#526BEE]' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white border border-[#E4E7E1] shadow-2xl z-50 overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-[#E4E7E1] bg-[#F7F8F5] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E] flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-[#526BEE]" />
              {t('graph.view_clusters')} ({clusters.length})
            </span>
            <span className="text-[10px] font-mono text-[#8B929E]">ScopeGraph</span>
          </div>

          {/* List of Clusters */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {clusters.map((cluster) => {
              const isSelected = cluster.id === activeClusterId;
              const conf = LAYER_CONFIG[cluster.layer] || LAYER_CONFIG.module;
              const Icon = conf.icon;

              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => {
                    onSelectCluster(cluster.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#151923] text-white shadow-xs font-bold'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-[#151923]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`p-1.5 rounded-lg border shrink-0 ${
                        isSelected ? 'bg-slate-800 border-slate-700 text-[#C7F36B]' : conf.badgeBg
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs truncate">{cluster.name}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] shrink-0" />
                        )}
                      </div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 flex items-center gap-2 ${
                          isSelected ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span className="uppercase font-bold tracking-wider">{conf.label}</span>
                        <span>•</span>
                        <span>
                          {cluster.files.length} {t('graph.cluster_files')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#C7F36B] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
