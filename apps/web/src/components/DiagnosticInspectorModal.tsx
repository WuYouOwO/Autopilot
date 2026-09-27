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
  Cpu 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-slate-800">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              node.shape === 'HEXAGON' 
                ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                : isServer 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'bg-sky-50 text-sky-600 border border-sky-200'
            }`}>
              {node.shape === 'HEXAGON' ? <ShieldCheck className="w-6 h-6" /> : isServer ? <Server className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-mono tracking-tight text-slate-900">{node.label}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase font-bold ${
                  isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  isPaused ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {node.userIntent || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {node.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Persona & Guardrail Notice */}
        <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">设备画像 (Persona):</span>
            <span className="font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
              {node.persona || 'WORKSTATION_INTERACTIVE'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {isServer ? '声明式管控 (3.5s 心跳自愈)' : '人权第一 (本地秒断秒连，禁止强拉)'}
          </span>
        </div>

        {/* Dual-Stack Network IPs */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-mono block mb-1">虚拟 IPv4 地址</span>
            <span className="text-sm font-mono text-sky-700 font-bold">
              {node.virtualIpv4 || '10.144.1.x'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-mono block mb-1">虚拟 IPv6 地址 (双栈首发)</span>
            <span className="text-sm font-mono text-sky-700 font-bold truncate block">
              {node.virtualIpv6 || 'fd00:cafe:2026::x'}
            </span>
          </div>
        </div>

        {/* Telemetry & Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-[11px] text-slate-500">延迟 / 链路</div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {isActive ? '12 ms (Direct P2P)' : '已断开'}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-sky-600" />
            <div>
              <div className="text-[11px] text-slate-500">CPU 负载</div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {node.telemetry?.cpuUsagePercent ?? 8}%
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-indigo-600" />
            <div>
              <div className="text-[11px] text-slate-500">地理与云厂商</div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {node.geo?.city || 'Tokyo'} ({node.geo?.cloudProvider || 'EDGE'})
              </div>
            </div>
          </div>
        </div>

        {/* X25519 Key */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-6 flex items-center gap-2 font-mono text-xs">
          <Key className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-slate-500 shrink-0">X25519 公钥:</span>
          <span className="truncate text-slate-700">
            {node.publicKeyX25519 || '7d9834b6b66b7c4a179e8cbb6c79a4c56891000a982348b610c4d81234567890'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleIntent(node.id, node.userIntent || 'ACTIVE')}
              disabled={isRevoked}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition ${
                isActive 
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-xs' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-xs'
              } disabled:opacity-50`}
            >
              <Power className="w-4 h-4" />
              {isActive ? '即时休眠 (Pause <10ms)' : '恢复连接 (Resume)'}
            </button>
          </div>

          <button
            onClick={() => onRevoke(node.id)}
            disabled={isRevoked}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            一键毫秒踢人 (Revoke)
          </button>
        </div>

      </div>
    </div>
  );
};
