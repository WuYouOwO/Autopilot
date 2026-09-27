import React, { useState } from 'react';
import { DiagnosticInspectorModal } from './DiagnosticInspectorModal';

interface TopologyHUDProps {
  topology: any;
  onToggleIntent: (nodeId: string, currentIntent: string) => void;
  onRevoke: (nodeId: string) => void;
}

export const TopologyHUD: React.FC<TopologyHUDProps> = ({
  topology,
  onToggleIntent,
  onRevoke
}) => {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  if (!topology || !topology.nodes) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 font-mono text-sm">
        正在渲染几何 HUD 拓扑...
      </div>
    );
  }

  // Layout dimensions
  const width = 800;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 170;

  const subnetNode = topology.nodes.find((n: any) => n.shape === 'DIAMOND') || {
    id: 'subnet_center',
    label: 'Autopilot SD-WAN Mesh',
    shape: 'DIAMOND',
    virtualIpv4: '10.144.0.0/16'
  };

  const deviceNodes = topology.nodes.filter((n: any) => n.shape !== 'DIAMOND');

  // Compute radial positions
  const positionedNodes = deviceNodes.map((node: any, idx: number) => {
    const angle = (idx / deviceNodes.length) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { ...node, x, y };
  });

  return (
    <div className="relative w-full rounded-2xl glass-panel p-6 overflow-hidden border border-slate-200/90 shadow-sm bg-white/90">
      {/* HUD Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            <h3 className="text-base font-bold font-mono tracking-wide text-slate-800">
              GEOMETRIC HUD TOPOLOGY
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            零信任动态全息拓扑感知 • 点击节点开启下钻诊断与毫秒级断开/重连
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-sky-600 rotate-45 inline-block" />
            <span className="font-medium">◇ 子网 (Subnet)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-purple-600 inline-block rounded-xs" />
            <span className="font-medium">⬡ 网关 (Gateway)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-full inline-block" />
            <span className="font-medium">○ 终端 (Terminal)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas (Light Blueprint Background) */}
      <div className="relative w-full flex justify-center py-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-4xl h-auto select-none"
        >
          <defs>
            {/* Linear gradients for light beam */}
            <linearGradient id="lightBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>
            {/* Subtle shadow filter */}
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" floodColor="#0f172a" />
            </filter>
          </defs>

          {/* Background grid concentric circles */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(203, 213, 225, 0.7)" strokeDasharray="5 5" />
          <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="none" stroke="rgba(226, 232, 240, 0.8)" />

          {/* Links between central subnet and nodes */}
          {positionedNodes.map((node: any) => {
            const isActive = node.userIntent === 'ACTIVE';
            return (
              <g key={`link_${node.id}`}>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={node.x}
                  y2={node.y}
                  stroke={isActive ? 'url(#lightBeamGrad)' : 'rgba(203, 213, 225, 0.6)'}
                  strokeWidth={isActive ? '2.5' : '1.5'}
                  strokeDasharray={isActive ? '6 4' : '3 4'}
                  className={isActive ? 'hud-beam' : ''}
                />
                {isActive && (
                  <circle
                    cx={(centerX + node.x) / 2}
                    cy={(centerY + node.y) / 2}
                    r="3"
                    fill="#0284c7"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Center: Subnet Diamond (◇ Subnet) */}
          <g
            transform={`translate(${centerX}, ${centerY})`}
            className="cursor-pointer group"
            onClick={() => setSelectedNode(subnetNode)}
          >
            <polygon
              points="0,-36 36,0 0,36 -36,0"
              fill="#f0f9ff"
              stroke="#0284c7"
              strokeWidth="2.5"
              filter="url(#nodeShadow)"
              className="group-hover:fill-sky-100 transition-all duration-300"
            />
            <text
              textAnchor="middle"
              y="4"
              fill="#0369a1"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              SUBNET
            </text>
            <text
              textAnchor="middle"
              y="52"
              fill="#0284c7"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {subnetNode.virtualIpv4 || '10.144.0.0/16'}
            </text>
          </g>

          {/* Periphery Nodes: ○ Terminals & ⬡ Gateways */}
          {positionedNodes.map((node: any) => {
            const isGateway = node.shape === 'HEXAGON';
            const isActive = node.userIntent === 'ACTIVE';
            const isPaused = node.userIntent === 'USER_PAUSED';

            const strokeColor = !isActive
              ? isPaused ? '#d97706' : '#e11d48'
              : isGateway ? '#7c3aed' : '#059669';

            const fillColor = !isActive
              ? isPaused ? '#fffbeb' : '#fff1f2'
              : isGateway ? '#f5f3ff' : '#ecfdf5';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node)}
              >
                {/* Node shape */}
                {isGateway ? (
                  // Hexagon (⬡)
                  <polygon
                    points="0,-24 20.7,-12 20.7,12 0,24 -20.7,12 -20.7,-12"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    filter="url(#nodeShadow)"
                    className="group-hover:scale-110 transition-transform duration-200"
                  />
                ) : (
                  // Circle (○)
                  <circle
                    r="22"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    filter="url(#nodeShadow)"
                    className="group-hover:scale-110 transition-transform duration-200"
                  />
                )}

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  y="35"
                  fill="#0f172a"
                  fontSize="11.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {node.label}
                </text>
                <text
                  textAnchor="middle"
                  y="48"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {node.virtualIpv4 || 'Auto IP'}
                </text>

                {/* Status Dot */}
                <circle
                  cx="14"
                  cy="-14"
                  r="4.5"
                  fill={strokeColor}
                  className={isActive ? 'animate-pulse' : ''}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Drill-Down Diagnostic Inspector Modal */}
      {selectedNode && (
        <DiagnosticInspectorModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onToggleIntent={(nodeId, currentIntent) => {
            onToggleIntent(nodeId, currentIntent);
            setSelectedNode(null);
          }}
          onRevoke={(nodeId) => {
            onRevoke(nodeId);
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
};
