<script setup lang="ts">
import { ref } from 'vue'
import {
  Network,
  Key,
  Activity,
  Plus,
  Zap,
  ArrowUpRight,
  X,
  Check,
} from 'lucide-vue-next'

const toastMessage = ref<string | null>(null)
const selectedPeer = ref<any | null>(null)
const showPeerModal = ref(false)
const showKeyModal = ref(false)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

const peers = ref([
  {
    id: 'nb-1',
    name: 'tokyo-edge-router',
    ip: '10.144.144.1',
    ipv6: 'fd00:144:144::1/64',
    os: 'Linux (Alpine 3.20)',
    status: 'online',
    connType: 'P2P Direct',
    iceProto: 'UDP / STUN',
    latency: '18 ms',
    txRx: '1.2 GB / 4.8 GB',
    routes: ['192.168.1.0/24'],
  },
  {
    id: 'nb-2',
    name: 'dev-macbook-pro',
    ip: '10.144.144.2',
    ipv6: 'fd00:144:144::2/64',
    os: 'macOS 14.5 (ARM64)',
    status: 'online',
    connType: 'P2P Direct',
    iceProto: 'UDP / Hole Punch',
    latency: '26 ms',
    txRx: '840 MB / 1.1 GB',
    routes: [],
  },
  {
    id: 'nb-3',
    name: 'sg-central-relay',
    ip: '10.144.144.3',
    ipv6: 'fd00:144:144::3/64',
    os: 'Linux (Debian 12)',
    status: 'online',
    connType: 'Relayed',
    iceProto: 'TCP / Relay',
    latency: '64 ms',
    txRx: '12.4 GB / 9.8 GB',
    routes: ['10.20.0.0/16'],
  },
  {
    id: 'nb-4',
    name: 'frankfurt-storage-box',
    ip: '10.144.144.4',
    ipv6: 'fd00:144:144::4/64',
    os: 'Linux (Ubuntu 22.04)',
    status: 'offline',
    connType: 'Disconnected',
    iceProto: '—',
    latency: '—',
    txRx: '0 B / 0 B',
    routes: [],
  },
])

const openPeerDetail = (peer: any) => {
  selectedPeer.value = JSON.parse(JSON.stringify(peer))
  showPeerModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- NetBird Top Nav -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Network class="w-4 h-4" />
          <span>NETBIRD · MESH PEER-TO-PEER</span>
        </div>
        <h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Peers & Mesh Network
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          分布式点对点虚拟网络，卡片式展示对等节点连通性与穿透打洞状态。
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="showKeyModal = true"
          class="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Key class="w-3.5 h-3.5" />
          Setup Keys
        </button>
        <button
          @click="showToast('正在生成快速加入对等网的邀请链接...')"
          class="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus class="w-3.5 h-3.5" />
          Add Peer
        </button>
      </div>
    </div>

    <!-- Mini-Mesh Connectivity Radar / Stats -->
    <div class="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-sky-500/5 to-transparent border border-teal-500/20 dark:border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
          <Zap class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Mesh 打洞直连率: 83.3%</span>
            <span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">健康</span>
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Noise_IK 加密在线 · 3 台直连节点，1 台中继，0 冲突
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 text-xs font-mono">
        <div class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          ↓ 14.4 GB
        </div>
        <div class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          ↑ 15.7 GB
        </div>
      </div>
    </div>

    <!-- NetBird Card Grid (对等节点卡片矩阵) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="peer in peers"
        :key="peer.id"
        class="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-teal-400 dark:hover:border-teal-500 transition-all group cursor-pointer"
        @click="openPeerDetail(peer)"
      >
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex items-center gap-2.5">
            <span
              :class="[
                'w-3 h-3 rounded-full shrink-0',
                peer.status === 'online' ? 'bg-teal-500 ring-4 ring-teal-500/20' : 'bg-slate-300 dark:bg-slate-700'
              ]"
            />
            <div>
              <div class="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                {{ peer.name }}
              </div>
              <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {{ peer.os }}
              </div>
            </div>
          </div>

          <span
            :class="[
              'px-2 py-0.5 rounded text-[11px] font-semibold',
              peer.connType === 'P2P Direct'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                : peer.connType === 'Relayed'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            ]"
          >
            {{ peer.connType }}
          </span>
        </div>

        <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono space-y-1 mb-3">
          <div class="flex items-center justify-between">
            <span class="text-slate-500">IPv4:</span>
            <span class="text-slate-800 dark:text-slate-200 font-semibold">{{ peer.ip }}</span>
          </div>
          <div class="flex items-center justify-between text-teal-700 dark:text-teal-400 font-medium">
            <span>IPv6:</span>
            <span class="truncate max-w-[240px]">{{ peer.ipv6 }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1 font-mono">
            <Activity class="w-3.5 h-3.5 text-teal-500" />
            {{ peer.latency }} · {{ peer.iceProto }}
          </span>
          <button
            @click.stop="openPeerDetail(peer)"
            class="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
          >
            配置与路由 <ArrowUpRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- NetBird Peer Modal -->
    <div
      v-if="showPeerModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="showPeerModal = false" />
      <div class="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              {{ selectedPeer?.name }} 节点详情
            </h3>
            <p class="text-[11px] text-slate-400">NetBird 风格节点与路由管理</p>
          </div>
          <button @click="showPeerModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3 font-mono">
          <div>
            <span class="text-slate-400 block text-[11px]">虚拟双栈 IPv4 / IPv6</span>
            <span class="text-slate-800 dark:text-slate-200 font-bold">{{ selectedPeer?.ip }}</span> /
            <span class="text-teal-600 font-bold">{{ selectedPeer?.ipv6 }}</span>
          </div>

          <div>
            <span class="text-slate-400 block text-[11px]">穿透打洞协议</span>
            <span class="text-slate-800 dark:text-slate-200">{{ selectedPeer?.iceProto }} (延迟: {{ selectedPeer?.latency }})</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="showPeerModal = false"
            class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            关闭
          </button>
          <button
            @click="showToast('节点参数已生效！'); showPeerModal = false"
            class="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-xl flex items-center gap-2"
    >
      <Check class="w-4 h-4 text-teal-400 dark:text-teal-600" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
