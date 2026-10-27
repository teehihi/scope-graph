import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  runAnalysisRequirement: (req: string) => Promise<void>;
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

  // Load sample repo
  const loadSample = useCallback(async () => {
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

  // Initial load
  useEffect(() => {
    fetchRepositories()
      .then((repos) => {
        setRepositories(repos);
        if (repos.length > 0) {
          setActiveRepo(repos[0]);
        } else {
          loadSample();
        }
      })
      .catch((err) => {
        console.error('Failed to fetch repositories', err);
      });
  }, [loadSample]);

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

  // Run analysis
  const runAnalysisRequirement = async (req: string) => {
    if (!activeRepo) return;
    setIsAnalyzing(true);
    try {
      const resp = await runAnalysis(activeRepo.id, req);
      if (resp.result) {
        setAnalysisReport(resp.result);
        setBriefMarkdown(resp.brief || '');

        const firstDirect = resp.result.affected_items.find((i) => i.impact_type === 'direct');
        if (firstDirect) {
          setSelectedImpactItem(firstDirect);
          const matched = nodes.find((n) => (n.data as any).path === firstDirect.file_path);
          if (matched) {
            setSelectedNodeData(matched.data as any);
          }
        }
      }
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
