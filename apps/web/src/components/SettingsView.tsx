import React, { useState } from 'react';
import { KeyRound, Terminal, Copy, Check, Server, Plus, Shield, RefreshCw, Cpu, Database } from 'lucide-react';
import { NetworkData } from '../lib/api';

interface SettingsViewProps {
  network: NetworkData | null;
  onToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ network, onToast }) => {
  const [platformTab, setPlatformTab] = useState<'linux' | 'macos' | 'windows' | 'docker'>('linux');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mock pre-auth keys
  const [preAuthKeys, setPreAuthKeys] = useState([
    {
      id: 'pak_live_9921a8f',
      key: 'tskey-auth-autopilot-k9921f00bca871928374829102938475',
      type: '可复用 (Reusable)',
      tags: ['tag:server'],
      createdAt: '2026-09-27',
      expiresIn: '89 天后'
    }
  ]);

  const hubUrl = window.location.origin;
  const netSecret = network?.networkSecret || 'autopilot-sec-9921';
  const netId = network?.id || 'net_corp_zero_trust';

  const scripts = {
    linux: `# 1. 下载并安装 Autopilot 受控守护进程
curl -fsSL ${hubUrl}/install.sh | sudo bash -s -- \\
  --hub "${hubUrl}" \\
  --network "${netId}" \\
  --secret "${netSecret}"

# 2. 检查守护进程状态
systemctl status autopilot-agent`,
    macos: `# macOS 终端一键安装 (支持 Apple Silicon 与 Intel)
curl -fsSL ${hubUrl}/install-darwin.sh | bash -s -- \\
  --hub "${hubUrl}" \\
  --network "${netId}" \\
  --secret "${netSecret}"`,
    windows: `# 以管理员身份启动 PowerShell 运行:
irm ${hubUrl}/install.ps1 | iex
autopilot-agent.exe join --hub "${hubUrl}" --network "${netId}" --secret "${netSecret}"`,
    docker: `# 启动轻量级无状态受控容器
docker run -d --name autopilot-agent \\
  --network host \\
  --cap-add NET_ADMIN \\
  --device /dev/net/tun \\
  -e AUTOPILOT_HUB="${hubUrl}" \\
  -e AUTOPILOT_NETWORK="${netId}" \\
  -e AUTOPILOT_SECRET="${netSecret}" \\
  ghcr.io/autopilot-network/agent:latest`
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scripts[platformTab]);
    setCopiedScript(true);
    onToast('部署指令已复制到剪贴板');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleGenerateKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const newKey = {
      id: `pak_${randomHex.slice(0, 8)}`,
      key: `tskey-auth-autopilot-${randomHex}`,
      type: '单次授权 (Single-use)',
      tags: ['tag:workstation'],
      createdAt: '刚刚',
      expiresIn: '30 天后'
    };
    setPreAuthKeys([newKey, ...preAuthKeys]);
    onToast('已生成新的预授权加入密钥 (Pre-Auth Key)');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          密钥与客户端部署 (Keys & Client Setup)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          管理受控节点预授权密钥 (Pre-Auth Keys)，并获取全平台 Agent 安装指令与官方 easytier-core 接管配置。
        </p>
      </div>

      {/* Pre-Auth Keys Card (Tailscale style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">预授权加入令牌 (Pre-Auth Keys)</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              用于无须人工干预的自动化脚本与 IDC 机房服务器无人值守静默入网。
            </p>
          </div>
          <button
            onClick={handleGenerateKey}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            生成新密钥
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 pl-6 pr-4">令牌标识</th>
                <th className="py-3 px-4">授权密钥 (Key)</th>
                <th className="py-3 px-4">类型</th>
                <th className="py-3 px-4">自动分配标签</th>
                <th className="py-3 px-4">有效期</th>
                <th className="py-3 pl-4 pr-6 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preAuthKeys.map(k => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 pl-6 pr-4 font-mono font-semibold text-slate-800">
                    {k.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {k.key.slice(0, 24)}...
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {k.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600">
                    {k.tags.join(', ')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {k.expiresIn}
                  </td>
                  <td className="py-3.5 pl-4 pr-6 text-right">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(k.key);
                        setCopiedKey(k.id);
                        onToast('令牌已复制到剪贴板');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
                    >
                      {copiedKey === k.id ? '已复制' : '复制完整令牌'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Quick Setup Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">受控端 Agent 极速安装指南</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            单二进制文件 (&lt; 8MB)，通过本地 RPC 释放接管，严禁破坏宿主物理网络。
          </p>

          {/* OS Switcher */}
          <div className="flex border-b border-slate-200 mt-4 -mb-6 space-x-6">
            {(['linux', 'macos', 'windows', 'docker'] as const).map(os => (
              <button
                key={os}
                onClick={() => setPlatformTab(os)}
                className={`pb-3 text-xs font-semibold capitalize border-b-2 transition ${
                  platformTab === os
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {os === 'macos' ? 'macOS' : os === 'linux' ? 'Linux (Systemd)' : os === 'windows' ? 'Windows' : 'Docker Container'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-900 text-slate-100 relative">
          <pre className="font-mono text-xs overflow-x-auto leading-relaxed">
            {scripts[platformTab]}
          </pre>
          <button
            onClick={handleCopyScript}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedScript ? '已复制' : '复制命令'}
          </button>
        </div>
      </div>

      {/* Central Hub Diagnostic Info */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-500">调度中枢版本 (Hub Version)</div>
          <div className="font-mono font-bold text-slate-900 mt-0.5">v1.0.0 (Isomorphic Edge)</div>
        </div>
        <div>
          <div className="text-slate-500">存储引擎 (Storage Engine)</div>
          <div className="font-mono font-bold text-slate-900 mt-0.5">SQLite (Local) / Cloudflare D1 (Cloud)</div>
        </div>
        <div>
          <div className="text-slate-500">中台服务根地址 (Hub Base URL)</div>
          <div className="font-mono font-bold text-indigo-600 mt-0.5 truncate">{hubUrl}</div>
        </div>
      </div>

    </div>
  );
};
