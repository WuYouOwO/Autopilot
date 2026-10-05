<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Server,
  Laptop,
  Copy,
  Check,
  MoreVertical,
  X,
  Search,
  Plus,
  Zap,
  Radio,
  FileCode,
} from 'lucide-vue-next'

const nodes = ref([
  {
    id: 'm-1',
    hostname: 'hk-gateway-edge',
    os: 'Linux (Ubuntu 24.04)',
    osType: 'linux',
    ipv4: '10.144.144.1',
    ipv6: 'fd00:144:144::1/64',
    status: 'online',
    isDirect: true,
    latencyMs: 12,
    subnets: ['192.168.10.0/24'],
    tags: ['tag:gateway', 'tag:prod'],
    listeners: ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010', 'wg://0.0.0.0:11011'],
    peers: ['udp://sg-core.network:11010', 'tcp://jp-tokyo.network:11010'],
    lastSeen: '实时在线',
    isExitNode: true,
  },
  {
    id: 'm-2',
    hostname: 'mbp-m3-dev',
    os: 'macOS Sonoma 14.5',
    osType: 'mac',
    ipv4: '10.144.144.2',
    ipv6: 'fd00:144:144::2/64',
    status: 'online',
    isDirect: true,
    latencyMs: 24,
    subnets: [],
    tags: ['tag:dev'],
    listeners: ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010'],
    peers: ['udp://10.144.144.1:11010'],
    lastSeen: '1 分钟前',
    isExitNode: false,
  },
  {
    id: 'm-3',
    hostname: 'shanghai-storage-nas',
    os: 'Linux (Debian 12)',
    osType: 'linux',
    ipv4: '10.144.144.10',
    ipv6: 'fd00:144:144::10/64',
    status: 'online',
    isDirect: false,
    latencyMs: 78,
    subnets: ['10.0.0.0/16'],
    tags: ['tag:storage'],
    listeners: ['tcp://0.0.0.0:11010'],
    peers: ['udp://hk-gateway.network:11010'],
    lastSeen: '3 分钟前',
    isExitNode: false,
  },
  {
    id: 'm-4',
    hostname: 'win11-workstation',
    os: 'Windows 11 Pro',
    osType: 'windows',
    ipv4: '10.144.144.15',
    ipv6: 'fd00:144:144::15/64',
    status: 'offline',
    isDirect: false,
    latencyMs: 0,
    subnets: [],
    tags: ['tag:office'],
    listeners: ['udp://0.0.0.0:11010'],
    peers: [],
    lastSeen: '2 小时前',
    isExitNode: false,
  },
])

const filterTab = ref('all')
const searchQuery = ref('')
const copiedText = ref<string | null>(null)
const selectedNode = ref<any | null>(null)
const drawerOpen = ref(false)
const drawerTab = ref<'general' | 'dualstack' | 'peers' | 'toml'>('general')
const toastMessage = ref<string | null>(null)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  copiedText.value = text
  showToast(`已复制 ${label}: ${text}`)
  setTimeout(() => {
    if (copiedText.value === text) copiedText.value = null
  }, 1800)
}

const filteredNodes = computed(() => {
  return nodes.value.filter((n) => {
    if (filterTab.value === 'online' && n.status !== 'online') return false
    if (filterTab.value === 'offline' && n.status !== 'offline') return false
    if (filterTab.value === 'exit' && !n.isExitNode) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return (
        n.hostname.toLowerCase().includes(q) ||
        n.ipv4.includes(q) ||
        n.ipv6.includes(q) ||
        n.tags.some((t) => t.includes(q))
      )
    }
    return true
  })
})

const openDrawer = (node: any) => {
  selectedNode.value = JSON.parse(JSON.stringify(node))
  drawerOpen.value = true
}

const toggleNodeStatus = (node: any) => {
  node.status = node.status === 'online' ? 'offline' : 'online'
  showToast(`节点 ${node.hostname} 状态已切换为: ${node.status}`)
}

