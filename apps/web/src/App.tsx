import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Layers, 
  Server, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  Globe,
  CheckCircle2
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load data from live Hub
  const loadData = async () => {
    try {
      const devs = await api.getDevices();
      setDevices(devs);
      const topo = await api.getTopology('net_corp_zero_trust');
      setTopology(topo);
    } catch {
      // Handled inside api.ts
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle instant pause/resume toggle (<10ms optimistic UI update)
  const handleToggleIntent = async (deviceId: string, currentIntent: string) => {
    const nextIntent = currentIntent === 'ACTIVE' ? 'USER_PAUSED' : 'ACTIVE';
    
    // Instant optimistic update
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, userIntent: nextIntent } : d));
    if (topology) {
      setTopology({
        ...topology,
        nodes: topology.nodes.map(n => n.id === deviceId ? { ...n, userIntent: nextIntent } : n)
      });
    }

    showToast(nextIntent === 'USER_PAUSED' 
      ? `节点 ${deviceId.slice(0, 10)} 已即时置为预期休眠 (PAUSED)，网关已阻断心跳强拉！` 
      : `节点 ${deviceId.slice(0, 10)} 已恢复网络连接 (ACTIVE)。`
    );

    if (currentIntent === 'ACTIVE') {
      await api.pauseDevice(deviceId, 'net_corp_zero_trust');
    } else {
      await api.resumeDevice(deviceId, 'net_corp_zero_trust');
    }
    loadData();
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
    showToast(`已成功吊销设备 ${deviceId} 的全部证书与 Peer 连接！`);
    await api.revokeDevice(deviceId);
    loadData();
  };

  // Handle switching persona (Workstation <-> Server)
  const handleSwitchPersona = async (deviceId: string, currentPersona: string) => {
    const targetPersona = currentPersona === 'SERVER_HEADLESS' ? 'WORKSTATION_INTERACTIVE' : 'SERVER_HEADLESS';
    const success = await api.updateDevicePersona(deviceId, targetPersona);
    if (success) {
      showToast(`已将节点画像切换为：${targetPersona === 'SERVER_HEADLESS' ? '机房无头服务器 (3.5s自愈)' : '工作站终端 (人权第一)'}`);
      loadData();
    } else {
      alert('切换画像失败，请重试');
    }
  };

  // Handle unregistering/deleting node
  const handleDeleteNode = async (deviceId: string) => {
    if (!confirm(`确定要从网络注销并删除节点 ${deviceId} 吗？`)) return;
    const success = await api.deleteDevice(deviceId);
    if (success) {
      showToast(`节点 ${deviceId} 已成功注销删除。`);
      loadData();
    } else {
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50/60 selection:bg-sky-100 selection:text-sky-900">
      {/* Top Tactical Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono tracking-wider bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  AUTOPILOT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                  v1.0 ZERO-TRUST
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono tracking-tight">
                From Cockpit to Autopilot • 现代化 EasyTier 零信任控制平面
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setActiveTab('topology')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'topology'
                  ? 'bg-white text-sky-700 border border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-600" />
              战情 HUD 拓扑
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'network'
                  ? 'bg-white text-sky-700 border border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600" />
              组织网络轴
            </button>
            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'hardware'
                  ? 'bg-white text-sky-700 border border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Server className="w-4 h-4 text-sky-600" />
              硬件机器轴
            </button>
            <button
              onClick={() => setActiveTab('wap')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'wap'
                  ? 'bg-white text-sky-700 border border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-sky-600" />
              移动端 WAP
            </button>
            <button
              onClick={() => setActiveTab('bugfix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium transition ${
                activeTab === 'bugfix'
                  ? 'bg-white text-amber-700 border border-slate-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              12.4 MB/s 修复验算
            </button>
          </nav>

          {/* Edge Health Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>D1 Edge SSOT: Active</span>
            </div>
          </div>

        </div>
      </header>

      {/* Global Interactive Notification Toast */}
      {toastMsg && (
        <div className="sticky top-16 z-50 max-w-7xl mx-auto px-4 w-full pt-2">
          <div className="p-3.5 rounded-2xl bg-sky-600 text-white font-mono text-xs flex items-center justify-between shadow-lg shadow-sky-600/20 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-200 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-sky-200 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Tab Select Dropdown (visible on small screens) */}
        <div className="block md:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 shadow-2xs"
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
              onSwitchPersona={handleSwitchPersona}
              onDeleteNode={handleDeleteNode}
            />

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl glass-panel flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-500">Zero-Trust Guardrails</div>
                  <div className="text-sm font-semibold text-slate-800">宿主底层网卡绝对受保 • 纯内存 RPC 释放</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-panel flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Zap className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-500">Local Latency & Sync</div>
                  <div className="text-sm font-semibold text-slate-800">&lt; 10ms 乐观响应 • 30~50ms 带外写入 D1</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-panel flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Globe className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-500">Dual Persona Governance</div>
                  <div className="text-sm font-semibold text-slate-800">机房无头自愈 (3.5s) • 终端秒断秒连人权第一</div>
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
            onRefresh={loadData}
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

      {/* Clean Light Footer */}
      <footer className="border-t border-slate-200 py-4 mt-auto bg-white/70 backdrop-blur-md font-mono text-xs text-slate-500 text-center">
        Autopilot 零信任现代化控制平面 • Cloudflare 边缘架构与本地同构 • EasyTier 原生 IPC/RPC 引擎
      </footer>
    </div>
  );
}

