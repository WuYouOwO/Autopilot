import React, { useState, useEffect } from 'react';
import { 
  Server, Laptop, Shield, Network, Globe, Activity, KeyRound, 
  Plus, RefreshCw, ChevronDown, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { api, NetworkData, DeviceData } from './lib/api';
import { MachinesTable } from './components/MachinesTable';
import { MachineDrawer } from './components/MachineDrawer';
import { AccessControlsView } from './components/AccessControlsView';
import { SubnetsRoutingView } from './components/SubnetsRoutingView';
import { AppConnectorsView } from './components/AppConnectorsView';
import { TopologyView } from './components/TopologyView';
import { SettingsView } from './components/SettingsView';
import { AddMachineModal } from './components/AddMachineModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'machines' | 'acl' | 'subnets' | 'connectors' | 'topology' | 'settings'>('machines');
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkData | null>(null);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [nets, devs] = await Promise.all([
        api.getNetworks(),
        api.getDevices()
      ]);
      setNetworks(nets);
      if (nets.length > 0 && !selectedNetwork) {
        setSelectedNetwork(nets[0]);
      }
      setDevices(devs);
      // Update selectedDevice if already open
      if (selectedDevice) {
        const updated = devs.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 8 seconds for background synchronization
    const timer = setInterval(() => {
      api.getDevices().then(setDevices);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const networkId = selectedNetwork?.id || 'net_corp_zero_trust';

  const navItems = [
    { id: 'machines', label: '设备清单', icon: Server, badge: devices.length },
    { id: 'acl', label: '访问控制', icon: Shield },
    { id: 'subnets', label: '子网与路由', icon: Network },
    { id: 'connectors', label: '应用连接器', icon: Globe },
    { id: 'topology', label: '网络拓扑', icon: Activity },
    { id: 'settings', label: '设置与部署', icon: KeyRound }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-xs font-medium border border-slate-700 animate-slide-in-right">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Global Top Header Bar (Tailscale / Cloudflare style) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand & Network Selector */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">Autopilot</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      EasyTier Zero-Trust
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Dropdown */}
              <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
                <div className="text-xs text-slate-500 font-medium">当前网络:</div>
                <div className="relative">
                  <select
                    value={selectedNetwork?.id || ''}
                    onChange={(e) => {
                      const net = networks.find(n => n.id === e.target.value);
                      if (net) setSelectedNetwork(net);
                    }}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold font-mono text-slate-800 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {networks.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Right: Status Pill & Actions */}
            <div className="flex items-center gap-3">
              {/* Central Hub Status */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>中枢就绪</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-[11px] text-slate-500">3.5s 心跳</span>
              </div>

              {/* Refresh button */}
              <button
                onClick={loadData}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                title="刷新数据"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Add Machine Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                添加设备
              </button>
            </div>

          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex overflow-x-auto space-x-1 sm:space-x-4 border-t border-slate-100 pt-1 -mb-px">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {'badge' in item && typeof item.badge === 'number' && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'machines' && (
          <MachinesTable
            devices={devices}
            networkId={networkId}
            onSelectDevice={(device) => setSelectedDevice(device)}
            onAddMachine={() => setShowAddModal(true)}
            onRefresh={loadData}
            onToast={showToast}
          />
        )}

        {activeTab === 'acl' && (
          <AccessControlsView
            networkId={networkId}
            onToast={showToast}
          />
        )}

        {activeTab === 'subnets' && (
          <SubnetsRoutingView
            network={selectedNetwork}
            devices={devices}
            onRefresh={loadData}
            onToast={showToast}
          />
        )}

        {activeTab === 'connectors' && (
          <AppConnectorsView
            networkId={networkId}
            devices={devices}
            onToast={showToast}
          />
        )}

        {activeTab === 'topology' && (
          <TopologyView
            networkId={networkId}
            onSelectDevice={(device) => setSelectedDevice(device)}
            devices={devices}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            network={selectedNetwork}
            onToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Autopilot Control Plane</span>
            <span>•</span>
            <span>From Cockpit to Autopilot</span>
            <span>•</span>
            <span>EasyTier 现代化零信任控制平面与客户端生态</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>双栈 ULA IPv6 规范</span>
            <span>•</span>
            <span>元控制内存 RPC 接管</span>
            <span>•</span>
            <a 
              href="https://github.com/EasyTier/EasyTier" 
              target="_blank" 
              rel="noreferrer"
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              EasyTier 核心
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Side Slide-Over Drawer for Selected Machine */}
      {selectedDevice && (
        <MachineDrawer
          device={selectedDevice}
          networkId={networkId}
          onClose={() => setSelectedDevice(null)}
          onRefresh={loadData}
          onToast={showToast}
        />
      )}

      {/* Add Machine Modal */}
      {showAddModal && (
        <AddMachineModal
          network={selectedNetwork}
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            showToast(msg);
            loadData();
          }}
        />
      )}

    </div>
  );
};
