import React, { useState } from 'react';
import { Network, Shield, Plus, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { IPv4CIDRRegex, IPv6CIDRRegex } from '@autopilot/protocol';

interface NetworkAxisViewProps {
  network: any;
  onRefresh: () => void;
}

export const NetworkAxisView: React.FC<NetworkAxisViewProps> = ({ network, onRefresh }) => {
  const [ipv4Input, setIpv4Input] = useState(network?.ipv4Cidr || '10.144.0.0/16');
  const [ipv6Input, setIpv6Input] = useState(network?.ipv6Cidr || 'fd00:cafe:2026::/64');
  const [isIpv4Valid, setIsIpv4Valid] = useState(true);
  const [isIpv6Valid, setIsIpv6Valid] = useState(true);

  // ACL Rules list
  const [aclList] = useState([
    {
      id: 'acl_1',
      name: 'Allow Intra-Mesh DNS',
      priority: 10,
      protocol: 'UDP',
      sourceTags: ['*'],
      destTags: ['gateway'],
      destPorts: [53],
      action: 'ALLOW'
    },
    {
      id: 'acl_2',
      name: 'Allow Admin SSH to Headless IDC',
      priority: 20,
      protocol: 'TCP',
      sourceTags: ['security-eng'],
      destTags: ['production'],
      destPorts: [22],
      action: 'ALLOW'
    },
    {
      id: 'acl_3',
      name: 'Block Untagged Inter-VLAN',
      priority: 999,
      protocol: 'ANY',
      sourceTags: ['*'],
      destTags: ['*'],
      destPorts: [],
      action: 'DENY'
    }
  ]);

  // App Connectors
  const [connectors] = useState([
    {
      id: 'conn_1',
      domainPattern: 'gitlab.corp.internal',
      assignedCidr32: '10.144.254.10/32',
      targetHost: '192.168.1.100',
      technitiumSynced: true
    },
    {
      id: 'conn_2',
      domainPattern: 'k8s-api.corp.internal',
      assignedCidr32: '10.144.254.11/32',
      targetHost: '192.168.1.101',
      technitiumSynced: true
    }
  ]);

  const handleValidateIpv4 = (val: string) => {
    setIpv4Input(val);
    setIsIpv4Valid(IPv4CIDRRegex.test(val));
  };

  const handleValidateIpv6 = (val: string) => {
    setIpv6Input(val);
    setIsIpv6Valid(val === '' || IPv6CIDRRegex.test(val));
  };

  return (
    <div className="space-y-6">
      {/* Network Overview Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono text-slate-900">{network?.name || 'Production Zero-Trust Network'}</h3>
              <p className="text-xs text-slate-500 font-mono">网络唯一 ID: {network?.id || 'net_corp_zero_trust'}</p>
            </div>
          </div>
          <button 
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新状态
          </button>
        </div>

        {/* Dual-Stack CIDR Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* IPv4 CIDR */}
          <div>
            <label className="block text-xs font-mono text-slate-700 font-bold mb-2">
              IPv4 虚拟网段 (Virtual CIDR)
            </label>
            <div className="relative">
              <input
                type="text"
                value={ipv4Input}
                onChange={(e) => handleValidateIpv4(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border font-mono text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                  isIpv4Valid ? 'border-slate-300 focus:ring-sky-500/30' : 'border-rose-400 focus:ring-rose-500/30'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv4Valid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1.5">
              主干虚拟子网，支持全自动 DHCP 冲突检测与租约分配。
            </p>
          </div>

          {/* IPv6 CIDR (Feature Fix: Official UI missed this completely!) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-700 font-bold">
                IPv6 虚拟网段 (双栈首发，官方 Bug 补全)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold">
                官方缺失补全
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={ipv6Input}
                onChange={(e) => handleValidateIpv6(e.target.value)}
                placeholder="例如: fd00:cafe:2026::/64"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border font-mono text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                  isIpv6Valid ? 'border-slate-300 focus:ring-sky-500/30' : 'border-rose-400 focus:ring-rose-500/30'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv6Valid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1.5">
              RFC 4291 严谨规范 ULA 地址空间，赋能下一代云原生双栈业务。
            </p>
          </div>
        </div>
      </div>

      {/* Zero-Trust ACL Firewall Matrix */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-sky-600" />
            <h4 className="text-base font-bold font-mono text-slate-900">零信任 ACL 安全访问矩阵</h4>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-xs">
            <Plus className="w-3.5 h-3.5" />
            新建策略
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                <th className="py-2.5 px-3 font-semibold rounded-l-lg">优先级</th>
                <th className="py-2.5 px-3 font-semibold">规则名称</th>
                <th className="py-2.5 px-3 font-semibold">源标签 (Source Tags)</th>
                <th className="py-2.5 px-3 font-semibold">目的标签 (Dest Tags)</th>
                <th className="py-2.5 px-3 font-semibold">协议 / 端口</th>
                <th className="py-2.5 px-3 font-semibold rounded-r-lg">动作 (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aclList.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 text-slate-500 font-bold">{rule.priority}</td>
                  <td className="py-3 px-3 text-slate-900 font-medium">{rule.name}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {rule.sourceTags.join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {rule.destTags.join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sky-700 font-semibold">
                    {rule.protocol} {rule.destPorts.length > 0 ? `:${rule.destPorts.join(',')}` : ':*'}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      rule.action === 'ALLOW' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {rule.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* App Connector & DNS Sniffing */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-sky-600" />
            <div>
              <h4 className="text-base font-bold font-mono text-slate-900">App Connectors (应用加速探针与 /32 路由)</h4>
              <p className="text-xs text-slate-500 font-mono">DNS 嗅探探针联动，增量宣告 /32 CIDR 并同步 Technitium DNS</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-xs">
            <Plus className="w-3.5 h-3.5" />
            新建连接器
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold font-mono text-slate-900">{c.domainPattern}</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  动态路由: <span className="text-sky-700 font-bold">{c.assignedCidr32}</span> → {c.targetHost}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Technitium 已对齐
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
