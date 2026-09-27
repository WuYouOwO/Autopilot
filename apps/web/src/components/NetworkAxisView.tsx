import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Shield, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Trash2, 
  Save, 
  X,
  ExternalLink
} from 'lucide-react';
import { IPv4CIDRRegex, IPv6CIDRRegex } from '@autopilot/protocol';
import { api, ACLRuleData, AppConnectorData } from '../lib/api';

interface NetworkAxisViewProps {
  network: any;
  onRefresh: () => void;
}

export const NetworkAxisView: React.FC<NetworkAxisViewProps> = ({ network, onRefresh }) => {
  const [ipv4Input, setIpv4Input] = useState(network?.ipv4Cidr || '10.144.0.0/16');
  const [ipv6Input, setIpv6Input] = useState(network?.ipv6Cidr || 'fd00:cafe:2026::/64');
  const [isIpv4Valid, setIsIpv4Valid] = useState(true);
  const [isIpv6Valid, setIsIpv6Valid] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // ACL Rules state
  const [aclList, setAclList] = useState<ACLRuleData[]>([]);
  const [showAclModal, setShowAclModal] = useState(false);
  const [newAclName, setNewAclName] = useState('');
  const [newAclPriority, setNewAclPriority] = useState(50);
  const [newAclProtocol, setNewAclProtocol] = useState('TCP');
  const [newAclSourceTags, setNewAclSourceTags] = useState('*');
  const [newAclDestTags, setNewAclDestTags] = useState('*');
  const [newAclPorts, setNewAclPorts] = useState('');
  const [newAclAction, setNewAclAction] = useState<'ALLOW' | 'DENY'>('ALLOW');

  // App Connectors state
  const [connectors, setConnectors] = useState<AppConnectorData[]>([]);
  const [showConnModal, setShowConnModal] = useState(false);
  const [newConnDomain, setNewConnDomain] = useState('');
  const [newConnCidr, setNewConnCidr] = useState('10.144.254.20/32');
  const [newConnHost, setNewConnHost] = useState('');
  const [newConnPort, setNewConnPort] = useState(8080);
  const [newConnSyncDns, setNewConnSyncDns] = useState(true);

  // Sync with prop changes
  useEffect(() => {
    if (network) {
      setIpv4Input(network.ipv4Cidr);
      setIpv6Input(network.ipv6Cidr || '');
      loadAclAndConnectors(network.id);
    }
  }, [network]);

  const loadAclAndConnectors = async (netId: string) => {
    const rules = await api.getAclRules(netId);
    setAclList(rules);
    const conns = await api.getConnectors();
    setConnectors(conns);
  };

  const handleValidateIpv4 = (val: string) => {
    setIpv4Input(val);
    setIsIpv4Valid(IPv4CIDRRegex.test(val));
  };

  const handleValidateIpv6 = (val: string) => {
    setIpv6Input(val);
    setIsIpv6Valid(val === '' || IPv6CIDRRegex.test(val));
  };

  // Save CIDR configuration
  const handleSaveNetworkConfig = async () => {
    if (!isIpv4Valid || !isIpv6Valid) {
      alert('请检查 CIDR 格式是否有效后再保存！');
      return;
    }
    const netId = network?.id || 'net_corp_zero_trust';
    const success = await api.updateNetwork(netId, {
      ipv4Cidr: ipv4Input,
      ipv6Cidr: ipv6Input
    });
    if (success) {
      setSaveStatus('网段配置已成功下发至 D1 数据库与全网节点！');
      setTimeout(() => setSaveStatus(null), 4000);
      onRefresh();
    } else {
      alert('保存失败，请稍后重试');
    }
  };

  // Create ACL Rule
  const handleCreateAcl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAclName.trim()) return;

    const netId = network?.id || 'net_corp_zero_trust';
    const ports = newAclPorts
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !isNaN(p));

    const sourceTags = newAclSourceTags.split(',').map(s => s.trim()).filter(Boolean);
    const destTags = newAclDestTags.split(',').map(s => s.trim()).filter(Boolean);

    await api.createAclRule(netId, {
      name: newAclName,
      priority: Number(newAclPriority),
      action: newAclAction,
      protocol: newAclProtocol,
      sourceTags,
      destTags,
      destPorts: ports
    });

    setShowAclModal(false);
    setNewAclName('');
    loadAclAndConnectors(netId);
  };

  // Delete ACL Rule
  const handleDeleteAcl = async (ruleId: string) => {
    const netId = network?.id || 'net_corp_zero_trust';
    await api.deleteAclRule(netId, ruleId);
    setAclList(prev => prev.filter(r => r.id !== ruleId));
  };

  // Create App Connector
  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnDomain.trim() || !newConnHost.trim()) return;

    const netId = network?.id || 'net_corp_zero_trust';
    await api.createConnector({
      networkId: netId,
      domainPattern: newConnDomain,
      assignedCidr32: newConnCidr,
      targetHost: newConnHost,
      targetPort: Number(newConnPort),
      syncTechnitium: newConnSyncDns
    });

    setShowConnModal(false);
    setNewConnDomain('');
    setNewConnHost('');
    loadAclAndConnectors(netId);
  };

  // Delete App Connector
  const handleDeleteConnector = async (connId: string) => {
    await api.deleteConnector(connId);
    setConnectors(prev => prev.filter(c => c.id !== connId));
  };

  return (
    <div className="space-y-6">
      {/* Network Overview Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono text-slate-900">{network?.name || 'Production Zero-Trust Network'}</h3>
              <p className="text-xs text-slate-500 font-mono">网络唯一 ID: {network?.id || 'net_corp_zero_trust'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveNetworkConfig}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition shadow-sm active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              保存并应用网段
            </button>
            <button 
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新
            </button>
          </div>
        </div>

        {/* Save confirmation toast */}
        {saveStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

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
              主干虚拟子网，自动执行 DHCP 冲突检测与租约分发。
            </p>
          </div>

          {/* IPv6 CIDR */}
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
          <button 
            onClick={() => setShowAclModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-xs active:scale-95"
          >
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
                <th className="py-2.5 px-3 font-semibold">动作</th>
                <th className="py-2.5 px-3 font-semibold rounded-r-lg text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aclList.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 text-slate-500 font-bold">{rule.priority}</td>
                  <td className="py-3 px-3 text-slate-900 font-medium">{rule.name}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {Array.isArray(rule.sourceTags) ? rule.sourceTags.join(', ') : rule.sourceTags}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {Array.isArray(rule.destTags) ? rule.destTags.join(', ') : rule.destTags}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sky-700 font-semibold">
                    {rule.protocol} {rule.destPorts?.length > 0 ? `:${rule.destPorts.join(',')}` : ':*'}
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
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteAcl(rule.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="删除规则"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {aclList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-mono">
                    暂未添加 ACL 策略规则，默认允许网内互相访问
                  </td>
                </tr>
              )}
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
          <button 
            onClick={() => setShowConnModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            新建连接器
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold font-mono text-slate-900 flex items-center gap-1.5">
                  {c.domainPattern}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  动态路由: <span className="text-sky-700 font-bold">{c.assignedCidr32}</span> → {c.targetHost}{c.targetPort ? `:${c.targetPort}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Technitium
                </div>
                <button
                  onClick={() => handleDeleteConnector(c.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="删除连接器"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {connectors.length === 0 && (
            <div className="col-span-2 p-6 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl">
              暂无 App Connector 路由宣告，点击上方按钮新增
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create ACL Rule */}
      {showAclModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold font-mono text-slate-900">新建零信任 ACL 策略</h3>
              <button onClick={() => setShowAclModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAcl} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">规则名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 允许工程组访问 GitLab"
                  value={newAclName}
                  onChange={e => setNewAclName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">优先级 (小先)</label>
                  <input
                    type="number"
                    value={newAclPriority}
                    onChange={e => setNewAclPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">动作 (Action)</label>
                  <select
                    value={newAclAction}
                    onChange={e => setNewAclAction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  >
                    <option value="ALLOW">ALLOW (允许)</option>
                    <option value="DENY">DENY (阻断)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">传输协议</label>
                  <select
                    value={newAclProtocol}
                    onChange={e => setNewAclProtocol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ANY">ANY (任意)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">目的端口 (逗号隔开)</label>
                  <input
                    type="text"
                    placeholder="例如: 80,443,22"
                    value={newAclPorts}
                    onChange={e => setNewAclPorts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">源节点标签 (Source Tags)</label>
                <input
                  type="text"
                  placeholder="例如: workstation, dev"
                  value={newAclSourceTags}
                  onChange={e => setNewAclSourceTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">目的节点标签 (Dest Tags)</label>
                <input
                  type="text"
                  placeholder="例如: production, database"
                  value={newAclDestTags}
                  onChange={e => setNewAclDestTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAclModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold shadow-sm"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create App Connector */}
      {showConnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold font-mono text-slate-900">新建 App Connector 域名探针</h3>
              <button onClick={() => setShowConnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateConnector} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">域名匹配规则 (Domain Pattern)</label>
                <input
                  type="text"
                  required
                  placeholder="例如: jenkins.corp.internal"
                  value={newConnDomain}
                  onChange={e => setNewConnDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">分配增量 /32 CIDR</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 10.144.254.20/32"
                  value={newConnCidr}
                  onChange={e => setNewConnCidr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">真实后端 IP / 目标主机</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: 192.168.1.50"
                    value={newConnHost}
                    onChange={e => setNewConnHost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">端口 (可选)</label>
                  <input
                    type="number"
                    value={newConnPort}
                    onChange={e => setNewConnPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="syncDns"
                  checked={newConnSyncDns}
                  onChange={e => setNewConnSyncDns(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <label htmlFor="syncDns" className="text-slate-700 font-medium">
                  同步至 Technitium DNS 服务端
                </label>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold shadow-sm"
                >
                  创建并宣告 /32
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

