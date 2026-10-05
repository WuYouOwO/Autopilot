<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import {
  Globe,
  Activity,
  Layers,
  Zap,
  Radio,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  ExternalLink,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-vue-next'
import type { GlobeDevice } from '@/types/globe'
export type { GlobeDevice } from '@/types/globe'

const props = defineProps<{
  devices: GlobeDevice[]
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-device', device: GlobeDevice): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const selectedDevice = ref<GlobeDevice | null>(null)
const isRotating = ref(true)
const webGlError = ref(false)
const autoRotateSpeed = 0.002

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let globeGroup: THREE.Group
let animationFrameId: number

// 鼠标交互控制变量
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
let targetRotation = { x: 0.2, y: 0 }
let currentRotation = { x: 0.2, y: 0 }

const onMouseUp = () => {
  isDragging = false
}

// 经纬度转 3D 笛卡尔坐标 (半径 R)
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - (lat || 0)) * (Math.PI / 180)
  const theta = ((lng || 0) + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

// 创建大圆弧线 (Great Circle Arc) 空间飞线
const createCurvedArc = (startVec: THREE.Vector3, endVec: THREE.Vector3, colorHex: number): THREE.Line => {
  const distance = startVec.distanceTo(endVec)
  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)

  // 根据距离将中点向球心外凸出，形成抛物弧线
  const altitude = 1 + distance * 0.22
  midPoint.normalize().multiplyScalar(altitude * 100)

  const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec)
  const points = curve.getPoints(50)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  const material = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.65,
    linewidth: 1.5,
  })

  return new THREE.Line(geometry, material)
}

// 初始化 Three.js 场景
const initThree = () => {
  if (!containerRef.value) return
  try {
    const width = containerRef.value.clientWidth || 800
    const height = containerRef.value.clientHeight || 500

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000)
    camera.position.z = 280

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.value.appendChild(renderer.domElement)

    globeGroup = new THREE.Group()
    scene.add(globeGroup)

  const RADIUS = 100

  // 1. 核心地球球体
  const sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64)
  const sphereMat = new THREE.MeshPhongMaterial({
    color: props.isDark ? 0x111b2b : 0xe2e8f0,
    emissive: props.isDark ? 0x070d19 : 0xf1f5f9,
    specular: props.isDark ? 0x1e3a8a : 0x93c5fd,
    shininess: 15,
    transparent: true,
    opacity: 0.92,
    wireframe: false,
  })
  const earthMesh = new THREE.Mesh(sphereGeo, sphereMat)
  globeGroup.add(earthMesh)

  // 2. 经纬线与网格网状线 (Latitude/Longitude Graticule)
  const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(RADIUS + 0.2, 24, 24))
  const wireMat = new THREE.LineBasicMaterial({
    color: props.isDark ? 0x2563eb : 0x94a3b8,
    transparent: true,
    opacity: props.isDark ? 0.15 : 0.2,
  })
  const wireMesh = new THREE.LineSegments(wireGeo, wireMat)
  globeGroup.add(wireMesh)

  // 3. 外部发光大气层光晕 (Atmosphere Glow)
  const glowGeo = new THREE.SphereGeometry(RADIUS * 1.08, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: props.isDark ? 0x3b82f6 : 0x60a5fa,
    transparent: true,
    opacity: props.isDark ? 0.08 : 0.05,
    side: THREE.BackSide,
  })
  const glowMesh = new THREE.Mesh(glowGeo, glowMat)
  globeGroup.add(glowMesh)

  // 4. 灯光系统
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambientLight)

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight1.position.set(200, 200, 200)
  scene.add(dirLight1)

  const dirLight2 = new THREE.DirectionalLight(props.isDark ? 0x3b82f6 : 0x93c5fd, 0.8)
  dirLight2.position.set(-200, -100, -100)
  scene.add(dirLight2)

  // 5. 添加设备节点标记 (Marker Pins)
  const nodeMarkers: THREE.Mesh[] = []
  props.devices.forEach((dev) => {
    const pos = latLngToVector3(dev.lat, dev.lng, RADIUS + 0.8)

    // 发光圆环或核心点
    const markerGeo = new THREE.SphereGeometry(2.2, 16, 16)
    const markerMat = new THREE.MeshBasicMaterial({
      color: dev.status === 'online' ? 0x10b981 : 0x94a3b8,
    })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    marker.position.copy(pos)
    marker.userData = dev
    globeGroup.add(marker)
    nodeMarkers.push(marker)

    // 外圈光晕立柱
    const ringGeo = new THREE.RingGeometry(2.5, 4.2, 16)
    const ringMat = new THREE.MeshBasicMaterial({
      color: dev.status === 'online' ? 0x34d399 : 0x94a3b8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.copy(pos.clone().multiplyScalar(1.002))
    ring.lookAt(new THREE.Vector3(0, 0, 0))
    globeGroup.add(ring)
  })

  // 6. 添加 P2P 飞线 (Arcs between nodes)
  // 以香港核心节点为枢纽，连接东京、上海、硅谷
  if (props.devices.length >= 2) {
    const hub = props.devices[0]
    const hubVec = latLngToVector3(hub.lat, hub.lng, RADIUS)

    for (let i = 1; i < props.devices.length; i++) {
      const peer = props.devices[i]
      if (peer.status === 'online') {
        const peerVec = latLngToVector3(peer.lat, peer.lng, RADIUS)
        const isDirect = peer.connection.includes('直连')
        const arcLine = createCurvedArc(hubVec, peerVec, isDirect ? 0x10b981 : 0xf59e0b)
        globeGroup.add(arcLine)
      }
    }
  }

    // 7. 鼠标交互事件监听
    const dom = renderer.domElement

    dom.addEventListener('mousedown', (e) => {
      isDragging = true
      isRotating.value = false
      previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    window.addEventListener('mouseup', onMouseUp)

    dom.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        // 射线检测鼠标悬浮的节点
        const rect = dom.getBoundingClientRect()
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / width) * 2 - 1,
          -((e.clientY - rect.top) / height) * 2 + 1
        )
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(nodeMarkers)
        if (intersects.length > 0) {
          dom.style.cursor = 'pointer'
        } else {
          dom.style.cursor = 'grab'
        }
        return
      }

      const deltaX = e.clientX - previousMousePosition.x
      const deltaY = e.clientY - previousMousePosition.y

      targetRotation.y += deltaX * 0.005
      targetRotation.x += deltaY * 0.005

      // 限制俯仰角度，避免翻滚
      targetRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotation.x))

      previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    // 点击选择节点
    dom.addEventListener('click', (e) => {
      const rect = dom.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / width) * 2 - 1,
        -((e.clientY - rect.top) / height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(nodeMarkers)
      if (intersects.length > 0) {
        const dev = intersects[0].object.userData as GlobeDevice
        selectedDevice.value = dev
        emit('select-device', dev)
      }
    })

    // 滚轮缩放控制
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        camera.position.z += e.deltaY * 0.15
        camera.position.z = Math.max(180, Math.min(450, camera.position.z))
      },
      { passive: false }
    )

    // 8. 渲染循环
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      // 自动自转与惯性插值
      if (isRotating.value) {
        targetRotation.y += autoRotateSpeed
      }

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1

      globeGroup.rotation.x = currentRotation.x
      globeGroup.rotation.y = currentRotation.y

      renderer.render(scene, camera)
    }

    animate()
  } catch (err) {
    webGlError.value = true
    console.warn('WebGL initialization failed, falling back to 2D view:', err)
  }
}

