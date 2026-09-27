import React from 'react';
import { Smartphone, Power } from 'lucide-react';
import { DeviceData } from '../lib/api';

interface MobileWAPViewProps {
  devices: DeviceData[];
  onToggleIntent: (deviceId: string, currentIntent: string) => void;
}

export const MobileWAPView: React.FC<MobileWAPViewProps> = ({ devices, onToggleIntent }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Mobile Header Banner */}
      <div className="p-4 rounded-2xl glass-panel bg-white/90 border border-slate-200/90 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-900">Autopilot 移动端 WAP</h3>
            <p className="text-[11px] text-slate-500 font-mono">一键远程休眠与漫游管控</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
          <span className="text-[11px] font-mono text-emerald-700 font-bold">ONLINE</span>
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
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between hover:border-sky-300 transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold font-mono text-slate-900">{device.hostname}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {device.persona === 'SERVER_HEADLESS' ? '机房服务器' : '工作站'}
                  </span>
                </div>
                <div className="text-xs font-mono text-sky-700 font-semibold mt-1">
                  {device.networks[0]?.virtualIpv4 || '10.144.1.x'}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                  <span>{device.city}</span>
                  <span>•</span>
                  <span>{isActive ? '12ms 畅通' : '预期休眠'}</span>
                </div>
              </div>

              {/* Big Touch Toggle Button */}
              <button
                onClick={() => onToggleIntent(device.id, device.userIntent)}
                disabled={device.userIntent === 'ADMIN_DISABLED'}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-sm'
                    : isPaused
                    ? 'bg-amber-50 text-amber-600 border border-amber-300 shadow-sm'
                    : 'bg-rose-50 text-rose-600 border border-rose-300 shadow-sm'
                }`}
              >
                <Power className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
