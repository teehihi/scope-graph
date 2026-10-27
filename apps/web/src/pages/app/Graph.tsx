import React from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { GraphCanvas } from '../../components/GraphCanvas';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { Zap, RotateCcw } from 'lucide-react';
import { Node } from '@xyflow/react';
import { NodeData } from '../../types';

export const GraphPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    activeRepo,
    repositories,
    setActiveRepo,
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
      title="Dependency Graph"
      subtitle={`${activeRepo?.name || 'Sample Repository'} • Layered Architecture`}
      actions={
        <div className="flex items-center gap-2">
          {repositories.length > 0 && (
            <select
              value={activeRepo?.id || ''}
              onChange={(e) => {
                const found = repositories.find((r) => r.id === e.target.value);
                if (found) setActiveRepo(found);
              }}
              className="text-xs font-medium bg-slate-50 border border-[#E4E7E1] rounded-lg px-2.5 py-1.5 text-[#151923]"
            >
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => navigate('/app/impact')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>Analyze Impact</span>
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
              <h3 className="text-base font-bold text-[#151923]">No Graph Data Loaded</h3>
              <p className="text-xs text-[#8B929E] max-w-sm mt-1">
                Load our sample Auth &amp; User microservice or upload a repository ZIP to view the graph.
              </p>
            </div>
            <button
              onClick={loadSample}
              disabled={isLoadingSample}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-[#C7F36B]" />
              <span>{isLoadingSample ? 'Loading Demo...' : 'Load Sample Repository'}</span>
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
