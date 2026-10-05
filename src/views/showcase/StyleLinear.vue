<script setup lang="ts">
import { ref } from 'vue'
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Plus,
  Play,
  Square,
  Check,
} from 'lucide-vue-next'

const expandedNodeId = ref<string | null>('lin-1')
const copiedText = ref<string | null>(null)
const toastMessage = ref<string | null>(null)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

const copy = (val: string) => {
  navigator.clipboard.writeText(val)
  copiedText.value = val
  showToast(`已复制: ${val}`)
  setTimeout(() => {
    if (copiedText.value === val) copiedText.value = null
  }, 1800)
}

const linearNodes = ref([
  {
    id: 'lin-1',
    hostname: 'hk-gateway-edge',
    instanceId: '00112233-4455-6677-8899-aabbccddeeff',
    ipv4: '10.144.144.1',
    ipv6: 'fd00:144:144::1/64',
    status: 'RUNNING',
    p2pMode: 'DIRECT',
    rtt: 12,
    listeners: ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010', 'wg://0.0.0.0:11011'],
    peers: ['udp://sg.node.net:11010'],
    routes: ['192.168.10.0/24'],
  },
  {
    id: 'lin-2',
    hostname: 'tokyo-worker-01',
    instanceId: '11223344-5566-7788-9900-aabbccddeeff',
    ipv4: '10.144.144.2',
    ipv6: 'fd00:144:144::2/64',
    status: 'RUNNING',
    p2pMode: 'DIRECT',
    rtt: 28,
    listeners: ['udp://0.0.0.0:11010'],
    peers: ['udp://10.144.144.1:11010'],
    routes: [],
  },
  {
    id: 'lin-3',
    hostname: 'sg-relay-hub',
    instanceId: '22334455-6677-8899-0011-aabbccddeeff',
    ipv4: '10.144.144.5',
    ipv6: 'fd00:144:144::5/64',
    status: 'RUNNING',
    p2pMode: 'RELAY',
    rtt: 74,
    listeners: ['tcp://0.0.0.0:11010'],
    peers: ['udp://10.144.144.1:11010'],
    routes: ['10.0.0.0/16'],
  },
  {
    id: 'lin-4',
    hostname: 'backup-nas-shanghai',
    instanceId: '33445566-7788-9900-1122-aabbccddeeff',
    ipv4: '10.144.144.15',
    ipv6: 'fd00:144:144::15/64',
    status: 'STOPPED',
    p2pMode: 'OFFLINE',
    rtt: 0,
    listeners: [],
    peers: [],
    routes: [],
  },
])

const toggleExpand = (id: string) => {
  expandedNodeId.value = expandedNodeId.value === id ? null : id
}
</script>

<template>
  <div class="space-y-4">
    <!-- Linear / Vercel Header -->
    <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-mono font-bold text-xs">
          ▲
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
              easytier / network-instances
            </h2>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              v2.6.4
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded">
          ⌘K
        </kbd>
        <button
          @click="showToast('新建实例 CLI 模板已准备就绪')"
          class="px-2.5 py-1 text-xs font-mono font-medium rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1"
        >
          <Plus class="w-3.5 h-3.5" />
          + instance
        </button>
      </div>
    </div>

    <!-- High-Density Node List with Inline Expansion -->
    <div class="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 font-mono text-xs">
      <div class="divide-y divide-zinc-200 dark:divide-zinc-800/80">
        <div
          v-for="node in linearNodes"
          :key="node.id"
          class="group"
        >
          <!-- Summary Row -->
          <div
            @click="toggleExpand(node.id)"
            class="flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer select-none transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <component
                :is="expandedNodeId === node.id ? ChevronDown : ChevronRight"
                class="w-3.5 h-3.5 text-zinc-400 shrink-0"
              />
              <span
                :class="[
                  'w-2 h-2 rounded-full shrink-0',
                  node.status === 'RUNNING' ? 'bg-emerald-500' : 'bg-zinc-400'
                ]"
              />
              <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {{ node.hostname }}
              </span>
              <span class="text-[11px] text-zinc-400 hidden sm:inline truncate">
                #{{ node.instanceId.slice(0, 8) }}
              </span>
            </div>

            <div class="flex items-center gap-4 text-[11px] shrink-0">
              <span class="text-zinc-700 dark:text-zinc-300">
                {{ node.ipv4 }}
              </span>
              <span class="text-sky-600 dark:text-sky-400 hidden md:inline">
                {{ node.ipv6 }}
              </span>
              <span
                :class="[
                  'px-1.5 py-0.2 rounded text-[10px]',
                  node.p2pMode === 'DIRECT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : node.p2pMode === 'RELAY'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                ]"
              >
                {{ node.p2pMode }} {{ node.rtt ? `${node.rtt}ms` : '' }}
              </span>

              <button
                @click.stop="showToast(`切换节点 ${node.hostname} 启停状态`)"
                class="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                :title="node.status === 'RUNNING' ? '停止实例' : '启动实例'"
              >
                <component :is="node.status === 'RUNNING' ? Square : Play" class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Inline Expandable Detail Panel -->
          <div
            v-if="expandedNodeId === node.id"
            class="px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span class="text-zinc-400 block mb-0.5">IPv4 / IPv6 双栈</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-zinc-800 dark:text-zinc-200">{{ node.ipv4 }}</span>
                  <span class="text-zinc-300 dark:text-zinc-700">|</span>
                  <span class="font-bold text-sky-600 dark:text-sky-400">{{ node.ipv6 }}</span>
                  <button @click="copy(node.ipv6)" class="text-zinc-400 hover:text-zinc-600">
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div>
                <span class="text-zinc-400 block mb-0.5">监听通道 Listeners</span>
                <span class="text-zinc-700 dark:text-zinc-300">{{ node.listeners.join('  ') || '无' }}</span>
              </div>
            </div>

            <div>
              <span class="text-zinc-400 block text-[10px] mb-1">LIVE CONFIG DIFF</span>
              <div class="p-2.5 rounded bg-zinc-950 text-emerald-400 text-[11px] leading-relaxed overflow-x-auto border border-zinc-800">
                <pre>instance_name = "{{ node.hostname }}"
ipv4 = "{{ node.ipv4 }}/24"
ipv6 = "{{ node.ipv6 }}"
listeners = {{ JSON.stringify(node.listeners) }}</pre>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                @click="showToast(`已重新探测 ${node.hostname} 链路`)"
                class="px-2.5 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                Probe RTT
              </button>
              <button
                @click="showToast(`已成功热下发修改！`)"
                class="px-3 py-1 text-xs rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
              >
                Apply Hot-Patch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-mono shadow-xl flex items-center gap-2"
    >
      <Check class="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
