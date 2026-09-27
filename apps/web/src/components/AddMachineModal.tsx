import React, { useState } from 'react';
import { X, Server, Laptop, Terminal, KeyRound, Copy, Check } from 'lucide-react';
import { api, NetworkData } from '../lib/api';

interface AddMachineModalProps {
  network: NetworkData | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({ network, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'command' | 'manual'>('command');
  const [hostname, setHostname] = useState('');
  const [persona, setPersona] = useState<'SERVER_HEADLESS' | 'WORKSTATION_INTERACTIVE'>('WORKSTATION_INTERACTIVE');
  const [os, setOs] = useState('linux');
  const [pubKey, setPubKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const hubUrl = window.location.origin;
  const netSecret = network?.networkSecret || 'autopilot-sec-9921';
  const netId = network?.id || 'net_corp_zero_trust';

  const quickCommand = `curl -fsSL ${hubUrl}/install.sh | bash -s -- --hub ${hubUrl} --network ${netId} --secret ${netSecret}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(quickCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim()) return;

    setIsSubmitting(true);
    const key = pubKey.trim() || Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const res = await api.enrollDevice({
      hostname: hostname.trim(),
      persona,
      publicKeyX25519: key,
      networkId: netId,
      tags: persona === 'SERVER_HEADLESS' ? ['server', 'idc'] : ['workstation']
    });

    setIsSubmitting(false);
    if (res && (res.deviceId || !res.error)) {
      onSuccess(`受控设备 ${hostname} 登记成功！`);
      onClose();
    } else {
      alert('登记失败，请检查网络后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">添加新设备到网络</h3>
            <p className="text-xs text-slate-500 mt-0.5">目标网络: {network?.name || 'Production Zero-Trust SD-WAN'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('command')}
            className={`py-3 text-xs font-semibold border-b-2 mr-6 transition ${
              activeTab === 'command'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            一键安装脚本 (推荐)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            手动凭据登记
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'command' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                在目标终端机器（Linux / macOS / WSL）的终端中以 root 权限运行以下指令，Autopilot Agent 将全自动完成编译驱动拉起、本地 RPC 接管与中台授信绑定：
              </p>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  {quickCommand}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute right-2.5 top-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制代码'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  零信任元控制保障 (Meta-Control Plane):
                </div>
                <p>
                  • 严禁篡改底层真实物理网卡，仅通过官方 RPC 启停虚拟网卡 TUN 句柄；<br />
                  • 支持机房无头（3.5s 故障自愈）与员工交互（本地秒切秒连）双轨自适应。
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  主机名 (Hostname) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: office-ubuntu-node"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    操作系统 (OS)
                  </label>
                  <select
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="linux">Linux</option>
                    <option value="darwin">macOS</option>
                    <option value="windows">Windows</option>
                    <option value="freebsd">FreeBSD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    设备双轨画像 (Persona)
                  </label>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="WORKSTATION_INTERACTIVE">员工终端 (本地托盘秒控)</option>
                    <option value="SERVER_HEADLESS">机房无头 (中枢 SSOT 自愈)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Noise X25519 公钥 (可选，留空将自动生成)
                </label>
                <input
                  type="text"
                  placeholder="32字节十六进制公钥，如: e89c091f09bbac41..."
                  value={pubKey}
                  onChange={(e) => setPubKey(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? '登记中...' : '确认登记'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
