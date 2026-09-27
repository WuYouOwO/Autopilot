import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Layers, 
  Server, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Terminal, 
  Activity, 
  Cpu 
} from 'lucide-react';
import { api, DeviceData, TopologyData } from './lib/api';
import { TopologyHUD } from './components/TopologyHUD';
import { NetworkAxisView } from './components/NetworkAxisView';
import { HardwareAxisView } from './components/HardwareAxisView';
import { MobileWAPView } from './components/MobileWAPView';
import { TrafficBugfixDemo } from './components/TrafficBugfixDemo';

export function App() {
  const [activeTab, setActiveTab] = useState<'topology' | 'network' | 'hardware' | 'wap' | 'bugfix'>('topology');
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      const devs = await api.getDevices();
      setDevices(devs);
      const topo = await api.getTopology('net_corp_zero_trust');
      setTopology(topo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle instant pause/resume toggle
  const handleToggleIntent = async (deviceId: string, currentIntent: string) => {
    // 1. Optimistic Local Update (<10ms UI instant response)
    const nextIntent = currentIntent === 'ACTIVE' ? 'USER_PAUSED' : 'ACTIVE';
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, userIntent: nextIntent } : d));
    if (topology) {
      setTopology({
        ...topology,
        nodes: topology.nodes.map(n => n.id === deviceId ? { ...n, userIntent: nextIntent } : n)
      });
    }

    // 2. Out-of-band async sync to Hub (30~50ms)
    if (currentIntent === 'ACTIVE') {
      await api.pauseDevice(deviceId, 'net_corp_zero_trust');
    } else {
      await api.resumeDevice(deviceId, 'net_corp_zero_trust');
    }
  };

  // Handle Admin Instant Revocation ("一键毫秒踢人")
  const handleRevoke = async (deviceId: string) => {
    if (!confirm('确定要毫秒级吊销该设备的所有零信任凭证与 Peer 隧道吗？此操作将立即断开设备。')) {
      return;
    }

    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, userIntent: 'ADMIN_DISABLED' } : d));
    if (topology) {
      setTopology({
        ...topology,
        nodes: topology.nodes.map(n => n.id === deviceId ? { ...n, userIntent: 'ADMIN_DISABLED' } : n)
      });
    }
    await api.revokeDevice(deviceId);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100">
      {/* Top Tactical Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-cyber-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  AUTOPILOT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                  v1.0 ZERO-TRUST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">
                From Cockpit to Autopilot • EasyTier Control Plane
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('topology')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'topology'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              战情 HUD 拓扑
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'network'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              组织网络轴
            </button>
            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'hardware'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              硬件机器轴
            </button>
            <button
              onClick={() => setActiveTab('wap')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'wap'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              移动端 WAP
            </button>
            <button
              onClick={() => setActiveTab('bugfix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'bugfix'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              12.4 MB/s 修复验算
            </button>
          </nav>

          {/* Edge Health Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>D1 Edge SSOT: Active</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Tab Select Dropdown (visible on small screens) */}
        <div className="block md:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 font-mono text-sm text-cyan-300 focus:outline-none"
          >
            <option value="topology">战情 HUD 拓扑</option>
            <option value="network">组织网络轴</option>
            <option value="hardware">硬件机器轴</option>
            <option value="wap">移动端 WAP 控制台</option>
            <option value="bugfix">12.4 MB/s 修复验算实验室</option>
          </select>
        </div>

        {/* Tab Panels */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            <TopologyHUD
              topology={topology}
              onToggleIntent={handleToggleIntent}
              onRevoke={handleRevoke}
            />

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl glass-panel border border-cyan-500/10 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-slate-400">Zero-Trust Guardrails</div>
                  <div className="text-sm font-semibold text-slate-200">底层宿主网卡绝对受保 • 纯内存 RPC 释放</div>
                </div>
              </div>
              <div className="p-4 rounded-xl glass-panel border border-cyan-500/10 flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-400 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-slate-400">Local Latency & Sync</div>
                  <div className="text-sm font-semibold text-slate-200">&lt; 10ms 乐观响应 • 30~50ms 带外写入 D1</div>
                </div>
              </div>
              <div className="p-4 rounded-xl glass-panel border border-cyan-500/10 flex items-center gap-3">
                <Globe className="w-6 h-6 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-slate-400">Dual Persona Governance</div>
                  <div className="text-sm font-semibold text-slate-200">机房无头自愈 (3.5s) • 终端秒断秒连人权第一</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <NetworkAxisView
            network={topology?.network}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareAxisView
            devices={devices}
            onToggleIntent={handleToggleIntent}
            onRevoke={handleRevoke}
          />
        )}

        {activeTab === 'wap' && (
          <MobileWAPView
            devices={devices}
            onToggleIntent={handleToggleIntent}
          />
        )}

        {activeTab === 'bugfix' && (
          <TrafficBugfixDemo />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 mt-auto bg-cyber-950/60 font-mono text-xs text-slate-500 text-center">
        Autopilot Control Plane • Isomorphic Cloudflare Edge & Self-Hosted • EasyTier Native IPC/RPC Engine
      </footer>
    </div>
  );
}
