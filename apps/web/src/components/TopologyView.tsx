import React, { useState, useEffect } from 'react';
import { Network, Server, Laptop, Activity, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Shield } from 'lucide-react';
import { TopologyData, DeviceData, api } from '../lib/api';

interface TopologyViewProps {
  networkId: string;
  onSelectDevice: (device: DeviceData) => void;
  devices: DeviceData[];
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  networkId,
  onSelectDevice,
  devices
}) => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    api.getTopology(networkId).then(setTopology);
  }, [networkId]);

  const centerX = 400;
  const centerY = 240;
  const radius = 170;

  // Real or fallback nodes
  const nodes = topology?.nodes?.filter(n => n.type !== 'SUBNET') || [];
  const subnetNode = topology?.nodes?.find(n => n.type === 'SUBNET');

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const dev = devices.find(d => d.id === nodeId);
    if (dev) {
      onSelectDevice(dev);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            全网拓扑与链路诊断 (Network Mesh Topology)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            实时展示当前 Zero-Trust SD-WAN 网络的点对点 (P2P) 打洞握手、中继路径与延迟质量。
          </p>
        </div>

        {/* Zoom & Reset Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.15, 1.6))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.7))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="重置缩放"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex items-center justify-center select-none">
        
        {/* Subtle Background Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Legend */}
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-white/95 border border-slate-200 shadow-sm text-xs space-y-1.5 pointer-events-none">
          <div className="font-semibold text-slate-700">图例说明</div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>直连 P2P 隧道 (Direct Mesh)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>休眠节点 (Paused)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
            <span>虚拟主干子网中心 (Subnet Hub)</span>
          </div>
        </div>

        {/* Main Canvas SVG */}
        <div 
          className="transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <svg width="800" height="480" viewBox="0 0 800 480" className="overflow-visible">
            
            {/* Edges / Connections */}
            {nodes.map((node, i) => {
              const angle = (i / (nodes.length || 1)) * 2 * Math.PI - Math.PI / 2;
              const nx = centerX + radius * Math.cos(angle);
              const ny = centerY + radius * Math.sin(angle);
              const isPaused = node.userIntent === 'USER_PAUSED' || node.userIntent === 'ADMIN_DISABLED';
              const midX = (centerX + nx) / 2;
              const midY = (centerY + ny) / 2;
              const latency = 12 + ((i * 7) % 20);

              return (
                <g key={`edge_${node.id}`}>
                  {/* Link line */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={nx}
                    y2={ny}
                    stroke={!isPaused ? '#6366f1' : '#cbd5e1'}
                    strokeWidth={!isPaused ? 2 : 1.5}
                    strokeDasharray={!isPaused ? 'none' : '4 4'}
                    opacity={!isPaused ? 0.7 : 0.4}
                  />

                  {/* Latency badge */}
                  {!isPaused && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-20"
                        y="-10"
                        width="40"
                        height="20"
                        rx="10"
                        fill="#ffffff"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="9"
                        fontFamily="JetBrains Mono"
                        fontWeight="600"
                      >
                        {latency}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Central Subnet Hub Node */}
            <g transform={`translate(${centerX}, ${centerY})`} className="cursor-default">
              <rect
                x="-80"
                y="-32"
                width="160"
                height="64"
                rx="16"
                fill="#ffffff"
                stroke="#4f46e5"
                strokeWidth="2"
                filter="drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1))"
              />
              <circle cx="-52" cy="0" r="14" fill="#e0e7ff" />
              <path
                d="M -58 -6 L -46 -6 L -46 6 L -58 6 Z"
                fill="#4f46e5"
              />
              <text
                x="-28"
                y="-6"
                fill="#0f172a"
                fontSize="12"
                fontWeight="700"
                fontFamily="Plus Jakarta Sans"
              >
                主干虚拟子网
              </text>
              <text
                x="-28"
                y="12"
                fill="#6366f1"
                fontSize="10"
                fontWeight="600"
                fontFamily="JetBrains Mono"
              >
                {subnetNode?.virtualIpv4 || '10.144.0.0/16'}
              </text>
            </g>

            {/* Fleet Nodes */}
            {nodes.map((node, i) => {
              const angle = (i / (nodes.length || 1)) * 2 * Math.PI - Math.PI / 2;
              const nx = centerX + radius * Math.cos(angle);
              const ny = centerY + radius * Math.sin(angle);
              const isPaused = node.userIntent === 'USER_PAUSED' || node.userIntent === 'ADMIN_DISABLED';
              const isServer = node.persona === 'SERVER_HEADLESS';
              const isSelected = selectedNodeId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${nx}, ${ny})`}
                  onClick={() => handleNodeClick(node.id)}
                  className="cursor-pointer group"
                >
                  {/* Large transparent click hitbox */}
                  <circle r="46" fill="transparent" pointerEvents="all" />

                  {/* Card shape */}
                  <rect
                    x="-68"
                    y="-28"
                    width="136"
                    height="56"
                    rx="12"
                    fill="#ffffff"
                    stroke={isSelected ? '#4f46e5' : (!isPaused ? '#e2e8f0' : '#f1f5f9')}
                    strokeWidth={isSelected ? 2 : 1.5}
                    className="group-hover:stroke-indigo-400 group-hover:shadow-md transition"
                    filter="drop-shadow(0 2px 4px rgb(0 0 0 / 0.05))"
                  />

                  {/* Status dot */}
                  <circle
                    cx="-50"
                    cy="0"
                    r="4"
                    fill={!isPaused ? '#10b981' : '#f59e0b'}
                  />

                  {/* Hostname */}
                  <text
                    x="-38"
                    y="-6"
                    fill="#0f172a"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="JetBrains Mono"
                    className="group-hover:fill-indigo-600 transition"
                  >
                    {node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label}
                  </text>

                  {/* Virtual IP */}
                  <text
                    x="-38"
                    y="12"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {node.virtualIpv4 || '10.144.x.x'}
                  </text>
                </g>
              );
            })}

          </svg>
        </div>

        {/* Footer Quick Node Pill Selector */}
        <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">快速点击节点下钻:</span>
          {nodes.map(node => (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-[11px] font-mono font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition shadow-sm"
            >
              {node.label}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
