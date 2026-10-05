<script setup lang="ts">
import { ref } from 'vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import StyleTailscale from '@/views/showcase/StyleTailscale.vue'
import StyleCloudflare from '@/views/showcase/StyleCloudflare.vue'
import StyleNetBird from '@/views/showcase/StyleNetBird.vue'
import StyleLinear from '@/views/showcase/StyleLinear.vue'
import {
  Sparkles,
  LayoutGrid,
  Shield,
  Network,
  Terminal,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
} from 'lucide-vue-next'

type StyleId = 'cloudflare' | 'tailscale' | 'netbird' | 'linear'

const currentStyle = ref<StyleId>('cloudflare')
const showAnalysis = ref(false)

const stylesList = [
  {
    id: 'cloudflare' as StyleId,
    name: '风格 B: Cloudflare Zero Trust',
    tag: '推荐首选',
    tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
    icon: Shield,
    themeDesc: '淡蓝/灰白底色 + 高饱和橙红告警重点色',
    badge: 'Pale Light + High Accent',
    summary: '符合您的要求：淡色底、绿色健康状态、蓝色主功能色、橙红醒目重点区域。具备全局网络遥测 KPI、ACL 策略流向、双栈隧道概览。',
  },
  {
    id: 'tailscale' as StyleId,
    name: '风格 A: Tailscale 实用主义',
    tag: '经典交互',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    icon: LayoutGrid,
    themeDesc: '纯净白色卡片 + 右侧机器详情抽屉 (Drawer)',
    badge: 'Utility & Drawer',
    summary: '经典网格与列表切换、点选机器右侧无缝滑出抽屉、完整的 IPv4/IPv6 双栈复制交互、子网路由与 ACL 标签。',
  },
  {
    id: 'netbird' as StyleId,
    name: '风格 C: NetBird P2P Mesh',
    tag: '直观拓扑',
    tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    icon: Network,
    themeDesc: '网状互联卡片 + Direct P2P/Relay 穿透识别',
    badge: 'Peer Mesh & Keys',
    summary: '重点突出节点穿透模式（Direct vs Relay 状态雷达）、Setup Keys 快速注册秘钥管理、以及多区域延迟矩阵。',
  },
  {
    id: 'linear' as StyleId,
    name: '风格 D: Linear 极客终端',
    tag: '高密度',
    tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
    icon: Terminal,
    themeDesc: '等宽字符高密度折叠行 + 实时 TOML 差异对比',
    badge: 'Developer Dense',
    summary: '为硬核开发者设计，行内手风琴折叠展开、TOML 实时 diff 生成与快速 CLI 复制，单屏容纳最多节点。',
  },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
    <!-- 顶部固定控制导航栏 -->
    <header class="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 gap-4">
          
          <!-- Logo & 阶段标识 -->
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-orange-500 p-0.5 shadow-sm flex items-center justify-center">
              <div class="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles class="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  EasyTier Autopilot
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  预开发·交互选型
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                纯前端交互体验沙盒 · 涵盖市面四大经典网络云平台设计语言
              </p>
            </div>
          </div>

          <!-- 4 种风格切换器 (Tabs) -->
          <nav class="hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              v-for="item in stylesList"
              :key="item.id"
              @click="currentStyle = item.id"
              type="button"
              :class="[
                'relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                currentStyle === item.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <component :is="item.icon" class="w-3.5 h-3.5" :class="currentStyle === item.id ? 'text-orange-500 dark:text-orange-400' : 'opacity-70'" />
              <span>{{ item.name.split(':')[0] }}</span>
              <span
                v-if="item.id === 'cloudflare'"
                class="w-1.5 h-1.5 rounded-full bg-orange-500"
                title="为您定制推荐"
              ></span>
            </button>
          </nav>

          <!-- 右侧工具栏：对比分析 + 明暗主题切换 -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              @click="showAnalysis = !showAnalysis"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all',
                showAnalysis
                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
              ]"
            >
              <Sliders class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">四款风格深度对比</span>
              <span class="sm:hidden">对比</span>
              <component :is="showAnalysis ? ChevronUp : ChevronDown" class="w-3 h-3 opacity-60" />
            </button>

            <!-- 主题切换组件 (浅色/深色/自动) -->
            <ThemeToggle />
          </div>

        </div>

        <!-- 移动端风格切换条 -->
        <div class="md:hidden pb-3 pt-1 flex items-center gap-1 overflow-x-auto">
          <button
            v-for="item in stylesList"
            :key="item.id"
            @click="currentStyle = item.id"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-md text-xs whitespace-nowrap flex items-center gap-1 border',
              currentStyle === item.id
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            ]"
          >
            <component :is="item.icon" class="w-3 h-3" />
            {{ item.name.split(':')[0] }}
          </button>
        </div>
      </div>
    </header>

    <!-- 可折叠对比分析条 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div v-if="showAnalysis" class="bg-blue-50/70 dark:bg-slate-900/90 border-b border-blue-100 dark:border-slate-800 py-5 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Info class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 class="text-sm font-bold text-slate-900 dark:text-white">
                四大主流网络与云平台风格对比及设计推导
              </h2>
            </div>
            <span class="text-xs text-slate-500">点击下方任意卡片可一键切换体验该风格</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              v-for="item in stylesList"
              :key="item.id"
              @click="currentStyle = item.id"
              :class="[
                'p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200',
                currentStyle === item.id
                  ? 'bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'
              ]"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <component :is="item.icon" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {{ item.name }}
                </span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded border font-medium', item.tagColor]">
                  {{ item.tag }}
                </span>
              </div>
              <p class="text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ item.themeDesc }}
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ item.summary }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 风格展示内容区 -->
    <main class="flex-1 w-full">
      <!-- 风格 A: Tailscale -->
      <div v-if="currentStyle === 'tailscale'">
        <StyleTailscale />
      </div>

      <!-- 风格 B: Cloudflare Zero Trust (推荐) -->
      <div v-else-if="currentStyle === 'cloudflare'">
        <StyleCloudflare />
      </div>

      <!-- 风格 C: NetBird P2P Mesh -->
      <div v-else-if="currentStyle === 'netbird'">
        <StyleNetBird />
      </div>

      <!-- 风格 D: Linear 极客终端 -->
      <div v-else-if="currentStyle === 'linear'">
        <StyleLinear />
      </div>
    </main>

    <!-- 底部常驻提示栏 -->
    <footer class="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>当前各风格内部的抽屉、模态框、复制 IP、路由过滤等微交互均可直接点击体验</span>
        </div>
        <div class="text-slate-600 dark:text-slate-300 font-medium">
          请在体验后告知心仪方案（如：「选 B」、「选 B 但要 A 的抽屉」、「A 与 B 结合」）
        </div>
      </div>
    </footer>
  </div>
</template>
