import React, { useEffect, useState, useCallback } from 'react';
import { useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';
import { Navbar } from './components/Navbar';
import { RequirementPanel } from './components/RequirementPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { ReportPanel } from './components/ReportPanel';
import { UploadModal } from './components/UploadModal';
import {
  fetchHealth,
  fetchRepositories,
  loadSampleRepository,
  fetchGraph,
  runAnalysis,
} from './api/client';
import { Repository, NodeData, ImpactItem, AnalysisReport, LayerType } from './types';
import { FolderGit2, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{ status: string; database: string; redis: string } | null>(null);

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerType | 'all'>('all');
  const [focusSubgraph, setFocusSubgraph] = useState(false);

  // Analysis & Evidence state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [briefMarkdown, setBriefMarkdown] = useState<string>('');
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);
  const [selectedImpactItem, setSelectedImpactItem] = useState<ImpactItem | null>(null);

  // Load 1-Click Sample Repo
  const handleLoadSample = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const repo = await loadSampleRepository();
      setRepositories((prev) => [repo, ...prev.filter((r) => r.id !== repo.id)]);
      setActiveRepo(repo);
      setAnalysisReport(null);
      setBriefMarkdown('');
      setSelectedNodeData(null);
      setSelectedImpactItem(null);
    } catch (err) {
      console.error('Failed to load sample repo', err);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  // Check health and load initial repos
  useEffect(() => {
    fetchHealth()
      .then(setSystemStatus)
      .catch(() => setSystemStatus({ status: 'offline', database: 'disconnected', redis: 'disconnected' }));

    fetchRepositories()
      .then((repos) => {
        setRepositories(repos);
        if (repos.length > 0) {
          setActiveRepo(repos[0]);
        } else {
          // Auto load sample repository on empty start for zero-friction demo!
          handleLoadSample();
        }
      })
      .catch((err) => console.error('Failed to load repositories', err));
  }, [handleLoadSample]);

  // Load graph when active repository or analysis state changes
  const reloadGraph = useCallback(
    async (repoId: string, report?: AnalysisReport | null, focusSub: boolean = false) => {
      try {
        const highlighted = report ? report.affected_items.map((i) => i.file_path) : [];
        const graphData = await fetchGraph(repoId, highlighted, focusSub);

        // Map graph data to React Flow nodes with impact statuses
        const rfNodes: Node[] = graphData.nodes.map((n: any) => {
          let impact_status = 'none';
          if (report) {
            const matched = report.affected_items.find((item) => item.file_path === n.data.path);
            if (matched) {
              impact_status = matched.impact_type;
            }
          }
          return {
            ...n,
            data: {
              ...n.data,
              impact_status,
            },
          };
        });

        setNodes(rfNodes);
        setEdges(graphData.edges);
      } catch (err) {
        console.error('Failed to load graph', err);
      }
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    if (activeRepo) {
      reloadGraph(activeRepo.id, analysisReport, focusSubgraph);
    }
  }, [activeRepo, reloadGraph, analysisReport, focusSubgraph]);

  // Run impact analysis
  const handleRunAnalysis = async (requirement: string) => {
    if (!activeRepo) return;
    setIsAnalyzing(true);
    try {
      const resp = await runAnalysis(activeRepo.id, requirement);
      if (resp.result) {
        setAnalysisReport(resp.result);
        setBriefMarkdown(resp.brief || '');

        // Pre-select first direct impact item
        const firstDirect = resp.result.affected_items.find((i) => i.impact_type === 'direct');
        if (firstDirect) {
          setSelectedImpactItem(firstDirect);
          // Find corresponding node
          const matchedNode = nodes.find((n) => (n.data as unknown as NodeData).path === firstDirect.file_path);
          if (matchedNode) {
            setSelectedNodeData(matchedNode.data as unknown as NodeData);
          }
        }
      }
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset analysis
  const handleClearAnalysis = () => {
    setAnalysisReport(null);
    setBriefMarkdown('');
    setSelectedNodeData(null);
    setSelectedImpactItem(null);
    setFocusSubgraph(false);
  };

  // Click on a node in graph
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as NodeData;
    setSelectedNodeData(data);
    if (analysisReport) {
      const matchedItem = analysisReport.affected_items.find((i) => i.file_path === data.path);
      setSelectedImpactItem(matchedItem || null);
    } else {
      setSelectedImpactItem(null);
    }
  };

  // Select an item from the report drawer
  const handleSelectReportItem = (item: ImpactItem) => {
    setSelectedImpactItem(item);
    const matchedNode = nodes.find((n) => (n.data as unknown as NodeData).path === item.file_path);
    if (matchedNode) {
      setSelectedNodeData(matchedNode.data as unknown as NodeData);
    }
  };

  const impactedCount = analysisReport ? analysisReport.affected_items.length : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Navbar
        repositories={repositories}
        activeRepo={activeRepo}
        onSelectRepo={(r) => {
          setActiveRepo(r);
          handleClearAnalysis();
        }}
        onLoadSample={handleLoadSample}
        onOpenUpload={() => setIsUploadOpen(true)}
        isLoadingSample={isLoadingSample}
        systemStatus={systemStatus}
      />

      {/* Main Content */}
      {activeRepo ? (
        <div className="flex-1 flex flex-col min-h-0">
          <RequirementPanel
            onAnalyze={handleRunAnalysis}
            isAnalyzing={isAnalyzing}
            hasReport={analysisReport !== null}
            onClear={handleClearAnalysis}
            activeRepoName={activeRepo.name}
          />

          {/* Canvas + Evidence Drawer */}
          <div className="flex-1 flex min-h-0 relative">
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

          {/* Report Panel (at bottom when analysis exists) */}
          {analysisReport && (
            <ReportPanel
              report={analysisReport}
              onSelectItem={handleSelectReportItem}
              selectedFilePath={selectedImpactItem?.file_path}
              briefMarkdown={briefMarkdown}
            />
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4 shadow-sm">
            <FolderGit2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No Repository Loaded</h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6">
            Upload your codebase archive or load our sample Auth & User microservice to start analyzing impact with Meta AI.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoadSample}
              disabled={isLoadingSample}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoadingSample ? 'Loading...' : 'Load Sample Repository'}</span>
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="text-xs font-medium px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Upload ZIP Archive
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(repo) => {
          setRepositories((prev) => [repo, ...prev]);
          setActiveRepo(repo);
          handleClearAnalysis();
        }}
      />
    </div>
  );
};
