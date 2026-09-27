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

  // ACL Rules mock/state
  const [aclList, setAclList] = useState([
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
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono text-slate-100">{network?.name || 'Production Zero-Trust Network'}</h3>
              <p className="text-xs text-slate-400 font-mono">Network ID: {network?.id || 'net_corp_zero_trust'}</p>
            </div>
          </div>
          <button 
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Dual-Stack CIDR Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* IPv4 CIDR */}
          <div>
            <label className="block text-xs font-mono text-slate-300 font-semibold mb-2">
              IPv4 Virtual CIDR
            </label>
            <div className="relative">
              <input
                type="text"
                value={ipv4Input}
                onChange={(e) => handleValidateIpv4(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border font-mono text-sm text-cyan-300 focus:outline-none focus:ring-2 ${
                  isIpv4Valid ? 'border-slate-700 focus:ring-cyan-500/40' : 'border-rose-500 focus:ring-rose-500/40'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv4Valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1.5">
              Dual-stack primary subnet for standard overlay traffic.
            </p>
          </div>

          {/* IPv6 CIDR (Feature Fix: Official UI missed this completely!) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-300 font-semibold">
                IPv6 Virtual CIDR (Autopilot Dual-Stack)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                Official Web Fix
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={ipv6Input}
                onChange={(e) => handleValidateIpv6(e.target.value)}
                placeholder="e.g. fd00:cafe:2026::/64"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border font-mono text-sm text-cyan-300 focus:outline-none focus:ring-2 ${
                  isIpv6Valid ? 'border-slate-700 focus:ring-cyan-500/40' : 'border-rose-500 focus:ring-rose-500/40'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv6Valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1.5">
              RFC 4291 compliant ULA range for IPv6 next-gen workloads.
            </p>
          </div>
        </div>
      </div>

      {/* Zero-Trust ACL Firewall Matrix */}
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h4 className="text-base font-bold font-mono text-slate-100">Zero-Trust ACL Policy Matrix</h4>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition">
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Priority</th>
                <th className="pb-3 font-semibold">Rule Name</th>
                <th className="pb-3 font-semibold">Source Tags</th>
                <th className="pb-3 font-semibold">Destination Tags</th>
                <th className="pb-3 font-semibold">Protocol / Port</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {aclList.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 text-slate-400 font-bold">{rule.priority}</td>
                  <td className="py-3 text-slate-200 font-medium">{rule.name}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rule.sourceTags.join(', ')}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rule.destTags.join(', ')}
                    </span>
                  </td>
                  <td className="py-3 text-cyan-400">
                    {rule.protocol} {rule.destPorts.length > 0 ? `:${rule.destPorts.join(',')}` : ':*'}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      rule.action === 'ALLOW' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-base font-bold font-mono text-slate-100">App Connectors (DNS Sniffing & /32 Routes)</h4>
              <p className="text-xs text-slate-400 font-mono">Dynamic route propagation and Technitium DNS synchronization</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition">
            <Plus className="w-3.5 h-3.5" />
            New Connector
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold font-mono text-cyan-300">{c.domainPattern}</div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Route: <span className="text-slate-200">{c.assignedCidr32}</span> → {c.targetHost}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Technitium Synced
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
