import React, { useState } from 'react';
import { ShieldCheck, Server, Laptop, Activity, Wifi } from 'lucide-react';
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
        Initializing Geometric HUD Topology...
      </div>
    );
  }

  // Layout nodes radially around the central subnet diamond
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
    <div className="relative w-full rounded-2xl glass-panel p-6 overflow-hidden border border-cyan-500/20 shadow-2xl">
      {/* HUD Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-base font-bold font-mono tracking-wide text-cyan-300">
              GEOMETRIC HUD TOPOLOGY
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Zero-Trust Dynamic Topology Perception • Click node for instant diagnosis & toggle
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-cyan-400 rotate-45 inline-block" />
            <span>◇ Subnet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-purple-400 inline-block rounded-sm" />
            <span>⬡ Gateway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-emerald-400 rounded-full inline-block" />
            <span>○ Terminal</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full flex justify-center py-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-4xl h-auto select-none"
        >
          <defs>
            {/* Cyan glow */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Linear gradients */}
            <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4facfe" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeDasharray="4 4" />
          <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="none" stroke="rgba(56, 189, 248, 0.04)" />

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
                  stroke={isActive ? 'url(#beamGrad)' : 'rgba(148, 163, 184, 0.15)'}
                  strokeWidth={isActive ? '2' : '1'}
                  strokeDasharray={isActive ? '6 4' : '2 4'}
                  className={isActive ? 'hud-beam' : ''}
                />
                {isActive && (
                  <circle
                    cx={(centerX + node.x) / 2}
                    cy={(centerY + node.y) / 2}
                    r="2.5"
                    fill="#38bdf8"
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
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth="2.5"
              filter="url(#glow-cyan)"
              className="group-hover:fill-cyan-500/30 transition-all duration-300"
            />
            <text
              textAnchor="middle"
              y="4"
              fill="#e0f2fe"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              SUBNET
            </text>
            <text
              textAnchor="middle"
              y="52"
              fill="#38bdf8"
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
              ? isPaused ? '#f59e0b' : '#f43f5e'
              : isGateway ? '#c084fc' : '#34d399';

            const fillColor = !isActive
              ? isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)'
              : isGateway ? 'rgba(192, 132, 252, 0.15)' : 'rgba(52, 211, 153, 0.15)';

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
                    strokeWidth="2"
                    className="group-hover:scale-110 transition-transform duration-200"
                  />
                ) : (
                  // Circle (○)
                  <circle
                    r="22"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="2"
                    className="group-hover:scale-110 transition-transform duration-200"
                  />
                )}

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  y="34"
                  fill="#f1f5f9"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {node.label}
                </text>
                <text
                  textAnchor="middle"
                  y="46"
                  fill="#94a3b8"
                  fontSize="9.5"
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
