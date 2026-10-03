<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Laptop class="w-6 h-6 text-indigo-500" />
          物理设备与客户端资产
        </h1>
        <p class="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          纳管所有与 EasyTier Web 控制器保持长连接的计算节点。查看终端健康状态、运行实例及实时心跳。
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button variant="secondary" size="sm" :loading="loading" @click="refreshData">
          <RefreshCw class="w-4 h-4 mr-1.5" />
          刷新列表
        </Button>
        <Button variant="primary" size="sm" @click="showOnboardModal = true">
          <Plus class="w-4 h-4 mr-1.5" />
          接入新设备
        </Button>
      </div>
    </div>

    <!-- Quick Telemetry Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card class="p-4 border border-slate-200 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-zinc-400">设备总数</span>
          <Server class="w-4 h-4 text-slate-400" />
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-2">
          {{ machines.length }}
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          已向控制器上报心跳的主机
        </div>
      </Card>

      <Card class="p-4 border border-slate-200 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-zinc-400">在线活跃</span>
          <Activity class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
          {{ onlineCount }}
        </div>
        <div class="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
          最近 3 分钟内保持通讯
        </div>
      </Card>

      <Card class="p-4 border border-slate-200 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-zinc-400">运行网络实例</span>
          <Globe class="w-4 h-4 text-indigo-500" />
        </div>
        <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
          {{ totalRunningInstances }}
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          全网活跃 Mesh 虚拟网卡
        </div>
      </Card>

      <Card class="p-4 border border-slate-200 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-zinc-400">跨平台架构</span>
          <Cpu class="w-4 h-4 text-amber-500" />
        </div>
        <div class="text-sm font-semibold text-slate-800 dark:text-zinc-200 mt-2 flex items-center gap-2">
          <span>Linux: {{ osCounts.linux }}</span>
          <span>·</span>
          <span>Win: {{ osCounts.windows }}</span>
          <span>·</span>
          <span>Mac: {{ osCounts.darwin }}</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
          多系统混合全网状互通
        </div>
      </Card>
    </div>

    <!-- Filter & Search Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="relative w-full sm:w-80">
        <Search class="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索主机名、设备 ID、操作系统..."
          class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <span class="text-xs text-slate-500 dark:text-zinc-400">系统筛选:</span>
        <select
          v-model="osFilter"
          class="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">全部操作系统</option>
          <option value="linux">Linux</option>
          <option value="windows">Windows</option>
          <option value="darwin">macOS</option>
          <option value="android">Android</option>
        </select>
      </div>
    </div>

    <!-- Machines Grid / List -->
    <div v-if="loading && machines.length === 0" class="py-16 text-center text-slate-400 dark:text-zinc-500 text-sm">
      <Loader2 class="w-7 h-7 mx-auto animate-spin mb-3 text-indigo-500" />
      正在拉取节点设备清单...
    </div>

    <div v-else-if="filteredMachines.length === 0" class="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50">
      <Laptop class="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
      <h3 class="text-sm font-semibold text-slate-700 dark:text-zinc-200">未检索到匹配的物理设备</h3>
      <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
        当前暂无设备连接或过滤条件无结果。您可以在服务器或个人终端运行命令加入本中心。
      </p>
      <Button variant="primary" size="sm" class="mt-4" @click="showOnboardModal = true">
        <Plus class="w-4 h-4 mr-1.5" />
        查看设备接入指引
      </Button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="m in filteredMachines"
        :key="m.machine_id"
        class="border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div class="p-4 space-y-3.5">
          <!-- Top Row: Hostname, OS Badge & Online Status -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700">
                <Terminal v-if="m.os_name?.toLowerCase().includes('linux')" class="w-5 h-5 text-amber-500" />
                <Laptop v-else-if="m.os_name?.toLowerCase().includes('darwin')" class="w-5 h-5 text-indigo-500" />
                <Monitor v-else-if="m.os_name?.toLowerCase().includes('windows')" class="w-5 h-5 text-blue-500" />
                <Server v-else class="w-5 h-5 text-slate-500" />
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate" :title="m.hostname">
                    {{ m.hostname || '未命名设备' }}
                  </h3>
                </div>
                <div class="text-[11px] text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1 font-mono">
                  <span>{{ m.machine_id.slice(0, 12) }}...</span>
                  <button @click="copyText(m.machine_id, '设备 UUID')" class="hover:text-slate-600 dark:hover:text-zinc-300" title="复制完整 UUID">
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <Badge :variant="isOnline(m.report_time) ? 'success' : 'neutral'" size="sm">
              <span class="w-1.5 h-1.5 rounded-full mr-1" :class="isOnline(m.report_time) ? 'bg-emerald-500' : 'bg-slate-400'"></span>
              {{ isOnline(m.report_time) ? '在线' : '离线' }}
            </Badge>
          </div>

          <!-- Spec Details -->
          <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">系统版本</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300 truncate block" :title="m.os_name">
                {{ m.os_name || 'Linux' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">EasyTier 版本</span>
              <span class="font-mono font-medium text-slate-700 dark:text-zinc-300">
                {{ m.version || 'v2.6.x' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">地理位置 / 出口</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300 truncate block">
                {{ formatLocation(m.location) }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">最近心跳</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300" :title="String(m.report_time || '')">
                {{ formatReportTime(m.report_time) }}
              </span>
            </div>
          </div>

          <!-- Networks Hosted on this Machine -->
          <div class="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div class="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>运行中网络实例 ({{ (m.running_instances || []).length }})</span>
            </div>
            <div v-if="(m.running_instances || []).length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="instId in m.running_instances"
                :key="instId"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
              >
                <Network class="w-3 h-3 text-indigo-500" />
                {{ instId.slice(0, 8) }}
              </span>
            </div>
            <div v-else class="text-[11px] text-slate-400 dark:text-zinc-500 italic">
              当前尚未挂载 Mesh 网络实例
            </div>
          </div>

          <!-- Card Actions -->
          <div class="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800">
            <router-link
              :to="{ path: '/diagnostics', query: { machine_id: m.machine_id } }"
              class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <Activity class="w-3.5 h-3.5" />
              诊断体检
            </router-link>

            <router-link
              :to="{ path: '/credentials', query: { machine_id: m.machine_id } }"
              class="text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1"
            >
              <Key class="w-3.5 h-3.5" />
              管理凭证
            </router-link>
          </div>
        </div>
      </Card>
    </div>

    <!-- Onboarding Guide Modal -->
    <Dialog :open="showOnboardModal" title="接入新计算设备至 EasyTier 控制器" @close="showOnboardModal = false">
      <div class="space-y-4 text-xs">
        <p class="text-slate-600 dark:text-zinc-400 leading-relaxed">
          将 EasyTier 客户端配置为连接至此控制器的配置分发端口（默认端口 <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-indigo-600 font-mono">22020</code>），即可自动纳管该设备并在本看板中监控与下发配置。
        </p>

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            方式一：Linux / macOS CLI 快速启动 (命令行)
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded-lg bg-slate-900 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">{{ cliConnectCommand }}</pre>
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
            <pre class="p-3 text-[11px] font-mono rounded-lg bg-slate-900 text-sky-400 overflow-x-auto whitespace-pre-wrap select-all">{{ dockerConnectCommand }}</pre>
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

        <div>
          <label class="block font-semibold text-slate-800 dark:text-zinc-200 mb-1">
            方式三：配置文件 (easytier.toml)
          </label>
          <pre class="p-3 text-[11px] font-mono rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap select-all"># 启用远程受控配置源
[instance]
config_server = "{{ configServerUrl }}"</pre>
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
  Laptop,
  Terminal,
  Monitor,
  Server,
  Activity,
  Globe,
  Cpu,
  RefreshCw,
  Plus,
  Search,
  Copy,
  Network,
  Key,
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
  return `http://${host}:22020`
})

const cliConnectCommand = computed(() => {
  return `easytier-core --config-server "${configServerUrl.value}"`
})

const dockerConnectCommand = computed(() => {
  return `docker run -d --name easytier-client --net=host --cap-add=NET_ADMIN --device=/dev/net/tun easytier/easytier:latest easytier-core --config-server "${configServerUrl.value}"`
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
