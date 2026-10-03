<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
          <Server class="w-3.5 h-3.5" />
          <span>EDGE COMPUTE NODES</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          边缘计算节点与物理设备 (Devices)
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          查看已向 EasyTier 边缘网络控制器注册的主机资产、实时心跳状态与挂载的 Mesh 实例。
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <Button variant="secondary" size="sm" :loading="loading" @click="refreshData">
          <RefreshCw class="w-3.5 h-3.5 mr-1" />
          刷新列表
        </Button>
        <Button variant="primary" size="sm" @click="showOnboardModal = true">
          <Plus class="w-3.5 h-3.5 mr-1" />
          接入新设备
        </Button>
      </div>
    </div>

    <!-- CF Quick Telemetry Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>注册主机总数</span>
          <Laptop class="w-4 h-4 text-slate-400" />
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-2">
          {{ machines.length }}
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          全平台纳管主机硬件
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>在线活跃节点</span>
          <Activity class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
          {{ onlineCount }}
        </div>
        <div class="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
          3 分钟内心跳响应正常
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>运行 Mesh 实例</span>
          <Globe class="w-4 h-4 text-[#f38020]" />
        </div>
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
          {{ totalRunningInstances }}
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          活跃虚拟隧道网卡
        </div>
      </Card>

      <Card class="p-4 border-slate-200 dark:border-[#262a33]">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>跨平台支持</span>
          <Cpu class="w-4 h-4 text-blue-500" />
        </div>
        <div class="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-3 flex items-center gap-2">
          <span>Linux: {{ osCounts.linux }}</span>
          <span>·</span>
          <span>Win: {{ osCounts.windows }}</span>
          <span>·</span>
          <span>Mac: {{ osCounts.darwin }}</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          多系统端到端对等穿透
        </div>
      </Card>
    </div>

    <!-- Filter & Search Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="relative w-full sm:w-80">
        <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索主机名、设备 ID、系统..."
          class="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-200 dark:border-[#262a33] bg-white dark:bg-[#191c22] text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <span class="text-xs text-slate-500 dark:text-zinc-400">系统筛选:</span>
        <select
          v-model="osFilter"
          class="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-[#262a33] bg-white dark:bg-[#191c22] text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          <option value="all">全部操作系统</option>
          <option value="linux">Linux</option>
          <option value="windows">Windows</option>
          <option value="darwin">macOS</option>
          <option value="android">Android</option>
        </select>
      </div>
    </div>

    <!-- Devices Table -->
    <Card class="border-slate-200 dark:border-[#262a33] overflow-hidden">
      <div v-if="loading && machines.length === 0" class="py-16 text-center text-xs text-slate-400">
        <Loader2 class="w-6 h-6 mx-auto animate-spin mb-2 text-orange-500" />
        正在拉取主机资产清册...
      </div>

      <div v-else-if="filteredMachines.length === 0" class="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded bg-white/50 dark:bg-zinc-900/40">
        <Server class="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
        <h3 class="text-sm font-semibold text-slate-800 dark:text-zinc-200">未检索到匹配的边缘设备</h3>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          当前暂无设备连接或过滤条件无结果。您可以在任何终端运行接入命令。
        </p>
        <Button variant="primary" size="sm" class="mt-4" @click="showOnboardModal = true">
          <Plus class="w-3.5 h-3.5 mr-1" />
          查看接入指引
        </Button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-[#191c22] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#262a33]">
            <tr>
              <th class="px-4 py-3 font-semibold">主机名 / 节点标识</th>
              <th class="px-4 py-3 font-semibold">操作系统平台</th>
              <th class="px-4 py-3 font-semibold">EasyTier 引擎</th>
              <th class="px-4 py-3 font-semibold">心跳状态</th>
              <th class="px-4 py-3 font-semibold">运行实例</th>
              <th class="px-4 py-3 font-semibold">物理出口</th>
              <th class="px-4 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#262a33] text-slate-700 dark:text-zinc-300">
            <tr v-for="m in filteredMachines" :key="m.machine_id" class="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
              <!-- Hostname & UUID -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700">
                    <Terminal v-if="m.os_name?.toLowerCase().includes('linux')" class="w-4 h-4 text-orange-500" />
                    <Laptop v-else-if="m.os_name?.toLowerCase().includes('darwin')" class="w-4 h-4 text-blue-500" />
                    <Monitor v-else-if="m.os_name?.toLowerCase().includes('windows')" class="w-4 h-4 text-sky-500" />
                    <Server v-else class="w-4 h-4 text-slate-500" />
                  </div>

                  <div class="min-w-0">
                    <div class="font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {{ m.hostname }}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                      <span>{{ m.machine_id.slice(0, 12) }}...</span>
                      <button @click="copyText(m.machine_id, '设备 UUID')" class="hover:text-slate-600 dark:hover:text-zinc-200">
                        <Copy class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </td>

              <!-- OS Platform -->
              <td class="px-4 py-3 text-slate-700 dark:text-zinc-300">
                {{ m.os_name || 'Linux' }}
              </td>

              <!-- Engine Version -->
              <td class="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                {{ m.version || 'v2.6.4' }}
              </td>

              <!-- Heartbeat Status -->
              <td class="px-4 py-3">
                <Badge :variant="isOnline(m.report_time) ? 'success' : 'neutral'" size="sm" dot>
                  {{ isOnline(m.report_time) ? '在线 (Active)' : '离线' }}
                </Badge>
                <span class="text-[10px] text-slate-400 ml-1.5 font-mono">
                  {{ formatReportTime(m.report_time) }}
                </span>
              </td>

              <!-- Hosted Instances -->
              <td class="px-4 py-3">
                <div v-if="(m.running_instances || []).length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="instId in m.running_instances"
                    :key="instId"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/40"
                  >
                    {{ instId.slice(0, 8) }}
                  </span>
                </div>
                <span v-else class="text-[11px] text-slate-400 italic">未挂载</span>
              </td>

              <!-- Physical Location -->
              <td class="px-4 py-3 text-slate-500 dark:text-zinc-400 text-[11px]">
                {{ formatLocation(m.location) }}
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <router-link
                    :to="{ path: '/diagnostics', query: { machine_id: m.machine_id } }"
                    class="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium"
                  >
                    探针诊断
                  </router-link>
                  <router-link
                    :to="{ path: '/credentials', query: { machine_id: m.machine_id } }"
                    class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                  >
                    凭证
                  </router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Onboarding Modal -->
    <Dialog :open="showOnboardModal" title="接入新计算设备至 EasyTier 控制台" @close="showOnboardModal = false">
      <div class="space-y-4 text-xs">
        <p class="text-slate-600 dark:text-zinc-400 leading-relaxed">
          将 EasyTier 客户端配置连接至此控制器的配置分发端口（默认端口 <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-orange-600 font-mono">22020</code>），即可自动纳管该设备并在本看板中监控与下发配置。
        </p>

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            方式一：Linux / macOS CLI 快速启动 (命令行)
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded bg-slate-950 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">{{ cliConnectCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(cliConnectCommand, 'CLI 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            方式二：Docker 容器化部署
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded bg-slate-950 text-sky-400 overflow-x-auto whitespace-pre-wrap select-all">{{ dockerConnectCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(dockerConnectCommand, 'Docker 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="primary" size="sm" @click="showOnboardModal = false">完成</Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Server,
  Laptop,
  Terminal,
  Monitor,
  Activity,
  Globe,
  Cpu,
  RefreshCw,
  Plus,
  Search,
  Copy,
  Loader2,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import { useNetworkStore } from '@/stores/network'

const networkStore = useNetworkStore()
const loading = ref(false)
const searchQuery = ref('')
const osFilter = ref('all')
const showOnboardModal = ref(false)

const machines = computed(() => networkStore.deviceList)

const onlineCount = computed(() => {
  return machines.value.filter((m) => isOnline(m.report_time)).length
})

const totalRunningInstances = computed(() => {
  return machines.value.reduce((acc, m) => acc + (m.running_instances?.length || 0), 0)
})

const osCounts = computed(() => {
  const counts = { linux: 0, windows: 0, darwin: 0, other: 0 }
  machines.value.forEach((m) => {
    const os = (m.os_name || '').toLowerCase()
    if (os.includes('linux')) counts.linux++
    else if (os.includes('win')) counts.windows++
    else if (os.includes('mac') || os.includes('darwin')) counts.darwin++
    else counts.other++
  })
  return counts
})

const filteredMachines = computed(() => {
  return machines.value.filter((m) => {
    const matchQuery =
      searchQuery.value === '' ||
      (m.hostname && m.hostname.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      m.machine_id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (m.os_name && m.os_name.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const os = (m.os_name || '').toLowerCase()
    let matchOs = true
    if (osFilter.value === 'linux') matchOs = os.includes('linux')
    else if (osFilter.value === 'windows') matchOs = os.includes('win')
    else if (osFilter.value === 'darwin') matchOs = os.includes('darwin') || os.includes('mac')
    else if (osFilter.value === 'android') matchOs = os.includes('android')

    return matchQuery && matchOs
  })
})

const configServerUrl = computed(() => {
  const host = window.location.hostname || '127.0.0.1'
  return `udp://${host}:22020/admin`
})

const cliConnectCommand = computed(() => {
  return `easytier-core -w "${configServerUrl.value}"`
})

const dockerConnectCommand = computed(() => {
  return `docker run -d --name easytier-client --net=host --cap-add=NET_ADMIN --device=/dev/net/tun easytier/easytier:latest easytier-core -w "${configServerUrl.value}"`
})

onMounted(async () => {
  await refreshData()
})

async function refreshData() {
  loading.value = true
  try {
    await networkStore.fetchSummary()
  } finally {
    loading.value = false
  }
}

function isOnline(reportTime?: string | number): boolean {
  if (!reportTime) return false
  const time = typeof reportTime === 'number' ? reportTime * 1000 : new Date(reportTime).getTime()
  if (isNaN(time)) return false
  return Date.now() - time < 3 * 60 * 1000 // 3 minutes
}

function formatReportTime(reportTime?: string | number): string {
  if (!reportTime) return '未知'
  const time = typeof reportTime === 'number' ? reportTime * 1000 : new Date(reportTime).getTime()
  if (isNaN(time)) return String(reportTime)
  const diffSec = Math.floor((Date.now() - time) / 1000)
  if (diffSec < 60) return `${diffSec} 秒前`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`
  return `${Math.floor(diffSec / 3600)} 小时前`
}

function formatLocation(loc: any): string {
  if (!loc) return '内网 / 直连'
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '内网节点'
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
