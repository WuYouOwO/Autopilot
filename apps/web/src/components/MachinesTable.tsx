import React, { useState } from 'react';
import { 
  Server, Laptop, Search, Plus, Power, Copy, Check, MoreVertical, 
  ExternalLink, Shield, ArrowUpDown, RefreshCw, Cpu, Activity
} from 'lucide-react';
import { DeviceData, api } from '../lib/api';

interface MachinesTableProps {
  devices: DeviceData[];
  networkId: string;
  onSelectDevice: (device: DeviceData) => void;
  onAddMachine: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export const MachinesTable: React.FC<MachinesTableProps> = ({
  devices,
  networkId,
  onSelectDevice,
  onAddMachine,
  onRefresh,
  onToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [personaFilter, setPersonaFilter] = useState<'ALL' | 'SERVER' | 'WORKSTATION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Derived counts
  const totalCount = devices.length;
  const connectedCount = devices.filter(d => {
    const net = d.networks?.find(n => n.networkId === networkId) || d.networks?.[0];
    return net?.intentState === 'ACTIVE' || !net?.intentState;
  }).length;
  const serverCount = devices.filter(d => d.persona === 'SERVER_HEADLESS').length;
  const workstationCount = devices.filter(d => d.persona === 'WORKSTATION_INTERACTIVE').length;

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const net = d.networks?.find(n => n.networkId === networkId) || d.networks?.[0];
    const isPaused = net?.intentState === 'USER_PAUSED' || net?.intentState === 'ADMIN_DISABLED';

    // Persona filter
    if (personaFilter === 'SERVER' && d.persona !== 'SERVER_HEADLESS') return false;
    if (personaFilter === 'WORKSTATION' && d.persona !== 'WORKSTATION_INTERACTIVE') return false;

    // Status filter
    if (statusFilter === 'ACTIVE' && isPaused) return false;
    if (statusFilter === 'PAUSED' && !isPaused) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.hostname.toLowerCase().includes(q);
      const matchIpv4 = (net?.virtualIpv4 || '').toLowerCase().includes(q);
      const matchIpv6 = (net?.virtualIpv6 || '').toLowerCase().includes(q);
      const matchTag = (d.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchIpv4 && !matchIpv6 && !matchTag) return false;
    }

    return true;
  });

  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(`${id}_${label}`);
    onToast(`已复制 ${label} 到剪贴板`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleToggleState = async (e: React.MouseEvent, device: DeviceData) => {
    e.stopPropagation();
    const net = device.networks?.find(n => n.networkId === networkId) || device.networks?.[0];
    const isPaused = net?.intentState === 'USER_PAUSED' || net?.intentState === 'ADMIN_DISABLED';

    setActionLoadingId(device.id);
    try {
      if (isPaused) {
        await api.resumeDevice(device.id, networkId);
        onToast(`已唤醒设备 ${device.hostname}，P2P 隧道重新建立`);
      } else {
        await api.pauseDevice(device.id, networkId);
        onToast(`已休眠设备 ${device.hostname}，TUN 句柄已释放`);
      }
      onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickSwitchPersona = async (e: React.MouseEvent, device: DeviceData) => {
    e.stopPropagation();
    const targetPersona = device.persona === 'SERVER_HEADLESS' ? 'WORKSTATION_INTERACTIVE' : 'SERVER_HEADLESS';
    setActionLoadingId(device.id);
    try {
      await api.updateDevicePersona(device.id, targetPersona);
      onToast(`设备 ${device.hostname} 画像已切换为 ${targetPersona === 'SERVER_HEADLESS' ? '机房无头模式' : '员工终端模式'}`);
      onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stat Summary Cards (Tailscale style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs font-medium text-slate-500">设备总数 (All Machines)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            在线保持 (Connected)
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{connectedCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-purple-600" />
            机房无头 (Headless Servers)
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1 font-mono">{serverCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            员工终端 (Workstations)
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono">{workstationCount}</div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索设备名称、虚拟 IP、标签..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona selector */}
          <select
            value={personaFilter}
            onChange={(e) => setPersonaFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">全部设备画像</option>
            <option value="SERVER">机房无头 (Server)</option>
            <option value="WORKSTATION">员工终端 (Workstation)</option>
          </select>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">全部运行状态</option>
            <option value="ACTIVE">在线 (Active)</option>
            <option value="PAUSED">已休眠 (Paused)</option>
          </select>

          {/* Add machine button */}
          <button
            onClick={onAddMachine}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            添加设备
          </button>
        </div>
      </div>

      {/* Tailscale-Style Machines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-4">设备机器 (Machine)</th>
                <th className="py-3.5 px-4">设备画像 (Persona)</th>
                <th className="py-3.5 px-4">分配地址 (Virtual IPs)</th>
                <th className="py-3.5 px-4">运行状态</th>
                <th className="py-3.5 px-4">实时遥测 (Telemetry)</th>
                <th className="py-3.5 px-4">心跳活跃</th>
                <th className="py-3.5 pl-4 pr-6 text-right">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    未找到匹配的设备记录
                  </td>
                </tr>
              ) : (
                filteredDevices.map(device => {
                  const currentNetwork = device.networks?.find(n => n.networkId === networkId) || device.networks?.[0];
                  const isPaused = currentNetwork?.intentState === 'USER_PAUSED' || currentNetwork?.intentState === 'ADMIN_DISABLED';
                  const isServer = device.persona === 'SERVER_HEADLESS';
                  const isLoading = actionLoadingId === device.id;

                  return (
                    <tr
                      key={device.id}
                      onClick={() => onSelectDevice(device)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Hostname & OS */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${
                            isServer 
                              ? 'bg-purple-50 text-purple-600 border-purple-100' 
                              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}>
                            {isServer ? <Server className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 font-mono group-hover:text-indigo-600 transition flex items-center gap-2">
                              {device.hostname}
                              {device.tags?.includes('gateway') && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-sans font-medium">
                                  子网路由网关
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{device.os}</span>
                              <span>•</span>
                              <span>{device.city || 'Edge PoP'}, {device.country || 'Global'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Persona Badge */}
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleQuickSwitchPersona(e, device)}
                          disabled={isLoading}
                          title="点击快速切换画像"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                            isServer
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                          }`}
                        >
                          <RefreshCw className="w-2.5 h-2.5 opacity-60" />
                          {isServer ? '机房无头 (Headless)' : '员工终端 (Interactive)'}
                        </button>
                      </td>

                      {/* IPs */}
                      <td className="py-4 px-4 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800 font-medium">{currentNetwork?.virtualIpv4 || '10.144.0.1'}</span>
                            <button
                              onClick={() => handleCopy(currentNetwork?.virtualIpv4 || '10.144.0.1', device.id, 'IPv4')}
                              className="text-slate-400 hover:text-indigo-600 p-0.5"
                            >
                              {copiedKey === `${device.id}_IPv4` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {currentNetwork?.virtualIpv6 && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                              <span>{currentNetwork.virtualIpv6}</span>
                              <button
                                onClick={() => handleCopy(currentNetwork.virtualIpv6 || '', device.id, 'IPv6')}
                                className="text-slate-400 hover:text-indigo-600 p-0.5"
                              >
                                {copiedKey === `${device.id}_IPv6` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          !isPaused
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${!isPaused ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                          {!isPaused ? '在线 (Active)' : '已休眠 (Paused)'}
                        </span>
                      </td>

                      {/* Telemetry */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">CPU</span>
                            <span className="font-mono text-slate-700 font-medium">{device.telemetry?.cpuUsagePercent ?? 8}%</span>
                            <span className="text-slate-500 ml-1">RAM</span>
                            <span className="font-mono text-slate-700 font-medium">{device.telemetry?.memoryUsagePercent ?? 32}%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Rx: {((device.telemetry?.rxBytesTotal || 0) / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-4 px-4 text-slate-500 text-[11px] font-mono">
                        刚刚 (3.5s 巡检)
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleToggleState(e, device)}
                            disabled={isLoading}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                              !isPaused
                                ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {!isPaused ? '断开' : '连接'}
                          </button>

                          <button
                            onClick={() => onSelectDevice(device)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition"
                          >
                            详情
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
