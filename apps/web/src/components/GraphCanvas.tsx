import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
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
  // Filter nodes by selected layer
  const filteredNodes = useMemo(() => {
    if (selectedLayer === 'all') return nodes;
    return nodes.filter((n) => n.data.layer === selectedLayer);
  }, [nodes, selectedLayer]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
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
    <div className="relative w-full h-full bg-slate-50 flex flex-col min-h-0">
      {/* Top Filter Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 pl-2 pr-1 text-slate-600 text-xs font-medium">
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filter:</span>
        </div>
        <div className="flex items-center gap-1">
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectLayer(l.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedLayer === l.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Focus Subgraph Toggle */}
        {impactedCount > 0 && (
          <div className="border-l border-slate-200 pl-2 ml-1">
            <button
              onClick={onToggleFocusSubgraph}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                focusSubgraph
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Focus Impact ({impactedCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Legend Badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur p-2.5 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1.5 pointer-events-none">
        <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">Legend</div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
          <span>Direct Impact (Must Modify)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
          <span>Indirect Impact (Downstream/Callers)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span>Verified Repository Dependency</span>
        </div>
      </div>

      {/* Main Flow Canvas with explicit height */}
      <div className="w-full h-full flex-1 min-h-[400px]">
        <ReactFlow
          key={`rf-${filteredNodes.length}-${impactedCount}`}
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="!bg-white !border-slate-200 !rounded-xl !shadow-sm overflow-hidden" />
          <MiniMap
            className="!bg-white !border-slate-200 !rounded-xl !shadow-sm overflow-hidden"
            nodeColor={(node) => {
              const nd = node.data as unknown as { impact_status?: string };
              if (nd?.impact_status === 'direct') return '#f43f5e';
              if (nd?.impact_status === 'indirect') return '#f59e0b';
              return '#cbd5e1';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};
