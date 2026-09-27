import React from 'react';
import { Smartphone, Power, ShieldCheck, Wifi, ArrowDown, ArrowUp } from 'lucide-react';
import { DeviceData } from '../lib/api';

interface MobileWAPViewProps {
  devices: DeviceData[];
  onToggleIntent: (deviceId: string, currentIntent: string) => void;
}

export const MobileWAPView: React.FC<MobileWAPViewProps> = ({ devices, onToggleIntent }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Mobile Header Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-100">Autopilot Mobile WAP</h3>
            <p className="text-[11px] text-slate-400 font-mono">One-tap Remote Sleep & Roaming</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold">ONLINE</span>
        </div>
      </div>

      {/* Touch-Friendly Device Cards */}
      <div className="space-y-3">
        {devices.map((device) => {
          const isActive = device.userIntent === 'ACTIVE';
          const isPaused = device.userIntent === 'USER_PAUSED';

          return (
            <div
              key={device.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold font-mono text-slate-100">{device.hostname}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {device.persona === 'SERVER_HEADLESS' ? 'Server' : 'PC'}
                  </span>
                </div>
                <div className="text-xs font-mono text-cyan-400 mt-1">
                  {device.networks[0]?.virtualIpv4 || '10.144.1.x'}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>{device.city}</span>
                  <span>•</span>
                  <span>{isActive ? '12ms' : 'Sleeping'}</span>
                </div>
              </div>

              {/* Big Touch Toggle Button */}
              <button
                onClick={() => onToggleIntent(device.id, device.userIntent)}
                disabled={device.userIntent === 'ADMIN_DISABLED'}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10 shadow-lg'
                    : isPaused
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                <Power className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
