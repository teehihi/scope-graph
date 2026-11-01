import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, getBezierPath } from '@xyflow/react';
import { ArrowRight } from 'lucide-react';

export const ClusterDependencyEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
  interactionWidth = 24,
}) => {
  const opacity = style?.opacity !== undefined ? Number(style.opacity) : 1;
  const isHidden = opacity <= 0.05 || style?.display === 'none';

  if (isHidden) {
    return null;
  }

  const isClusterOverview = Boolean((data as any)?.isClusterOverview || id.startsWith('cluster-'));

  const [edgePath, labelX, labelY] = isClusterOverview
    ? getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.25,
      })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 20,
        offset: 24,
      });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeDasharray: '8 6',
          animation: 'flowDash 0.8s linear infinite',
        }}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs border border-slate-300 shadow-sm text-[10px] font-mono font-bold text-[#151923] hover:border-[#526BEE] hover:text-[#526BEE] hover:shadow-md hover:scale-105 transition-all select-none"
          >
            <ArrowRight className="w-3 h-3 text-[#526BEE] shrink-0" />
            <span className="truncate max-w-[150px]">{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

ClusterDependencyEdge.displayName = 'ClusterDependencyEdge';
