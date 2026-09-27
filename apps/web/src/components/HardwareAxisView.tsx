import React from 'react';
import { Server, Laptop, Power, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { DeviceData } from '../lib/api';

interface HardwareAxisViewProps {
  devices: DeviceData[];
  onToggleIntent: (deviceId: string, currentIntent: string) => void;
  onRevoke: (deviceId: string) => void;
}

export const HardwareAxisView: React.FC<HardwareAxisViewProps> = ({
  devices,
  onToggleIntent,
  onRevoke
}) => {
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

      {/* Hardware Devices List */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold font-mono text-slate-900">硬件拓扑与终端舰队</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              双轨画像治理机制 • 工作站终端本地控制权最高 vs 机房服务器 3.5s 集中自愈
            </p>
          </div>
        </div>

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
                        <h4 className="text-base font-bold font-mono text-slate-900">{device.hostname}</h4>
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
                      <span className="text-slate-500 block text-[10px]">VIRTUAL IPv6</span>
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
                      延迟: {isActive ? '14 ms' : '休眠离线'}
                    </span>
                    <span className="text-slate-400">
                      {isServer ? '机房服务器' : '终端工作站'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onToggleIntent(device.id, device.userIntent)}
                    disabled={isRevoked || isServer}
                    title={isServer ? '机房无头服务器由中台集中控制，禁止本地误断' : ''}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition ${
                      isActive
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-xs'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isActive ? '即时休眠 (<10ms)' : '恢复网络'}
                  </button>

                  <button
                    onClick={() => onRevoke(device.id)}
                    disabled={isRevoked}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-40 shadow-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    一键踢人
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
