<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  Network,
  ShieldCheck,
  KeyRound,
  Server,
  ActivitySquare,
  Shield,
  Radio,
} from 'lucide-vue-next'

const route = useRoute()

const navGroups = [
  {
    title: '网络与边缘 (Edge Network)',
    items: [
      {
        name: '虚拟局域网拓扑',
        desc: 'Mesh 全景与节点列表',
        path: '/networks',
        icon: Network,
      },
      {
        name: '物理设备清单',
        desc: '边缘计算主机与心跳',
        path: '/devices',
        icon: Server,
      },
    ],
  },
  {
    title: '零信任安全 (Zero Trust)',
    items: [
      {
        name: '访问控制策略',
        desc: '安全标签与全局 ACL',
        path: '/policies',
        icon: ShieldCheck,
      },
      {
        name: 'PKI 凭证与令牌',
        desc: '服务 Token 与即时吊销',
        path: '/credentials',
        icon: KeyRound,
      },
    ],
  },
  {
    title: '可观测性 (Analytics)',
    items: [
      {
        name: '链路探针体检',
        desc: '连接器状态与动态日志',
        path: '/diagnostics',
        icon: ActivitySquare,
      },
    ],
  },
]
</script>

<template>
  <aside class="w-64 shrink-0 border-r border-slate-200 dark:border-[#262a33] bg-white dark:bg-[#101216] hidden md:flex flex-col justify-between p-3.5 min-h-[calc(100vh-3.5rem)] select-none">
    <div class="space-y-6">
      <div v-for="grp in navGroups" :key="grp.title" class="space-y-1">
        <div class="px-2.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
          {{ grp.title }}
        </div>

        <router-link
          v-for="item in grp.items"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all duration-150 group border-l-2',
            route.path === item.path
              ? 'bg-orange-50/80 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 font-semibold border-[#f38020] shadow-xs'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60'
          ]"
        >
          <component
            :is="item.icon"
            :class="[
              'w-4 h-4 shrink-0 transition-colors',
              route.path === item.path
                ? 'text-[#f38020]'
                : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300'
            ]"
          />
          <div class="min-w-0">
            <div class="truncate">{{ item.name }}</div>
            <div class="text-[10px] font-normal text-slate-400 dark:text-zinc-500 truncate leading-tight mt-0.5">
              {{ item.desc }}
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Bottom Telemetry & Info Footer -->
    <div class="pt-4 border-t border-slate-100 dark:border-[#262a33] space-y-2">
      <div class="p-2.5 rounded bg-slate-50 dark:bg-[#191c22] border border-slate-200/70 dark:border-[#262a33] text-[11px] text-slate-500 dark:text-zinc-400 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="font-medium text-slate-700 dark:text-zinc-300">安全传输引擎</span>
          <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Noise_IK 加密
          </span>
        </div>
        <div class="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
          <span>核心协议版本</span>
          <span>v2.6.4</span>
        </div>
      </div>
    </div>
  </aside>
</template>
