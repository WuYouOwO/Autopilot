<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Maximize2,
  Minimize2,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Laptop,
  Smartphone,
  Server,
  HardDrive,
  Monitor,
  Cpu,
  Router,
  Wifi,
  ExternalLink,
  Info,
} from 'lucide-vue-next'

export interface TopologyNode {
  id: string
  hostname: string
  domain?: string
  ipv4: string
  ipv6?: string
  osType?: string
  status: 'online' | 'offline'
  connection: string
  isLocal?: boolean
  isExitNode?: boolean
  latencyMs: number
  locationName?: string
  publicIp?: string
  subnets?: string[]
  // 画布位置
  x: number
  y: number
}

export interface TopologyLink {
  id: string
  sourceId: string
  targetId: string
  mode: 'p2p' | 'relay'
  protocol: string
  latency: string
  cost?: number
}

const props = withDefaults(
  defineProps<{
    networkName?: string
    nodes?: any[]
    isDark?: boolean
  }>(),
  {
    networkName: 'default-mesh',
    isDark: false,
  }
)

const emit = defineEmits<{
  (e: 'select-node', node: any): void
}>()

// 全屏状态
const isFullscreen = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)

// 视图平移与缩放 (Pan & Zoom)
const zoom = ref(1.0)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

// 节点拖拽状态
const draggingNodeId = ref<string | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const hoveredNodeId = ref<string | null>(null)

// 拓扑节点数据（精细排版层级，完全贴合参考图树状拓扑布局）
const defaultNodes: TopologyNode[] = [
  {
    id: 'node-home-pve',
    hostname: 'home-pve',
    ipv4: '10.144.144.12/24',
    osType: 'server',
    status: 'online',
    connection: '直连 P2P',
    latencyMs: 515,
    locationName: '家庭虚拟化服务器',
    x: 400,
    y: 40,
  },
  {
    id: 'node-macbook',
    hostname: 'JiangMacBookPro',
    ipv4: '10.144.144.4/24',
    osType: 'macos',
    status: 'online',
    connection: '直连 P2P',
    latencyMs: 24,
    locationName: '移动办公 MacBook',
    x: 400,
    y: 180,
  },
  {
    id: 'node-android-phone',
    hostname: 'android-phone',
    ipv4: '10.144.144.1/24',
    osType: 'phone',
    status: 'online',
    connection: '本机节点',
    isLocal: true,
    latencyMs: 0,
    locationName: '随身移动端 (本机)',
    x: 400,
    y: 330,
  },
  {
    id: 'node-public-server',
    hostname: 'PublicServer_aliyun',
    ipv4: '10.144.144.20/24',
    osType: 'server',
    status: 'online',
    connection: '直连 P2P',
    latencyMs: 32,
    locationName: '阿里云公共中继入口',
    x: 180,
    y: 490,
  },
  {
    id: 'node-workstation-pc',
    hostname: 'renshuaideMacBook',
    ipv4: '10.144.144.2/24',
    osType: 'macos',
    status: 'online',
    connection: '直连 P2P',
    latencyMs: 21,
    locationName: '办公室工作站',
    x: 620,
    y: 490,
  },
  {
    id: 'node-edge-gateway',
    hostname: 'hk-gateway-edge',
    ipv4: '10.144.144.10/24',
    osType: 'linux',
    status: 'online',
    connection: '中继转发',
    latencyMs: 78,
    locationName: '香港核心出口网关',
    x: 400,
    y: 650,
  },
]

const topologyNodes = ref<TopologyNode[]>([...defaultNodes])

// 拓扑链路数据（直连 P2P 实线 vs Relay 中继虚线）
const topologyLinks = ref<TopologyLink[]>([
  {
    id: 'link-1',
    sourceId: 'node-home-pve',
    targetId: 'node-macbook',
    mode: 'p2p',
    protocol: 'UDP / TCP',
    latency: '515 ms',
  },
  {
    id: 'link-2',
    sourceId: 'node-macbook',
    targetId: 'node-android-phone',
    mode: 'p2p',
    protocol: 'TCP',
    latency: '21 ms',
  },
  {
    id: 'link-3',
    sourceId: 'node-android-phone',
    targetId: 'node-public-server',
    mode: 'p2p',
    protocol: 'TCP / UDP',
    latency: '32 ms',
  },
  {
    id: 'link-4',
    sourceId: 'node-android-phone',
    targetId: 'node-workstation-pc',
    mode: 'p2p',
    protocol: 'TCP',
    latency: '23 ms',
  },
  {
    id: 'link-5',
    sourceId: 'node-public-server',
    targetId: 'node-edge-gateway',
    mode: 'relay',
    protocol: 'UDP / Relay',
    latency: '78 ms',
  },
  {
    id: 'link-6',
    sourceId: 'node-workstation-pc',
    targetId: 'node-public-server',
    mode: 'p2p',
    protocol: 'TCP',
    latency: '68 ms',
  },
])

// 设备图标匹配
const getNodeIcon = (type?: string) => {
  switch (type) {
    case 'macos':
    case 'laptop':
      return Laptop
    case 'phone':
    case 'mobile':
      return Smartphone
    case 'server':
      return Server
    case 'nas':
      return HardDrive
    case 'windows':
      return Monitor
    default:
      return Cpu
  }
}

