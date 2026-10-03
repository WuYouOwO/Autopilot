<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  Network,
  ShieldCheck,
  KeyRound,
  Server,
  ActivitySquare,
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  {
    name: '虚拟网络',
    desc: '拓扑与节点大屏',
    path: '/networks',
    icon: Network,
  },
  {
    name: '零信任策略',
    desc: '全局安全组与 ACL',
    path: '/policies',
    icon: ShieldCheck,
  },
  {
    name: '访问凭证',
    desc: '动态 Token 与吊销',
    path: '/credentials',
    icon: KeyRound,
  },
  {
    name: '物理设施',
    desc: '主机硬件与心跳',
    path: '/devices',
    icon: Server,
  },
  {
    name: '链路诊断',
    desc: 'Connector 与日志',
    path: '/diagnostics',
    icon: ActivitySquare,
  },
]
</script>

<template>
  <aside class="w-60 shrink-0 border-r border-slate-200/90 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hidden md:flex flex-col justify-between p-3 min-h-[calc(100vh-3.5rem)]">
    <div class="space-y-1">
      <div class="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
        核心管控
      </div>
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group select-none',
          route.path === item.path
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60'
        ]"
      >
        <component
          :is="item.icon"
          :class="[
            'w-4.5 h-4.5 shrink-0 transition-colors',
            route.path === item.path ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300'
          ]"
        />
        <div class="flex flex-col min-w-0">
          <span class="truncate leading-tight">{{ item.name }}</span>
          <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-normal truncate mt-0.5">{{ item.desc }}</span>
        </div>
      </router-link>
    </div>

    <!-- 底部架构状态卡片 -->
    <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800 text-xs">
      <div class="flex items-center justify-between text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
        <span>内核状态</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-bold">2.6.4</span>
      </div>
      <div class="mt-1 text-[11px] text-slate-400 dark:text-zinc-500">
        双栈原生引擎 · P2P/Relay
      </div>
    </div>
  </aside>
</template>
