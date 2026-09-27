import React, { useState, useEffect } from 'react';
import { Network, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Copy, Check, Route, ShieldCheck } from 'lucide-react';
import { NetworkData, DeviceData, api } from '../lib/api';

const IPv4CIDRRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;
const IPv6CIDRRegex = /^\s*([0-9a-fA-F:]+)\/(12[0-8]|1[0-1][0-9]|[1-9]?[0-9])\s*$/;

interface SubnetsRoutingViewProps {
  network: NetworkData | null;
  devices: DeviceData[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export const SubnetsRoutingView: React.FC<SubnetsRoutingViewProps> = ({
  network,
  devices,
  onRefresh,
  onToast
}) => {
  const [ipv4, setIpv4] = useState(network?.ipv4Cidr || '10.144.0.0/16');
  const [ipv6, setIpv6] = useState(network?.ipv6Cidr || 'fd00:cafe:2026::/64');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (network) {
      setIpv4(network.ipv4Cidr);
      setIpv6(network.ipv6Cidr || '');
    }
  }, [network]);

  const isIpv4Valid = IPv4CIDRRegex.test(ipv4);
  const isIpv6Valid = ipv6 === '' || IPv6CIDRRegex.test(ipv6);

  const handleSave = async () => {
    if (!isIpv4Valid || !isIpv6Valid) {
      alert('请检查输入的 CIDR 格式是否有效！');
      return;
    }

    setIsSaving(true);
    const netId = network?.id || 'net_corp_zero_trust';
    const ok = await api.updateNetwork(netId, {
      ipv4Cidr: ipv4,
      ipv6Cidr: ipv6
    });

    setIsSaving(false);
    if (ok) {
      onToast('网段配置已保存并同步至 D1 数据库与全网节点');
      onRefresh();
    } else {
      alert('保存失败，请稍后重试');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(network?.networkSecret || '');
    setCopiedSecret(true);
    onToast('网络通信密钥已复制到剪贴板');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const gatewayNodes = devices.filter(d => d.tags?.includes('gateway') || d.persona === 'SERVER_HEADLESS');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" />
          虚拟网段与全网路由 (Subnets & Routing)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          定义全网主干 IPv4 与 IPv6 虚拟地址池，管理边缘子网路由通告与 DHCP 动态租约。
        </p>
      </div>

      {/* CIDR Config Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-mono">
              {network?.name || 'Production Zero-Trust SD-WAN'}
            </h4>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Network ID: {network?.id || 'net_corp_zero_trust'}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !isIpv4Valid || !isIpv6Valid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? '下发中...' : '保存并应用网段'}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IPv4 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              主干 IPv4 虚拟网段 (Virtual CIDR) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={ipv4}
                onChange={(e) => setIpv4(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  isIpv4Valid
                    ? 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                    : 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv4Valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              默认分配 /16 地址空间，支持至多 65,534 台受控设备无冲突 DHCP 分配。
            </p>
          </div>

          {/* IPv6 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                主干 IPv6 虚拟网段 (双栈首发，官方 Bug 补全)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                RFC 4291 规范
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={ipv6}
                onChange={(e) => setIpv6(e.target.value)}
                placeholder="例如: fd00:cafe:2026::/64"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  isIpv6Valid
                    ? 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                    : 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <div className="absolute right-3 top-3">
                {isIpv6Valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              补全原版 Web 控制台缺失的 IPv6 虚拟网段入口，赋能端到端 IPv6 原生漫游打洞。
            </p>
          </div>
        </div>

        {/* Network Secret */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            网状网络通信密钥 (P2P Mesh Network Secret)
          </label>
          <div className="flex items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={network?.networkSecret || 'autopilot-sec-9921'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleCopySecret}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSecret ? '已复制' : '复制密钥'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            受控端加入该子网时所用的预共享通信令牌，用于 Noise 协议初始握手协商。
          </p>
        </div>
      </div>

      {/* Subnet Routers Table (Tailscale style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">活跃子网路由代理 (Subnet Routers)</h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">{gatewayNodes.length} 台网关在线</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-4">路由节点主机</th>
                <th className="py-3.5 px-4">通告网段 (Advertised CIDR)</th>
                <th className="py-3.5 px-4">路由模式</th>
                <th className="py-3.5 px-4">虚拟 IP</th>
                <th className="py-3.5 pl-4 pr-6 text-right">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {gatewayNodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    暂无子网路由网关
                  </td>
                </tr>
              ) : (
                gatewayNodes.map(gw => {
                  const net = gw.networks?.find(n => n.networkId === network?.id) || gw.networks?.[0];
                  return (
                    <tr key={gw.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 pl-6 pr-4 font-mono font-semibold text-slate-800">
                        {gw.hostname}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600 font-semibold">
                        0.0.0.0/0 (Exit Node) • {network?.ipv4Cidr}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          全流量中继 / NAT
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {net?.virtualIpv4 || '10.144.0.1'}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          已通告生效
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
