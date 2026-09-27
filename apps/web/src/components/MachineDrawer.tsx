import React, { useState } from 'react';
import { X, Server, Laptop, Copy, Check, Power, RefreshCw, Trash2, Shield, Activity, Globe, Cpu, HardDrive } from 'lucide-react';
import { DeviceData, api } from '../lib/api';

interface MachineDrawerProps {
  device: DeviceData | null;
  networkId: string;
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export const MachineDrawer: React.FC<MachineDrawerProps> = ({
  device,
  networkId,
  onClose,
  onRefresh,
  onToast
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isUpdatingPersona, setIsUpdatingPersona] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!device) return null;

  const currentNetwork = device.networks?.find(n => n.networkId === networkId) || device.networks?.[0];
  const isPaused = currentNetwork?.intentState === 'USER_PAUSED' || currentNetwork?.intentState === 'ADMIN_DISABLED';
  const isServer = device.persona === 'SERVER_HEADLESS';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    onToast(`已复制 ${label} 到剪贴板`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleState = async () => {
    setIsToggling(true);
    try {
      if (isPaused) {
        await api.resumeDevice(device.id, networkId);
        onToast(`已唤醒设备 ${device.hostname}，Noise 隧道已重新建立`);
      } else {
        await api.pauseDevice(device.id, networkId);
        onToast(`已休眠设备 ${device.hostname}，内存 RPC 句柄已平滑释放`);
      }
      onRefresh();
    } finally {
      setIsToggling(false);
    }
  };

  const handleSwitchPersona = async () => {
    setIsUpdatingPersona(true);
    const targetPersona = isServer ? 'WORKSTATION_INTERACTIVE' : 'SERVER_HEADLESS';
    try {
      await api.updateDevicePersona(device.id, targetPersona);
      onToast(`设备 ${device.hostname} 画像已更新为 ${targetPersona === 'SERVER_HEADLESS' ? '机房无头模式' : '员工终端模式'}`);
      onRefresh();
    } finally {
      setIsUpdatingPersona(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确定要注销并删除设备 ${device.hostname} 吗？该操作不可逆。`)) return;
    setIsDeleting(true);
    try {
      await api.deleteDevice(device.id);
      onToast(`设备 ${device.hostname} 已注销并清理`);
      onClose();
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slide-in-right">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                isServer 
                  ? 'bg-purple-50 text-purple-600 border-purple-200' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}>
                {isServer ? <Server className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">{device.hostname}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    !isPaused
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${!isPaused ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                    {!isPaused ? '在线运行 (Active)' : '已休眠 (Paused)'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{device.os} • {device.clientVersion || 'v1.2.0'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Connection Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">网络连接控制 (Meta-Control)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {!isPaused ? '隧道握手保持中，可通过 RPC 平滑暂停' : '已进入休眠状态，网关判定为预期静默'}
                </div>
              </div>
              <button
                onClick={handleToggleState}
                disabled={isToggling}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50 ${
                  !isPaused
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {isToggling ? '执行中...' : (!isPaused ? '断开网络' : '连接网络')}
              </button>
            </div>

            {/* IP Addresses */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">分配虚拟地址</h4>
              
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Virtual IPv4</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {currentNetwork?.virtualIpv4 || '10.144.0.1'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(currentNetwork?.virtualIpv4 || '10.144.0.1', 'IPv4')}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                    >
                      {copiedKey === 'IPv4' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-500">Virtual IPv6</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {currentNetwork?.virtualIpv6 || 'fd00:cafe:2026::1'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(currentNetwork?.virtualIpv6 || 'fd00:cafe:2026::1', 'IPv6')}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                    >
                      {copiedKey === 'IPv6' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Persona Switch */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">设备画像模式 (Device Persona)</h4>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {isServer ? '机房无头模式 (Server / Headless)' : '员工终端模式 (Workstation / Interactive)'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {isServer 
                        ? '3.5s 心跳巡检，断开后自动故障拉起自愈，确保 IDC 生产不断联。' 
                        : '人权第一，托盘开关最高优先级，本地秒级断开与中台带外对齐。'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSwitchPersona}
                  disabled={isUpdatingPersona}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPersona ? 'animate-spin' : ''}`} />
                  切换为 {isServer ? '员工终端模式' : '机房无头模式'}
                </button>
              </div>
            </div>

            {/* Zero-Trust Cryptography */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">零信任凭据与加密</h4>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    Noise X25519 公钥
                  </span>
                  <button
                    onClick={() => copyToClipboard(device.publicKeyX25519, '公钥')}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600"
                  >
                    {copiedKey === '公钥' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-50 font-mono text-[11px] text-slate-700 break-all select-all border border-slate-100">
                  {device.publicKeyX25519}
                </div>
              </div>
            </div>

            {/* Hardware & Telemetry */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">实时资源与链路遥测</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    CPU 占用率
                  </div>
                  <div className="text-base font-bold text-slate-800 font-mono">
                    {device.telemetry?.cpuUsagePercent ?? 8}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.min(100, device.telemetry?.cpuUsagePercent ?? 8)}%` }} 
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                    内存占用率
                  </div>
                  <div className="text-base font-bold text-slate-800 font-mono">
                    {device.telemetry?.memoryUsagePercent ?? 34}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.min(100, device.telemetry?.memoryUsagePercent ?? 34)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    累计吞吐总量
                  </span>
                  <span className="font-mono text-slate-700">
                    Rx: {((device.telemetry?.rxBytesTotal || 0) / (1024 * 1024)).toFixed(1)} MB / 
                    Tx: {((device.telemetry?.txBytesTotal || 0) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                    节点位置
                  </span>
                  <span className="text-slate-700 font-mono">
                    {device.city || 'Edge PoP'}, {device.country || 'Global'} ({device.cloudProvider || 'Cloudflare'})
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? '注销中...' : '注销并从中枢删除此节点'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
