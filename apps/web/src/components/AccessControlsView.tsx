import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Code, Table, Check, Copy, AlertCircle, X } from 'lucide-react';
import { ACLRuleData, api } from '../lib/api';

interface AccessControlsViewProps {
  networkId: string;
  onToast: (msg: string) => void;
}

export const AccessControlsView: React.FC<AccessControlsViewProps> = ({ networkId, onToast }) => {
  const [rules, setRules] = useState<ACLRuleData[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('100');
  const [action, setAction] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [sourceTags, setSourceTags] = useState('tag:workstation');
  const [destTags, setDestTags] = useState('tag:database');
  const [protocol, setProtocol] = useState('TCP');
  const [ports, setPorts] = useState('443, 80');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRules = async () => {
    const list = await api.getAclRules(networkId);
    setRules(list);
  };

  useEffect(() => {
    loadRules();
  }, [networkId]);

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!window.confirm(`确定要删除策略规则 "${ruleName}" 吗？`)) return;
    const ok = await api.deleteAclRule(networkId, ruleId);
    if (ok) {
      onToast(`策略规则 "${ruleName}" 已删除`);
      loadRules();
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const parsedPorts = ports
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !isNaN(p));

    const sTags = sourceTags.split(',').map(s => s.trim()).filter(Boolean);
    const dTags = destTags.split(',').map(s => s.trim()).filter(Boolean);

    const ok = await api.createAclRule(networkId, {
      name: name.trim(),
      priority: Number(priority),
      action,
      protocol,
      sourceTags: sTags,
      destTags: dTags,
      destPorts: parsedPorts,
      description: description.trim()
    });

    setIsSubmitting(false);
    if (ok) {
      onToast(`零信任访问规则 "${name}" 已成功创建并应用`);
      setShowAddModal(false);
      setName('');
      setDescription('');
      loadRules();
    } else {
      alert('创建失败，请检查网络');
    }
  };

  // Generate Tailnet HUJSON representation
  const huJsonPolicy = JSON.stringify({
    "$schema": "https://tailscale.com/schema/hujson",
    "acls": rules.map(r => ({
      "action": r.action.toLowerCase(),
      "src": r.sourceTags?.length ? r.sourceTags : ["*"],
      "dst": (r.destTags?.length ? r.destTags : ["*"]).map((d: string) => 
        r.destPorts?.length ? `${d}:${r.destPorts.join(',')}` : `${d}:*`
      ),
      "proto": r.protocol.toLowerCase()
    })),
    "tagOwners": {
      "tag:server": ["autogroup:admin"],
      "tag:workstation": ["autogroup:members"],
      "tag:database": ["autogroup:admin"]
    }
  }, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(huJsonPolicy);
    setCopied(true);
    onToast('ACL 策略 JSON 已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            零信任访问控制策略 (Access Controls)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            基于源/目的设备身份标签实行纳秒级访问隔离，杜绝局域网横向渗透风险。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              可视化列表
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'json'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Tailnet JSON
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            添加访问规则
          </button>
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-6 pr-4">优先级</th>
                  <th className="py-3.5 px-4">策略名称</th>
                  <th className="py-3.5 px-4">动作 (Action)</th>
                  <th className="py-3.5 px-4">源标签 (Source)</th>
                  <th className="py-3.5 px-4">目的标签 / 网段 (Destination)</th>
                  <th className="py-3.5 px-4">协议与端口</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      当前网络暂无定制 ACL 规则，默认允许网内相互通信
                    </td>
                  </tr>
                ) : (
                  rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 pl-6 pr-4 font-mono font-bold text-slate-700">
                        {rule.priority}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{rule.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                          rule.action === 'ALLOW'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {rule.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {rule.sourceTags?.length > 0 ? rule.sourceTags.join(', ') : '* (Any)'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {rule.destTags?.length > 0 ? rule.destTags.join(', ') : '* (Any)'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {rule.protocol}:{rule.destPorts?.length > 0 ? rule.destPorts.join(', ') : '*'}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule.id, rule.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="删除规则"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400">
            <span className="font-mono">tailnet-policy.hujson</span>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制 JSON'}
            </button>
          </div>
          <pre className="p-6 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
            {huJsonPolicy}
          </pre>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">新建零信任访问策略</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">规则名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如: Allow-Developers-SSH"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">优先级 (1-1000)</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">动作 (Action)</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ALLOW">ALLOW (允许流量)</option>
                    <option value="DENY">DENY (拦截流量)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">源标签 (Source Tags)</label>
                  <input
                    type="text"
                    placeholder="tag:workstation"
                    value={sourceTags}
                    onChange={(e) => setSourceTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">目的标签 (Dest Tags/CIDR)</label>
                  <input
                    type="text"
                    placeholder="tag:database, 10.144.0.0/16"
                    value={destTags}
                    onChange={(e) => setDestTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">传输协议</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ANY">ANY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">端口范围 (以逗号分隔)</label>
                  <input
                    type="text"
                    placeholder="22, 80, 443"
                    value={ports}
                    onChange={(e) => setPorts(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">规则描述 (可选)</label>
                <input
                  type="text"
                  placeholder="说明规则业务场景"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? '保存中...' : '创建并应用'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
