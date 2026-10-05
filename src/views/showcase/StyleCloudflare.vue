<script setup lang="ts">
import { ref } from 'vue'
import {
  Globe,
  ShieldCheck,
  Zap,
  Server,
  Layers,
  Activity,
  Plus,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  X,
  FileCode,
  Radio,
} from 'lucide-vue-next'

const activeSubTab = ref<'networks' | 'policies' | 'tunnels'>('networks')
const toastMessage = ref<string | null>(null)
const copiedIp = ref<string | null>(null)
const showConfigModal = ref(false)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

const copyIp = (text: string) => {
  navigator.clipboard.writeText(text)
  copiedIp.value = text
  showToast(`已复制 IP: ${text}`)
  setTimeout(() => {
    if (copiedIp.value === text) copiedIp.value = null
  }, 1800)
}

const editingNode = ref({
  name: 'edge-gateway-hk',
  network: 'default-mesh',
  ipv4: '10.144.144.1/24',
  ipv6: 'fd00:144:144::1/64',
  noiseEncryption: true,
  enableExitNode: true,
  subnets: '192.168.10.0/24',
  listeners: 'tcp://0.0.0.0:11010, udp://0.0.0.0:11010, wg://0.0.0.0:11011',
  peers: 'udp://sg-core.network:11010',
})

const cfNodes = ref([
  {
    id: 'cf-1',
    name: 'edge-gateway-hk',
    region: 'APAC (Hong Kong)',
    ipv4: '10.144.144.1',
    ipv6: 'fd00:144:144::1/64',
    status: 'online',
    encryption: 'Noise_IK',
    tunnelType: 'P2P Direct',
    latency: '14 ms',
    loss: '0.0%',
    role: 'Exit Gateway',
  },
  {
    id: 'cf-2',
    name: 'worker-tokyo-01',
    region: 'APAC (Tokyo)',
    ipv4: '10.144.144.2',
    ipv6: 'fd00:144:144::2/64',
    status: 'online',
    encryption: 'Noise_IK',
    tunnelType: 'P2P Direct',
    latency: '32 ms',
    loss: '0.0%',
    role: 'Edge Worker',
  },
  {
    id: 'cf-3',
    name: 'sg-relay-hub',
    region: 'APAC (Singapore)',
    ipv4: '10.144.144.5',
    ipv6: 'fd00:144:144::5/64',
    status: 'online',
    encryption: 'Noise_IK',
    tunnelType: 'Relay Tunnel',
    latency: '68 ms',
    loss: '0.2%',
    role: 'Relay Server',
  },
  {
    id: 'cf-4',
    name: 'frankfurt-backup-node',
    region: 'EMEA (Frankfurt)',
    ipv4: '10.144.144.12',
    ipv6: 'fd00:144:144::12/64',
    status: 'lost',
    encryption: 'Noise_IK',
    tunnelType: 'Disconnected',
    latency: '—',
    loss: '100%',
    role: 'Standby NAS',
  },
])

const zeroTrustRules = ref([
  { id: 1, name: 'Allow Dev to Internal MySQL', action: 'ALLOW', protocol: 'TCP', port: '3306', src: 'tag:developer', dst: 'tag:database' },
  { id: 2, name: 'Block Public SSH Access', action: 'BLOCK', protocol: 'TCP', port: '22', src: '0.0.0.0/0', dst: 'tag:prod' },
  { id: 3, name: 'Allow Mesh DNS Sync', action: 'ALLOW', protocol: 'UDP', port: '53', src: '10.144.144.0/24', dst: '10.144.144.1' },
])

