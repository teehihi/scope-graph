import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ScopeNode } from './ScopeNode';
import { Eye, Layers } from 'lucide-react';
import { LayerType } from '../types';

interface GraphCanvasProps {
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
};

// Layer hierarchy order: API (0) -> Service (1) -> Model (2) -> Core (3) -> Tests (4)
const LAYER_ORDER: Record<string, number> = {
  api: 0,
  service: 1,
  model: 2,
  core: 3,
  test: 4,
  module: 1,
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  selectedLayer,
  onSelectLayer,
  focusSubgraph,
  onToggleFocusSubgraph,
  impactedCount,
}) => {
  // Layered Layout calculation (Dagre-style left-to-right columns)
  const layeredNodes = useMemo(() => {
    // 1. Filter by layer if selected
    const activeNodes =
      selectedLayer === 'all'
        ? nodes
        : nodes.filter((n) => (n.data as any).layer === selectedLayer);

    // 2. Bucket nodes into columns
    const columns: Record<number, Node[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    activeNodes.forEach((n) => {
      const layer = (n.data as any).layer || 'module';
      const col = LAYER_ORDER[layer] ?? 1;
      columns[col].push(n);
    });

    const COL_WIDTH = 360;
    const START_X = 60;
    const START_Y = 80;
    const ROW_GAP = 180;

    return activeNodes.map((n) => {
      const layer = (n.data as any).layer || 'module';
      const colIndex = LAYER_ORDER[layer] ?? 1;
      const rowIndex = columns[colIndex].findIndex((item) => item.id === n.id);

      return {
        ...n,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: {
          x: START_X + colIndex * COL_WIDTH,
          y: START_Y + (rowIndex >= 0 ? rowIndex : 0) * ROW_GAP,
        },
      };
    });
  }, [nodes, selectedLayer]);

  const visibleNodeIds = useMemo(
    () => new Set(layeredNodes.map((n) => n.id)),
    [layeredNodes]
  );

  // Clean smoothstep edges with label pills and high z-index handles
  const styledEdges = useMemo(() => {
    return edges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => {
        const isTrigger = (e as any).is_impact || e.animated;
        return {
          ...e,
          type: 'smoothstep',
          animated: isTrigger,
          style: {
            stroke: isTrigger ? '#526BEE' : '#CBD5E1',
            strokeWidth: isTrigger ? 2.5 : 1.5,
          },
          labelStyle: {
            fill: '#151923',
            fontWeight: 600,
            fontSize: 10,
            fontFamily: 'monospace',
          },
          labelBgStyle: {
            fill: '#FFFFFF',
            rx: 4,
            ry: 4,
            stroke: '#E4E7E1',
            strokeWidth: 1,
          },
          labelBgPadding: [4, 6] as [number, number],
        };
      });
  }, [edges, visibleNodeIds]);

  const layers: Array<{ id: LayerType | 'all'; label: string }> = [
    { id: 'all', label: 'All Layers' },
    { id: 'api', label: 'API Routes' },
    { id: 'service', label: 'Services' },
    { id: 'model', label: 'Data Models' },
    { id: 'test', label: 'Tests' },
    { id: 'core', label: 'Core / Security' },
  ];

  return (
    <div className="relative w-full h-full bg-[#F7F8F5] flex flex-col min-h-0">
      {/* Top Toolbar (Filters + Legend combined, zero overlap) */}
      <div className="p-3 bg-white border-b border-[#E4E7E1] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 shadow-sm">
        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 pr-1 text-[#8B929E] text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>Filter:</span>
          </div>
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectLayer(l.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedLayer === l.id
                  ? 'bg-[#151923] text-white shadow-sm'
                  : 'text-[#8B929E] hover:text-[#151923] hover:bg-slate-100'
              }`}
            >
              {l.label}
            </button>
          ))}

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
                <span>Focus Impact ({impactedCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Legend in Toolbar */}
        <div className="flex items-center gap-3.5 text-xs text-[#8B929E] border-l border-[#E4E7E1] pl-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7F36B] ring-2 ring-[#C7F36B]/40" />
            <span className="text-[#151923] font-medium text-[11px]">Trigger Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#526BEE] ring-2 ring-[#526BEE]/40" />
            <span className="text-[#151923] font-medium text-[11px]">Affected Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
            <span className="text-[11px]">Unchanged</span>
          </div>
        </div>
      </div>

      {/* Main ReactFlow Canvas */}
      <div className="w-full h-full flex-1 min-h-[400px]">
        <ReactFlow
          key={`rf-${layeredNodes.length}-${impactedCount}`}
          nodes={layeredNodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#E4E7E1" gap={24} size={1} />
          <Controls className="!bg-white !border-[#E4E7E1] !rounded-xl !shadow-sm overflow-hidden" />
          {/* Note: Unstyled MiniMap removed to eliminate the empty grey skeleton panel */}
        </ReactFlow>
      </div>
    </div>
  );
};
