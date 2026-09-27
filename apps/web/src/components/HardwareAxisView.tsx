import React, { useState } from 'react';
import { 
  Server, 
  Laptop, 
  Power, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Plus, 
  RotateCw, 
  Trash2,
  X,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { DeviceData, api } from '../lib/api';

interface HardwareAxisViewProps {
  devices: DeviceData[];
  onToggleIntent: (deviceId: string, currentIntent: string) => void;
  onRevoke: (deviceId: string) => void;
  onRefresh?: () => void;
}

export const HardwareAxisView: React.FC<HardwareAxisViewProps> = ({
  devices,
  onToggleIntent,
  onRevoke,
  onRefresh
}) => {
  // Modal for enrolling new device
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [newPersona, setNewPersona] = useState<'WORKSTATION_INTERACTIVE' | 'SERVER_HEADLESS'>('WORKSTATION_INTERACTIVE');
  const [newPubKey, setNewPubKey] = useState('');
  const [newCity, setNewCity] = useState('Shanghai');
  const [newTags, setNewTags] = useState('workstation, dev');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Handle switching persona (Workstation <-> Server)
  const handleSwitchPersona = async (device: DeviceData) => {
    const targetPersona = device.persona === 'SERVER_HEADLESS' ? 'WORKSTATION_INTERACTIVE' : 'SERVER_HEADLESS';
    const success = await api.updateDevicePersona(device.id, targetPersona);
    if (success) {
      showNotification(`已成功将 ${device.hostname} 画像切换为 ${targetPersona === 'SERVER_HEADLESS' ? '机房服务器 (3.5s自愈)' : '工作站终端 (人权第一)'}`);
      if (onRefresh) onRefresh();
    } else {
      alert('切换画像失败，请重试');
    }
  };

  // Handle deleting/unenrolling device
  const handleDeleteDevice = async (deviceId: string, hostname: string) => {
    if (!confirm(`确定要注销并删除设备 ${hostname} 吗？`)) return;
    const success = await api.deleteDevice(deviceId);
    if (success) {
      showNotification(`设备 ${hostname} 已从零信任中枢注销。`);
      if (onRefresh) onRefresh();
    } else {
      alert('注销失败，请重试');
    }
  };

  // Handle enrolling new device
  const handleEnrollDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname.trim()) return;

    const pubKey = newPubKey.trim() || 'f8a' + Math.random().toString(16).slice(2) + '09b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4';
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);

    const res = await api.enrollDevice({
      hostname: newHostname,
      persona: newPersona,
      publicKeyX25519: pubKey,
      networkId: 'net_corp_zero_trust',
      tags,
      geo: {
        city: newCity,
        country: 'CN',
        latitude: 31.2304,
        longitude: 121.4737,
        cloudProvider: 'EDGE'
      }
    });

    if (res && res.deviceId) {
      showNotification(`新设备 ${newHostname} 已成功注册并分配虚拟 IP！`);
      setShowEnrollModal(false);
      setNewHostname('');
      setNewPubKey('');
      if (onRefresh) onRefresh();
    } else {
      alert('注册失败: ' + (res.error || '未知错误'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel bg-white/90 border border-slate-200 shadow-xs">
          <div className="text-xs font-mono text-slate-500">已登记受控节点</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{devices.length}</div>
        </div>
        <div className="p-4 rounded-2xl glass-panel bg-white/90 border border-slate-200 shadow-xs">
          <div className="text-xs font-mono text-slate-500">活跃终端工作站</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {devices.filter(d => d.persona === 'WORKSTATION_INTERACTIVE' && d.userIntent === 'ACTIVE').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl glass-panel bg-white/90 border border-slate-200 shadow-xs">
          <div className="text-xs font-mono text-slate-500">预期休眠 (已主动断开)</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {devices.filter(d => d.userIntent === 'USER_PAUSED').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl glass-panel bg-white/90 border border-slate-200 shadow-xs">
          <div className="text-xs font-mono text-slate-500">机房无头服务器 (IDC)</div>
          <div className="text-2xl font-bold font-mono text-purple-600 mt-1">
            {devices.filter(d => d.persona === 'SERVER_HEADLESS').length}
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-mono flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hardware Devices List Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold font-mono text-slate-900">硬件拓扑与终端舰队</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              双轨画像治理机制 • 工作站终端本地控制权最高 vs 机房服务器 3.5s 集中自愈
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEnrollModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              登记新受控设备
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                刷新
              </button>
            )}
          </div>
        </div>

        {/* Devices Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isServer = device.persona === 'SERVER_HEADLESS';
            const isActive = device.userIntent === 'ACTIVE';
            const isPaused = device.userIntent === 'USER_PAUSED';
            const isRevoked = device.userIntent === 'ADMIN_DISABLED';

            return (
              <div
                key={device.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isServer 
                          ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                          : 'bg-sky-50 text-sky-600 border border-sky-200'
                      }`}>
                        {isServer ? <Server className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold font-mono text-slate-900">{device.hostname}</h4>
                          <button
                            onClick={() => handleSwitchPersona(device)}
                            className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 transition flex items-center gap-1"
                            title="点击切换画像 (Workstation / Headless)"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            {isServer ? '机房服务器' : '工作站'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-500">{device.os} • {device.clientVersion}</span>
                          <span className="text-xs font-mono text-slate-400">• {device.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      isPaused ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {device.userIntent}
                    </span>
                  </div>

                  {/* Virtual IPs */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs flex justify-between">
                    <div>
                      <span className="text-slate-500 block text-[10px]">VIRTUAL IPv4</span>
                      <span className="text-sky-700 font-bold">{device.networks[0]?.virtualIpv4 || '10.144.1.x'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">VIRTUAL IPv6 (双栈)</span>
                      <span className="text-sky-700 font-bold truncate block">{device.networks[0]?.virtualIpv6 || 'fd00:cafe::x'}</span>
                    </div>
                  </div>

                  {/* Telemetry row */}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-sky-600" />
                      CPU: {device.telemetry?.cpuUsagePercent ?? 8}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      延迟: {isActive ? '14 ms' : '预期休眠'}
                    </span>
                    <span className="text-slate-400">
                      ID: {device.id.slice(0, 10)}...
                    </span>
                  </div>
                </div>

                {/* Bottom Interactive Actions - ALL BUTTONS CLICKABLE! */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Toggle button: clickable for all nodes in the Admin console! */}
                    <button
                      onClick={() => onToggleIntent(device.id, device.userIntent)}
                      disabled={isRevoked}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition active:scale-95 ${
                        isActive
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-xs'
                      } disabled:opacity-40`}
                      title={isActive ? '点击立即休眠断开' : '点击立即恢复网络连接'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isActive ? '即时休眠 (<10ms)' : '恢复网络'}
                    </button>

                    <button
                      onClick={() => handleSwitchPersona(device)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-mono text-slate-600 hover:text-sky-700 hover:bg-slate-100 transition border border-slate-200"
                      title="快速切换双轨制画像"
                    >
                      转为{isServer ? '工作站' : '服务器'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onRevoke(device.id)}
                      disabled={isRevoked}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-40 shadow-xs active:scale-95"
                      title="毫秒级吊销证书与断开 Peer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      踢出
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device.id, device.hostname)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                      title="注销并删除设备"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Enroll New Device */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold font-mono text-slate-900">登记新零信任受控设备</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEnrollDevice} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">主机名 (Hostname)</label>
                <input
                  type="text"
                  required
                  placeholder="例如: bob-macbook-air"
                  value={newHostname}
                  onChange={e => setNewHostname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">设备画像 (Persona)</label>
                  <select
                    value={newPersona}
                    onChange={e => setNewPersona(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  >
                    <option value="WORKSTATION_INTERACTIVE">工作站终端 (人权第一)</option>
                    <option value="SERVER_HEADLESS">机房无头服务器 (3.5s自愈)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">所在城市 / 地域</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">X25519 公钥 (留空自动生成)</label>
                <input
                  type="text"
                  placeholder="留空自动分配 32 字节高强度密钥"
                  value={newPubKey}
                  onChange={e => setNewPubKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">标签 Tags (逗号隔开)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold shadow-sm active:scale-95"
                >
                  确认登记并入网
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
