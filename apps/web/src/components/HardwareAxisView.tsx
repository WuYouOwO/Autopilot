import React from 'react';
import { Server, Laptop, Power, ShieldAlert, Cpu, HardDrive, Wifi, Activity } from 'lucide-react';
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
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="text-xs font-mono text-slate-400">Total Enrolled Nodes</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{devices.length}</div>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="text-xs font-mono text-slate-400">Active Workstations</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {devices.filter(d => d.persona === 'WORKSTATION_INTERACTIVE' && d.userIntent === 'ACTIVE').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="text-xs font-mono text-slate-400">Expected Sleep (Paused)</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {devices.filter(d => d.userIntent === 'USER_PAUSED').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20">
          <div className="text-xs font-mono text-slate-400">Headless Servers</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {devices.filter(d => d.persona === 'SERVER_HEADLESS').length}
          </div>
        </div>
      </div>

      {/* Hardware Devices List */}
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold font-mono text-slate-100">Hardware Fleet Status</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Dual Persona Management • Local supremacy for workstations vs SSOT for servers
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
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isServer 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {isServer ? <Server className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold font-mono text-slate-100">{device.hostname}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-400">{device.os} • {device.clientVersion}</span>
                          <span className="text-xs font-mono text-slate-500">• {device.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      isPaused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {device.userIntent}
                    </span>
                  </div>

                  {/* Virtual IPs */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs flex justify-between">
                    <div>
                      <span className="text-slate-500 block text-[10px]">VIRTUAL IPv4</span>
                      <span className="text-cyan-300 font-semibold">{device.networks[0]?.virtualIpv4 || '10.144.1.x'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">VIRTUAL IPv6</span>
                      <span className="text-cyan-300 font-semibold">{device.networks[0]?.virtualIpv6 || 'fd00:cafe::x'}</span>
                    </div>
                  </div>

                  {/* Telemetry row */}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      CPU: {device.telemetry?.cpuUsagePercent ?? 8}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Latency: {isActive ? '14 ms' : 'Offline'}
                    </span>
                    <span className="text-slate-500">
                      {isServer ? 'Headless Server' : 'Workstation'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onToggleIntent(device.id, device.userIntent)}
                    disabled={isRevoked || isServer}
                    title={isServer ? 'Headless Servers are controlled centrally by SSOT' : ''}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isActive ? 'Pause (<10ms)' : 'Connect'}
                  </button>

                  <button
                    onClick={() => onRevoke(device.id)}
                    disabled={isRevoked}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition disabled:opacity-40"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Revoke
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
