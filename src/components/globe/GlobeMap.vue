<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import landTopology from '@/assets/land-110m.json'
import {
  Globe,
  Compass,
  Crosshair,
  Play,
  Settings,
  Wifi,
  X,
  ArrowUpRight,
  Menu,
  RotateCw,
  Eye,
  EyeOff,
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
  }>(),
  {
    isDark: false,
  }
)

const emit = defineEmits<{
  (e: 'select-device', device: GlobeDevice): void
}>()

// 视图模式与控制状态
const viewMode = ref<'3d' | '2d'>('3d')
const showDeviceList = ref(false)
const showLines = ref(true)
const searchTarget = ref('')
const selectedDevice = ref<GlobeDevice | null>(null)
const isRotating = ref(true)
const webGlError = ref(false)
const isTracing = ref(false)

const containerRef = ref<HTMLDivElement | null>(null)
const canvas2dRef = ref<HTMLCanvasElement | null>(null)

// Three.js 核心对象
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let globeGroup: THREE.Group
let linesGroup: THREE.Group
let markersGroup: THREE.Group
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null = null
let pulseSprites: { sprite: THREE.Sprite; baseScale: number }[] = []
let animationFrameId: number

const RADIUS = 100
const autoRotateSpeed = 0.0012

// 鼠标交互控制变量
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
// 初始角度对准东亚/西太平洋 (如截图所示)
let targetRotation = { x: 0.32, y: -2.15 }
let currentRotation = { x: 0.32, y: -2.15 }

const onMouseUp = () => {
  isDragging = false
}

// 经纬度转 3D 笛卡尔坐标
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - (lat || 0)) * (Math.PI / 180)
  const theta = ((lng || 0) + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

// 动态生成高清世界陆地与经纬网画布贴图 (实现参考图中高亮纯净淡蓝+纯白陆地现代极简风格)
const createEarthTexture = (dark: boolean): THREE.CanvasTexture => {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // 1. 海洋背景底色 (浅色模式为通透明亮纯净的天空淡蓝水体 #e0f2fe，暗色模式为深空蓝)
  ctx.fillStyle = dark ? '#0a1220' : '#e0f2fe'
  ctx.fillRect(0, 0, width, height)

  // 2. 经纬度网格线 (微透天空蓝细线，与参考图一致)
  ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.32)'
  ctx.lineWidth = 1.0

  // 纬线 (每 30 度)
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // 经线 (每 30 度)
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // 赤道微加深高亮
  ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.45)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  // 3. 绘制真实世界各大洲陆地多边形 (浅色模式下为明亮纯白 #ffffff，海岸线为柔和浅灰蓝 #94a3b8)
  try {
    const landGeo = topojson.feature(landTopology as any, (landTopology as any).objects.land) as any
    const multiPoly = landGeo.features[0].geometry.coordinates

    ctx.fillStyle = dark ? '#16233b' : '#ffffff'
    ctx.strokeStyle = dark ? '#283c5a' : '#94a3b8'
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'round'

    for (const poly of multiPoly) {
      ctx.beginPath()
      for (const ring of poly) {
        if (!ring || ring.length === 0) continue
        for (let i = 0; i < ring.length; i++) {
          const pt = ring[i]
          const x = ((pt[0] + 180) / 360) * width
          const y = ((90 - pt[1]) / 180) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      }
      ctx.fill()
      ctx.stroke()
    }
  } catch (err) {
    console.warn('陆地数据解析渲染异常:', err)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

// 创建节点呼吸发光贴图 (类似截图东京、新加坡蓝热力光晕)
const createGlowTexture = (isOnline: boolean, dark: boolean): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)

  if (isOnline) {
    if (dark) {
      grad.addColorStop(0, 'rgba(56, 189, 248, 1)')
      grad.addColorStop(0.2, 'rgba(14, 165, 233, 0.85)')
      grad.addColorStop(0.48, 'rgba(2, 132, 199, 0.35)')
      grad.addColorStop(0.8, 'rgba(3, 105, 161, 0.1)')
      grad.addColorStop(1, 'rgba(3, 105, 161, 0)')
    } else {
      // 浅色模式：浓郁且泛着光晕的清澈天蓝/湛蓝发光晕圈 (与参考图一致)
      grad.addColorStop(0, 'rgba(2, 132, 199, 1)')
      grad.addColorStop(0.22, 'rgba(14, 165, 233, 0.8)')
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)')
      grad.addColorStop(0.8, 'rgba(186, 230, 253, 0.12)')
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)')
    }
  } else {
    grad.addColorStop(0, 'rgba(148, 163, 184, 0.8)')
    grad.addColorStop(0.3, 'rgba(203, 213, 225, 0.3)')
    grad.addColorStop(1, 'rgba(241, 245, 249, 0)')
  }

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 创建贴地低空飞线 (满足用户需求：不要搞那种特别高的线！低空贴地仅微凸 0.8%)
const createLowAltitudeArc = (startVec: THREE.Vector3, endVec: THREE.Vector3, colorHex: number): THREE.Line => {
  const points: THREE.Vector3[] = []
  const segments = 48
  const startNorm = startVec.clone().normalize()
  const endNorm = endVec.clone().normalize()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const current = new THREE.Vector3()
    const omega = Math.acos(Math.max(-1, Math.min(1, startNorm.dot(endNorm))))

    if (omega < 0.001) {
      current.copy(startNorm)
    } else {
      const sinOmega = Math.sin(omega)
      const w1 = Math.sin((1 - t) * omega) / sinOmega
      const w2 = Math.sin(t * omega) / sinOmega
      current.copy(startNorm).multiplyScalar(w1).add(endNorm.clone().multiplyScalar(w2))
    }

    // 关键：贴地低空控制，中间最高处仅高出表面 0.8% (RADIUS * 1.008)，完全贴合地表弧度
    const elevation = 1 + Math.sin(t * Math.PI) * 0.008
    current.normalize().multiplyScalar(RADIUS * elevation)
    points.push(current)
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: props.isDark ? 0.75 : 0.6,
    linewidth: 1.2,
  })

  return new THREE.Line(geometry, material)
}

