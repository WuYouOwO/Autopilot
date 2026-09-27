import React from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Server, 
  Laptop, 
  Power, 
  Key, 
  Globe, 
  Cpu, 
  HardDrive 
} from 'lucide-react';

interface DiagnosticModalProps {
  node: any;
  onClose: () => void;
  onToggleIntent: (nodeId: string, currentIntent: string) => void;
  onRevoke: (nodeId: string) => void;
}

export const DiagnosticInspectorModal: React.FC<DiagnosticModalProps> = ({
  node,
  onClose,
  onToggleIntent,
  onRevoke
}) => {
  if (!node) return null;

  const isServer = node.persona === 'SERVER_HEADLESS';
  const isActive = node.userIntent === 'ACTIVE';
  const isPaused = node.userIntent === 'USER_PAUSED';
  const isRevoked = node.userIntent === 'ADMIN_DISABLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl p-6 shadow-2xl border border-cyan-500/20 text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              node.shape === 'HEXAGON' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : isServer 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}>
              {node.shape === 'HEXAGON' ? <ShieldCheck className="w-6 h-6" /> : isServer ? <Server className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-mono tracking-tight">{node.label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                  isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  isPaused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {node.userIntent || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {node.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Persona & Guardrail Notice */}
        <div className="my-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-300">Device Persona:</span>
            <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              {node.persona || 'WORKSTATION_INTERACTIVE'}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {isServer ? 'Declarative SSOT (3.5s Auto-Heal)' : 'Supreme Local Rights (Instant Toggle)'}
          </span>
        </div>

        {/* Dual-Stack Network IPs */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
            <span className="text-xs text-slate-400 font-mono block mb-1">Virtual IPv4 Address</span>
            <span className="text-sm font-mono text-cyan-400 font-semibold">
              {node.virtualIpv4 || '10.144.1.x (Auto-Allocated)'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
            <span className="text-xs text-slate-400 font-mono block mb-1">Virtual IPv6 Address</span>
            <span className="text-sm font-mono text-cyan-400 font-semibold truncate block">
              {node.virtualIpv6 || 'fd00:cafe:2026::x (Dual-Stack)'}
            </span>
          </div>
        </div>

        {/* Telemetry & Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400">Latency / Tunnel</div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {isActive ? '12 ms (Direct P2P)' : 'Disconnected'}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[11px] text-slate-400">CPU Load</div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {node.telemetry?.cpuUsagePercent ?? 8}%
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[11px] text-slate-400">Geo & Cloud</div>
              <div className="text-sm font-mono font-semibold text-slate-200">
                {node.geo?.city || 'Tokyo'} ({node.geo?.cloudProvider || 'EDGE'})
              </div>
            </div>
          </div>
        </div>

        {/* X25519 Key */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 mb-6 flex items-center gap-2 font-mono text-xs">
          <Key className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-slate-400 shrink-0">X25519 PubKey:</span>
          <span className="truncate text-slate-300">
            {node.publicKeyX25519 || '7d9834b6b66b7c4a179e8cbb6c79a4c56891000a982348b610c4d81234567890'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleIntent(node.id, node.userIntent || 'ACTIVE')}
              disabled={isRevoked}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition ${
                isActive 
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
              } disabled:opacity-50`}
            >
              <Power className="w-4 h-4" />
              {isActive ? 'Instant Pause (预期休眠)' : 'Resume Tunnel (立即连接)'}
            </button>
          </div>

          <button
            onClick={() => onRevoke(node.id)}
            disabled={isRevoked}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            一键毫秒踢人 (Revoke)
          </button>
        </div>

      </div>
    </div>
  );
};
