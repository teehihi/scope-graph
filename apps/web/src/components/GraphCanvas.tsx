import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Panel,
  MiniMap,
  useReactFlow,
  useViewport,
  useOnViewportChange,
  ReactFlowProvider,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
  PanOnScrollMode,
  applyNodeChanges,
  NodeChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ScopeNode } from './ScopeNode';
import { ClusterNode } from './ClusterNode';
import { ClusterContainerNode } from './ClusterContainerNode';
import { ClusterDependencyEdge } from './ClusterDependencyEdge';
import { ClusterSelectorDropdown } from './ClusterSelectorDropdown';
import {
  Eye,
  Sparkles,
  Columns3,
  Workflow,
  LayoutGrid,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  Filter,
  X,
  Target,
  ArrowLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { LayerType, LayoutMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  computeHierarchicalClusterLayout,
  computeClusterDrillDownLayout,
} from '../utils/graphLayout';

export interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  selectedLayer: LayerType | 'all';
  onSelectLayer: (layer: LayerType | 'all') => void;
  focusSubgraph: boolean;
  onToggleFocusSubgraph: () => void;
  impactedCount: number;
}

const nodeTypes: NodeTypes = {
  scopeNode: ScopeNode,
  clusterNode: ClusterNode,
  clusterContainer: ClusterContainerNode,
};

const edgeTypes = {
  clusterEdge: ClusterDependencyEdge,
  default: ClusterDependencyEdge,
};

type GridMode = 'dots' | 'lines' | 'off';
type FocusFilterMode = 'none' | 'neighborhood' | 'dependencies' | 'dependents';

/**
 * Floating Dock Controls inside ReactFlow canvas
 */
