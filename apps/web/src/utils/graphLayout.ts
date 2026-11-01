import { Node, Edge, Position, MarkerType } from '@xyflow/react';
import { LayerType, NodeData } from '../types';

export interface ArchitectureCluster {
  id: string;
  name: string;
  layer: LayerType;
  description: string;
  files: Node[];
  width: number;
  height: number;
  x: number;
  y: number;
}

const CLUSTER_CANONICAL_LAYERS: Record<string, LayerType> = {
  api_layer: 'api',
  mcp_gateway: 'api',
  services_layer: 'service',
  analysis_engine: 'service',
  ai_inference: 'service',
  indexing_ast: 'core',
  database_layer: 'model',
  core_infrastructure: 'core',
  background_jobs: 'core',
  test_suites: 'test',
};

const LAYER_TIERS: Record<string, number> = {
  // Tier 0: Ingress & Gateway (Top)
  api_layer: 0,
  mcp_gateway: 0,
  api: 0,

  // Tier 1: Domain & Intelligence Engine (Middle-Top)
  services_layer: 1,
  analysis_engine: 1,
  ai_inference: 1,
  service: 1,

  // Tier 2: Storage, Parsing & Infrastructure (Middle-Bottom)
  database_layer: 2,
  indexing_ast: 2,
  core_infrastructure: 2,
  model: 2,
  core: 2,
  module: 2,
  domain_module: 2,

  // Tier 3: Background Worker & Verification (Bottom)
  background_jobs: 3,
  test_suites: 3,
  test: 3,
};

/**
 * Categorize repository files into architectural clusters
 */
export function buildArchitectureClusters(
  nodes: Node[],
  expandedClusterIds: Set<string>
): ArchitectureCluster[] {
  const clusterMap: Record<string, { name: string; layer: LayerType; files: Node[] }> = {};

  nodes.forEach((n) => {
    const data = n.data as unknown as NodeData;
    const path = (data.path || '').toLowerCase();
    const layer = data.layer || 'module';

    let clusterId: string = layer;
    let clusterName = 'Module Subsystem';

    if (path.includes('/analysis/') || path.includes('/evidence/') || path.includes('/graph/')) {
      clusterId = 'analysis_engine';
      clusterName = 'Analysis & Graph Engine';
    } else if (path.includes('/indexing/') || path.includes('/parser/') || path.includes('/scanner/')) {
      clusterId = 'indexing_ast';
      clusterName = 'Code Parser & AST';
    } else if (path.includes('/ai/') || path.includes('/provider/')) {
      clusterId = 'ai_inference';
      clusterName = 'AI Reasoning Engine';
    } else if (path.includes('/jobs/') || path.includes('/worker/') || path.includes('/tasks/')) {
      clusterId = 'background_jobs';
      clusterName = 'Task Queue & Worker';
    } else if (path.includes('/mcp/')) {
      clusterId = 'mcp_gateway';
      clusterName = 'MCP Agent Gateway';
    } else if (layer === 'api' || path.includes('/api/') || path.includes('/routes/')) {
      clusterId = 'api_layer';
      clusterName = 'API & Endpoints';
    } else if (layer === 'service' || path.includes('/services/')) {
      clusterId = 'services_layer';
      clusterName = 'Domain Services';
    } else if (layer === 'model' || path.includes('/models/') || path.includes('/db/')) {
      clusterId = 'database_layer';
      clusterName = 'Data Models & Storage';
    } else if (layer === 'core' || path.includes('/core/') || path.includes('/config/')) {
      clusterId = 'core_infrastructure';
      clusterName = 'Core & Security';
    } else if (layer === 'test' || path.includes('/tests/') || path.includes('test_')) {
      clusterId = 'test_suites';
      clusterName = 'Test Suites & Verification';
    } else {
      clusterId = `domain_${layer}`;
      clusterName = `${layer.toUpperCase()} Domain`;
    }

    const canonicalLayer: LayerType = CLUSTER_CANONICAL_LAYERS[clusterId] || (layer as LayerType) || 'module';

    if (!clusterMap[clusterId]) {
      clusterMap[clusterId] = {
        name: clusterName,
        layer: canonicalLayer,
        files: [],
      };
    }

    clusterMap[clusterId].files.push(n);
  });

  return Object.entries(clusterMap).map(([id, info]) => {
    const isExpanded = expandedClusterIds.has(id);
    const count = info.files.length;

    let width = 320;
    let height = 210;

    if (isExpanded) {
      const cols = count <= 2 ? 1 : count <= 6 ? 2 : 3;
      const rows = Math.ceil(count / cols);
      width = Math.max(380, 50 + cols * 340);
      height = 95 + rows * 310 + 40;
    }

    return {
      id,
      name: info.name,
      layer: info.layer,
      description: `${info.name} (${count} files)`,
      files: info.files,
      width,
      height,
      x: 0,
      y: 0,
    };
  });
}