const saveCfNode = () => {
  showConfigModal.value = false
  showToast(`已成功热同步节点 ${editingNode.value.name} 到全网控制器！`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cloudflare Top Banner & Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
          <Globe class="w-3.5 h-3.5" />
          <span>CLOUDFLARE ZERO TRUST · EDGE NETWORKS</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          虚拟局域网络控制台 (Virtual Networks)
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          当前网络: <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">mesh-production</span> · 基于 Noise_IK 端到端加密隧道，去中心化双栈 IPv6 自动穿透。
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="showToast('正在从边缘网络同步最新链路状态...')"
          class="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs flex items-center gap-1.5"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          刷新拓扑
        </button>
        <button
          @click="showConfigModal = true"
          class="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus class="w-3.5 h-3.5" />
          接入/配置边缘节点
        </button>
      </div>
    </div>

    <!-- Overview Callout (Cloudflare Banner with Pale Blue Base) -->
    <div class="p-3.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div class="flex items-center gap-2.5">
        <Lock class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          全网已强制开启 <strong>Noise_IK</strong> 非对称公钥加密；双栈 IPv6 CIDR 完整保留下发，拒绝任何字段截断。
        </span>
      </div>
      <button
        @click="showToast('已向网内全部节点广播下发最新 ACL 规则！')"
        class="px-3 py-1 text-xs font-bold rounded-md bg-orange-600 hover:bg-orange-700 text-white shrink-0 shadow-xs flex items-center gap-1.5 transition-colors"
      >
        <Zap class="w-3.5 h-3.5" />
        一键分发至全网节点 (Sync ACL)
      </button>
    </div>

    <!-- Cloudflare Analytics KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d] shadow-2xs">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>全网节点规模</span>
          <Server class="w-4 h-4 text-slate-400" />
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 flex items-baseline gap-2">
          <span>{{ cfNodes.length }}</span>
          <span class="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            3 在线
          </span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">跨地域全连接 Mesh 互通</div>
      </div>

      <div class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d] shadow-2xs">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>P2P 直连率</span>
          <Zap class="w-4 h-4 text-blue-500" />
        </div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 font-mono">
          75.0%
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">UDP/TCP 打洞直连通道</div>
      </div>

      <div class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d] shadow-2xs">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>双栈 IPv6 覆盖率</span>
          <Globe class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
          100%
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">所有节点完整保留 IPv6 CIDR</div>
      </div>

      <div class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-red-200 dark:border-red-900/60 shadow-2xs">
        <div class="flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-semibold">
          <span>高危预警与离线</span>
          <AlertTriangle class="w-4 h-4 text-red-500" />
        </div>
        <div class="text-2xl font-bold text-red-600 dark:text-red-400 mt-2 flex items-baseline gap-2">
          <span>1 台离线</span>
        </div>
        <div class="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">frankfurt-backup-node 心跳超时</div>
      </div>
    </div>

    <!-- Segmented Underline Tabs -->
    <div class="border-b border-slate-200/90 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold">
      <button
        @click="activeSubTab = 'networks'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-colors flex items-center gap-1.5',
          activeSubTab === 'networks'
            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        ]"
      >
        <Layers class="w-4 h-4" />
        边缘节点清单 (Edge Nodes)
      </button>

      <button
        @click="activeSubTab = 'policies'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-colors flex items-center gap-1.5',
          activeSubTab === 'policies'
            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        ]"
      >
        <ShieldCheck class="w-4 h-4" />
        零信任策略链 (Zero Trust ACL)
      </button>

      <button
        @click="activeSubTab = 'tunnels'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-colors flex items-center gap-1.5',
          activeSubTab === 'tunnels'
            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        ]"
      >
        <Radio class="w-4 h-4" />
        原生 TOML 快速校验 (Raw TOML)
      </button>
    </div>

    <!-- SUBTAB 1: Edge Nodes Table -->
    <div v-if="activeSubTab === 'networks'" class="rounded-lg border border-slate-200/90 dark:border-[#23334d] bg-white dark:bg-[#162136] overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/90 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th class="py-3 px-4">节点名称 & 角色</th>
              <th class="py-3 px-4">双栈 IP (IPv4 / IPv6)</th>
              <th class="py-3 px-4">加密与链路状态</th>
              <th class="py-3 px-4">往返时延 (RTT)</th>
              <th class="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr
              v-for="node in cfNodes"
              :key="node.id"
              class="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <span
                    :class="[
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      node.status === 'online' ? 'bg-emerald-500' : 'bg-red-500 ring-4 ring-red-500/20'
                    ]"
                  />
                  <div>
                    <div class="font-bold text-slate-900 dark:text-slate-100">
                      {{ node.name }}
                    </div>
                    <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {{ node.region }} · {{ node.role }}
                    </div>
                  </div>
                </div>
              </td>

              <td class="py-3 px-4 font-mono text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-800 dark:text-slate-200 font-medium">{{ node.ipv4 }}</span>
                  <button
                    @click="copyIp(node.ipv4)"
                    class="text-slate-400 hover:text-blue-600 p-0.5"
                    title="复制 IPv4"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
                <div class="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold text-[10px] mt-0.5">
                  <span class="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-[9px]">IPv6</span>
                  <span>{{ node.ipv6 }}</span>
                  <button
                    @click="copyIp(node.ipv6)"
                    class="text-slate-400 hover:text-blue-600 p-0.5"
                    title="复制 IPv6"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold',
                      node.status === 'online' && node.tunnelType === 'P2P Direct'
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : node.status === 'online'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                    ]"
                  >
                    {{ node.tunnelType }}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-mono">
                    {{ node.encryption }}
                  </span>
                </div>
              </td>

              <td class="py-3 px-4 font-mono">
                <span
                  :class="[
                    'text-xs font-semibold',
                    node.status === 'lost'
                      ? 'text-red-500'
                      : parseInt(node.latency) > 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  ]"
                >
                  {{ node.latency }}
                </span>
              </td>

              <td class="py-3 px-4 text-right">
                <button
                  @click="showConfigModal = true"
                  class="px-3 py-1 rounded text-xs font-semibold border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
                >
                  管理实例
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SUBTAB 2: Zero Trust ACL Policies -->
    <div v-if="activeSubTab === 'policies'" class="space-y-4">
      <div class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d] shadow-2xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
              全网访问控制规则 (Mesh ACL Chains)
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              基于安全组标签与端口的端到端访问控制，拦截规则将在节点内核直接丢包。
            </p>
          </div>
          <button
            @click="showToast('添加新零信任规则')"
            class="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-xs flex items-center gap-1"
          >
            <Plus class="w-3.5 h-3.5" /> 新建 ACL 规则
          </button>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          <div
            v-for="rule in zeroTrustRules"
            :key="rule.id"
            class="py-3 flex items-center justify-between text-xs"
          >
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider',
                  rule.action === 'ALLOW'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 ring-2 ring-red-500/30'
                ]"
              >
                {{ rule.action }}
              </span>
              <div>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ rule.name }}</span>
                <span class="ml-2 font-mono text-[11px] text-slate-500">
                  {{ rule.protocol }} / {{ rule.port }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <span class="text-slate-500 font-mono text-[11px]">
                {{ rule.src }} <span class="text-slate-400">➔</span> {{ rule.dst }}
              </span>
              <button
                @click="showToast(`已删除规则: ${rule.name}`)"
                class="text-red-600 hover:underline text-[11px] font-semibold"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBTAB 3: Raw TOML Preview -->
    <div v-if="activeSubTab === 'tunnels'" class="p-4 rounded-lg bg-white dark:bg-[#162136] border border-slate-200/90 dark:border-[#23334d]">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <FileCode class="w-4 h-4 text-blue-600" />
          全节点原生 TOML 配置生成器 (Zero Truncation)
        </span>
        <button
          @click="showToast('TOML 配置语法已校验通过，无截断风险！')"
          class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
        >
          语法验证通过 (Valid)
        </button>
      </div>
      <div class="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
        <pre>[network_identity]
network_name = "mesh-production"
network_secret = "secret-12345"

# 双栈 IPv4 与 IPv6 原生无损参数
ipv4 = "10.144.144.1/24"
ipv6 = "fd00:144:144::1/64"

listeners = [
    "tcp://0.0.0.0:11010",
    "udp://0.0.0.0:11010",
    "wg://0.0.0.0:11011",
]

[[peer]]
uri = "udp://sg-core.network:11010"</pre>
      </div>
    </div>

    <!-- Cloudflare Modal (配置边缘节点弹窗) -->
    <div
      v-if="showConfigModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="showConfigModal = false" />
      <div class="relative z-10 w-full max-w-xl bg-white dark:bg-[#162136] rounded-xl border border-slate-200/90 dark:border-[#23334d] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe class="w-4 h-4 text-blue-600" />
              配置边缘节点双栈网络参数
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cloudflare 风格弹窗表单 · 完整保留 IPv6 前缀
            </p>
          </div>
          <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <div class="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded text-orange-900 dark:text-orange-200 leading-relaxed text-[11px] flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-orange-600 shrink-0" />
            <span>修改后的 IP 与监听端口将在保存后直接推送给该节点核心并热生效。</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-800 dark:text-slate-200 mb-1">节点名称</label>
              <input
                v-model="editingNode.name"
                class="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-800 dark:text-slate-200 mb-1">所属网络</label>
              <input
                v-model="editingNode.network"
                class="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-800 dark:text-slate-200 mb-1">虚拟 IPv4 (CIDR)</label>
              <input
                v-model="editingNode.ipv4"
                class="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label class="block font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                虚拟 IPv6 (完整 CIDR 双栈)
              </label>
              <input
                v-model="editingNode.ipv6"
                class="w-full px-3 py-1.5 rounded border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 font-mono font-bold text-blue-700 dark:text-blue-300"
              />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-800 dark:text-slate-200 mb-1">监听地址与协议</label>
            <input
              v-model="editingNode.listeners"
              class="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-800 dark:text-slate-200 mb-1">对等节点 Peers</label>
            <input
              v-model="editingNode.peers"
              class="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div class="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            @click="showConfigModal = false"
            class="px-3.5 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            取消
          </button>
          <button
            @click="saveCfNode"
            class="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            保存并热推到核心
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-xl flex items-center gap-2"
    >
      <Check class="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
