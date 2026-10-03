<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
          <ActivitySquare class="w-3.5 h-3.5" />
          <span>NETWORK TRACE & TELEMETRY</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          链路探针与运行诊断 (Diagnostics)
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          穿透后端 RPC 实时探针。即时排查出站连接器状态、P2P 隧道加密、路由跳数及动态热切换日志等级。
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Target Machine Selector -->
        <div v-if="machineOptions.length > 0" class="flex items-center gap-2">
          <span class="text-xs text-slate-500 dark:text-slate-400">诊断目标:</span>
          <select
            v-model="selectedMachineId"
            @change="runFullDiagnostics"
            class="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#162136] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="m in machineOptions" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.os }})
            </option>
          </select>
        </div>

        <Button variant="primary" size="sm" :loading="loading" @click="runFullDiagnostics">
          <RefreshCw class="w-3.5 h-3.5 mr-1" />
          全量深度体检
        </Button>
      </div>
    </div>

    <div v-if="!selectedMachineId" class="py-16 text-center">
      <ServerOff class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">暂无在线节点可供诊断</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">请先在「物理设备」或「虚拟网络」中接入节点并上报心跳。</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Section 1: Live Log Level Hot-Toggling -->
      <Card class="border-slate-200/90 dark:border-slate-800 p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ScrollText class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              运行时动态日志热切换 (Dynamic Log Level)
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              通过 LoggerRpc 动态修改终端进程运行日志级别，无需重启节点进程即可捕获 Trace/Debug 详细连接追踪。
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-slate-500 dark:text-slate-400">日志级别:</span>
              <select
                v-model.number="loggerConfig.level"
                class="px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#162136] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option :value="5">TRACE (5 - 极详尽)</option>
                <option :value="4">DEBUG (4 - 调试)</option>
                <option :value="3">INFO (3 - 常规)</option>
                <option :value="2">WARN (2 - 警告)</option>
                <option :value="1">ERROR (1 - 仅错误)</option>
                <option :value="0">DISABLED (0 - 关闭)</option>
              </select>
            </div>

            <!-- High saturation orange indicator for debug/trace mode -->
            <span v-if="loggerConfig.level >= 4" class="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hidden lg:inline">
              ⚠️ 高负载排障日志开启
            </span>

            <Button variant="primary" size="sm" :loading="updatingLogger" @click="applyLoggerConfig">
              应用生效
            </Button>
          </div>
        </div>
      </Card>

      <!-- Section 2: Outbound Connector Status Inspector -->
      <Card class="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-emerald-500" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">出站连接器状态探针 (Connectors)</h3>
          </div>
          <Badge variant="primary" size="sm">
            {{ connectors.length }} 个出站连接
          </Badge>
        </div>

        <div v-if="connectorsLoading" class="p-8 text-center text-xs text-slate-400">
          <Loader2 class="w-5 h-5 mx-auto animate-spin mb-2 text-orange-500" />
          正在读取连接器状态...
        </div>
        <div v-else-if="connectors.length === 0" class="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
          当前节点未配置出站 Connector 种子节点或仅作为被动对等方监听。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-[#191c22] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#262a33]">
              <tr>
                <th class="px-4 py-2.5 font-semibold">协议 / 目标 URL</th>
                <th class="px-4 py-2.5 font-semibold">连接状态</th>
                <th class="px-4 py-2.5 font-semibold">传输通道说明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-[#262a33] text-slate-700 dark:text-zinc-300">
              <tr v-for="(conn, idx) in connectors" :key="idx" class="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                <td class="px-4 py-3 font-mono font-medium text-slate-900 dark:text-zinc-100">
                  <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" :class="getProtoBadgeClass(conn.url?.scheme || conn.url)">
                      {{ conn.url?.scheme || getScheme(conn.url) || 'UDP' }}
                    </span>
                    <span>{{ formatConnUrl(conn.url) }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="conn.status === 0 || conn.status === 'CONNECTED' ? 'success' : conn.status === 2 || conn.status === 'CONNECTING' ? 'warning' : 'danger'" size="sm" dot>
                    {{ formatConnectorStatus(conn.status) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-slate-500 dark:text-zinc-400">
                  {{ conn.status === 0 || conn.status === 'CONNECTED' ? '握手成功 · 数据对等通道已建立' : '等待对端响应或打洞探测中' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Section 3: Peer Connections & P2P Details -->
      <Card class="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Network class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">活跃 P2P 对等连接与隧道度量 (Peers)</h3>
          </div>
          <Badge variant="primary" size="sm">
            {{ peers.length }} 个对端
          </Badge>
        </div>

        <div v-if="peersLoading" class="p-8 text-center text-xs text-slate-400">
          <Loader2 class="w-5 h-5 mx-auto animate-spin mb-2 text-blue-500" />
          正在探查对端链路...
        </div>
        <div v-else-if="peers.length === 0" class="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
          当前节点暂无对端 Peer 建立通道。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-[#162136] text-slate-500 dark:text-slate-400 border-b border-slate-200/90 dark:border-slate-800">
              <tr>
                <th class="px-4 py-2.5 font-semibold">Peer ID</th>
                <th class="px-4 py-2.5 font-semibold">隧道类型 (Tunnel)</th>
                <th class="px-4 py-2.5 font-semibold">往返延迟 (RTT)</th>
                <th class="px-4 py-2.5 font-semibold">丢包率</th>
                <th class="px-4 py-2.5 font-semibold">流量统计 (RX / TX)</th>
                <th class="px-4 py-2.5 font-semibold">安全模式</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <template v-for="peer in peers" :key="peer.peer_id">
                <tr v-for="(conn, cIdx) in (peer.conns || [{}])" :key="cIdx" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    #{{ peer.peer_id }}
                  </td>
                  <td class="px-4 py-3 font-mono">
                    <span v-if="conn.tunnel" class="text-slate-800 dark:text-slate-200">
                      {{ formatTunnel(conn.tunnel) }}
                    </span>
                    <span v-else class="text-slate-400">中继转发链路</span>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    <span v-if="conn.stats?.latency_us" :class="getLatencyClass(conn.stats.latency_us)">
                      {{ (conn.stats.latency_us / 1000).toFixed(1) }} ms
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    <span v-if="conn.loss_rate !== undefined" :class="conn.loss_rate > 0.05 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'">
                      {{ (conn.loss_rate * 100).toFixed(1) }}%
                    </span>
                    <span v-else class="text-slate-400">0.0%</span>
                  </td>
                  <td class="px-4 py-3 font-mono text-[11px]">
                    <span class="text-emerald-600 dark:text-emerald-400">↓ {{ formatBytes(conn.stats?.rx_bytes) }}</span>
                    <span class="mx-1 text-slate-300 dark:text-slate-700">|</span>
                    <span class="text-blue-600 dark:text-blue-400">↑ {{ formatBytes(conn.stats?.tx_bytes) }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <Badge variant="success" size="sm">
                      Noise 加密
                    </Badge>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Section 4: Live Prometheus Metrics Raw Inspector -->
      <Card class="border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BarChart2 class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Prometheus 实时性能指标探针</h3>
          </div>
          <Button variant="secondary" size="sm" :loading="metricsLoading" @click="fetchMetrics">
            <RefreshCw class="w-3.5 h-3.5 mr-1" />
            拉取最新指标
          </Button>
        </div>

        <div class="p-4">
          <div v-if="metricsLoading" class="py-8 text-center text-xs text-slate-400">
            <Loader2 class="w-5 h-5 mx-auto animate-spin mb-2 text-orange-500" />
            正在采样指标流...
          </div>
          <div v-else-if="!rawMetricsText" class="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
            暂无 Prometheus 指标上报。
          </div>
          <div v-else class="relative">
            <pre class="p-4 text-[11px] font-mono rounded bg-slate-950 text-slate-200 max-h-72 overflow-y-auto select-all leading-relaxed">{{ rawMetricsText }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-3 right-3 bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
              @click="copyText(rawMetricsText, 'Prometheus 指标')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ActivitySquare,
  ScrollText,
  Radio,
  Network,
  BarChart2,
  RefreshCw,
  ServerOff,
  Copy,
  Loader2,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import { api } from '@/lib/api'
import { useNetworkStore } from '@/stores/network'
import { formatBytes } from '@/lib/utils'

const networkStore = useNetworkStore()
const loading = ref(false)
const selectedMachineId = ref('')

// Logger config
const loggerConfig = ref({
  level: 3,
})
const updatingLogger = ref(false)

// Connectors
const connectors = ref<any[]>([])
const connectorsLoading = ref(false)

// Peers
const peers = ref<any[]>([])
const peersLoading = ref(false)

// Prometheus Metrics
const rawMetricsText = ref('')
const metricsLoading = ref(false)

const machineOptions = computed(() => {
  return networkStore.deviceList.map((m) => ({
    id: m.machine_id,
    name: m.hostname || m.machine_id.slice(0, 8),
    os: m.os_name || 'Linux',
  }))
})

onMounted(async () => {
  await networkStore.fetchSummary()
  if (networkStore.deviceList.length > 0 && !selectedMachineId.value) {
    selectedMachineId.value = networkStore.deviceList[0].machine_id
  }
  if (selectedMachineId.value) {
    await runFullDiagnostics()
  }
})

async function runFullDiagnostics() {
  if (!selectedMachineId.value) return
  loading.value = true
  await Promise.allSettled([
    fetchLoggerConfig(),
    fetchConnectors(),
    fetchPeers(),
    fetchMetrics(),
  ])
  loading.value = false
}

async function fetchLoggerConfig() {
  if (!selectedMachineId.value) return
  try {
    const res = await api.getLoggerConfig(selectedMachineId.value)
    if (res && res.level !== undefined) {
      loggerConfig.value.level = res.level
    }
  } catch (err: any) {
    console.error('Failed to get logger config:', err)
  }
}

async function fetchConnectors() {
  if (!selectedMachineId.value) return
  connectorsLoading.value = true
  try {
    const res = await api.listConnectors(selectedMachineId.value)
    connectors.value = res.connectors || []
  } catch (err: any) {
    console.error('Failed to list connectors:', err)
    connectors.value = []
  } finally {
    connectorsLoading.value = false
  }
}

async function fetchPeers() {
  if (!selectedMachineId.value) return
  peersLoading.value = true
  try {
    const res = await api.listPeers(selectedMachineId.value)
    peers.value = res.peer_infos || []
  } catch (err: any) {
    console.error('Failed to list peers:', err)
    peers.value = []
  } finally {
    peersLoading.value = false
  }
}

async function fetchMetrics() {
  if (!selectedMachineId.value) return
  metricsLoading.value = true
  try {
    const res = await api.getPrometheusStats(selectedMachineId.value)
    rawMetricsText.value = res.prometheus_text || ''
  } catch (err: any) {
    console.error('Failed to fetch prometheus stats:', err)
    rawMetricsText.value = ''
  } finally {
    metricsLoading.value = false
  }
}

async function applyLoggerConfig() {
  if (!selectedMachineId.value) return
  updatingLogger.value = true
  try {
    await api.setLoggerConfig(
      selectedMachineId.value,
      loggerConfig.value.level
    )
    const levelNames: Record<number, string> = {
      0: 'DISABLED (0)',
      1: 'ERROR (1)',
      2: 'WARN (2)',
      3: 'INFO (3)',
      4: 'DEBUG (4)',
      5: 'TRACE (5)',
    }
    alert(`日志级别已成功更新为: ${levelNames[loggerConfig.value.level] || loggerConfig.value.level}`)
  } catch (err: any) {
    alert('设置日志失败: ' + (err?.response?.data?.message || err?.message))
  } finally {
    updatingLogger.value = false
  }
}

function formatConnectorStatus(status: any): string {
  if (status === 0 || status === 'CONNECTED') return '已连通 (CONNECTED)'
  if (status === 2 || status === 'CONNECTING') return '连接探测中 (CONNECTING)'
  return '未连通 / 离线 (DISCONNECTED)'
}

function getScheme(url: any): string {
  if (typeof url === 'string') {
    const match = url.match(/^([a-zA-Z0-9]+):\/\//)
    return match ? match[1] : 'TCP'
  }
  return 'TCP'
}

function formatConnUrl(url: any): string {
  if (typeof url === 'string') return url
  if (!url) return '-'
  return `${url.scheme || 'tcp'}://${url.host || ''}:${url.port || ''}`
}

function formatTunnel(tunnel: any): string {
  if (typeof tunnel === 'string') return tunnel
  if (tunnel?.remote_addr) {
    return `${tunnel.tunnel_type || 'UDP'} -> ${tunnel.remote_addr}`
  }
  return JSON.stringify(tunnel)
}

function getProtoBadgeClass(scheme: string): string {
  const s = (scheme || '').toLowerCase()
  if (s.includes('wg')) return 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
  if (s.includes('udp')) return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
  if (s.includes('tcp')) return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
  if (s.includes('ws')) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300'
  return 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
}

function getLatencyClass(latencyUs: number): string {
  const ms = latencyUs / 1000
  if (ms < 30) return 'text-emerald-600 dark:text-emerald-400 font-semibold'
  if (ms < 80) return 'text-blue-600 dark:text-blue-400'
  return 'text-orange-600 dark:text-orange-400 font-bold'
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