// 聚焦到指定设备
const focusOnDevice = (dev: GlobeDevice) => {
  selectedDevice.value = dev
  isRotating.value = false

  // 计算对应经纬度应该对准相机的旋转角度
  const targetY = -(((dev.lng || 0) + 180) * (Math.PI / 180)) + Math.PI / 2
  const targetX = ((dev.lat || 0) * (Math.PI / 180)) * 0.6

  targetRotation.y = targetY
  targetRotation.x = targetX
}

// 响应容器大小变化
const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mouseup', onMouseUp)
  if (renderer && renderer.domElement) {
    renderer.dispose()
  }
})

// 暴露聚焦方法
defineExpose({
  focusOnDevice,
})
</script>

<template>
  <div class="relative w-full h-[520px] rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-[#f8fafc] dark:bg-[#151d2c] overflow-hidden select-none shadow-2xs">
    
    <!-- WebGL 不可用或报错时的优雅降级 -->
    <div v-if="webGlError" class="w-full h-full p-6 flex flex-col justify-between">
      <div class="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <Globe class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 class="font-bold text-gray-900 dark:text-white text-base">全球节点拓扑空间概览</h3>
        </div>
        <span class="text-xs text-gray-400">已开启轻量 2D 拓扑视图</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-auto">
        <div
          v-for="dev in devices"
          :key="dev.id"
          @click="emit('select-device', dev)"
          class="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-blue-500 cursor-pointer transition-all space-y-1.5"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-gray-900 dark:text-white">{{ dev.hostname }}</span>
            <span :class="['w-2 h-2 rounded-full', dev.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400']"></span>
          </div>
          <div class="text-xs text-gray-500">{{ dev.locationName }}</div>
          <div class="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-gray-100 dark:border-gray-800 text-gray-400">
            <span>{{ dev.publicIp }}</span>
            <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ dev.ipv4 }}</span>
          </div>
        </div>
      </div>

      <div class="text-xs text-gray-400 text-center">
        点击节点卡片可展开右侧详细参数抽屉并配置路由
      </div>
    </div>

    <!-- 正常 WebGL Three.js 画布容器 -->
    <template v-else>
      <div ref="containerRef" class="w-full h-full cursor-grab active:cursor-grabbing"></div>

      <!-- 顶部浮动控制工具条 -->
      <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div class="flex items-center gap-2 pointer-events-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-2xs">
          <Globe class="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span class="text-xs font-semibold text-gray-900 dark:text-white">EasyTier 全球设备空间分布</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
            {{ devices.filter(d => d.status === 'online').length }} 节点在线
          </span>
        </div>

        <!-- 旋转与重置控制 -->
        <div class="flex items-center gap-1.5 pointer-events-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-2xs">
          <button
          type="button"
          @click="isRotating = !isRotating"
          :class="[
            'px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors',
            isRotating ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          ]"
          title="切换地球自动旋转"
        >
          <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': isRotating }" />
          <span>{{ isRotating ? '旋转中' : '已暂停' }}</span>
        </button>
      </div>
    </div>

    <!-- 左下角图例 (Legend) -->
    <div class="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[11px] space-y-1.5 shadow-2xs">
      <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">空间连通图例</div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">P2P 直连打洞 (Direct Arc)</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">协同中继中转 (Relay Arc)</span>
      </div>
      <div class="text-[10px] text-gray-400 pt-0.5 border-t border-gray-100 dark:border-gray-800">
        按住鼠标左键可 360° 旋转，滚轮可缩放地球
      </div>
    </div>

    <!-- 右侧节点浮动快选列表 -->
    <div class="absolute top-14 right-3 w-56 max-h-[380px] overflow-y-auto space-y-1.5 pointer-events-auto">
      <div
        v-for="dev in devices"
        :key="dev.id"
        @click="focusOnDevice(dev)"
        :class="[
          'p-2 rounded-lg border cursor-pointer backdrop-blur-md transition-all text-xs',
          selectedDevice?.id === dev.id
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white/85 dark:bg-gray-900/85 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800'
        ]"
      >
        <div class="flex items-center justify-between font-semibold">
          <div class="flex items-center gap-1.5 truncate">
            <span
              :class="[
                'w-2 h-2 rounded-full shrink-0',
                dev.status === 'online' ? 'bg-emerald-400' : 'bg-gray-400'
              ]"
            ></span>
            <span class="truncate">{{ dev.hostname }}</span>
          </div>
          <span class="text-[10px] font-mono opacity-80">{{ dev.latencyMs }}ms</span>
        </div>
        <div class="text-[11px] opacity-75 mt-0.5 flex items-center justify-between">
          <span>{{ dev.locationName }}</span>
          <span class="font-mono">{{ dev.publicIp }}</span>
        </div>
      </div>
    </div>

    <!-- 底部选中节点悬浮卡片 -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform translate-y-3 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-3 opacity-0"
    >
      <div
        v-if="selectedDevice"
        class="absolute bottom-3 right-3 max-w-sm w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg text-xs space-y-2 pointer-events-auto"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['w-2.5 h-2.5 rounded-full', selectedDevice.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400']"></span>
            <span class="font-bold text-gray-900 dark:text-white text-sm">{{ selectedDevice.hostname }}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {{ selectedDevice.locationName }}
            </span>
          </div>
          <button type="button" @click="selectedDevice = null" class="text-gray-400 hover:text-gray-600">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="p-1.5 rounded bg-gray-50 dark:bg-gray-800/60">
            <span class="text-gray-400 block text-[10px]">公网出口 IP</span>
            <span class="font-semibold text-gray-800 dark:text-gray-200">{{ selectedDevice.publicIp }}</span>
          </div>
          <div class="p-1.5 rounded bg-gray-50 dark:bg-gray-800/60">
            <span class="text-gray-400 block text-[10px]">虚拟 IPv4 地址</span>
            <span class="font-semibold text-blue-600 dark:text-blue-400">{{ selectedDevice.ipv4 }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 dark:border-gray-800">
          <span class="text-gray-500">穿透链路: <strong class="text-gray-800 dark:text-gray-200">{{ selectedDevice.connection }}</strong> ({{ selectedDevice.latencyMs }}ms)</span>
          <button
            type="button"
            @click="emit('select-device', selectedDevice)"
            class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5"
          >
            打开节点详情抽屉
            <ArrowUpRight class="w-3 h-3" />
          </button>
        </div>
      </div>
    </transition>
    </template>

  </div>
</template>