// 重新构建标记与飞线
const updateMarkersAndLines = () => {
  if (!globeGroup || !markersGroup || !linesGroup) return

  // 清理原有标记和飞线
  while (markersGroup.children.length > 0) {
    markersGroup.remove(markersGroup.children[0])
  }
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0])
  }
  pulseSprites = []

  const nodeMarkers: THREE.Mesh[] = []
  const glowOnlineTex = createGlowTexture(true, props.isDark)
  const glowOfflineTex = createGlowTexture(false, props.isDark)

  // 1. 添加各个节点的光晕与实体点
  props.devices.forEach((dev) => {
    const pos = latLngToVector3(dev.lat, dev.lng, RADIUS + 0.3)

    // A. 柔和呼吸发光光晕 (Sprite 看向相机)
    const isOnline = dev.status === 'online'
    const spriteMat = new THREE.SpriteMaterial({
      map: isOnline ? glowOnlineTex : glowOfflineTex,
      transparent: true,
      opacity: isOnline ? (props.isDark ? 0.95 : 0.85) : 0.4,
      blending: THREE.NormalBlending,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.position.copy(pos.clone().multiplyScalar(1.002))
    const baseScale = isOnline ? 13 : 8
    sprite.scale.set(baseScale, baseScale, 1)
    markersGroup.add(sprite)
    pulseSprites.push({ sprite, baseScale })

    // B. 中心高清晰实体核心点
    const coreGeo = new THREE.SphereGeometry(1.6, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({
      color: isOnline ? (props.isDark ? 0x38bdf8 : 0x1d4ed8) : 0x94a3b8,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreMesh.position.copy(pos)
    coreMesh.userData = dev
    markersGroup.add(coreMesh)
    nodeMarkers.push(coreMesh)
  })

  // 2. 添加贴地低空飞线 (若开关开启)
  if (showLines.value && props.devices.length >= 2) {
    const hub = props.devices[0]
    const hubVec = latLngToVector3(hub.lat, hub.lng, RADIUS)

    for (let i = 1; i < props.devices.length; i++) {
      const peer = props.devices[i]
      if (peer.status === 'online') {
        const peerVec = latLngToVector3(peer.lat, peer.lng, RADIUS)
        const isDirect = peer.connection.includes('直连')
        const color = isDirect
          ? (props.isDark ? 0x38bdf8 : 0x2563eb)
          : (props.isDark ? 0xf59e0b : 0xd97706)
        const line = createLowAltitudeArc(hubVec, peerVec, color)
        linesGroup.add(line)
      }
    }
  }

  return nodeMarkers
}

// 初始化 Three.js 场景
const initThree = () => {
  if (!containerRef.value) return
  try {
    const width = containerRef.value.clientWidth || 800
    const height = containerRef.value.clientHeight || 540

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000)
    camera.position.z = 275

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    containerRef.value.appendChild(renderer.domElement)

    globeGroup = new THREE.Group()
    scene.add(globeGroup)

    linesGroup = new THREE.Group()
    markersGroup = new THREE.Group()

    // 1. 核心地球球体 (使用 MeshBasicMaterial 彻底消除背光阴影与发灰暗角，实现 100% 全面纯净高亮通透质感)
    const earthTexture = createEarthTexture(props.isDark)
    const sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64)
    const sphereMat = new THREE.MeshBasicMaterial({
      map: earthTexture,
    })
    earthMesh = new THREE.Mesh(sphereGeo, sphereMat)
    globeGroup.add(earthMesh)

    globeGroup.add(linesGroup)
    globeGroup.add(markersGroup)

    // 2. 节点与低空飞线
    const nodeMarkers = updateMarkersAndLines() || []

    // 5. 鼠标与拖拽控制
    const dom = renderer.domElement

    dom.addEventListener('mousedown', (e) => {
      isDragging = true
      isRotating.value = false
      previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    window.addEventListener('mouseup', onMouseUp)

    dom.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        // 射线检测
        const rect = dom.getBoundingClientRect()
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / width) * 2 - 1,
          -((e.clientY - rect.top) / height) * 2 + 1
        )
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(nodeMarkers)
        dom.style.cursor = intersects.length > 0 ? 'pointer' : 'grab'
        return
      }

      const deltaX = e.clientX - previousMousePosition.x
      const deltaY = e.clientY - previousMousePosition.y

      targetRotation.y += deltaX * 0.004
      targetRotation.x += deltaY * 0.004
      targetRotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, targetRotation.x))

      previousMousePosition = { x: e.clientX, y: e.clientY }
    })

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

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        camera.position.z += e.deltaY * 0.12
        camera.position.z = Math.max(170, Math.min(420, camera.position.z))
      },
      { passive: false }
    )

    // 6. 动画渲染循环
    let time = 0
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      time += 0.03

      if (isRotating.value) {
        targetRotation.y += autoRotateSpeed
      }

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1

      globeGroup.rotation.x = currentRotation.x
      globeGroup.rotation.y = currentRotation.y

      // 节点呼吸动态发光效果 (类似截图脉冲)
      pulseSprites.forEach(({ sprite, baseScale }, index) => {
        const pulse = Math.sin(time + index * 1.2) * 0.15 + 1.0
        sprite.scale.set(baseScale * pulse, baseScale * pulse, 1)
      })

      renderer.render(scene, camera)
    }

    animate()
  } catch (err) {
    webGlError.value = true
    console.warn('WebGL 初始化失败，切换为 2D 视图:', err)
  }
}

