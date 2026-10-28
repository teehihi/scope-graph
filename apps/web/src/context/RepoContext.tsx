import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';
import { Repository, NodeData, ImpactItem, AnalysisReport, LayerType } from '../types';
import { fetchRepositories, loadSampleRepository, fetchGraph, runAnalysis } from '../api/client';

interface RepoContextType {
  repositories: Repository[];
  activeRepo: Repository | null;
  setActiveRepo: (repo: Repository | null) => void;
  isLoadingSample: boolean;
  loadSample: () => Promise<void>;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  selectedLayer: LayerType | 'all';
  setSelectedLayer: (layer: LayerType | 'all') => void;
  focusSubgraph: boolean;
  setFocusSubgraph: (val: boolean) => void;
  analysisReport: AnalysisReport | null;
  briefMarkdown: string;
  isAnalyzing: boolean;
  requirement: string;
  setRequirement: (req: string) => void;
  runAnalysisRequirement: (req: string, targetRepo?: Repository | null) => Promise<void>;
  clearAnalysis: () => void;
  selectedNodeData: NodeData | null;
  setSelectedNodeData: (n: NodeData | null) => void;
  selectedImpactItem: ImpactItem | null;
  setSelectedImpactItem: (i: ImpactItem | null) => void;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerType | 'all'>('all');
  const [focusSubgraph, setFocusSubgraph] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [briefMarkdown, setBriefMarkdown] = useState<string>('');
  const [requirement, setRequirement] = useState<string>(
    'Require email verification before users can change their email address.'
  );
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);
  const [selectedImpactItem, setSelectedImpactItem] = useState<ImpactItem | null>(null);

  const activeRepoRef = useRef<Repository | null>(null);
  activeRepoRef.current = activeRepo;

  // Run analysis (stable reference, no re-triggering dependencies)
  const runAnalysisRequirement = useCallback(async (req: string, targetRepo?: Repository | null) => {
    const repo = targetRepo || activeRepoRef.current;
    if (!repo) return;
    setIsAnalyzing(true);
    try {
      const resp = await runAnalysis(repo.id, req);
      if (resp.result) {
        setAnalysisReport(resp.result);
        setBriefMarkdown(resp.brief || '');

        const firstDirect = resp.result.affected_items.find((i) => i.impact_type === 'direct');
        if (firstDirect) {
          setSelectedImpactItem(firstDirect);
        }
      }
    } catch (err: any) {
      console.warn('Analysis API unavailable:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Load sample repo
  const loadSample = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const repo = await loadSampleRepository();
      setRepositories((prev) => [repo, ...prev.filter((r) => r.id !== repo.id)]);
      setActiveRepo(repo);
      setSelectedNodeData(null);
      setSelectedImpactItem(null);
    } catch (err) {
      console.warn('Backend load-sample failed:', err);
    } finally {
      setIsLoadingSample(false);
    }
  }, [setNodes, setEdges]);

  // Sync graph
  const reloadGraph = useCallback(
    async (repoId: string, report?: AnalysisReport | null, focusSub: boolean = false) => {
      try {
        const highlighted = report ? report.affected_items.map((i) => i.file_path) : [];
        const graphData = await fetchGraph(repoId, highlighted, focusSub);

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
        console.warn('Graph API unavailable:', err);
      }
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    if (activeRepo) {
      reloadGraph(activeRepo.id, analysisReport, focusSubgraph);
    }
  }, [activeRepo, reloadGraph, analysisReport, focusSubgraph]);

  // Initial load - sync with backend if available
  useEffect(() => {
    let isCancelled = false;

    const initRepositories = async () => {
      try {
        const repos = await fetchRepositories();
        if (isCancelled) return;
        if (repos.length > 0) {
          setRepositories(repos);
          setActiveRepo(repos[0]);
        } else {
          // Backend is online but database is empty, seed it
          await loadSample();
        }
      } catch (err) {
        console.warn('[RepoContext] Backend connecting in background:', err);
        // Keep the empty or last successfully loaded repository state.
      }
    };

    initRepositories();

    return () => {
      isCancelled = true;
    };
  }, [loadSample]);

  const clearAnalysis = () => {
    setAnalysisReport(null);
    setBriefMarkdown('');
    setSelectedNodeData(null);
    setSelectedImpactItem(null);
    setFocusSubgraph(false);
  };

  return (
    <RepoContext.Provider
      value={{
        repositories,
        activeRepo,
        setActiveRepo,
        isLoadingSample,
        loadSample,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        selectedLayer,
        setSelectedLayer,
        focusSubgraph,
        setFocusSubgraph,
        analysisReport,
        briefMarkdown,
        isAnalyzing,
        requirement,
        setRequirement,
        runAnalysisRequirement,
        clearAnalysis,
        selectedNodeData,
        setSelectedNodeData,
        selectedImpactItem,
        setSelectedImpactItem,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error('useRepo must be used within a RepoProvider');
  }
  return context;
};