export interface ComputedGraphLayout {
  nodes: Node[];
  edges: Edge[];
  clusters: ArchitectureCluster[];
  drillDownInfo?: {
    activeCluster: ArchitectureCluster;
    upstreamCount: number;
    internalCount: number;
    downstreamCount: number;
  };
}

/**
 * Dedicated Hierarchical Layout Engine with Cluster Boundaries and Edge Aggregation
 */
export function computeHierarchicalClusterLayout(
  rawNodes: Node[],
  rawEdges: Edge[],
  expandedClusterIds: Set<string>,
  t: (key: string) => string
): ComputedGraphLayout {
  // 1. Build clusters
  const clusters = buildArchitectureClusters(rawNodes, expandedClusterIds);

  // Quick lookup map: file_id -> cluster_id
  const fileToClusterId = new Map<string, string>();
  clusters.forEach((c) => {
    c.files.forEach((f) => fileToClusterId.set(f.id, c.id));
  });

  // 2. Assign clusters to tier rows (Top-to-Bottom Architecture Grid)
  const tierRows: Record<number, ArchitectureCluster[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  const clusterLookup = new Map<string, ArchitectureCluster>();
  clusters.forEach((c) => {
    clusterLookup.set(c.id, c);
    const tier = LAYER_TIERS[c.id] ?? LAYER_TIERS[c.layer] ?? 1;
    tierRows[tier] = tierRows[tier] || [];
    tierRows[tier].push(c);
  });

  // Sort clusters inside each tier row cleanly by file count
  Object.values(tierRows).forEach((row) => {
    row.sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));
  });

  // 3. Layout Cluster Containers in a Balanced 4-Tier Centered Grid
  const GAP_X = 60;
  const GAP_Y = 100;
  const START_X = 60;
  const START_Y = 60;

  // Calculate max row width to center all tiers horizontally
  let maxRowWidth = 0;
  [0, 1, 2, 3].forEach((tier) => {
    const row = tierRows[tier] || [];
    if (row.length === 0) return;
    const totalW = row.reduce((sum, c) => sum + c.width, 0) + (row.length - 1) * GAP_X;
    if (totalW > maxRowWidth) maxRowWidth = totalW;
  });

  // Position each cluster in the global coordinate space
  let currentY = START_Y;
  [0, 1, 2, 3].forEach((tier) => {
    const row = tierRows[tier] || [];
    if (row.length === 0) return;

    const rowTotalWidth = row.reduce((sum, c) => sum + c.width, 0) + (row.length - 1) * GAP_X;
    const rowStartX = START_X + Math.max(0, (maxRowWidth - rowTotalWidth) / 2);

    let curX = rowStartX;
    let maxRowH = 0;

    row.forEach((c) => {
      c.x = curX;
      c.y = currentY;
      curX += c.width + GAP_X;
      if (c.height > maxRowH) maxRowH = c.height;
    });

    currentY += maxRowH + GAP_Y;
  });

  // 4. Generate Renderable Nodes
  const renderNodes: Node[] = [];

  clusters.forEach((c) => {
    const isExpanded = expandedClusterIds.has(c.id);

    if (!isExpanded) {
      // Collapsed Cluster Node: Single compact card with inter-cluster handles
      let totalImpact = 0;
      c.files.forEach((f) => {
        const d = f.data as unknown as NodeData;
        if (d.impact_status === 'direct' || d.impact_status === 'indirect') totalImpact++;
      });

      renderNodes.push({
        id: `cluster-${c.id}`,
        type: 'clusterNode',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { x: c.x, y: c.y },
        data: {
          clusterId: c.id,
          name: c.name,
          layer: c.layer,
          fileCount: c.files.length,
          symbolCount: c.files.reduce((acc, f) => acc + ((f.data as any).symbol_count || 0), 0),
          previewFiles: c.files.slice(0, 3).map((f) => (f.data as any).label || f.id),
          impactCount: totalImpact,
          isExpanded: false,
        } as any,
      });
    } else {
      // Expanded Cluster Node: Visual Container Boundary + Inner Files
      renderNodes.push({
        id: `cluster-${c.id}`,
        type: 'clusterContainer',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { x: c.x, y: c.y },
        style: {
          width: c.width,
          height: c.height,
          zIndex: 0,
        },
        data: {
          clusterId: c.id,
          name: c.name,
          layer: c.layer,
          fileCount: c.files.length,
          symbolCount: c.files.reduce((acc, f) => acc + ((f.data as any).symbol_count || 0), 0),
          impactCount: c.files.filter((f) => (f.data as any).impact_status !== 'none').length,
          isExpanded: true,
        } as any,
      });

      // Layout inner files neatly inside the container with spacious padding
      const count = c.files.length;
      const cols = count <= 2 ? 1 : count <= 6 ? 2 : 3;

      c.files.forEach((f, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const innerX = c.x + 36 + col * 340;
        const innerY = c.y + 85 + row * 310;

        renderNodes.push({
          ...f,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: { x: innerX, y: innerY },
          style: {
            zIndex: 10,
          },
        });
      });
    }
  });

  // 5. Generate Edges: Clean Inter-Cluster Aggregated Edges + Direct Intra/Cross Cluster Edges
  const renderEdges: Edge[] = [];
  const interClusterEdges = new Map<
    string,
    { count: number; source: string; target: string; srcClusterId: string; tgtClusterId: string }
  >();

  rawEdges.forEach((e) => {
    const srcClusterId = fileToClusterId.get(e.source);
    const tgtClusterId = fileToClusterId.get(e.target);

    if (!srcClusterId || !tgtClusterId) return;

    const isSrcExpanded = expandedClusterIds.has(srcClusterId);
    const isTgtExpanded = expandedClusterIds.has(tgtClusterId);

    if (srcClusterId === tgtClusterId) {
      // Intra-cluster edge: ONLY render if this cluster is currently expanded!
      if (isSrcExpanded) {
        const isImpact = (e as any).is_impact || e.animated;
        renderEdges.push({
          ...e,
          type: 'default',
          animated: isImpact,
          style: {
            stroke: isImpact ? '#526BEE' : '#94A3B8',
            strokeWidth: isImpact ? 2.5 : 1.5,
          },
        });
      }
    } else {
      // Cross-cluster edge:
      // If BOTH clusters are expanded, render direct file-to-file connection!
      // If either cluster is collapsed, aggregate into a clean high-level cluster connector.
      if (isSrcExpanded && isTgtExpanded) {
        const isImpact = (e as any).is_impact || e.animated;
        renderEdges.push({
          ...e,
          type: 'default',
          animated: isImpact,
          style: {
            stroke: isImpact ? '#526BEE' : '#94A3B8',
            strokeWidth: isImpact ? 2.5 : 1.5,
          },
        });
      } else {
        const edgeKey = `cluster-${srcClusterId}->cluster-${tgtClusterId}`;
        const existing = interClusterEdges.get(edgeKey);
        if (existing) {
          existing.count += 1;
        } else {
          interClusterEdges.set(edgeKey, {
            count: 1,
            source: `cluster-${srcClusterId}`,
            target: `cluster-${tgtClusterId}`,
            srcClusterId,
            tgtClusterId,
          });
        }
      }
    }
  });

  // Emit aggregated inter-cluster edges with clean labels and distributed ports
  interClusterEdges.forEach((item, edgeKey) => {
    const srcTier = LAYER_TIERS[item.srcClusterId] ?? 1;
    const tgtTier = LAYER_TIERS[item.tgtClusterId] ?? 1;

    let sourceHandle = 'bottom';
    let targetHandle = 'top';

    const srcC = clusterLookup.get(item.srcClusterId);
    const tgtC = clusterLookup.get(item.tgtClusterId);

    if (tgtTier > srcTier) {
      if (srcC && tgtC) {
        if (tgtC.x > srcC.x + 80) {
          sourceHandle = 'bottom-right';
          targetHandle = 'top-left';
        } else if (tgtC.x < srcC.x - 80) {
          sourceHandle = 'bottom-left';
          targetHandle = 'top-right';
        } else {
          sourceHandle = 'bottom';
          targetHandle = 'top';
        }
      }
    } else if (tgtTier < srcTier) {
      if (srcC && tgtC) {
        if (tgtC.x > srcC.x + 80) {
          sourceHandle = 'top-right-src';
          targetHandle = 'bottom-left-tgt';
        } else if (tgtC.x < srcC.x - 80) {
          sourceHandle = 'top-left-src';
          targetHandle = 'bottom-right-tgt';
        } else {
          sourceHandle = 'top-src';
          targetHandle = 'bottom-tgt';
        }
      } else {
        sourceHandle = 'top-src';
        targetHandle = 'bottom-tgt';
      }
    } else {
      if (srcC && tgtC && tgtC.x > srcC.x) {
        sourceHandle = 'right';
        targetHandle = 'left';
      } else {
        sourceHandle = 'left-src';
        targetHandle = 'right-tgt';
      }
    }

    renderEdges.push({
      id: edgeKey,
      source: item.source,
      target: item.target,
      sourceHandle,
      targetHandle,
      type: 'clusterEdge',
      animated: true,
      label: `${item.count} ${t('graph.dependencies_count')}`,
      data: {
        isClusterOverview: true,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#526BEE',
      },
      style: {
        stroke: '#526BEE',
        strokeWidth: Math.min(2.5, 1.6 + item.count * 0.15),
      },
    });
  });

  return {
    nodes: renderNodes,
    edges: renderEdges,
    clusters,
  };
}

