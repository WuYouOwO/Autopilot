<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { createTraceGlobe } from '@/lib/traceglobe.js'
import {
  Globe,
  Compass,
  Play,
  Wifi,
  Menu,
  RotateCw,
  Eye,
  EyeOff,
  Crosshair,
  Server,
  ChevronUp,
  ChevronDown,
} from 'lucide-vue-next'

export interface GlobeDevice {
  id: string
  hostname: string
  locationName: string
  countryCode: string
  publicIp: string
  ipv4: string
  ipv6: string
  lat: number
  lng: number
  status: 'online' | 'offline'
  connection: string
  latencyMs: number
  natType: string
  peers?: string[]
}

const props = withDefaults(
  defineProps<{
    devices: GlobeDevice[]
    isDark?: boolean
    heightClass?: string
  }>(),
  {
    isDark: false,
    heightClass: '',
  }
)

const emit = defineEmits<{
  (e: 'select-device', device: GlobeDevice): void
}>()

// 视图模式与控制状态
const viewMode = ref<'3d' | '2d'>('3d')
const showDeviceList = ref(false)
const showLines = ref(true)
const lockNorth = ref(true)
const searchTarget = ref('')
const selectedDevice = ref<GlobeDevice | null>(null)
const isTracing = ref(false)
const hoveredProbeId = ref<string | null>(null)
const isRightPanelMinimized = ref(false)

// DOM 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hitRef = ref<HTMLDivElement | null>(null)
const tipRef = ref<HTMLDivElement | null>(null)

// Peer.as 地球引擎句柄
let globeCtrl: any = null

// 同步节点数据到 Peer.as 地球引擎
const syncData = () => {
  if (!globeCtrl || !props.devices.length) return

  // 1. 探测点/测站光点网络 (全网设备位置)
  const locs = props.devices.map((d) => ({
    id: d.id,
    city: d.locationName,
    cc: d.countryCode,
    country: d.locationName,
    lat: d.lat,
    lon: d.lng,
    count: d.status === 'online' ? 12 : 2,
    sel: selectedDevice.value?.id === d.id ? 1 : 0,
  }))
  globeCtrl.setLocations(locs)

  // 2. 路由与全网互联模型 (以核心中枢节点为 Target，其余 Peer 为 Probes 汇聚)
  const hub = selectedDevice.value || props.devices[0]
  const probes = showLines.value
    ? props.devices
        .filter((d) => d.id !== hub.id)
        .map((d) => {
          const isDirect = d.connection.includes('直连')
          return {
            id: d.id,
            city: d.locationName,
            cc: d.countryCode,
            asn: 0,
            network: d.connection,
            isRelay: !isDirect,
            lat: d.lat,
            lon: d.lng,
            // 用户明确需求：替换成淡绿色/淡蓝色 前者直连后者中继
            // 前者（直连 P2P）: 淡绿色 [16, 185, 129] / 暗色 [52, 211, 153]
            // 后者（中继 Relay）: 淡蓝色 [14, 165, 233] / 暗色 [56, 189, 248]
            color: isDirect
              ? (props.isDark ? [52, 211, 153] : [16, 185, 129])
              : (props.isDark ? [56, 189, 248] : [14, 165, 233]),
            status: d.status === 'online' ? 'done' : 'queued',
            hops: [
              {
                idx: 1,
                lat: hub.lat,
                lon: hub.lng,
                ip: hub.ipv4,
                name: hub.hostname,
                city: hub.locationName,
                rtt: d.latencyMs,
                isTarget: true,
              },
            ],
          }
        })
    : []

  const model = {
    target: {
      lat: hub.lat,
      lon: hub.lng,
      ip: hub.ipv4,
      label: hub.hostname,
      city: hub.locationName,
    },
    probes,
  }

  globeCtrl.setData(model)
}

// 聚焦选中设备
const focusOnDevice = (device: GlobeDevice) => {
  selectedDevice.value = device
  if (globeCtrl) {
    globeCtrl.setHome(device.lng, device.lat)
    syncData()
  }
  emit('select-device', device)
}

