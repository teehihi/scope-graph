import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { GraphCanvas } from '../../components/GraphCanvas';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { RepoSelectorDropdown } from '../../components/RepoSelectorDropdown';
import { OnboardingTour, TourStep } from '../../components/OnboardingTour';
import { Zap, RotateCcw, HelpCircle } from 'lucide-react';
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

  // Guided Walkthrough Tour State
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seenTour = localStorage.getItem('scopegraph_graph_tour_seen');
    if (!seenTour) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTour = () => {
    setShowTour(false);
    localStorage.setItem('scopegraph_graph_tour_seen', 'true');
  };

  const graphTourSteps: TourStep[] = [
    {
      id: 'clusters',
      targetSelector: '#tour-graph-canvas',
      title: t('graph.tour_step_clusters_title'),
      placement: 'bottom',
      spotlightPadding: 6,
      spotlightRadius: 18,
      description: t('graph.tour_step_clusters_desc'),
      interactiveTip: t('graph.tour_step_clusters_tip'),
    },
    {
      id: 'drilldown',
      targetSelector: '#tour-graph-layer-filter',
      title: t('graph.tour_step_drilldown_title'),
      placement: 'bottom',
      spotlightPadding: 6,
      spotlightRadius: 14,
      description: t('graph.tour_step_drilldown_desc'),
      interactiveTip: t('graph.tour_step_drilldown_tip'),
    },
    {
      id: 'layouts',
      targetSelector: '#tour-graph-layout-dock',
      title: t('graph.tour_step_layout_title'),
      placement: 'left',
      spotlightPadding: 8,
      spotlightRadius: 18,
      description: t('graph.tour_step_layout_desc'),
      interactiveTip: t('graph.tour_step_layout_tip'),
    },
    {
      id: 'navigation',
      targetSelector: '#tour-graph-zoom-dock',
      title: t('graph.tour_step_nav_title'),
      placement: 'top',
      spotlightPadding: 8,
      spotlightRadius: 18,
      description: t('graph.tour_step_nav_desc'),
      interactiveTip: t('graph.tour_step_nav_tip'),
    },
    {
      id: 'actions',
      targetSelector: '#tour-graph-header-actions',
      title: t('graph.tour_step_actions_title'),
      placement: 'bottom',
      spotlightPadding: 6,
      spotlightRadius: 14,
      description: t('graph.tour_step_actions_desc'),
      interactiveTip: t('graph.tour_step_actions_tip'),
    },
  ];

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
        <div id="tour-graph-header-actions" className="flex items-center gap-1.5 sm:gap-2">
          {/* Guide / Walkthrough Button */}
          <button
            type="button"
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white text-[#151923] border border-[#E4E7E1] hover:bg-slate-50 transition-colors shadow-xs shrink-0 cursor-pointer"
            title={t('graph.tour_btn')}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#526BEE]" />
            <span className="hidden sm:inline">{t('graph.tour_btn')}</span>
          </button>

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

      {/* Interactive Guided Walkthrough Tour */}
      <OnboardingTour
        isOpen={showTour}
        steps={graphTourSteps}
        onClose={handleCloseTour}
        onComplete={handleCloseTour}
        onSkip={handleCloseTour}
      />
    </AppLayout>
  );
};