/**
 * Accurately estimates a ScopeNode card height based on actual symbol counts
 * to ensure 100% collision-free layout with clean vertical breathing room.
 */
export function estimateNodeHeight(node: Node, isExternalRelated = false): number {
  const data = (node.data || {}) as any;
  const symbols = data.symbols || [];
  const displayCount = Math.min(symbols.length, 5);
  const hasRemaining = (data.symbol_count || 0) > displayCount;

  // 1. Top banner: 42px
  let height = 42;

  // 2. External relation role ribbon (if present): 26px
  if (isExternalRelated) {
    height += 26;
  }

  // 3. Field / symbol list rows
  if (displayCount > 0) {
    height += displayCount * 30; // 30px per symbol row
    if (hasRemaining) {
      height += 26; // "+N symbols" badge row
    }
  } else {
    height += 36; // Empty file path placeholder
  }

  // 4. Footer info bar: 30px
  height += 30;

  return height;
}

/**
 * Focused Cluster Drill-Down Layout Engine:
 * Displays all internal files of the selected cluster + directly connected upstream callers & downstream dependencies.
 * Organized in a clean 3-Stage Pipeline (Upstream Callers -> Internal Components -> Downstream Dependencies).
 */
export function computeClusterDrillDownLayout(
  rawNodes: Node[],
  rawEdges: Edge[],
  activeClusterId: string,
  t: (key: string) => string
): ComputedGraphLayout {
  // 1. Build all clusters
  const clusters = buildArchitectureClusters(rawNodes, new Set());
  const activeCluster = clusters.find((c) => c.id === activeClusterId);

  if (!activeCluster) {
    return computeHierarchicalClusterLayout(rawNodes, rawEdges, new Set(), t);
  }

  const internalFiles = activeCluster.files;
  const internalFileIdSet = new Set(internalFiles.map((f) => f.id));

  // 2. Discover Upstream (Callers) and Downstream (Dependencies)
  const upstreamFileIds = new Set<string>();
  const downstreamFileIds = new Set<string>();

  rawEdges.forEach((e) => {
    if (internalFileIdSet.has(e.target) && !internalFileIdSet.has(e.source)) {
      upstreamFileIds.add(e.source);
    }
    if (internalFileIdSet.has(e.source) && !internalFileIdSet.has(e.target)) {
      downstreamFileIds.add(e.target);
    }
  });

  const nodeLookup = new Map<string, Node>();
  rawNodes.forEach((n) => nodeLookup.set(n.id, n));

  const upstreamNodes: Node[] = [];
  upstreamFileIds.forEach((id) => {
    const n = nodeLookup.get(id);
    if (n) upstreamNodes.push(n);
  });

  const downstreamNodes: Node[] = [];
  downstreamFileIds.forEach((id) => {
    const n = nodeLookup.get(id);
    if (n) downstreamNodes.push(n);
  });

  // 3. Spacious, non-overlapping multi-column layout
  const CARD_WIDTH = 288; // Matches w-72 (18rem) of ScopeNode
  const INNER_GAP_X = 120; // 120px channel for smooth step routing + 75px edge pills with 22.5px clear margin
  const CARD_GAP_Y = 52; // Guaranteed 52px vertical clearance between cards in each column
  const SECTION_GAP_X = 180; // 180px gap between architectural stages
  const START_Y = 80;

  const hasUpstream = upstreamNodes.length > 0;
  const hasDownstream = downstreamNodes.length > 0;

  // Upstream callers columns (1 or 2 cols if > 6)
  const upCols = upstreamNodes.length > 6 ? 2 : 1;
  const upWidth = hasUpstream ? upCols * CARD_WIDTH + (upCols - 1) * INNER_GAP_X : 0;

  // Target cluster internal files columns
  const clusterCols =
    internalFiles.length <= 3
      ? 1
      : internalFiles.length <= 8
      ? 2
      : internalFiles.length <= 24
      ? 3
      : 4;
  const clusterWidth = clusterCols * CARD_WIDTH + (clusterCols - 1) * INNER_GAP_X;

  // Downstream dependencies columns (1 or 2 cols if > 6)
  const downCols = downstreamNodes.length > 6 ? 2 : 1;

  let currentX = 60;
  const renderNodes: Node[] = [];
  const nodePositions = new Map<string, { x: number; y: number }>();

  // --- Section 1: Upstream Callers ---
  if (hasUpstream) {
    const upColHeights = new Array(upCols).fill(START_Y);

    upstreamNodes.forEach((n, idx) => {
      const col = idx % upCols;
      const x = currentX + col * (CARD_WIDTH + INNER_GAP_X);
      const y = upColHeights[col];
      const h = estimateNodeHeight(n, true);
      upColHeights[col] += h + CARD_GAP_Y;

      nodePositions.set(n.id, { x, y });

      renderNodes.push({
        ...n,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { x, y },
        data: {
          ...n.data,
          isExternalRelated: true,
          relationRole: 'upstream',
        },
      });
    });

    currentX += upWidth + SECTION_GAP_X;
  }

  // --- Section 2: Target Cluster Files (Center Stage) ---
  const clusterStartX = currentX;
  const clusterColHeights = new Array(clusterCols).fill(START_Y);

  internalFiles.forEach((n, idx) => {
    const col = idx % clusterCols;
    const x = clusterStartX + col * (CARD_WIDTH + INNER_GAP_X);
    const y = clusterColHeights[col];
    const h = estimateNodeHeight(n, false);
    clusterColHeights[col] += h + CARD_GAP_Y;

    nodePositions.set(n.id, { x, y });

    renderNodes.push({
      ...n,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: { x, y },
      data: {
        ...n.data,
        isInternalClusterFile: true,
        isExternalRelated: false,
      },
    });
  });

  currentX += clusterWidth + SECTION_GAP_X;

  // --- Section 3: Downstream Dependencies ---
  if (hasDownstream) {
    const downColHeights = new Array(downCols).fill(START_Y);

    downstreamNodes.forEach((n, idx) => {
      const col = idx % downCols;
      const x = currentX + col * (CARD_WIDTH + INNER_GAP_X);
      const y = downColHeights[col];
      const h = estimateNodeHeight(n, true);
      downColHeights[col] += h + CARD_GAP_Y;

      nodePositions.set(n.id, { x, y });

      renderNodes.push({
        ...n,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { x, y },
        data: {
          ...n.data,
          isExternalRelated: true,
          relationRole: 'downstream',
        },
      });
    });
  }

  // 4. Edges with deduplication and directional handle routing
  const visibleFileIds = new Set([
    ...internalFileIdSet,
    ...upstreamFileIds,
    ...downstreamFileIds,
  ]);

  interface AggregatedEdgeInfo {
    source: string;
    target: string;
    callCount: number;
    importCount: number;
    hasImpact: boolean;
    evidenceEdges: any[];
  }

  const edgeMap = new Map<string, AggregatedEdgeInfo>();

  rawEdges.forEach((e) => {
    if (visibleFileIds.has(e.source) && visibleFileIds.has(e.target)) {
      const isSrcInternal = internalFileIdSet.has(e.source);
      const isTgtInternal = internalFileIdSet.has(e.target);

      // Only display edges where at least one node is an internal file of this cluster
      if (isSrcInternal || isTgtInternal) {
        const key = `${e.source}->${e.target}`;
        const existing = edgeMap.get(key);
        const edgeType = (e.label || (e.data as any)?.edge_type || '').toLowerCase();
        const isImpact = (e as any).is_impact || e.animated || false;
        const evidence = (e.data as any)?.evidence_edges || [];

        if (existing) {
          if (edgeType.includes('call')) existing.callCount++;
          else if (edgeType.includes('import')) existing.importCount++;
          else existing.callCount++;
          if (isImpact) existing.hasImpact = true;
          existing.evidenceEdges.push(...evidence);
        } else {
          edgeMap.set(key, {
            source: e.source,
            target: e.target,
            callCount: edgeType.includes('import') ? 0 : 1,
            importCount: edgeType.includes('import') ? 1 : 0,
            hasImpact: isImpact,
            evidenceEdges: [...evidence],
          });
        }
      }
    }
  });

  const renderEdges: Edge[] = [];

  edgeMap.forEach((info, key) => {
    const srcPos = nodePositions.get(info.source);
    const tgtPos = nodePositions.get(info.target);

    let sourceHandle = 'right';
    let targetHandle = 'left';

    if (srcPos && tgtPos) {
      const dx = tgtPos.x - srcPos.x;
      const dy = tgtPos.y - srcPos.y;

      if (Math.abs(dx) >= CARD_WIDTH * 0.7) {
        // Horizontal connection between different columns
        if (dx > 0) {
          sourceHandle = 'right';
          targetHandle = 'left';
        } else {
          sourceHandle = 'left-src';
          targetHandle = 'right-tgt';
        }
      } else {
        // Vertical connection within the same column
        if (dy > 0) {
          sourceHandle = 'bottom';
          targetHandle = 'top';
        } else {
          sourceHandle = 'top-src';
          targetHandle = 'bottom-tgt';
        }
      }
    }

    // Build clear, concise label
    let edgeLabel = '';
    if (info.callCount > 0 && info.importCount > 0) {
      edgeLabel = 'calls & imports';
    } else if (info.callCount > 0) {
      edgeLabel = info.callCount > 1 ? `calls (${info.callCount})` : 'calls';
    } else if (info.importCount > 0) {
      edgeLabel = info.importCount > 1 ? `imports (${info.importCount})` : 'imports';
    }

    renderEdges.push({
      id: `edge-${key}`,
      source: info.source,
      target: info.target,
      sourceHandle,
      targetHandle,
      type: 'clusterEdge',
      animated: true,
      label: edgeLabel,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#526BEE',
      },
      data: {
        evidence_edges: info.evidenceEdges,
      },
      style: {
        stroke: '#526BEE',
        strokeWidth: info.hasImpact ? 3.5 : Math.min(3, 1.8 + (info.callCount + info.importCount - 1) * 0.3),
      },
    });
  });

  return {
    nodes: renderNodes,
    edges: renderEdges,
    clusters,
    drillDownInfo: {
      activeCluster,
      upstreamCount: upstreamNodes.length,
      internalCount: internalFiles.length,
      downstreamCount: downstreamNodes.length,
    },
  };
}