// 聚焦到指定节点或位置
const focusOnDevice = (dev: GlobeDevice) => {
  selectedDevice.value = dev
  isRotating.value = false

  const targetY = -(((dev.lng || 0) + 180) * (Math.PI / 180)) + Math.PI / 2
  const targetX = ((dev.lat || 0) * (Math.PI / 180)) * 0.55

  targetRotation.y = targetY
  targetRotation.x = targetX
}

// 重置视角到默认亚太中心
const resetView = () => {
  isRotating.value = true
  targetRotation = { x: 0.32, y: -2.15 }
  if (camera) camera.position.z = 275
}

// 聚焦活跃节点
const centerActive = () => {
  if (selectedDevice.value) {
    focusOnDevice(selectedDevice.value)
  } else if (props.devices.length > 0) {
    focusOnDevice(props.devices[0])
  }
}

// 发起模拟探测 (截图中的 ▶ 按钮)
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

// 2D 模式渲染
const render2DMap = () => {
  if (!canvas2dRef.value) return
  const canvas = canvas2dRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // 1. 海洋底色 (与 3D 地球仪保持完全一致的高亮清爽淡天蓝)
  ctx.fillStyle = props.isDark ? '#0a1220' : '#e0f2fe'
  ctx.fillRect(0, 0, width, height)

  // 2. 经纬线
  ctx.strokeStyle = props.isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.32)'
  ctx.lineWidth = 1
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // 3. 陆地轮廓 (明亮纯白 #ffffff 与清晰浅灰蓝海岸线轮廓 #94a3b8)
  try {
    const landGeo = topojson.feature(landTopology as any, (landTopology as any).objects.land) as any
    const multiPoly = landGeo.features[0].geometry.coordinates

    ctx.fillStyle = props.isDark ? '#16233b' : '#ffffff'
    ctx.strokeStyle = props.isDark ? '#283c5a' : '#94a3b8'
    ctx.lineWidth = 1.0

    for (const poly of multiPoly) {
      ctx.beginPath()
      for (const ring of poly) {
        if (!ring || ring.length === 0) continue
        for (let i = 0; i < ring.length; i++) {
          const pt = ring[i]
          const x = ((pt[0] + 180) / 360) * width
          const y = ((90 - pt[1]) / 180) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      }
      ctx.fill()
      ctx.stroke()
    }
  } catch (e) {
    console.error(e)
  }

  // 4. 贴地低空连线 (2D 平面线段)
  if (showLines.value && props.devices.length >= 2) {
    const hub = props.devices[0]
    const hx = ((hub.lng + 180) / 360) * width
    const hy = ((90 - hub.lat) / 180) * height

    ctx.strokeStyle = props.isDark ? 'rgba(56, 189, 248, 0.65)' : 'rgba(2, 132, 199, 0.6)'
    ctx.lineWidth = 1.5

    for (let i = 1; i < props.devices.length; i++) {
      const peer = props.devices[i]
      if (peer.status === 'online') {
        const px = ((peer.lng + 180) / 360) * width
        const py = ((90 - peer.lat) / 180) * height
        ctx.beginPath()
        ctx.moveTo(hx, hy)
        ctx.lineTo(px, py)
        ctx.stroke()
      }
    }
  }

  // 5. 绘制节点光晕与圆点
  props.devices.forEach((dev) => {
    const x = ((dev.lng + 180) / 360) * width
    const y = ((90 - dev.lat) / 180) * height
    const isOnline = dev.status === 'online'

    // 光晕
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, isOnline ? 14 : 7)
    if (isOnline) {
      glowGrad.addColorStop(0, 'rgba(2, 132, 199, 0.9)')
      glowGrad.addColorStop(0.3, 'rgba(14, 165, 233, 0.6)')
      glowGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.25)')
      glowGrad.addColorStop(1, 'rgba(224, 242, 254, 0)')
    } else {
      glowGrad.addColorStop(0, 'rgba(148, 163, 184, 0.6)')
      glowGrad.addColorStop(1, 'rgba(241, 245, 249, 0)')
    }
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(x, y, isOnline ? 14 : 7, 0, Math.PI * 2)
    ctx.fill()

    // 核心实体点
    ctx.fillStyle = isOnline ? '#0284c7' : '#64748b'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
}