const CanvasFloatingDock: React.FC<{
  layoutMode: LayoutMode;
  onSelectLayout: (mode: LayoutMode) => void;
  onAutoLayout: () => void;
  gridMode: GridMode;
  onToggleGrid: () => void;
}> = ({
  layoutMode,
  onSelectLayout,
  onAutoLayout,
  gridMode,
  onToggleGrid,
}) => {
  const { t } = useLanguage();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round((zoom || 1) * 100);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.15, minZoom: 0.75, maxZoom: 1.05, duration: 350 });
  }, [fitView]);

  return (
    <>
      {/* Zoom Dock (Bottom-Left) */}
      <Panel position="bottom-left" className="!m-4 !mb-4 z-20">
        <div id="tour-graph-zoom-dock" className="flex items-center bg-white/95 backdrop-blur-md border border-[#E4E7E1] rounded-2xl shadow-lg p-1 gap-1 text-[#151923]">
          <button
            onClick={() => zoomOut({ duration: 250 })}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B929E] hover:text-[#151923] hover:bg-slate-100 transition-colors"
            title={t('graph.zoom_out')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono font-bold px-1.5 min-w-[42px] text-center text-[#151923] select-none">
            {zoomPercent}%
          </span>

          <button
            onClick={() => zoomIn({ duration: 250 })}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B929E] hover:text-[#151923] hover:bg-slate-100 transition-colors"
            title={t('graph.zoom_in')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#E4E7E1] mx-0.5" />

          <button
            onClick={handleFitView}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl text-xs font-semibold text-[#151923] hover:bg-slate-100 transition-colors"
            title={`${t('graph.reset_zoom')} (1)`}
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#526BEE]" />
            <span className="text-[11px] hidden sm:inline">{t('graph.reset_zoom')}</span>
            <kbd className="hidden md:inline-block text-[9px] font-mono text-[#8B929E] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
              1
            </kbd>
          </button>
        </div>
      </Panel>

      {/* Layout Presets & Grid Dock (Right-Side Vertical Toolbar) */}
      <Panel position="top-right" className="!mr-4 !mt-4 z-20">
        <div id="tour-graph-layout-dock" className="flex flex-col items-center bg-white/95 backdrop-blur-md border border-[#E4E7E1] rounded-2xl shadow-xl p-1.5 gap-1.5 text-[#151923]">
          {/* Hierarchical / Architecture Layout */}
          <button
            onClick={() => onSelectLayout('hierarchical')}
            className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              layoutMode === 'hierarchical'
                ? 'bg-[#151923] text-white shadow-sm'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
            }`}
            title={`${t('graph.hierarchical_layout')} (2)`}
          >
            <Columns3 className={`w-4 h-4 ${layoutMode === 'hierarchical' ? 'text-[#C7F36B]' : ''}`} />
            {/* Tooltip to the left */}
            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-[#151923] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl flex items-center gap-2 z-50">
              <span>{t('graph.hierarchical_layout')}</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">2</kbd>
            </div>
          </button>

          {/* Flow Stream Layout */}
          <button
            onClick={() => onSelectLayout('stream')}
            className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              layoutMode === 'stream'
                ? 'bg-[#151923] text-white shadow-sm'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
            }`}
            title={`${t('graph.radial_layout')} (3)`}
          >
            <Workflow className={`w-4 h-4 ${layoutMode === 'stream' ? 'text-[#C7F36B]' : ''}`} />
            {/* Tooltip to the left */}
            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-[#151923] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl flex items-center gap-2 z-50">
              <span>{t('graph.radial_layout')}</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">3</kbd>
            </div>
          </button>

          {/* Compact Grid Layout */}
          <button
            onClick={() => onSelectLayout('compact')}
            className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              layoutMode === 'compact'
                ? 'bg-[#151923] text-white shadow-sm'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
            }`}
            title={`${t('graph.compact_layout')} (4)`}
          >
            <LayoutGrid className={`w-4 h-4 ${layoutMode === 'compact' ? 'text-[#C7F36B]' : ''}`} />
            {/* Tooltip to the left */}
            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-[#151923] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl flex items-center gap-2 z-50">
              <span>{t('graph.compact_layout')}</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">4</kbd>
            </div>
          </button>

          <div className="w-5 h-[1px] bg-[#E4E7E1] my-0.5" />

          {/* Auto Arrange / Rearrange */}
          <button
            onClick={onAutoLayout}
            className="relative group w-9 h-9 rounded-xl flex items-center justify-center text-[#151923] hover:bg-slate-100 transition-colors"
            title={t('graph.auto_layout')}
          >
            <Sparkles className="w-4 h-4 text-[#526BEE]" />
            {/* Tooltip to the left */}
            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-[#151923] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl flex items-center gap-1.5 z-50">
              <span>{t('graph.auto_layout')}</span>
            </div>
          </button>

          <div className="w-5 h-[1px] bg-[#E4E7E1] my-0.5" />

          {/* Grid Mode Toggle (Dots / Lines / Off) */}
          <button
            onClick={onToggleGrid}
            className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              gridMode !== 'off'
                ? 'bg-[#151923] text-white shadow-sm'
                : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
            }`}
            title={`${t('graph.grid_toggle')} (${
              gridMode === 'dots'
                ? t('graph.grid_dots')
                : gridMode === 'lines'
                ? t('graph.grid_lines')
                : 'Off'
            })`}
          >
            <Grid className={`w-4 h-4 ${gridMode !== 'off' ? 'text-[#C7F36B]' : ''}`} />
            {/* Tooltip to the left */}
            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-[#151923] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl flex items-center gap-1.5 z-50">
              <span>{t('graph.grid_toggle')}: {
                gridMode === 'dots'
                  ? t('graph.grid_dots')
                  : gridMode === 'lines'
                  ? t('graph.grid_lines')
                  : 'Off'
              }</span>
            </div>
          </button>
        </div>
      </Panel>
    </>
  );
};

/**
 * Fixed Non-Zooming Background Grid that smoothly pans along with the canvas.
 * Uses direct DOM manipulation to update backgroundPosition without triggering React re-renders!
 */
const CanvasBackgroundLayer: React.FC<{ gridMode: GridMode }> = ({ gridMode }) => {
  const bgRef = useRef<HTMLDivElement>(null);

  useOnViewportChange({
    onChange: useCallback((viewport: { x: number; y: number; zoom: number }) => {
      if (bgRef.current) {
        const gap = 24;
        const x = ((viewport.x % gap) + gap) % gap;
        const y = ((viewport.y % gap) + gap) % gap;
        bgRef.current.style.backgroundPosition = `${x}px ${y}px`;
      }
    }, []),
  });

  if (gridMode === 'off') return null;

  return (
    <div
      ref={bgRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage:
          gridMode === 'dots'
            ? 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)'
            : 'linear-gradient(to right, #E4E7E1 1px, transparent 1px), linear-gradient(to bottom, #E4E7E1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
};

const GraphCanvasInner: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  onNodesChange: _onNodesChange,
  onEdgesChange,
  onNodeClick,
  selectedLayer,
  onSelectLayer,
  focusSubgraph,
  onToggleFocusSubgraph,
  impactedCount,
}) => {
  const { t } = useLanguage();
  const { fitView } = useReactFlow();

  // State: Set of cluster IDs currently expanded by the user
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set());

  // Active Cluster Drill-Down: When set, focuses inside that cluster + connected callers/dependents
  const [activeDrillDownClusterId, setActiveDrillDownClusterId] = useState<string | null>(null);

  // Internal live nodes state to support native 60-120fps real-time dragging without snap or lag
  const [internalNodes, setInternalNodes] = useState<Node[]>([]);
  const prevClusterRef = useRef<string | null>(null);
  const prevRevisionRef = useRef<number>(0);
  const prevLayerRef = useRef<string>('all');
  const prevLayoutModeRef = useRef<LayoutMode>('hierarchical');

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchical');
  // Grid mode state (Default to clean Dots grid)
  const [gridMode, setGridMode] = useState<GridMode>('dots');
  // Revision counter to force layout recalculation
  const [layoutRevision, setLayoutRevision] = useState(0);

  // Hover states for interactive call-chain highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Node Focus & Exploration State (Requirement 6)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusFilterMode, setFocusFilterMode] = useState<FocusFilterMode>('none');
  const [drillDownSearch, setDrillDownSearch] = useState('');

  // Toggle expand / drill-down into a single cluster
  const handleToggleExpandCluster = useCallback(
    (clusterId: string) => {
      setActiveDrillDownClusterId((prev) => (prev === clusterId ? null : clusterId));
      setSelectedNodeId(null);
      setFocusFilterMode('none');
      setDrillDownSearch('');
      setLayoutRevision((r) => r + 1);
      setTimeout(() => fitView({ minZoom: 0.75, maxZoom: 1.05, padding: 0.15, duration: 350 }), 80);
    },
    [fitView]
  );

  // Collapse all clusters back to pure Architecture Overview
  const handleCollapseAll = useCallback(() => {
    setActiveDrillDownClusterId(null);
    setExpandedClusterIds(new Set());
    setSelectedNodeId(null);
    setFocusFilterMode('none');
    setDrillDownSearch('');
    setLayoutRevision((r) => r + 1);
    setTimeout(() => fitView({ minZoom: 0.65, maxZoom: 1.05, padding: 0.15, duration: 350 }), 80);
  }, [fitView]);

  // Filter raw files by selected layer before layout
  const filteredRawNodes = useMemo(() => {
    if (selectedLayer === 'all') return nodes;
    return nodes.filter((n) => (n.data as any).layer === selectedLayer);
  }, [nodes, selectedLayer]);

  // Fast search filter inside active cluster drill-down
  const drillDownFilteredNodes = useMemo(() => {
    if (!activeDrillDownClusterId || !drillDownSearch.trim()) {
      return filteredRawNodes;
    }
    const q = drillDownSearch.toLowerCase().trim();
    return filteredRawNodes.filter((n) => {
      const data = n.data as any;
      const label = (data?.label || '').toLowerCase();
      const path = (data?.path || '').toLowerCase();
      return label.includes(q) || path.includes(q);
    });
  }, [filteredRawNodes, activeDrillDownClusterId, drillDownSearch]);

  // Execute Real Layout Engine (Overview or Drill-Down)
  const layoutResult = useMemo(() => {
    if (activeDrillDownClusterId) {
      return computeClusterDrillDownLayout(
        drillDownFilteredNodes,
        edges,
        activeDrillDownClusterId,
        t,
        layoutMode
      );
    }
    return computeHierarchicalClusterLayout(
      filteredRawNodes,
      edges,
      expandedClusterIds,
      t,
      layoutMode
    );
  }, [filteredRawNodes, drillDownFilteredNodes, edges, expandedClusterIds, activeDrillDownClusterId, layoutRevision, layoutMode, t]);

  // Compute connected nodes and edges for hover interactions
  const { connectedEdgeIds, connectedNodeIds } = useMemo(() => {
    const cEdges = new Set<string>();
    const cNodes = new Set<string>();

    if (hoveredNodeId) {
      cNodes.add(hoveredNodeId);
      (layoutResult?.edges || []).forEach((e) => {
        if (e && (e.source === hoveredNodeId || e.target === hoveredNodeId)) {
          cEdges.add(e.id);
          if (e.source) cNodes.add(e.source);
          if (e.target) cNodes.add(e.target);
        }
      });
    } else if (hoveredEdgeId) {
      cEdges.add(hoveredEdgeId);
      const matched = (layoutResult?.edges || []).find((e) => e && e.id === hoveredEdgeId);
      if (matched) {
        if (matched.source) cNodes.add(matched.source);
        if (matched.target) cNodes.add(matched.target);
      }
    }

    return { connectedEdgeIds: cEdges, connectedNodeIds: cNodes };
  }, [hoveredNodeId, hoveredEdgeId, layoutResult?.edges]);

  // Base layout nodes with cluster expansion & drill-down callbacks attached
  const basePreparedNodes = useMemo(() => {
    return (layoutResult?.nodes || []).map((n) => {
      if (!n) return n;
      if (n.type === 'clusterNode') {
        return {
          ...n,
          data: {
            ...(n.data || {}),
            onToggleExpand: handleToggleExpandCluster,
            onExplore: handleToggleExpandCluster,
          },
        };
      }
      if (n.type === 'clusterContainer') {
        return {
          ...n,
          data: {
            ...(n.data || {}),
            onToggleCollapse: handleToggleExpandCluster,
          },
        };
      }
      return n;
    });
  }, [layoutResult?.nodes, handleToggleExpandCluster]);

  // Synchronize internalNodes when layout, active cluster, layer, or layoutMode changes
  useEffect(() => {
    const isReset =
      prevClusterRef.current !== activeDrillDownClusterId ||
      prevRevisionRef.current !== layoutRevision ||
      prevLayerRef.current !== selectedLayer ||
      prevLayoutModeRef.current !== layoutMode;

    prevClusterRef.current = activeDrillDownClusterId;
    prevRevisionRef.current = layoutRevision;
    prevLayerRef.current = selectedLayer;
    prevLayoutModeRef.current = layoutMode;

    setInternalNodes((prev) => {
      if (isReset || prev.length === 0) {
        return basePreparedNodes;
      }
      // Retain custom dragged positions for any node that was already moved
      const posMap = new Map(prev.map((n) => [n.id, n.position]));
      return basePreparedNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) || n.position,
      }));
    });
  }, [basePreparedNodes, activeDrillDownClusterId, layoutRevision, selectedLayer, layoutMode]);

  // Live node dragging handler: updates node position synchronously on every mousemove tick
  const handleInternalNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setInternalNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Compute selected node dependencies & dependents
  const selectedNodeNeighborhood = useMemo(() => {
    if (!selectedNodeId) {
      return { dependencies: new Set<string>(), dependents: new Set<string>(), all: new Set<string>() };
    }
    const dependencies = new Set<string>();
    const dependents = new Set<string>();

    edges.forEach((e) => {
      if (e.source === selectedNodeId) dependencies.add(e.target);
      if (e.target === selectedNodeId) dependents.add(e.source);
    });

    const all = new Set([selectedNodeId, ...dependencies, ...dependents]);
    return { dependencies, dependents, all };
  }, [selectedNodeId, edges]);

  // Filter nodes if Focus Filter Mode is active
  const filteredDisplayNodes = useMemo(() => {
    if (!selectedNodeId || focusFilterMode === 'none') {
      return internalNodes;
    }

    return internalNodes.filter((n) => {
      if (n.type === 'clusterNode' || n.type === 'clusterContainer') return true;
      if (focusFilterMode === 'neighborhood') {
        return selectedNodeNeighborhood.all.has(n.id);
      }
      if (focusFilterMode === 'dependencies') {
        return n.id === selectedNodeId || selectedNodeNeighborhood.dependencies.has(n.id);
      }
      if (focusFilterMode === 'dependents') {
        return n.id === selectedNodeId || selectedNodeNeighborhood.dependents.has(n.id);
      }
      return true;
    });
  }, [internalNodes, selectedNodeId, focusFilterMode, selectedNodeNeighborhood]);

  // Inject hover and connection states onto display nodes with reference caching to preserve 60fps drag
  const finalDisplayNodes = useMemo(() => {
    const isAnyHovered = hoveredNodeId !== null || hoveredEdgeId !== null;

    return filteredDisplayNodes.map((n) => {
      const isHovered = n.id === hoveredNodeId;
      const isConnected = connectedNodeIds.has(n.id);

      const currentData = n.data as any;
      if (
        currentData?.isHovered === isHovered &&
        currentData?.isConnected === isConnected &&
        currentData?.isAnyHovered === isAnyHovered
      ) {
        return n;
      }

      return {
        ...n,
        data: {
          ...(n.data || {}),
          isHovered,
          isConnected,
          isAnyHovered,
        },
      };
    });
  }, [filteredDisplayNodes, hoveredNodeId, hoveredEdgeId, connectedNodeIds]);

  // Stable marker definitions to prevent SVG defs thrashing and jitter
  const DEFAULT_MARKER = useMemo(
    () => ({
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: '#526BEE',
    }),
    []
  );

  // Styled edges with clean routing and hover highlight:
  // When hovering on a node, hide all other non-connected dependencies!
  const styledEdges = useMemo(() => {
    const isAnyHovered = hoveredNodeId !== null || hoveredEdgeId !== null;

    return (layoutResult?.edges || []).map((e) => {
      if (!e) return e;
      const isConnected = connectedEdgeIds.has(e.id);
      const isFocusPath =
        selectedNodeId !== null &&
        (e.source === selectedNodeId || e.target === selectedNodeId);

      let opacity = 0.75;
      let strokeColor = '#94A3B8';
      let strokeWidth = 1.5;
      let marker: any = DEFAULT_MARKER;
      let isHidden = false;

      if (isAnyHovered) {
        if (isConnected) {
          strokeColor = '#526BEE';
          strokeWidth = 2.4;
          opacity = 1;
          marker = DEFAULT_MARKER;
          isHidden = false;
        } else {
          // Hide all other dependencies completely!
          opacity = 0;
          strokeColor = 'transparent';
          strokeWidth = 0;
          marker = undefined;
          isHidden = true;
        }
      } else if (isFocusPath) {
        strokeColor = '#526BEE';
        strokeWidth = 2.4;
        opacity = 1;
        marker = DEFAULT_MARKER;
      }

      return {
        ...e,
        hidden: isHidden,
        type: e.type || 'clusterEdge',
        animated: isConnected || (!isAnyHovered && Boolean(e.animated)),
        markerEnd: marker,
        style: {
          ...(e.style || {}),
          stroke: strokeColor,
          strokeWidth,
          opacity,
          display: isHidden ? 'none' : 'block',
          transition: 'stroke 0.15s, stroke-width 0.15s, opacity 0.15s',
        },
      };
    });
  }, [layoutResult?.edges, hoveredNodeId, hoveredEdgeId, connectedEdgeIds, selectedNodeId, DEFAULT_MARKER]);

  // Handle clicking on a node
  const handleInternalNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.type === 'clusterNode' || node.type === 'clusterContainer') {
        // Expansion / collapse is handled cleanly inside ClusterNode / ClusterContainerNode
        return;
      }
      setSelectedNodeId(node.id);
      onNodeClick(event, node);
    },
    [onNodeClick]
  );

  // Layout mode switcher
  const handleSelectLayout = useCallback(
    (mode: LayoutMode) => {
      setLayoutMode(mode);
      setLayoutRevision((r) => r + 1);
      setTimeout(() => fitView({ padding: 0.15, minZoom: 0.65, maxZoom: 1.05, duration: 400 }), 80);
    },
    [fitView]
  );

  // Auto layout trigger
  const handleAutoLayout = useCallback(() => {
    setInternalNodes(basePreparedNodes);
    setLayoutRevision((r) => r + 1);
    setTimeout(() => fitView({ padding: 0.15, minZoom: 0.65, maxZoom: 1.05, duration: 400 }), 50);
  }, [basePreparedNodes, fitView]);

  // Keyboard shortcut: Esc to return to architecture overview or clear selection; 1..4 for layout presets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is typing in a text field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'Escape') {
        if (activeDrillDownClusterId) {
          setActiveDrillDownClusterId(null);
          setDrillDownSearch('');
          setLayoutRevision((r) => r + 1);
          setTimeout(() => fitView({ minZoom: 0.65, maxZoom: 1.05, padding: 0.15, duration: 350 }), 80);
        } else if (selectedNodeId) {
          setSelectedNodeId(null);
          setFocusFilterMode('none');
        }
      } else if (e.key === '1') {
        fitView({ padding: 0.15, minZoom: 0.65, maxZoom: 1.05, duration: 350 });
      } else if (e.key === '2') {
        handleSelectLayout('hierarchical');
      } else if (e.key === '3') {
        handleSelectLayout('stream');
      } else if (e.key === '4') {
        handleSelectLayout('compact');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrillDownClusterId, selectedNodeId, fitView, handleSelectLayout]);

  // Grid toggle handler
  const handleToggleGrid = useCallback(() => {
    setGridMode((prev) => {
      if (prev === 'dots') return 'lines';
      if (prev === 'lines') return 'off';
      return 'dots';
    });
  }, []);

  const layers: Array<{ id: LayerType | 'all'; label: string }> = [
    { id: 'all', label: t('graph.all_layers') },
    { id: 'api', label: t('graph.api_routes') },
    { id: 'service', label: t('graph.services') },
    { id: 'model', label: t('graph.data_models') },
    { id: 'test', label: t('graph.tests') },
    { id: 'core', label: t('graph.core') },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const currentDrillDownCluster =
    layoutResult.drillDownInfo?.activeCluster ||
    layoutResult.clusters.find((c) => c.id === activeDrillDownClusterId);

  return (
    <div className="relative w-full h-full bg-[#F7F8F5] flex flex-col min-h-0 select-none">
      {/* Top Header: Architecture Cluster Controls & Filter */}
      <div className="p-3 bg-white border-b border-[#E4E7E1] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
        {activeDrillDownClusterId && currentDrillDownCluster ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-all font-semibold text-xs shadow-sm hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C7F36B]" />
              <span>{t('graph.back_to_clusters')}</span>
              <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                Esc
              </kbd>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#151923]">
                {currentDrillDownCluster.name}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EDF0F7] text-[#526BEE] border border-blue-200">
                {layoutResult.drillDownInfo?.internalCount ?? currentDrillDownCluster.files.length}{' '}
                {t('graph.internal_files')}
              </span>
              {layoutResult.drillDownInfo &&
                layoutResult.drillDownInfo.upstreamCount + layoutResult.drillDownInfo.downstreamCount > 0 && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {layoutResult.drillDownInfo.upstreamCount + layoutResult.drillDownInfo.downstreamCount}{' '}
                    {t('graph.related_files')}
                  </span>
                )}
            </div>

            {/* Quick Switcher dropdown (Custom Brand Kit v2 Dropdown) */}
            <ClusterSelectorDropdown
              clusters={layoutResult.clusters}
              activeClusterId={activeDrillDownClusterId}
              onSelectCluster={(clusterId) => {
                setActiveDrillDownClusterId(clusterId);
                setDrillDownSearch('');
                setLayoutRevision((r) => r + 1);
                setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100);
              }}
            />

            {/* In-Cluster Fast File Search (Handles 100+ files gracefully) */}
            <div className="relative flex items-center ml-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={drillDownSearch}
                onChange={(e) => {
                  setDrillDownSearch(e.target.value);
                  setLayoutRevision((r) => r + 1);
                }}
                placeholder={t('graph.search_files')}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-7 py-1 w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-[#526BEE] focus:bg-white text-[#151923] placeholder-slate-400 transition-all"
              />
              {drillDownSearch && (
                <button
                  onClick={() => {
                    setDrillDownSearch('');
                    setLayoutRevision((r) => r + 1);
                  }}
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div id="tour-graph-layer-filter" className="flex items-center gap-2 flex-wrap">
            {/* Architecture Cluster Overview Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-[#151923]">
              <Box className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>{t('graph.view_clusters')} ({layoutResult.clusters.length})</span>
            </div>

            {/* Layer Filter */}
            <div className="flex items-center gap-1 border-l border-[#E4E7E1] pl-2 ml-1">
              <div className="flex items-center gap-1 pr-1 text-[#8B929E] text-xs font-semibold">
                <Filter className="w-3 h-3 text-[#526BEE]" />
              </div>
              {layers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelectLayer(l.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedLayer === l.id
                      ? 'bg-[#151923] text-white shadow-xs'
                      : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Focus Subgraph Toggle */}
            {impactedCount > 0 && (
              <div className="border-l border-[#E4E7E1] pl-2 ml-1">
                <button
                  onClick={onToggleFocusSubgraph}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                    focusSubgraph
                      ? 'bg-[#C7F36B] text-[#151923] border-[#151923]'
                      : 'bg-white text-[#151923] border-[#E4E7E1] hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-[#526BEE]" />
                  <span>
                    {t('graph.focus_impact')} ({impactedCount})
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3.5 text-xs text-[#8B929E] border-l border-[#E4E7E1] pl-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7F36B] ring-2 ring-[#C7F36B]/40" />
            <span className="text-[#151923] font-medium text-[11px]">{t('graph.trigger_node')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#526BEE] ring-2 ring-[#526BEE]/40" />
            <span className="text-[#151923] font-medium text-[11px]">{t('graph.affected_path')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
            <span className="text-[11px]">{t('graph.unchanged')}</span>
          </div>
        </div>
      </div>

      {/* Floating Node Exploration Toolbar (Requirement 6) */}
      {selectedNode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md border border-[#E4E7E1] rounded-2xl shadow-xl px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#526BEE]" />
            <span className="text-xs font-bold text-[#151923] max-w-[200px] truncate" title={(selectedNode.data as any)?.path}>
              {(selectedNode.data as any)?.label}
            </span>
          </div>

          <div className="w-[1px] h-4 bg-[#E4E7E1]" />

          {/* Focus Neighborhood */}
          <button
            onClick={() => setFocusFilterMode(focusFilterMode === 'neighborhood' ? 'none' : 'neighborhood')}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              focusFilterMode === 'neighborhood'
                ? 'bg-[#151923] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>{t('graph.focus_node')}</span>
          </button>

          {/* Dependencies Button */}
          <button
            onClick={() => setFocusFilterMode(focusFilterMode === 'dependencies' ? 'none' : 'dependencies')}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              focusFilterMode === 'dependencies'
                ? 'bg-[#526BEE] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{t('graph.show_dependencies')} ({selectedNodeNeighborhood.dependencies.size})</span>
          </button>

          {/* Dependents Button */}
          <button
            onClick={() => setFocusFilterMode(focusFilterMode === 'dependents' ? 'none' : 'dependents')}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              focusFilterMode === 'dependents'
                ? 'bg-[#526BEE] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{t('graph.show_dependents')} ({selectedNodeNeighborhood.dependents.size})</span>
          </button>

          {/* Clear Selection */}
          <button
            onClick={() => {
              setSelectedNodeId(null);
              setFocusFilterMode('none');
            }}
            className="p-1 hover:bg-slate-100 rounded-lg text-[#8B929E] hover:text-[#151923] transition-colors"
            title={t('graph.clear_focus')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main ReactFlow Canvas with fixed non-scaling background */}
      <div id="tour-graph-canvas" className="w-full h-full flex-1 min-h-[400px] relative bg-[#F7F8F5]">
        <ReactFlow
          key={`rf-${selectedLayer}-${focusSubgraph}`}
          nodes={finalDisplayNodes}
          edges={styledEdges}
          onNodesChange={handleInternalNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleInternalNodeClick}
          onNodeMouseEnter={(_e, node) => {
            if (node?.id) setHoveredNodeId(node.id);
          }}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          onEdgeMouseEnter={(_e, edge) => {
            if (edge?.id) setHoveredEdgeId(edge.id);
          }}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ minZoom: 0.75, maxZoom: 1.05, padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2.0}
          onlyRenderVisibleElements={true}
          elevateNodesOnSelect={false}
          defaultEdgeOptions={{
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: '#526BEE',
            },
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={[0, 1, 2]}
          panOnScroll={true}
          panOnScrollSpeed={1.8}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomActivationKeyCode={['Meta', 'Control']}
          zoomOnPinch={true}
          preventScrolling={true}
        >
          {/* Fixed Non-Zooming Background Grid that pans smoothly with the canvas */}
          <CanvasBackgroundLayer gridMode={gridMode} />

          {/* Minimap (Requirement 7) */}
          <MiniMap
            nodeStrokeColor="#526BEE"
            nodeColor="#CBD5E1"
            nodeBorderRadius={6}
            maskColor="rgba(247, 248, 245, 0.7)"
            className="!rounded-2xl !border !border-[#E4E7E1] !shadow-md !bg-white/95 !m-4 !mb-4 hidden md:block"
          />

          {/* Floating Bottom Toolbar Dock */}
          <CanvasFloatingDock
            layoutMode={layoutMode}
            onSelectLayout={handleSelectLayout}
            onAutoLayout={handleAutoLayout}
            gridMode={gridMode}
            onToggleGrid={handleToggleGrid}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export const GraphCanvas: React.FC<GraphCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