const saveDrawerConfig = () => {
  if (!selectedNode.value) return
  const idx = nodes.value.findIndex((n) => n.id === selectedNode.value.id)
  if (idx !== -1) {
    nodes.value[idx] = JSON.parse(JSON.stringify(selectedNode.value))
  }
  drawerOpen.value = false
  showToast(`已成功保存节点 ${selectedNode.value.hostname} 的双栈网络配置！`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Tailscale Header Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
      <div>
        <div class="flex items-center gap-2.5">
          <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Machines
          </h2>
          <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {{ nodes.length }} 台设备
          </span>
          <span class="text-xs text-gray-400">· Tailscale 极简设备流风格</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          管理加入 EasyTier 虚拟局域网的全部设备节点，点击设备直达右侧配置抽屉。
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="showToast('正在向中心控制器同步机器状态...')"
          class="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-2xs"
        >
          刷新状态
        </button>
        <button
          @click="showToast('打开快速接入引导对话框')"
          class="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus class="w-3.5 h-3.5" />
          Add device
        </button>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Tabs -->
      <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-lg text-xs font-medium">
        <button
          @click="filterTab = 'all'"
          :class="[
            'px-3 py-1 rounded-md transition-colors',
            filterTab === 'all'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          All ({{ nodes.length }})
        </button>
        <button
          @click="filterTab = 'online'"
          :class="[
            'px-3 py-1 rounded-md transition-colors',
            filterTab === 'online'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          Connected ({{ nodes.filter((n) => n.status === 'online').length }})
        </button>
        <button
          @click="filterTab = 'exit'"
          :class="[
            'px-3 py-1 rounded-md transition-colors',
            filterTab === 'exit'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          Exit Nodes
        </button>
        <button
          @click="filterTab = 'offline'"
          :class="[
            'px-3 py-1 rounded-md transition-colors',
            filterTab === 'offline'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          Offline ({{ nodes.filter((n) => n.status === 'offline').length }})
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full sm:w-64">
        <Search class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter by name, IP, or tag..."
          class="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
        />
      </div>
    </div>

    <!-- Tailscale Machines Table -->
    <div class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase text-[11px] tracking-wider">
              <th class="py-3 px-4">Machine</th>
              <th class="py-3 px-4">Virtual IPv4 / IPv6</th>
              <th class="py-3 px-4">P2P Status & Latency</th>
              <th class="py-3 px-4">Subnets / Tags</th>
              <th class="py-3 px-4">Last Seen</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/80">
            <tr
              v-for="node in filteredNodes"
              :key="node.id"
              @click="openDrawer(node)"
              class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group"
            >
              <!-- Machine Name & OS -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <span
                    :class="[
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      node.status === 'online' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-gray-300 dark:bg-gray-600'
                    ]"
                  />
                  <div>
                    <div class="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {{ node.hostname }}
                      <span
                        v-if="node.isExitNode"
                        class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      >
                        Exit Node
                      </span>
                    </div>
                    <div class="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                      <component
                        :is="node.osType === 'mac' ? Laptop : Server"
                        class="w-3 h-3 text-gray-400"
                      />
                      <span>{{ node.os }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- IPs (Dual Stack) -->
              <td class="py-3 px-4" @click.stop>
                <div class="flex flex-col gap-1 font-mono text-[11px]">
                  <div class="flex items-center gap-1.5 group/ip">
                    <span class="text-gray-900 dark:text-gray-100 font-medium">{{ node.ipv4 }}</span>
                    <button
                      @click="copyToClipboard(node.ipv4, 'IPv4')"
                      class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
                      title="点击复制 IPv4"
                    >
                      <Copy v-if="copiedText !== node.ipv4" class="w-3 h-3" />
                      <Check v-else class="w-3 h-3 text-emerald-500" />
                    </button>
                  </div>
                  <div class="flex items-center gap-1.5 group/ip6 text-gray-500 dark:text-gray-400 text-[10px]">
                    <span class="px-1 py-0.2 bg-gray-100 dark:bg-gray-800 rounded font-semibold text-gray-600 dark:text-gray-300 text-[9px]">IPv6</span>
                    <span>{{ node.ipv6 }}</span>
                    <button
                      @click="copyToClipboard(node.ipv6, 'IPv6')"
                      class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
                      title="点击复制 IPv6"
                    >
                      <Copy v-if="copiedText !== node.ipv6" class="w-3 h-3" />
                      <Check v-else class="w-3 h-3 text-emerald-500" />
                    </button>
                  </div>
                </div>
              </td>

              <!-- P2P Status & Latency -->
              <td class="py-3 px-4">
                <div v-if="node.status === 'online'" class="flex items-center gap-2">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
                      node.isDirect
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                    ]"
                  >
                    <Zap v-if="node.isDirect" class="w-3 h-3 text-emerald-500" />
                    <Radio v-else class="w-3 h-3 text-amber-500" />
                    {{ node.isDirect ? 'Direct P2P' : 'Relay' }}
                  </span>
                  <span class="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    {{ node.latencyMs }} ms
                  </span>
                </div>
                <div v-else class="text-[11px] text-gray-400">
                  离线
                </div>
              </td>

              <!-- Subnets / Tags -->
              <td class="py-3 px-4">
                <div class="flex flex-wrap items-center gap-1">
                  <span
                    v-for="sub in node.subnets"
                    :key="sub"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    {{ sub }}
                  </span>
                  <span
                    v-for="tag in node.tags"
                    :key="tag"
                    class="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="node.subnets.length === 0 && node.tags.length === 0" class="text-gray-400 text-[11px]">
                    —
                  </span>
                </div>
              </td>

              <!-- Last Seen -->
              <td class="py-3 px-4 text-gray-500 dark:text-gray-400">
                {{ node.lastSeen }}
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openDrawer(node)"
                    class="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    @click="toggleNodeStatus(node)"
                    class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    :title="node.status === 'online' ? '暂停/禁用节点' : '唤醒/启用节点'"
                  >
                    <MoreVertical class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tailscale Slide-out Drawer (点击任何机器滑出编辑抽屉) -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 overflow-hidden"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        @click="drawerOpen = false"
      />

      <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div class="w-screen max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
          <!-- Drawer Header -->
          <div class="px-6 py-4.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span
                :class="[
                  'w-3 h-3 rounded-full',
                  selectedNode?.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
                ]"
              />
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">
                  {{ selectedNode?.hostname }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  EasyTier 节点配置抽屉 · {{ selectedNode?.os }}
                </p>
              </div>
            </div>
            <button
              @click="drawerOpen = false"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Drawer Navigation Tabs -->
          <div class="px-6 border-b border-gray-200 dark:border-gray-800 flex gap-4 text-xs font-semibold">
            <button
              @click="drawerTab = 'general'"
              :class="[
                'py-3 border-b-2 transition-colors',
                drawerTab === 'general'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              ]"
            >
              常规网络
            </button>
            <button
              @click="drawerTab = 'dualstack'"
              :class="[
                'py-3 border-b-2 transition-colors flex items-center gap-1',
                drawerTab === 'dualstack'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              ]"
            >
              双栈 IPv6 配置 (重点)
            </button>
            <button
              @click="drawerTab = 'peers'"
              :class="[
                'py-3 border-b-2 transition-colors',
                drawerTab === 'peers'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              ]"
            >
              监听与对等体
            </button>
            <button
              @click="drawerTab = 'toml'"
              :class="[
                'py-3 border-b-2 transition-colors flex items-center gap-1',
                drawerTab === 'toml'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              ]"
            >
              <FileCode class="w-3.5 h-3.5" />
              原生 TOML
            </button>
          </div>

          <!-- Drawer Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            <!-- TAB 1: General -->
            <div v-if="drawerTab === 'general'" class="space-y-4">
              <div>
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  主机名称 (Hostname)
                </label>
                <input
                  v-model="selectedNode.hostname"
                  type="text"
                  class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  子网路由 CIDR (Subnet Router)
                </label>
                <input
                  :value="selectedNode.subnets.join(', ')"
                  @input="selectedNode.subnets = ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)"
                  type="text"
                  placeholder="例如: 192.168.1.0/24, 10.0.0.0/16"
                  class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
                />
                <p class="text-[11px] text-gray-400 mt-1">
                  该节点将向全网广播这些子网，其他对等节点可直接访问其背后的局域网设备。
                </p>
              </div>

              <div class="pt-2">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    v-model="selectedNode.isExitNode"
                    type="checkbox"
                    class="rounded text-gray-900 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span class="font-semibold text-gray-800 dark:text-gray-200">设为此虚拟网的出口节点 (Exit Node)</span>
                    <p class="text-[11px] text-gray-400">允许其他机器通过此节点的互联网连接路由公网流量。</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- TAB 2: Dual-Stack IPv4 / IPv6 (核心痛点解决) -->
            <div v-if="drawerTab === 'dualstack'" class="space-y-4">
              <div class="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-md text-blue-900 dark:text-blue-200 leading-relaxed text-[11px]">
                <strong>无损双栈验证：</strong>此处不仅支持标准的 IPv4 虚拟地址，而且直接支持完整的 IPv6 CIDR（包括子网前缀，例如 <code>fd00:144:144::1/64</code>），杜绝官方前端表单截断丢失。
              </div>

              <div>
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  虚拟 IPv4 地址 (Virtual IPv4)
                </label>
                <div class="flex gap-2">
                  <input
                    v-model="selectedNode.ipv4"
                    type="text"
                    placeholder="10.144.144.1"
                    class="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
                  />
                  <span class="px-2.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-mono text-xs">/24</span>
                </div>
              </div>

              <div>
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  虚拟 IPv6 地址 (Virtual IPv6 Dual-Stack)
                </label>
                <input
                  v-model="selectedNode.ipv6"
                  type="text"
                  placeholder="fd00:144:144::1/64"
                  class="w-full px-3 py-2 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <p class="text-[11px] text-gray-400 mt-1">
                  可自定义 ULA 专用网段（如 <code>fd00:.../64</code>），完全不受 IPv4 限制。
                </p>
              </div>
            </div>

            <!-- TAB 3: Peers & Listeners -->
            <div v-if="drawerTab === 'peers'" class="space-y-4">
              <div>
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  监听协议与端口 (Listeners)
                </label>
                <div class="space-y-1.5">
                  <div
                    v-for="(lis, idx) in selectedNode.listeners"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="selectedNode.listeners[idx]"
                      type="text"
                      class="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-xs text-gray-900 dark:text-white"
                    />
                    <button
                      @click="selectedNode.listeners.splice(idx, 1)"
                      class="text-red-500 hover:text-red-700 px-1.5 py-1"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <button
                  @click="selectedNode.listeners.push('tcp://0.0.0.0:11012')"
                  class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus class="w-3.5 h-3.5" /> 添加新监听通道 (TCP/UDP/WG)
                </button>
              </div>

              <div class="pt-3 border-t border-gray-200 dark:border-gray-800">
                <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  对等节点连接 (Peers)
                </label>
                <div class="space-y-1.5">
                  <div
                    v-for="(p, idx) in selectedNode.peers"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="selectedNode.peers[idx]"
                      type="text"
                      class="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-xs text-gray-900 dark:text-white"
                    />
                    <button
                      @click="selectedNode.peers.splice(idx, 1)"
                      class="text-red-500 hover:text-red-700 px-1.5 py-1"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <button
                  @click="selectedNode.peers.push('udp://203.0.113.10:11010')"
                  class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus class="w-3.5 h-3.5" /> 添加对等节点 URL
                </button>
              </div>
            </div>

            <!-- TAB 4: Raw TOML -->
            <div v-if="drawerTab === 'toml'" class="space-y-3">
              <p class="text-gray-500 text-[11px]">
                双向无损同步的原生 TOML 文本。此处修改后点击保存将直接推送生效：
              </p>
              <div class="bg-gray-950 rounded-lg p-3 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-gray-800">
                <pre>instance_name = "{{ selectedNode.hostname }}"
ipv4 = "{{ selectedNode.ipv4 }}/24"
ipv6 = "{{ selectedNode.ipv6 }}"
listeners = [
{{ selectedNode.listeners.map((l: string) => `    "${l}",`).join('\n') }}
]

[network_identity]
network_name = "default"
network_secret = "******"

{{ selectedNode.peers.map((p: string) => `[[peer]]\nuri = "${p}"`).join('\n\n') }}</pre>
              </div>
            </div>
          </div>

          <!-- Drawer Footer -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
            <button
              @click="toggleNodeStatus(selectedNode)"
              class="px-3 py-1.5 text-xs font-medium rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {{ selectedNode?.status === 'online' ? '暂停此节点 (Suspend)' : '启用此节点' }}
            </button>
            <div class="flex items-center gap-2">
              <button
                @click="drawerOpen = false"
                class="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                @click="saveDrawerConfig"
                class="px-4 py-1.5 text-xs font-semibold rounded bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-colors shadow-xs"
              >
                保存并下发生效
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium shadow-xl flex items-center gap-2 transition-all"
    >
      <Check class="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
