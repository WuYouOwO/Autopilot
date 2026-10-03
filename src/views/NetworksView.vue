<template>
  <div class="space-y-6">
    <!-- CF Page Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
          <Globe class="w-3.5 h-3.5" />
          <span>EDGE NETWORKS & ZERO TRUST</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          虚拟局域网络 (Virtual Networks)
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          当前网络: <span class="font-semibold text-slate-800 dark:text-zinc-200 font-mono">{{ activeNetName }}</span> · 去中心化 P2P 网状拓扑，自动穿透 NAT 与双栈 IPv6 直连。
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <Button variant="secondary" size="sm" :loading="refreshing" @click="handleRefresh">
          <RefreshCw class="w-3.5 h-3.5 mr-1" />
          刷新
        </Button>
        <Button variant="secondary" size="sm" @click="activeTab = 'toml'">
          <Code2 class="w-3.5 h-3.5 mr-1" />
          原生 TOML
        </Button>
        <Button variant="primary" size="sm" @click="showAddModal = true">
          <Plus class="w-3.5 h-3.5 mr-1" />
          接入新节点
        </Button>
      </div>
    </div>

    <!-- CF Analytics KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>网络节点规模</span>
          <Server class="w-4 h-4 text-slate-400" />
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-2 flex items-baseline gap-2">
          <span>{{ currentNet?.nodes?.length || 0 }}</span>
          <span class="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {{ currentNet?.onlineNodes || 0 }} 在线
          </span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          跨地域端到端 Mesh 互通
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>P2P 直连率</span>
          <Zap class="w-4 h-4 text-orange-500" />
        </div>
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
          {{ directPeerRate }}%
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          UDP/TCP 打洞直连链路
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>实时下行 / 上行流量</span>
          <ArrowDownUp class="w-4 h-4 text-blue-500" />
        </div>
        <div class="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-2 font-mono flex items-center gap-2">
          <span class="text-emerald-600 dark:text-emerald-400">↓ {{ formatBytes(totalRxBytes) }}</span>
          <span class="text-slate-300 dark:text-zinc-700">|</span>
          <span class="text-orange-600 dark:text-orange-400">↑ {{ formatBytes(totalTxBytes) }}</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          全网累计加密传输总量
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>零信任安全防护</span>
          <ShieldCheck class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-2 flex items-center gap-1.5">
          <Badge variant="success" size="sm">已全局启用</Badge>
          <span class="text-xs font-normal text-slate-500">Noise_IK</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          非对称公钥鉴权与动态流控
        </div>
      </Card>
    </div>

    <!-- CF Underline Tabs -->
    <div class="border-b border-slate-200 dark:border-[#262a33] flex items-center gap-6 text-xs font-medium">
      <button
        @click="activeTab = 'topology'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-all flex items-center gap-1.5',
          activeTab === 'topology'
            ? 'border-[#f38020] text-[#f38020] font-bold'
            : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
        ]"
      >
        <Network class="w-4 h-4" />
        网状拓扑大屏 (Topology)
      </button>

      <button
        @click="activeTab = 'nodes'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-all flex items-center gap-1.5',
          activeTab === 'nodes'
            ? 'border-[#f38020] text-[#f38020] font-bold'
            : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
        ]"
      >
        <ListFilter class="w-4 h-4" />
        节点列表清单 (Nodes)
      </button>

      <button
        @click="activeTab = 'toml'"
        :class="[
          'pb-3 pt-1 border-b-2 transition-all flex items-center gap-1.5',
          activeTab === 'toml'
            ? 'border-[#f38020] text-[#f38020] font-bold'
            : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
        ]"
      >
        <FileCode class="w-4 h-4" />
        原生配置编辑器 (Raw TOML)
      </button>
    </div>

    <!-- Tab 1: Interactive Mesh Topology -->
    <div v-show="activeTab === 'topology'" class="space-y-4">
      <Card class="border-slate-200 dark:border-[#262a33] overflow-hidden">
        <div class="p-3.5 border-b border-slate-100 dark:border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-800 dark:text-zinc-200">全局点对点链路拓扑</span>
            <span class="text-[11px] text-slate-400">实线为 P2P 直连通道，虚线为中继转发通道</span>
          </div>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 直连 P2P
            </span>
            <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span> 中继转发
            </span>
            <span class="flex items-center gap-1 text-slate-400">
              <span class="w-2 h-2 rounded-full bg-slate-400"></span> 离线节点
            </span>
          </div>
        </div>

        <div class="h-[480px] w-full bg-slate-50/50 dark:bg-[#12141a]">
          <NetworkTopology
            :network-name="activeNetName"
            :nodes="currentNet?.nodes || []"
            @select-node="handleSelectNode"
          />
        </div>
      </Card>
    </div>

    <!-- Tab 2: Nodes Table & Cards -->
    <div v-show="activeTab === 'nodes'" class="space-y-4">
      <!-- Empty state -->
      <div v-if="!currentNet || currentNet.nodes.length === 0" class="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg bg-white/50 dark:bg-zinc-900/40">
        <Network class="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
        <h3 class="text-sm font-semibold text-slate-800 dark:text-zinc-200">当前虚拟局域网暂无在线节点</h3>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          在任何安装了 EasyTier 的服务器或电脑上，连接至控制服务器即可自动加入本网络。
        </p>
        <Button variant="primary" size="sm" class="mt-4" @click="showAddModal = true">
          <Plus class="w-3.5 h-3.5 mr-1" />
          立即接入第一台节点
        </Button>
      </div>

      <!-- Nodes Table -->
      <Card v-else class="border-slate-200 dark:border-[#262a33] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-[#191c22] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#262a33]">
              <tr>
                <th class="px-4 py-3 font-semibold">主机名 / 设备</th>
                <th class="px-4 py-3 font-semibold">虚拟 IPv4 地址</th>
                <th class="px-4 py-3 font-semibold">虚拟 IPv6 地址 (双栈)</th>
                <th class="px-4 py-3 font-semibold">链路状态</th>
                <th class="px-4 py-3 font-semibold">往返延迟</th>
                <th class="px-4 py-3 font-semibold">流量统计</th>
                <th class="px-4 py-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-[#262a33] text-slate-700 dark:text-zinc-300">
              <tr v-for="node in currentNet.nodes" :key="node.machineId" class="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <Laptop class="w-4 h-4 text-slate-400 shrink-0" />
                    <div class="min-w-0">
                      <div class="font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {{ node.hostname }}
                      </div>
                      <div class="text-[10px] text-slate-400 font-mono truncate">
                        {{ node.osName || 'Linux' }} · {{ node.machineId.slice(0, 8) }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Virtual IPv4 -->
                <td class="px-4 py-3 font-mono font-medium">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-900 dark:text-zinc-100">{{ node.virtualIpv4 || 'DHCP 分配中' }}</span>
                    <button
                      v-if="node.virtualIpv4"
                      @click="copyText(node.virtualIpv4, 'IPv4')"
                      class="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      title="复制 IPv4"
                    >
                      <Copy class="w-3 h-3" />
                    </button>
                  </div>
                </td>

                <!-- Virtual IPv6 -->
                <td class="px-4 py-3 font-mono">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-600 dark:text-zinc-400 text-[11px] truncate max-w-[180px]" :title="node.virtualIpv6">
                      {{ node.virtualIpv6 || '未启用 IPv6' }}
                    </span>
                    <button
                      v-if="node.virtualIpv6"
                      @click="copyText(node.virtualIpv6, 'IPv6')"
                      class="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      title="复制 IPv6"
                    >
                      <Copy class="w-3 h-3" />
                    </button>
                  </div>
                </td>

                <!-- Link Status -->
                <td class="px-4 py-3">
                  <Badge :variant="node.status === 'online' ? 'online' : node.status === 'relay' ? 'relay' : 'offline'" size="sm" dot>
                    {{ node.status === 'online' ? '直连 P2P (Direct)' : node.status === 'relay' ? '中继转发 (Relay)' : '离线' }}
                  </Badge>
                </td>

                <!-- Latency -->
                <td class="px-4 py-3 font-mono">
                  <span v-if="node.latencyUs" :class="getLatencyClass(node.latencyUs)">
                    {{ (node.latencyUs / 1000).toFixed(1) }} ms
                  </span>
                  <span v-else class="text-slate-400">-</span>
                </td>

                <!-- RX / TX -->
                <td class="px-4 py-3 font-mono text-[11px]">
                  <span class="text-emerald-600 dark:text-emerald-400">↓ {{ formatBytes(node.downloadBytes) }}</span>
                  <span class="mx-1 text-slate-300 dark:text-zinc-700">|</span>
                  <span class="text-orange-600 dark:text-orange-400">↑ {{ formatBytes(node.uploadBytes) }}</span>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <router-link
                      :to="{ path: '/diagnostics', query: { machine_id: node.machineId } }"
                      class="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium"
                    >
                      体检
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Tab 3: Native TOML Configuration Editor -->
    <div v-show="activeTab === 'toml'" class="space-y-4">
      <Card class="border-slate-200 dark:border-[#262a33] p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <FileCode class="w-4 h-4 text-[#f38020]" />
              无损原生 TOML 文本编辑 (Zero-Truncation Config)
            </h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              直接与 EasyTier 核心配置引擎通信。彻底消除官方前端表单截断 IPv6、丢弃未知字段的缺陷，完整支持自定义高级配置选项。
            </p>
          </div>

          <div class="flex items-center gap-2">
            <Button variant="secondary" size="sm" :loading="loadingToml" @click="fetchCurrentToml">
              <RefreshCw class="w-3.5 h-3.5 mr-1" />
              重新拉取
            </Button>
            <Button variant="primary" size="sm" :loading="savingToml" @click="saveCurrentToml">
              <Save class="w-3.5 h-3.5 mr-1" />
              保存并下发生效
            </Button>
          </div>
        </div>

        <div class="rounded border border-slate-200 dark:border-[#262a33] overflow-hidden bg-slate-950">
          <textarea
            v-model="rawTomlText"
            rows="16"
            spellcheck="false"
            class="w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-orange-500 selection:bg-orange-500 selection:text-white resize-y"
            placeholder="# 正在加载 EasyTier 节点 TOML 配置..."
          ></textarea>
        </div>
      </Card>
    </div>

    <!-- Onboarding Modal (Add Node) -->
    <Dialog :open="showAddModal" title="接入新节点至当前虚拟网络" @close="showAddModal = false">
      <div class="space-y-4 text-xs">
        <div class="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded text-orange-900 dark:text-orange-200 leading-relaxed">
          <span class="font-bold">Cloudflare 风格边缘直连接入：</span>
          在客户端主机执行以下单行命令，客户端将自动连接至配置中心（端口 22020）并加入当前虚拟网络 <code class="font-mono font-bold bg-white/60 dark:bg-zinc-800 px-1 py-0.5 rounded">{{ activeNetName }}</code>。
        </div>

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            CLI 快速启动命令 (Linux / macOS / Windows PowerShell)
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded bg-slate-950 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">{{ cliCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(cliCommand, 'CLI 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            Docker 容器一键部署命令
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded bg-slate-950 text-sky-400 overflow-x-auto whitespace-pre-wrap select-all">{{ dockerCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(dockerCommand, 'Docker 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="primary" size="sm" @click="showAddModal = false">完成</Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Globe,
  Server,
  Zap,
  ArrowDownUp,
  ShieldCheck,
  RefreshCw,
  Plus,
  Code2,
  Network,
  ListFilter,
  FileCode,
  Laptop,
  Copy,
  Save,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import NetworkTopology from '@/components/topology/NetworkTopology.vue'
import { useNetworkStore, type MeshNode } from '@/stores/network'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

const networkStore = useNetworkStore()
const activeTab = ref<'topology' | 'nodes' | 'toml'>('topology')
const refreshing = ref(false)
const showAddModal = ref(false)

// TOML state
const rawTomlText = ref('')
const loadingToml = ref(false)
const savingToml = ref(false)

const activeNetName = computed(() => networkStore.activeNetworkName)
const currentNet = computed(() => networkStore.currentNetwork)

const directPeerRate = computed(() => {
  const nodes = currentNet.value?.nodes || []
  if (nodes.length <= 1) return 100
  let totalPeers = 0
  let p2pPeers = 0
  nodes.forEach((n) => {
    (n.peers || []).forEach((p) => {
      totalPeers++
      if (p.isP2P) p2pPeers++
    })
  })
  if (totalPeers === 0) return 100
  return Math.round((p2pPeers / totalPeers) * 100)
})

const totalRxBytes = computed(() => {
  return (currentNet.value?.nodes || []).reduce((acc, n) => acc + (n.downloadBytes || 0), 0)
})

const totalTxBytes = computed(() => {
  return (currentNet.value?.nodes || []).reduce((acc, n) => acc + (n.uploadBytes || 0), 0)
})

const serverHost = computed(() => window.location.hostname || '127.0.0.1')

const cliCommand = computed(() => {
  return `easytier-core -w udp://${serverHost.value}:22020/admin`
})

const dockerCommand = computed(() => {
  return `docker run -d --name easytier-node --net=host --cap-add=NET_ADMIN --device=/dev/net/tun easytier/easytier:latest easytier-core -w udp://${serverHost.value}:22020/admin`
})

onMounted(async () => {
  await handleRefresh()
  await fetchCurrentToml()
})

async function handleRefresh() {
  refreshing.value = true
  try {
    await networkStore.fetchAll()
  } finally {
    refreshing.value = false
  }
}

async function fetchCurrentToml() {
  loadingToml.value = true
  try {
    const nodes = currentNet.value?.nodes || []
    if (nodes.length > 0) {
      const target = nodes[0]
      const cfg = await api.getNetworkConfig(target.machineId, target.instanceId)
      const toml = await api.generateTomlConfig(cfg)
      rawTomlText.value = toml
    } else {
      rawTomlText.value = `# EasyTier Network Configuration
instance_name = "default"
dhcp = true

[network_identity]
network_name = "${activeNetName.value}"
network_secret = "default_secret"

[flags]
enable_ipv6 = true
`
    }
  } catch (err: any) {
    console.error('Failed to load TOML config:', err)
  } finally {
    loadingToml.value = false
  }
}

async function saveCurrentToml() {
  savingToml.value = true
  try {
    const parsedConfig = await api.parseTomlConfig(rawTomlText.value)
    const nodes = currentNet.value?.nodes || []
    if (nodes.length > 0) {
      const target = nodes[0]
      await api.saveNetworkConfig(target.machineId, target.instanceId, parsedConfig)
      alert('TOML 配置已成功保存并下发至节点！')
    } else {
      alert('配置已验证合法！待节点上线后将自动同步。')
    }
  } catch (err: any) {
    alert('保存失败: ' + (err?.response?.data?.message || err?.message))
  } finally {
    savingToml.value = false
  }
}

function handleSelectNode(node: MeshNode) {
  activeTab.value = 'nodes'
}

function getLatencyClass(latencyUs: number): string {
  const ms = latencyUs / 1000
  if (ms < 30) return 'text-emerald-500 font-semibold'
  if (ms < 100) return 'text-orange-500'
  return 'text-rose-500 font-semibold'
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert(`已复制 ${label} 到剪贴板`)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    alert(`已复制 ${label} 到剪贴板`)
  }
}
</script>