// 切换飞线显示
const toggleLines = () => {
  showLines.value = !showLines.value
  syncData()
}

// 切换正北锁定
const toggleLockNorth = () => {
  lockNorth.value = !lockNorth.value
  globeCtrl?.setLockNorth(lockNorth.value)
}

// 切换 2D 墨卡托投影 / 3D 球体粒子形变
const toggleMode = () => {
  viewMode.value = viewMode.value === '3d' ? '2d' : '3d'
  globeCtrl?.setMode(viewMode.value === '2d')
}

// 视角复位
const resetView = () => {
  selectedDevice.value = null
  globeCtrl?.reset()
  syncData()
}

// 处理搜索探测
const handleTrace = () => {
  if (!searchTarget.value.trim()) {
    if (props.devices.length > 1) {
      focusOnDevice(props.devices[1])
    }
    return
  }
  const q = searchTarget.value.trim().toLowerCase()
  const matched = props.devices.find(
    (d) =>
      d.hostname.toLowerCase().includes(q) ||
      d.ipv4.includes(q) ||
      d.publicIp.includes(q) ||
      d.locationName.toLowerCase().includes(q)
  )
  if (matched) {
    focusOnDevice(matched)
  }
  isTracing.value = true
  setTimeout(() => {
    isTracing.value = false
  }, 1200)
}

// 监听响应式状态
watch(
  () => props.devices,
  () => {
    syncData()
  },
  { deep: true }
)

watch(
  () => props.isDark,
  (dark) => {
    if (globeCtrl) {
      // 触发重绘
      syncData()
    }
  }
)

onMounted(() => {
  if (!canvasRef.value) return

  // 初始化 Peer.as 原生地球引擎
  globeCtrl = createTraceGlobe(canvasRef.value, {
    tip: tipRef.value,
    hit: hitRef.value,
    centered: true,
    radiusRatio: 0.44,
    mode2d: viewMode.value === '2d',
    lockNorth: lockNorth.value,
    isDark: props.isDark,
    onpick: (query: string) => {
      const q = (query || '').toLowerCase()
      const found = props.devices.find(
        (d) =>
          d.hostname.toLowerCase().includes(q) ||
          d.ipv4.toLowerCase().includes(q) ||
          d.locationName.toLowerCase().includes(q)
      )
      if (found) {
        focusOnDevice(found)
      }
    },
    onhover: (probeId: string | null) => {
      hoveredProbeId.value = probeId
    },
  })

  // 默认视角对准东亚 (中国/香港)
  if (props.devices.length > 0) {
    const defaultHub = props.devices[0]
    globeCtrl.setHome(defaultHub.lng, defaultHub.lat)
  } else {
    globeCtrl.setHome(114.17, 22.32)
  }

  syncData()
})

onUnmounted(() => {
  if (globeCtrl) {
    globeCtrl.destroy()
    globeCtrl = null
  }
})

defineExpose({
  focusOnDevice,
  resetView,
})
</script>