const handleResize = () => {
  if (!containerRef.value || !renderer || !camera) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

watch(
  () => [props.devices, showLines.value],
  () => {
    updateMarkersAndLines()
    if (viewMode.value === '2d') {
      render2DMap()
    }
  },
  { deep: true }
)

watch(
  () => props.isDark,
  (dark) => {
    if (earthMesh) {
      earthMesh.material.map = createEarthTexture(dark)
      earthMesh.material.needsUpdate = true
    }
    updateMarkersAndLines()
    if (viewMode.value === '2d') {
      render2DMap()
    }
  }
)

watch(
  () => viewMode.value,
  (mode) => {
    if (mode === '2d') {
      setTimeout(render2DMap, 50)
    }
  }
)

onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mouseup', onMouseUp)
  if (renderer && renderer.domElement) {
    renderer.dispose()
  }
})

defineExpose({
  focusOnDevice,
  resetView,
})
</script>

<template>
  <div class="relative w-full h-[580px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c1322] overflow-hidden select-none shadow-2xs group">
    
    <!-- 纯净大气层外光晕渐变 (纯净通透高亮氛围，彻底解决地球发黑问题) -->
    <div
      class="absolute inset-0 pointer-events-none transition-opacity duration-500"
      :style="{
        background: isDark
          ? 'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.15) 0%, rgba(12, 19, 34, 0.4) 48%, #0c1322 75%)'
          : 'radial-gradient(circle at 50% 50%, rgba(186, 230, 253, 0.65) 0%, rgba(224, 242, 254, 0.35) 48%, #ffffff 76%)',
      }"
    ></div>

    <!-- ----------------- 模式 A: 3D 球体模式 ----------------- -->
    <div
      v-show="viewMode === '3d' && !webGlError"
      ref="containerRef"
      class="w-full h-full cursor-grab active:cursor-grabbing relative z-0"
    ></div>

    <!-- ----------------- 模式 B: 2D 平面地图投影模式 ----------------- -->
    <div
      v-show="viewMode === '2d' || webGlError"
      class="w-full h-full relative z-0 flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#0c1322]"
    >
      <canvas
        ref="canvas2dRef"
        width="1600"
        height="800"
        class="w-full max-h-[520px] rounded-lg object-contain shadow-sm border border-gray-200 dark:border-gray-800"
      ></canvas>
    </div>

    <!-- ----------------- 截图风格悬浮工具控件组 ----------------- -->

    <!-- 1. 左上角菜单展开按钮 (截图左上角 ☰ 按钮) -->
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

    <!-- 2. 右上角探测与链路卡片 (完美还原截图右上角浮动操作卡片) -->
    <div class="absolute top-4 right-4 z-20 max-w-sm w-full sm:w-auto">
      <div class="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 shadow-md p-3 space-y-2.5">
        
        <!-- 卡片顶部小拉手装饰条 -->
        <div class="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto -mt-1 opacity-60"></div>

        <!-- 目标 IP / 域名探测输入栏 (类似截图第一行) -->
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

        <!-- 链路状态与操作栏 (类似截图第二行) -->
        <div class="flex items-center justify-between gap-2 text-xs pt-0.5 border-t border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-300">
          <div class="flex items-center gap-1.5 truncate">
            <Wifi class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span class="font-medium truncate text-[11px]">
              {{ selectedDevice ? selectedDevice.hostname : '香港核心网关 • 东京' }}
            </span>
            <span class="text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
              +{{ devices.length > 2 ? devices.length - 2 : 1 }}
            </span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              @click="showLines = !showLines"
              :class="[
                'text-[11px] px-2 py-0.8 rounded border transition-colors cursor-pointer flex items-center gap-1',
                showLines
                  ? 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400',
              ]"
              title="切换贴地低空飞线"
            >
              <component :is="showLines ? Eye : EyeOff" class="w-3 h-3" />
              <span>链路飞线</span>
            </button>
            <button
              type="button"
              @click="isRotating = !isRotating"
              :class="[
                'p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer',
                isRotating ? 'text-blue-600 dark:text-blue-400' : '',
              ]"
              title="自转开关"
            >
              <RotateCw class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- 3. 右下角地图视角控制与 3D / 2D 切换栏 (完美还原截图右下角控制条) -->
    <div class="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-1 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm text-xs">
      
      <!-- 航向复位按钮 🧭 -->
      <button
        type="button"
        @click="resetView"
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
        title="复位视角至默认中心"
      >
        <Compass class="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </button>

      <!-- 居中目标节点按钮 🎯 -->
      <button
        type="button"
        @click="centerActive"
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
        title="居中当前节点"
      >
        <Crosshair class="w-4 h-4" />
      </button>

      <div class="w-[1px] h-3.5 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <!-- 3D / 2D 分段切换按钮 (截图右下角核心亮点) -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md font-mono text-[11px] font-semibold">
        <button
          type="button"
          @click="viewMode = '3d'"
          :class="[
            'px-2 py-0.8 rounded transition-all duration-150 cursor-pointer',
            viewMode === '3d'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          ]"
        >
          3D
        </button>
        <button
          type="button"
          @click="viewMode = '2d'"
          :class="[
            'px-2 py-0.8 rounded transition-all duration-150 cursor-pointer',
            viewMode === '2d'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          ]"
        >
          2D
        </button>
      </div>

    </div>

    <!-- 4. 底部节点详情浮窗 (点击任意节点时优雅展开) -->
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
        class="absolute bottom-4 left-4 max-w-sm w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl text-xs space-y-2 z-20"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span :class="['w-2.5 h-2.5 rounded-full', selectedDevice.status === 'online' ? 'bg-blue-600' : 'bg-gray-400']"></span>
            <span class="font-bold text-gray-900 dark:text-white text-sm">{{ selectedDevice.hostname }}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {{ selectedDevice.locationName }}
            </span>
          </div>
          <button type="button" @click="selectedDevice = null" class="text-gray-400 hover:text-gray-600 cursor-pointer">
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
            class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            打开节点参数抽屉
            <ArrowUpRight class="w-3 h-3" />
          </button>
        </div>
      </div>
    </transition>

  </div>
</template>
