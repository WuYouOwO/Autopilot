import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Globe, Server, Check, X, Shield, ArrowRight } from 'lucide-react';
import { AppConnectorData, DeviceData, api } from '../lib/api';

interface AppConnectorsViewProps {
  networkId: string;
  devices: DeviceData[];
  onToast: (msg: string) => void;
}

export const AppConnectorsView: React.FC<AppConnectorsViewProps> = ({
  networkId,
  devices,
  onToast
}) => {
  const [connectors, setConnectors] = useState<AppConnectorData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [domain, setDomain] = useState('');
  const [cidr, setCidr] = useState('10.144.50.1/32');
  const [deviceId, setDeviceId] = useState('');
  const [targetHost, setTargetHost] = useState('');
  const [targetPort, setTargetPort] = useState('8080');
  const [syncTechnitium, setSyncTechnitium] = useState(true);

  const loadConnectors = async () => {
    const list = await api.getConnectors();
    setConnectors(list);
  };

  useEffect(() => {
    loadConnectors();
    const defaultGw = devices.find(d => d.tags?.includes('gateway') || d.persona === 'SERVER_HEADLESS');
    if (defaultGw) setDeviceId(defaultGw.id);
  }, [devices]);

  const handleDelete = async (id: string, domainName: string) => {
    if (!window.confirm(`确定要移除应用连接器 "${domainName}" 吗？`)) return;
    const ok = await api.deleteConnector(id);
    if (ok) {
      onToast(`应用连接器 "${domainName}" 已移除`);
      loadConnectors();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !targetHost.trim()) return;

    setIsSubmitting(true);
    const ok = await api.createConnector({
      networkId,
      domainPattern: domain.trim(),
      assignedCidr32: cidr.trim(),
      deviceId: deviceId || devices[0]?.id || 'dev_gw_hk01',
      targetHost: targetHost.trim(),
      targetPort: Number(targetPort) || 80,
      syncTechnitium
    });

    setIsSubmitting(false);
    if (ok) {
      onToast(`应用连接器 "${domain}" 注册成功，/32 增量路由已通告全网`);
      setShowModal(false);
      setDomain('');
      setTargetHost('');
      loadConnectors();
    } else {
      alert('创建失败，请稍后重试');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            应用连接器与私有 DNS (App Connectors & DNS)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            基于 DNS 探针与增量宣告 /32 CIDR 路由，实现免客户端配置的内网域名透明加速与反向代理。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          新建应用连接器
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-start gap-3 text-xs text-indigo-900">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold">云原生 App Connector 原理: </strong>
          终端请求企业内网域名时，Autopilot DNS 探针自动拦截并下发该域名的专用 /32 虚拟路由，由最近的边缘网关节点透明反向代理至机房后端服务，无需修改员工电脑 Hosts 或手工配置反代。
        </div>
      </div>

      {/* Connectors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-4">内网目标域名 (Domain)</th>
                <th className="py-3.5 px-4">增量宣告路由 (/32 CIDR)</th>
                <th className="py-3.5 px-4">出网代理网关</th>
                <th className="py-3.5 px-4">内网真实回源目标</th>
                <th className="py-3.5 px-4">Technitium DNS 同步</th>
                <th className="py-3.5 pl-4 pr-6 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {connectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    暂无已注册的应用连接器，点击右上角新建以纳管内网业务
                  </td>
                </tr>
              ) : (
                connectors.map(c => {
                  const gw = devices.find(d => d.id === c.deviceId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 pl-6 pr-4 font-mono font-semibold text-slate-900">
                        {c.domainPattern}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600 font-bold">
                        {c.assignedCidr32}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {gw ? gw.hostname : (c.deviceId || 'hk-edge-gw-01')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 flex items-center gap-1.5 pt-4">
                        <span>{c.targetHost}:{c.targetPort || 80}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                          c.technitiumSynced
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.technitiumSynced ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {c.technitiumSynced ? '已同步权威解析' : '本地路由'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <button
                          onClick={() => handleDelete(c.id, c.domainPattern)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="删除连接器"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Connector Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">新建应用连接器</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  企业内网目标域名 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: gitlab.corp.internal 或 *.k8s.local"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    增量宣告 /32 CIDR *
                  </label>
                  <input
                    type="text"
                    required
                    value={cidr}
                    onChange={(e) => setCidr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    负责路由的网关节点
                  </label>
                  <select
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  >
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.hostname} ({d.os})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    内网回源真实 IP / 主机 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.100"
                    value={targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    内网端口
                  </label>
                  <input
                    type="number"
                    value={targetPort}
                    onChange={(e) => setTargetPort(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="syncTech"
                  checked={syncTechnitium}
                  onChange={(e) => setSyncTechnitium(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500/20"
                />
                <label htmlFor="syncTech" className="text-xs text-slate-700 cursor-pointer">
                  自动同步解析记录至私有 Technitium DNS 服务器
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? '保存中...' : '注册连接器'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