<template>
  <div
    :class="[
      'relative w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0e15] overflow-hidden select-none shadow-2xs group font-sans',
      heightClass || 'h-[calc(100vh-270px)] min-h-[640px]'
    ]"
  >
    
    <!-- 大气层柔和背景光晕 (精确还原 peer.as 站点淡天蓝氛围) -->
    <div
      class="absolute inset-0 pointer-events-none transition-opacity duration-500"
      :style="{
        background: isDark
          ? 'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.15) 0%, rgba(10, 14, 21, 0.45) 52%, #0a0e15 76%)'
          : 'radial-gradient(circle at 50% 50%, rgba(186, 230, 253, 0.6) 0%, rgba(224, 242, 254, 0.28) 48%, #ffffff 76%)',
      }"
    ></div>

    <!-- Peer.as 原生 Canvas 容器 -->
    <div class="tglobe relative w-full h-full">
      <canvas ref="canvasRef" class="block w-full h-full relative z-[1] pointer-events-none"></canvas>
      <div ref="hitRef" class="tg-hit absolute inset-0 z-[2] cursor-grab active:cursor-grabbing touch-none"></div>

      <!-- Peer.as 原生高精度毛玻璃浮动 Tooltip -->
      <div ref="tipRef" class="tg-tip">
        <div class="tg-a"></div>
        <div class="tg-b"></div>
        <div class="tg-c"></div>
      </div>
    </div>

    <!-- ----------------- 控件组 (完全对齐 peer.as/trace) ----------------- -->

    <!-- 1. 左上角菜单展开按钮 (☰ 节点快速定位抽屉) -->
    <div class="absolute top-4 left-4 z-20">
      <button
        type="button"
        @click="showDeviceList = !showDeviceList"
        :class="[
          'p-2.5 rounded-lg border bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm transition-all duration-150 active:scale-95 cursor-pointer',
          showDeviceList
            ? 'border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
            : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
        ]"
        title="展开/收起节点清单"
      >
        <Menu class="w-4 h-4" />
      </button>

      <!-- 侧边节点快捷展开抽屉 -->
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform -translate-x-3 opacity-0"
        enter-to-class="transform translate-x-0 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform translate-x-0 opacity-100"
        leave-to-class="transform -translate-x-3 opacity-0"
      >
        <div
          v-if="showDeviceList"
          class="mt-2 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-3 text-xs space-y-2 max-h-[420px] overflow-y-auto"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800 font-semibold text-gray-700 dark:text-gray-300">
            <span>在线节点清单 ({{ devices.length }})</span>
            <span class="text-[10px] text-gray-400">点击自动定位</span>
          </div>
          <div
            v-for="d in devices"
            :key="d.id"
            @click="focusOnDevice(d)"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors space-y-1"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-900 dark:text-white truncate">{{ d.hostname }}</span>
              <span :class="['w-2 h-2 rounded-full', d.status === 'online' ? 'bg-blue-600' : 'bg-gray-400']"></span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-gray-500">
              <span>{{ d.locationName }}</span>
              <span class="font-mono text-blue-600 dark:text-blue-400">{{ d.latencyMs }}ms</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 2. 右上角探测与链路卡片 (带收起/展开功能，避免遮挡地球) -->
    <div class="absolute top-4 right-4 z-20 max-w-sm w-full sm:w-auto">
      <!-- 展开状态 -->
      <div
        v-if="!isRightPanelMinimized"
        class="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 shadow-md p-3 space-y-2.5 transition-all"
      >
        <!-- 顶部小拉手与收起按钮 -->
        <div class="flex items-center justify-between pb-0.5">
          <div class="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full opacity-60"></div>
          <button
            type="button"
            @click="isRightPanelMinimized = true"
            class="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
            title="收起控制面板以全屏查看地球仪"
          >
            <span>收起面板</span>
            <ChevronUp class="w-3 h-3" />
          </button>
        </div>

        <!-- 目标 IP / 域名探测输入栏 (类似 peer.as/trace 第一行) -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono font-bold px-1.5 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80 shrink-0">
            AUTO
          </span>
          <input
            v-model="searchTarget"
            type="text"
            placeholder="目标 IP 或域名，如 10.144.144.1, github.com"
            @keyup.enter="handleTrace"
            class="w-full text-xs px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            @click="handleTrace"
            :class="[
              'p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all duration-100 active:scale-95 shrink-0 cursor-pointer',
              isTracing ? 'animate-pulse' : '',
            ]"
            title="开始空间探测"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        <!-- 链路状态与操作栏 (类似 peer.as/trace 第二行) -->
        <div class="flex items-center justify-between gap-2 text-xs pt-0.5 border-t border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-300">
          <div class="flex items-center gap-1.5 truncate">
            <Wifi class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span class="truncate font-medium text-gray-800 dark:text-gray-200">
              {{ selectedDevice ? selectedDevice.hostname : (devices[0]?.hostname || 'EasyTier 网络') }}
            </span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono shrink-0">
              +{{ devices.length }}
            </span>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              @click="toggleLines"
              :class="[
                'px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer',
                showLines
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              ]"
              title="切换飞线可见性"
            >
              <component :is="showLines ? Eye : EyeOff" class="w-3 h-3" />
              <span>链路飞线</span>
            </button>

            <button
              type="button"
              @click="resetView"
              class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
              title="复位视角"
            >
              <RotateCw class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- 链路图例徽章说明: 淡绿直连 / 淡蓝中继 -->
        <div class="flex items-center gap-3 pt-0.5 text-[11px]">
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
            <span class="w-2 h-0.5 bg-emerald-500 rounded-full"></span>
            <span>直连 P2P (淡绿)</span>
          </div>
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold text-[10px]">
            <span class="w-2 h-0.5 bg-sky-500 rounded-full border-t border-dashed"></span>
            <span>中继 Relay (淡蓝)</span>
          </div>
        </div>
      </div>

      <!-- 收起状态 (悬浮胶囊) -->
      <div
        v-else
        class="flex items-center gap-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-full border border-gray-200 dark:border-gray-800 shadow-md px-3.5 py-1.5 text-xs select-none"
      >
        <Wifi class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span class="font-medium text-gray-700 dark:text-gray-300 text-[11px]">{{ devices.length }} 节点在线</span>
        <button
          type="button"
          @click="isRightPanelMinimized = false"
          class="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold flex items-center gap-0.5 ml-1 cursor-pointer"
        >
          <span>展开控制台</span>
          <ChevronDown class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- 3. 右下角快捷模式切换组 (完全对齐 peer.as/trace 右下角工具栏) -->
    <div class="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 p-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-xs font-medium">
      <!-- 锁定正北切换 (🧭 罗盘) -->
      <button
        type="button"
        @click="toggleLockNorth"
        :class="[
          'p-1.5 rounded-lg transition-colors cursor-pointer',
          lockNorth
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40'
            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
        ]"
        :title="lockNorth ? '正北锁定已开启' : '自由任意倾斜角度'"
      >
        <Compass class="w-4 h-4" />
      </button>

      <!-- 居中复位 (🎯 十字准星) -->
      <button
        type="button"
        @click="resetView"
        class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
        title="复位到网络中心"
      >
        <Crosshair class="w-4 h-4" />
      </button>

      <div class="w-px h-3.5 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <!-- 3D 球体 / 2D 墨卡托双模式无缝滑行切换 (3D / 2D) -->
      <div class="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
        <button
          type="button"
          @click="viewMode = '3d'; globeCtrl?.setMode(false)"
          :class="[
            'px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer',
            viewMode === '3d'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          ]"
        >
          3D
        </button>
        <button
          type="button"
          @click="viewMode = '2d'; globeCtrl?.setMode(true)"
          :class="[
            'px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer',
            viewMode === '2d'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          ]"
        >
          2D
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tglobe {
  touch-action: none;
}
.tglobe canvas {
  touch-action: none;
}
.tglobe .tg-hit.hot {
  cursor: pointer;
}

/* Peer.as 原生浮动 Tooltip */
.tg-tip {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.14s ease;
  z-index: 30;
  background: rgba(255, 255, 255, 0.94);
  color: #0b2538;
  border: 1px solid #c8d9ea;
  border-radius: 8px;
  padding: 6px 10px;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.25);
}

:deep(.dark) .tg-tip,
.dark .tg-tip {
  background: rgba(13, 19, 28, 0.94);
  color: #dde6f0;
  border-color: #1b2738;
  box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.6);
}

.tg-tip.on {
  opacity: 1;
}

:deep(.tg-tip .tg-a) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: inherit;
  letter-spacing: -0.01em;
}

:deep(.tg-tip .tg-b) {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #1289f9;
  margin-top: 2px;
}

:deep(.tg-tip .tg-c) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  font-weight: 500;
  color: #5a7187;
  margin-top: 2px;
}

.tg-tip::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 9px;
  height: 9px;
  background: inherit;
  border-right: 1px solid #c8d9ea;
  border-bottom: 1px solid #c8d9ea;
  transform: translateX(-50%) rotate(45deg);
}

:deep(.dark) .tg-tip::after,
.dark .tg-tip::after {
  border-right-color: #1b2738;
  border-bottom-color: #1b2738;
}
</style>