// 节点卡片尺寸常量
const NODE_WIDTH = 180
const NODE_HEIGHT = 84

// 获取节点中心位置
const getNodeCenter = (nodeId: string) => {
  const node = topologyNodes.value.find((n) => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  }
}

// 计算阶梯式/平滑贝塞尔连接线路径 (精准复刻参考图的正交平滑连线)
const calculatePath = (link: TopologyLink) => {
  const source = getNodeCenter(link.sourceId)
  const target = getNodeCenter(link.targetId)

  const sNode = topologyNodes.value.find((n) => n.id === link.sourceId)
  const tNode = topologyNodes.value.find((n) => n.id === link.targetId)

  if (!sNode || !tNode) return { path: '', midX: 0, midY: 0 }

  // 上下相对还是左右相对
  const isVertical = Math.abs(target.y - source.y) >= Math.abs(target.x - source.x)

  let startX = source.x
  let startY = source.y
  let endX = target.x
  let endY = target.y

  if (isVertical) {
    if (target.y > source.y) {
      startY = sNode.y + NODE_HEIGHT
      endY = tNode.y
    } else {
      startY = sNode.y
      endY = tNode.y + NODE_HEIGHT
    }
  } else {
    if (target.x > source.x) {
      startX = sNode.x + NODE_WIDTH
      endX = tNode.x
    } else {
      startX = sNode.x
      endX = tNode.x + NODE_WIDTH
    }
  }

  // 生成正交平滑折线 (Orthogonal Smooth Curve)
  const midY = (startY + endY) / 2
  const midX = (startX + endX) / 2

  // 二次或三次平滑贝塞尔
  const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`

  return {
    path,
    midX,
    midY,
  }
}

// 画布鼠标拖拽平移
const handleMouseDown = (e: MouseEvent) => {
  if (draggingNodeId.value) return
  isPanning.value = true
  panStart.value = {
    x: e.clientX - panX.value,
    y: e.clientY - panY.value,
  }
}

const handleMouseMove = (e: MouseEvent) => {
  // 画布平移
  if (isPanning.value) {
    panX.value = e.clientX - panStart.value.x
    panY.value = e.clientY - panStart.value.y
    return
  }

  // 节点拖拽
  if (draggingNodeId.value) {
    const node = topologyNodes.value.find((n) => n.id === draggingNodeId.value)
    if (node && containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      const clientX = (e.clientX - rect.left - panX.value) / zoom.value
      const clientY = (e.clientY - rect.top - panY.value) / zoom.value
      node.x = clientX - dragOffset.value.x
      node.y = clientY - dragOffset.value.y
    }
  }
}

const handleMouseUp = () => {
  isPanning.value = false
  draggingNodeId.value = null
}

// 滚轮平滑缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.08 : -0.08
  zoom.value = Math.max(0.5, Math.min(1.8, zoom.value + delta))
}

// 开始拖动某个节点
const startDragNode = (node: TopologyNode, e: MouseEvent) => {
  e.stopPropagation()
  draggingNodeId.value = node.id
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const clientX = (e.clientX - rect.left - panX.value) / zoom.value
    const clientY = (e.clientY - rect.top - panY.value) / zoom.value
    dragOffset.value = {
      x: clientX - node.x,
      y: clientY - node.y,
    }
  }
}

// 居中自适应
const fitView = () => {
  zoom.value = 1.0
  panX.value = 40
  panY.value = 20
}

// 放大与缩小
const zoomIn = () => {
  zoom.value = Math.min(1.8, zoom.value + 0.15)
}
const zoomOut = () => {
  zoom.value = Math.max(0.5, zoom.value - 0.15)
}

// 重置排布
const resetLayout = () => {
  topologyNodes.value = JSON.parse(JSON.stringify(defaultNodes))
  fitView()
}

// 点击节点触发选择
const handleSelectNode = (node: TopologyNode) => {
  emit('select-node', node)
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div
    :class="[
      'w-full transition-all duration-200 select-none font-sans',
      isFullscreen ? 'fixed inset-0 z-50 p-6 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md overflow-hidden' : 'relative',
    ]"
  >
    <!-- 拓扑卡片整体容器 (参照参考图设计：圆角白卡片，顶部标题、图例与全局快照徽标) -->
    <div class="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2333] shadow-xs overflow-hidden flex flex-col">
      
      <!-- 卡片头部标题与图例栏 -->
      <div class="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">网络拓扑</h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              全局快照
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            展示全网 P2P 直连和 Relay 中转连接。查看节点连接方式、协议与路由成本。
          </p>

          <!-- 连线图例 (参考图中的：实线 P2P / 虚线 Relay 药丸徽标) -->
          <div class="flex items-center gap-2 mt-2.5">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <span class="w-2.5 h-0.5 bg-emerald-500 rounded-full"></span>
              <span>实线 P2P</span>
            </div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300">
              <span class="w-2.5 h-0.5 bg-sky-500 rounded-full border-t border-dashed"></span>
              <span>虚线 Relay</span>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-400 font-mono hidden sm:block">
          活跃节点: {{ topologyNodes.length }} 台 · 互联链路: {{ topologyLinks.length }} 条
        </div>
      </div>

      <!-- 拓扑画布主区域 (内置参考图右上角浮动操作按钮组) -->
      <div
        ref="containerRef"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @wheel="handleWheel"
        :class="[
          'relative w-full overflow-hidden cursor-grab active:cursor-grabbing bg-[#fafbfc] dark:bg-[#121927]',
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[600px]',
        ]"
      >
        <!-- 背景微点阵图纹 (高科技通透质感) -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20" width="100%" height="100%">
          <defs>
            <pattern id="topo-grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-grid-dots)" />
        </svg>

        <!-- 右上角悬浮工具条 (1:1 还原参考图右上角按钮：全屏、自适应、放大、缩小、刷新) -->
        <div class="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            type="button"
            @click="isFullscreen = !isFullscreen"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            :title="isFullscreen ? '退出全屏' : '全屏展示'"
          >
            <component :is="isFullscreen ? Minimize2 : Maximize2" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="fitView"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="居中适应画布"
          >
            <Crosshair class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="zoomIn"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="放大"
          >
            <ZoomIn class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="zoomOut"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="缩小"
          >
            <ZoomOut class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="resetLayout"
            class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="重新排列与刷新"
          >
            <RotateCw class="w-4 h-4" />
          </button>
        </div>

        <!-- 缩放与平移变换容器 -->
        <div
          class="absolute inset-0 origin-top-left pointer-events-none"
          :style="{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          }"
        >
          <!-- SVG 连线层 -->
          <svg class="absolute top-0 left-0 w-[2000px] h-[2000px] pointer-events-none overflow-visible">
            <g v-for="link in topologyLinks" :key="link.id">
              <!-- 基础连线：P2P 为翡翠淡绿实线，Relay 为清透淡蓝虚线 (前者直连后者中继) -->
              <path
                :d="calculatePath(link).path"
                fill="none"
                :stroke="link.mode === 'p2p' ? '#10b981' : '#0ea5e9'"
                :stroke-dasharray="link.mode === 'p2p' ? 'none' : '6,4'"
                stroke-width="2"
                stroke-linecap="round"
                class="transition-all duration-150"
              />

              <!-- 连线协议与延时小药丸徽章 (参考图连线上的：TCP-21ms、UDP/TCP-22ms、TCP-68ms) -->
              <g :transform="`translate(${calculatePath(link).midX}, ${calculatePath(link).midY})`">
                <rect
                  x="-38"
                  y="-10"
                  width="76"
                  height="20"
                  rx="10"
                  :fill="link.mode === 'p2p' ? '#ecfdf5' : '#f0f9ff'"
                  :stroke="link.mode === 'p2p' ? '#a7f3d0' : '#bae6fd'"
                  stroke-width="1"
                />
                <text
                  x="0"
                  y="3"
                  text-anchor="middle"
                  font-size="9"
                  font-family="monospace"
                  font-weight="600"
                  :fill="link.mode === 'p2p' ? '#047857' : '#0369a1'"
                >
                  {{ link.protocol }} · {{ link.latency }}
                </text>
              </g>
            </g>
          </svg>

          <!-- 节点卡片层 (1:1 复刻参考图白色圆角卡片布局) -->
          <div
            v-for="node in topologyNodes"
            :key="node.id"
            @mousedown="startDragNode(node, $event)"
            @click="handleSelectNode(node)"
            @mouseenter="hoveredNodeId = node.id"
            @mouseleave="hoveredNodeId = null"
            :style="{
              transform: `translate(${node.x}px, ${node.y}px)`,
              width: `${NODE_WIDTH}px`,
              height: `${NODE_HEIGHT}px`,
            }"
            :class="[
              'absolute top-0 left-0 rounded-xl border bg-white dark:bg-[#1a2333] shadow-md p-2.5 flex flex-col justify-between transition-shadow pointer-events-auto cursor-pointer',
              hoveredNodeId === node.id
                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600',
            ]"
          >
            <!-- 第一行：设备图标 + 主机名 -->
            <div class="flex items-center gap-1.5 min-w-0">
              <component
                :is="getNodeIcon(node.osType)"
                class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0"
              />
              <span class="font-bold text-xs text-gray-900 dark:text-white truncate">
                {{ node.hostname }}
              </span>
            </div>

            <!-- 第二行：虚拟 IP 广播地址 -->
            <div class="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
              {{ node.ipv4 }}
            </div>

            <!-- 第三行：状态徽章 (P2P / 本机 / 中继) + 延时毫秒 -->
            <div class="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80">
              <!-- 徽章 -->
              <span
                v-if="node.isLocal"
                class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              >
                本机
              </span>
              <span
                v-else-if="node.connection.includes('直连')"
                class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              >
                P2P
              </span>
              <span
                v-else
                class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
              >
                中继
              </span>

              <!-- 延时 -->
              <span class="text-[10px] font-mono text-gray-400">
                {{ node.isLocal ? '0 ms' : `${node.latencyMs} ms` }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
