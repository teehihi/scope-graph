import React from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { GraphCanvas } from '../../components/GraphCanvas';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { RepoSelectorDropdown } from '../../components/RepoSelectorDropdown';
import { Zap, RotateCcw } from 'lucide-react';
import { Node } from '@xyflow/react';
import { NodeData } from '../../types';

export const GraphPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const {
    activeRepo,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedLayer,
    setSelectedLayer,
    focusSubgraph,
    setFocusSubgraph,
    analysisReport,
    selectedNodeData,
    setSelectedNodeData,
    selectedImpactItem,
    setSelectedImpactItem,
    loadSample,
    isLoadingSample,
  } = useRepo();

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as NodeData;
    setSelectedNodeData(data);
    if (analysisReport) {
      const matched = analysisReport.affected_items.find((i) => i.file_path === data.path);
      setSelectedImpactItem(matched || null);
    } else {
      setSelectedImpactItem(null);
    }
  };

  const impactedCount = analysisReport ? analysisReport.affected_items.length : 0;

  return (
    <AppLayout
      title={t('graph.title')}
      subtitle={`${activeRepo?.name || t('graph.sample_repo')} • ${t('graph.subtitle')}`}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <RepoSelectorDropdown />

          <button
            onClick={() => navigate('/app/impact')}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm shrink-0"
            title={t('graph.analyze_impact')}
          >
            <Zap className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span className="hidden sm:inline">{t('graph.analyze_impact')}</span>
          </button>
        </div>
      }
    >
      <div className="flex-1 flex min-h-0 relative">
        {nodes.length > 0 ? (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            focusSubgraph={focusSubgraph}
            onToggleFocusSubgraph={() => setFocusSubgraph(!focusSubgraph)}
            impactedCount={impactedCount}
          />
        ) : (
          /* Empty state: Scout sleeping */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <img
              src="/brand/scout-sleeping.svg"
              alt="Scout Sleeping"
              className="w-20 h-20 opacity-80"
            />
            <div>
              <h3 className="text-base font-bold text-[#151923]">{t('graph.empty_title')}</h3>
              <p className="text-xs text-[#8B929E] max-w-sm mt-1">
                {t('graph.empty_desc')}
              </p>
            </div>
            <button
              onClick={loadSample}
              disabled={isLoadingSample}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <RotateCcw className={`w-4 h-4 text-[#C7F36B] ${isLoadingSample ? 'animate-spin' : ''}`} />
              <span>{isLoadingSample ? t('graph.loading_demo') : t('graph.load_sample')}</span>
            </button>
          </div>
        )}

        {/* Evidence Drawer */}
        {selectedNodeData && (
          <EvidenceDrawer
            selectedNode={selectedNodeData}
            impactItem={selectedImpactItem}
            onClose={() => {
              setSelectedNodeData(null);
              setSelectedImpactItem(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
};
