<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import GlobeMap from '@/components/globe/GlobeMap.vue'
import NetworkTopology from '@/components/topology/NetworkTopology.vue'
import type { GlobeDevice } from '@/types/globe'
import {
  Network,
  GitFork,
  Lock,
  Book,
  Settings,
  BookOpen,
  CircleHelp,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Minus,
  Plus,
  Search,
  Copy,
  Check,
  MoreVertical,
  X,
  Play,
  RotateCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Menu,
  Radio,
  Server,
  Activity,
  Zap,
  Globe,
  List,
  Layers,
  Key,
  FolderGit2,
  Eye,
  EyeOff,
  Sliders,
  SlidersHorizontal,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Clock,
  ArrowDownLeft,
  Trash2,
  Wrench,
} from 'lucide-vue-next'

// --- 多网络管理状态 (按照“网络为中心”进行管理) ---
interface ManagedNetwork {
  id: string
  name: string
  status: 'active' | 'degraded' | 'syncing'
  nodeCount: number
  onlineCount: number
  ipv4Cidr: string
  ipv6Cidr: string
  secretKey: string
  rpcPortal: string
  relayHubs: string[]
  createdDate: string
}

const { isDark } = useTheme()

const managedNetworks = ref<ManagedNetwork[]>([
  {
    id: 'net-default',
    name: 'default-mesh',
    status: 'active',
    nodeCount: 0,
    onlineCount: 0,
    ipv4Cidr: '10.144.144.0/24',
    ipv6Cidr: '',
    secretKey: '',
    rpcPortal: '',
    relayHubs: [],
    createdDate: new Date().toISOString().split('T')[0],
  }
])

const currentNetworkId = ref<string>('net-default')
const currentNetwork = computed(() => {
  return managedNetworks.value.find((n) => n.id === currentNetworkId.value) || managedNetworks.value[0]
})

// 网络流量动态统计 (模拟真实 Mesh 局域网传输累计与实时速率)
interface NetworkTrafficStats {
  rxTotal: string
  txTotal: string
  rxSpeed: string
  txSpeed: string
}

const networkTrafficMap = ref<Record<string, NetworkTrafficStats>>({})

const currentTraffic = computed(() => {
  return (
    networkTrafficMap.value[currentNetworkId.value] || {
      rxTotal: '0 B',
      txTotal: '0 B',
      rxSpeed: '0 B/s',
      txSpeed: '0 B/s',
    }
  )
})

// 专属网络切换面板模态框

const showAddTestModal = ref(false)
const isRefreshingStun = ref(false)
const stunServers = ref<any[]>([])
const showAddStunModal = ref(false)
const newStunForm = ref({ name: '', host: '', type: 'public' })
const addStunServer = () => {
  if (!newStunForm.value.name.trim() || !newStunForm.value.host.trim()) {
    showToast('请填写 STUN 名称和地址')
    return
  }
  stunServers.value.push({
    id: `stun-${Date.now()}`,
    name: newStunForm.value.name,
    host: newStunForm.value.host,
    type: newStunForm.value.type === 'public' ? '公共 STUN' : '私有中继',
    latency: (Math.random() * 50 + 10).toFixed(1)
  })
  showAddStunModal.value = false
  newStunForm.value = { name: '', host: '', type: 'public' }
  showToast('STUN 节点添加成功')
}
const logsList = ref<any[]>([])
const newTestForm = ref({ name: '', src: '', dst: '' })

const refreshStun = () => {
  isRefreshingStun.value = true
  setTimeout(() => { isRefreshingStun.value = false }, 1000)
}
const clearLogs = () => {
  logsList.value = []
}
const saveSettings = () => {
  showToast('Settings saved')
}

const showNetworkModal = ref(false)
const showCreateNetworkModal = ref(false)
const showNetworkSecret = ref(false)

// 指标卡片自定义显示控制
interface MetricVisibility {
  onlineNodes: boolean
  avgLatency: boolean
  rxTraffic: boolean
  txTraffic: boolean
  p2pRate: boolean
  ipv4Cidr: boolean
  ipv6Cidr: boolean
  secretKey: boolean
}

const defaultMetricVisibility: MetricVisibility = {
  onlineNodes: true,
  avgLatency: true,
  rxTraffic: true,
  txTraffic: true,
  p2pRate: true,
  ipv4Cidr: true,
  ipv6Cidr: true,
  secretKey: true,
}

const loadMetricVisibility = (): MetricVisibility => {
  try {
    const saved = localStorage.getItem('easytier_metric_visibility')
    if (saved) return { ...defaultMetricVisibility, ...JSON.parse(saved) }
  } catch {}
  return { ...defaultMetricVisibility }
}

const metricVisibility = ref<MetricVisibility>(loadMetricVisibility())

const toggleMetricVisibility = (key: keyof MetricVisibility) => {
  metricVisibility.value[key] = !metricVisibility.value[key]
  localStorage.setItem('easytier_metric_visibility', JSON.stringify(metricVisibility.value))
}

const showAllMetrics = () => {
  for (const k of Object.keys(metricVisibility.value) as (keyof MetricVisibility)[]) {
    metricVisibility.value[k] = true
  }
  localStorage.setItem('easytier_metric_visibility', JSON.stringify(metricVisibility.value))
}

const isMetricConfigOpen = ref(false)

const metricToggleList = computed(() => [
  { key: 'onlineNodes' as const, label: '在线节点数量', icon: Server },
  { key: 'avgLatency' as const, label: '平均链路延迟', icon: Clock },
  { key: 'rxTraffic' as const, label: '入网总流量 (RX)', icon: ArrowDownLeft },
  { key: 'txTraffic' as const, label: '出网总流量 (TX)', icon: ArrowUpRight },
  { key: 'p2pRate' as const, label: 'P2P 直连打洞率', icon: Zap },
  { key: 'ipv4Cidr' as const, label: '虚拟 IPv4 网段', icon: Network },
  { key: 'ipv6Cidr' as const, label: '虚拟 IPv6 网段', icon: Radio },
  { key: 'secretKey' as const, label: '网络加入秘钥 (PSK)', icon: Key },
])

const newNetworkForm = ref({
  name: '',
  ipv4Cidr: '10.144.200.0/24',
  ipv6Cidr: 'fd00:144:200::/64',
  secretKey: '',
})

const advancedSettings = ref({
  noTunMode: false,
  magicDns: true,
  autoStart: true,
  socks5Proxy: false,
  socks5Port: 1080,
  kcpProxy: false,
  wireguardAccess: false,
  wireguardPort: 51820,
  secureMode: false,
})


// --- 导航菜单状态定义 ---
type SubNavItem = 'network-overview' | 'machines' | 'subnets' | 'stun' | 'policies' | 'tests' | 'toml' | 'logs' | 'settings' | 'advanced' | 'advanced'
const activeSubNav = ref<SubNavItem>('network-overview')

// 侧边栏折叠状态 (桌面端一键收起，只保留图标)
const isSidebarCollapsed = ref(localStorage.getItem('easytier_sidebar_collapsed') === 'true')
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  localStorage.setItem('easytier_sidebar_collapsed', String(isSidebarCollapsed.value))
}

// 显示模式切换：列表模式 vs 网络拓扑图 vs 全球 3D 球形地图模式
const displayMode = ref<'table' | 'topology' | 'globe'>('table')
// 网络总览视图切换：网络拓扑 (默认) vs 3D 数字地球 vs 双图同屏
const overviewViewTab = ref<'topology' | 'globe' | 'split'>('topology')

// 移动端菜单抽屉状态
const mobileMenuOpen = ref(false)

// 折叠组状态
const isNetworkOpen = ref(true)
const isAccessControlsOpen = ref(true)
const isLogsOpen = ref(false)
const isSettingsOpen = ref(false)

// 全局 Toast 提示
const toastMessage = ref<string | null>(null)
const copiedKey = ref<string | null>(null)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

// 连接模式枚举与规范化定义（避免依赖硬编码中文文本匹配）
export type ConnectionMode = 'p2p' | 'relay' | 'disconnected'

const copyText = async (text: string, label: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // 降级兼容：兼容非 HTTPS 安全上下文或未授予权限的环境
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (!successful) throw new Error('execCommand failed')
    }
    copiedKey.value = text
    showToast(`已成功复制 ${label}: ${text}`)
    setTimeout(() => {
      if (copiedKey.value === text) copiedKey.value = null
    }, 1800)
  } catch (err) {
    console.warn(`[Clipboard] 复制 ${label} 异常:`, err)
    showToast(`复制失败，请手动选择复制 ${label}`)
  }
}

// --- 设备节点数据 (含全球 IP 物理经纬度定位信息) ---
const nodes = ref<any[]>([])

// 转换为 3D 球形地图需要的设备格式
const globeDevices = computed<GlobeDevice[]>(() => {
  return nodes.value.map((n) => ({
    id: n.id,
    hostname: n.hostname,
    locationName: n.locationName,
    countryCode: n.countryCode,
    publicIp: n.publicIp,
    ipv4: n.ipv4,
    ipv6: n.ipv6,
    lat: n.lat,
    lng: n.lng,
    status: n.status,
    connection: n.connection,
    latencyMs: n.latencyMs,
    natType: n.natType,
  }))
})

// 网络运行态指标动态汇总 (在线节点、平均延迟、打洞成功率)
const onlineNodesCount = computed(() => nodes.value.filter((n) => n.status === 'online').length)
const totalNodesCount = computed(() => nodes.value.length)
const onlinePercentage = computed(() => {
  if (!totalNodesCount.value) return 0
  return Math.round((onlineNodesCount.value / totalNodesCount.value) * 100)
})

const avgLatency = computed(() => {
  const onlineWithLat = nodes.value.filter((n) => n.status === 'online' && n.latencyMs > 0)
  if (!onlineWithLat.length) return 0
  const sum = onlineWithLat.reduce((acc, cur) => acc + cur.latencyMs, 0)
  return Math.round(sum / onlineWithLat.length)
})

// 规范化连接类型判定函数，避免硬编码中文字符串匹配，解耦数据层与展示层
const isP2PConnection = (node: { connectionMode?: string; connection?: string; status?: string }): boolean => {
  if (node.status === 'offline') return false
  if (node.connectionMode) {
    return node.connectionMode.toLowerCase() === 'p2p'
  }
  const conn = (node.connection || '').toLowerCase()
  return conn.includes('p2p') || conn.includes('direct') || conn.includes('直连')
}

const isRelayConnection = (node: { connectionMode?: string; connection?: string; status?: string }): boolean => {
  if (node.status === 'offline') return false
  if (node.connectionMode) {
    return node.connectionMode.toLowerCase() === 'relay'
  }
  const conn = (node.connection || '').toLowerCase()
  return conn.includes('relay') || conn.includes('中继') || (!isP2PConnection(node) && node.status === 'online')
}

const p2pNodesCount = computed(() => nodes.value.filter((n) => n.status === 'online' && isP2PConnection(n)).length)
const relayNodesCount = computed(() => nodes.value.filter((n) => n.status === 'online' && isRelayConnection(n)).length)
const p2pSuccessRate = computed(() => {
  const total = onlineNodesCount.value
  if (!total) return '0.0'
  return ((p2pNodesCount.value / total) * 100).toFixed(1)
})

// --- UI 状态控制 ---
const isBannerMinimized = ref(false)
const showAddDeviceModal = ref(false)
const selectedOs = ref<'linux' | 'macos' | 'windows' | 'docker'>('linux')
const searchQuery = ref('')
const filterTab = ref<'all' | 'connected' | 'exit' | 'offline'>('all')

// 抽屉详情状态
const drawerOpen = ref(false)
const drawerTab = ref<'details' | 'routing' | 'peers' | 'toml'>('details')
const activeNode = ref<any | null>(null)

// 过滤后的节点列表
const filteredNodes = computed(() => {
  return nodes.value.filter((n) => {
    if (filterTab.value === 'connected' && n.status !== 'online') return false
    if (filterTab.value === 'offline' && n.status !== 'offline') return false
    if (filterTab.value === 'exit' && !n.isExitNode) return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      return (
        n.hostname.toLowerCase().includes(q) ||
        n.ipv4.includes(q) ||
        n.ipv6.toLowerCase().includes(q) ||
        n.locationName.includes(q) ||
        n.tags.some((t: string) => t.toLowerCase().includes(q))
      )
    }
    return true
  })
})

const openDrawer = (nodeOrDevice: any) => {
  if (!nodeOrDevice) return
  const fullNode = nodes.value.find((n) => n.id === nodeOrDevice.id) || nodeOrDevice
  const clone = JSON.parse(JSON.stringify(fullNode))
  if (!Array.isArray(clone.subnets)) clone.subnets = []
  if (!Array.isArray(clone.tags)) clone.tags = []
  if (!Array.isArray(clone.listeners)) clone.listeners = []
  if (!Array.isArray(clone.peersList)) clone.peersList = []
  if (clone.isExitNode === undefined) clone.isExitNode = false
  if (clone.isSubnetApproved === undefined) clone.isSubnetApproved = false
  activeNode.value = clone
  drawerOpen.value = true
}

const saveDrawerChanges = () => {
  if (!activeNode.value) return
  const idx = nodes.value.findIndex((n) => n.id === activeNode.value.id)
  if (idx !== -1) {
    nodes.value[idx] = JSON.parse(JSON.stringify(activeNode.value))
  }
  drawerOpen.value = false
  showToast(`已成功保存节点 ${activeNode.value.hostname} 的网络与子网配置`)
}

// 模拟添加新节点 (已移除)
const addTestCase = () => {
  if (!newTestForm.value.name.trim() || !newTestForm.value.src.trim() || !newTestForm.value.dst.trim()) {
    showToast('请填写完整的测试用例信息')
    return
  }
  aclTests.value.push({
    id: `test-${Date.now()}`,
    name: newTestForm.value.name,
    src: newTestForm.value.src,
    dst: newTestForm.value.dst,
    action: '-',
    ruleMatched: '-',
    latency: '-',
    status: 'pending'
  })
  showAddTestModal.value = false
  newTestForm.value = { name: '', src: '', dst: '' }
  showToast('测试用例添加成功')
}


const deleteNetwork = (id: string, name: string) => {
  if (managedNetworks.value.length <= 1) {
    showToast('至少保留一个虚拟网络，无法删除最后一个网络。')
    return
  }
  if (!confirm(`确定要删除虚拟网络 "${name}" 吗？此操作不可撤销，且网络下的所有节点将断开连接！`)) return
  
  managedNetworks.value = managedNetworks.value.filter(n => n.id !== id)
  if (currentNetworkId.value === id) {
    currentNetworkId.value = managedNetworks.value[0].id
    showToast(`已删除网络 ${name}，并自动切换至 ${managedNetworks.value[0].name}`)
  } else {
    showToast(`已成功删除虚拟网络: ${name}`)
  }
}

// 新建网络提交
const createNewNetwork = () => {


  if (!newNetworkForm.value.name.trim()) return
  const newNet: ManagedNetwork = {
    id: `net-${Date.now().toString().slice(-4)}`,
    name: newNetworkForm.value.name.trim(),
    status: 'active',
    nodeCount: 1,
    onlineCount: 1,
    ipv4Cidr: newNetworkForm.value.ipv4Cidr,
    ipv6Cidr: newNetworkForm.value.ipv6Cidr,
    secretKey: newNetworkForm.value.secretKey || `token-${Date.now().toString().slice(-6)}`,
    rpcPortal: 'tcp://hub.example.com:11010',
    relayHubs: [],
    createdDate: new Date().toISOString().split('T')[0],
  }
  managedNetworks.value.push(newNet)
  currentNetworkId.value = newNet.id
  showCreateNetworkModal.value = false
  showToast(`虚拟网络 ${newNet.name} 已成功创建并切换为主控网络！`)
}



// --- 子网路由 (Proxy CIDR) 逻辑 ---
interface SubnetRoute {
  id: string
  cidr: string
  nodeId: string
  gatewayName: string
  gatewayIp: string
  status: string
  metric: number
}

const subnetRoutes = computed<SubnetRoute[]>(() => {
  const routes: SubnetRoute[] = []
  nodes.value.forEach(node => {
    if (Array.isArray(node.subnets)) {
      node.subnets.forEach((cidr: string, idx: number) => {
        routes.push({
          id: `${node.id}-${idx}`,
          cidr: cidr,
          nodeId: node.id,
          gatewayName: node.hostname,
          gatewayIp: node.ipv4 || node.publicIp || 'Unknown',
          status: node.isSubnetApproved !== false ? '已放行 (Approved)' : '待审批 (Pending)',
          metric: node.latencyMs < 50 ? 1 : 2
        })
      })
    }
  })
  return routes
})

const showAddSubnetModal = ref(false)
const newSubnetForm = ref({ cidr: '', nodeId: '' })

const addSubnetRoute = () => {
  if (!newSubnetForm.value.cidr || !newSubnetForm.value.nodeId) {
    showToast('请填写子网 CIDR 并选择网关节点')
    return
  }
  const targetNode = nodes.value.find(n => n.id === newSubnetForm.value.nodeId)
  if (targetNode) {
    if (!Array.isArray(targetNode.subnets)) targetNode.subnets = []
    if (targetNode.subnets.includes(newSubnetForm.value.cidr)) {
      showToast('该子网路由已存在于选定节点中')
      return
    }
    targetNode.subnets.push(newSubnetForm.value.cidr)
    showToast(`已成功为节点 ${targetNode.hostname} 添加子网路由 ${newSubnetForm.value.cidr}`)
    showAddSubnetModal.value = false
    newSubnetForm.value.cidr = ''
    newSubnetForm.value.nodeId = ''
  } else {
    showToast('未找到选定的网关节点')
  }
}

// --- ACL Policies 访问控制策略 ---
interface AclPolicy {
  id: string
  name: string
  src: string
  dst: string
  action: 'allow' | 'deny'
  priority: number
  enabled: boolean
}

const aclPolicies = ref<AclPolicy[]>([])

const aclConflicts = computed(() => {
  const conflicts: { rule1: string, rule2: string, reason: string }[] = []
  const activeRules = aclPolicies.value.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)
  
  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const r1 = activeRules[i]
      const r2 = activeRules[j]
      
      // Simple conflict detection logic: same src and dst but different actions, or overlapping CIDRs
      const srcOverlap = r1.src === r2.src || r1.src === '0.0.0.0/0' || r2.src === '0.0.0.0/0'
      const dstOverlap = r1.dst === r2.dst || r1.dst === '*:*' || r2.dst === '*:*'
      
      if (srcOverlap && dstOverlap && r1.action !== r2.action) {
         conflicts.push({
           rule1: r1.name,
           rule2: r2.name,
           reason: `源 "${r1.src}" 与目标 "${r1.dst}" 范围重叠但动作冲突。高优先级规则 "${r1.name}" 将覆盖 "${r2.name}"。`
         })
      }
    }
  }
  return conflicts
})

const editingPolicy = ref<AclPolicy | null>(null)
const showPolicyModal = ref(false)

const savePolicy = () => {
  if (editingPolicy.value) {
    if (!editingPolicy.value.id) {
       editingPolicy.value.id = `rule-${Date.now()}`
       aclPolicies.value.push({...editingPolicy.value} as AclPolicy)
    } else {
       const idx = aclPolicies.value.findIndex(r => r.id === editingPolicy.value!.id)
       if (idx !== -1) {
         aclPolicies.value[idx] = {...editingPolicy.value} as AclPolicy
       }
    }
  }
  showPolicyModal.value = false
  showToast('访问控制策略已保存')
}

const deletePolicy = (id: string) => {
  aclPolicies.value = aclPolicies.value.filter(r => r.id !== id)
  showToast('策略规则已删除')
}

// --- ACL Tests 规则验证数据 ---
const aclTests = ref<any[]>([])

const isRunningTests = ref(false)
const runAllTests = () => {
  isRunningTests.value = true
  showToast('正在执行 数据包过滤规则断言测试...')
  
  setTimeout(() => {
    // 动态执行测试，根据 aclPolicies 模拟路由过滤
    aclTests.value.forEach(test => {
       const matchedRule = aclPolicies.value.find(r => 
         r.enabled && 
         (r.src === test.src || r.src === '0.0.0.0/0') && 
         (r.dst === test.dst || r.dst === '*:*')
       )
       
       if (matchedRule) {
         test.action = matchedRule.action === 'allow' ? '放行' : '阻断'
         test.ruleMatched = `规则 #${matchedRule.priority}: ${matchedRule.name}`
       } else {
         test.action = '放行'
         test.ruleMatched = '默认放行'
       }
       test.status = '通过'
       test.latency = (Math.random() * 2 + 0.1).toFixed(1) + 'ms'
    })
    
    isRunningTests.value = false
    showToast(`全部 ACL 安全策略校验完成：${aclTests.value.length} 项测试完毕`)
  }, 750)
}

// --- TOML Editor State ---
const tomlContent = ref(`[network_identity]
network_name = "${currentNetwork.value.name}"
network_secret = "${currentNetwork.value.secretKey}"

[vpn_portal]
ipv4 = "${currentNetwork.value.ipv4Cidr}"
ipv6 = "${currentNetwork.value.ipv6Cidr}"

[feature]
enable_stun_turn = true
enable_encryption = true`)

const saveTomlConfig = () => {
  showToast('TOML 配置文件已成功应用并保存至本地')
}
</script>

<template>
  <div class="relative z-0 min-h-screen bg-[#fafafa] dark:bg-[#1f1e1e] text-gray-900 dark:text-gray-100 flex font-sans transition-colors duration-150">
    
    <!-- ==================== 移动端顶部标题栏 ==================== -->
    <header class="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-[#2f2e2e] bg-[#f9fafb] dark:bg-[#1f1e1e]">
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="打开侧边菜单"
        >
          <Menu class="w-5 h-5" />
        </button>
        <button
          type="button"
          @click="showNetworkModal = true"
          class="flex items-center gap-1.5 font-bold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>{{ currentNetwork.name }}</span>
          <ChevronsUpDown class="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
      <ThemeToggle />
    </header>

    <!-- ==================== 左侧固定导航栏 (可一键收起为纯图标模式) ==================== -->
    <aside
      :class="[
        'fixed top-0 bottom-0 left-0 border-r border-gray-200 dark:border-[#2f2e2e] bg-[#f9fafb] dark:bg-[#1f1e1e] z-50 select-none flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0',
        isSidebarCollapsed ? 'w-60 lg:w-16' : 'w-60 lg:w-60',
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      ]"
    >
      <!-- 网络为中心：可切换当前虚拟局域网的标题栏 (点击打开专属网络管理与切换面板) -->
      <div
        :class="[
          'relative h-14 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center',
          isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
        ]"
      >
        <!-- 展开状态或移动端 -->
        <template v-if="!isSidebarCollapsed">
          <button
            type="button"
            @click="showNetworkModal = true"
            class="flex items-center min-w-0 gap-2 hover:bg-gray-200/60 dark:hover:bg-gray-800 px-2 py-1.5 rounded-lg transition-colors text-left flex-1 group cursor-pointer"
            title="点击打开虚拟网络切换与管理面板"
          >
            <div class="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center shrink-0">
              <Network class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="flex flex-col min-w-0 flex-1 leading-tight">
              <span class="font-bold text-xs truncate text-gray-900 dark:text-gray-100 max-w-[125px]" :title="currentNetwork.name">{{ currentNetwork.name }}</span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                ● 运行中 · {{ currentNetwork.onlineCount }}/{{ currentNetwork.nodeCount }}
              </span>
            </div>
            <ChevronsUpDown class="w-3.5 h-3.5 text-gray-400 shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          </button>

          <div class="flex items-center gap-0.5 shrink-0 ml-1">
            <button
              type="button"
              @click="toggleSidebar"
              class="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="收起侧边栏 (仅保留图标)"
            >
              <PanelLeftClose class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="mobileMenuOpen = false"
              class="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- 折叠状态 (桌面端) -->
        <template v-else>
          <button
            type="button"
            @click="showNetworkModal = true"
            class="relative p-2 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-blue-600 dark:text-blue-400 cursor-pointer"
            :title="`当前网络: ${currentNetwork.name} (点击切换网络)`"
          >
            <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle opacity="0.25" cx="3.4" cy="3.25" r="2.7" fill="currentColor"></circle>
              <circle cx="3.4" cy="11.3" r="2.7" fill="currentColor"></circle>
              <circle opacity="0.25" cx="3.4" cy="19.5" r="2.7" fill="currentColor"></circle>
              <circle cx="11.5" cy="11.3" r="2.7" fill="currentColor"></circle>
              <circle cx="11.5" cy="19.5" r="2.7" fill="currentColor"></circle>
              <circle opacity="0.25" cx="11.5" cy="3.25" r="2.7" fill="currentColor"></circle>
              <circle opacity="0.25" cx="19.5" cy="3.25" r="2.7" fill="currentColor"></circle>
              <circle cx="19.5" cy="11.3" r="2.7" fill="currentColor"></circle>
              <circle opacity="0.25" cx="19.5" cy="19.5" r="2.7" fill="currentColor"></circle>
            </svg>
            <span class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1f1e1e]"></span>
          </button>
        </template>
      </div>

      <!-- 折叠模式下的纯图标导航菜单 (桌面端) -->
      <div v-if="isSidebarCollapsed" class="hidden lg:flex flex-1 flex-col items-center py-3 px-1 space-y-1.5 overflow-y-auto">
        <!-- 1. 网络总览 (独立一级) -->
        <button
          type="button"
          @click="activeSubNav = 'network-overview'"
          title="网络总览"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'network-overview'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Activity class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span
            v-if="activeSubNav === 'network-overview'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-blue-600 dark:bg-blue-400"
          ></span>
        </button>

        <div class="w-6 border-t border-gray-200 dark:border-[#333232] my-1"></div>

        <!-- 2. 设备节点 -->
        <button
          type="button"
          @click="activeSubNav = 'machines'"
          title="设备节点"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'machines'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Server class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'machines'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 3. 子网路由 -->
        <button
          type="button"
          @click="activeSubNav = 'subnets'"
          title="子网路由 (Proxy CIDR)"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'subnets'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <GitFork class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'subnets'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 4. STUN 穿透与中继 -->
        <button
          type="button"
          @click="activeSubNav = 'stun'"
          title="STUN 穿透与中继"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'stun'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Zap class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'stun'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <div class="w-6 border-t border-gray-200 dark:border-[#333232] my-1"></div>

        <!-- 5. 访问控制规则 -->
        <button
          type="button"
          @click="activeSubNav = 'policies'"
          title="访问控制 (ACL) 策略规则"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'policies'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Lock class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'policies'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 6. 规则测试 -->
        <button
          type="button"
          @click="activeSubNav = 'tests'"
          title="ACL 规则测试"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'tests'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <CheckCircle2 class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'tests'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 7. 配置编辑 (TOML) -->
        <button
          type="button"
          @click="activeSubNav = 'toml'"
          title="配置编辑 (TOML)"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'toml'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Sliders class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'toml'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <div class="w-6 border-t border-gray-200 dark:border-[#333232] my-1"></div>

        <!-- 8. 运行日志 -->
        <button
          type="button"
          @click="activeSubNav = 'logs'"
          title="运行日志"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'logs'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Book class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'logs'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 9. 网络设置 -->
        <button
          type="button"
          @click="activeSubNav = 'settings'"
          title="网络设置"
          :class="[
            'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95',
            activeSubNav === 'settings'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white shadow-2xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <Settings class="w-5 h-5" />
          <span
            v-if="activeSubNav === 'settings'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gray-700 dark:bg-gray-200"
          ></span>
        </button>

        <!-- 帮助文档 -->
        <div class="w-6 border-t border-gray-200 dark:border-[#333232] my-1"></div>
        <button
          type="button"
          @click="showToast('打开 官方技术文档')"
          title="使用文档"
          class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <BookOpen class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="showToast('节点连通性排查与延迟探测')"
          title="故障诊断"
          class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <CircleHelp class="w-4 h-4" />
        </button>
      </div>

      <!-- 展开模式下的导航菜单 (桌面展开态或移动端抽屉) -->
      <div v-else class="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-sm">
        <!-- 1. 网络总览 (单独作为一级菜单) -->
        <button
          type="button"
          @click="activeSubNav = 'network-overview'; mobileMenuOpen = false"
          :class="[
            'relative flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg font-medium text-sm transition-all duration-150 text-left active:scale-[0.98] cursor-pointer group',
            activeSubNav === 'network-overview'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-semibold shadow-2xs'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <span
            v-if="activeSubNav === 'network-overview'"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-blue-600 dark:bg-blue-400"
          ></span>
          <Activity
            :class="[
              'w-4 h-4 shrink-0 transition-colors',
              activeSubNav === 'network-overview' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500'
            ]"
          />
          <span class="truncate">网络总览</span>
          <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
            全览
          </span>
        </button>

        <!-- 分割间距 -->
        <div class="my-1 border-t border-gray-200/60 dark:border-[#2a2929]"></div>

        <!-- 2. 网络与节点分组 -->
        <div>
          <button
            type="button"
            @click="isNetworkOpen = !isNetworkOpen"
            class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Network class="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span>网络与节点</span>
            </div>
            <ChevronDown v-if="isNetworkOpen" class="w-3.5 h-3.5 text-gray-400" />
            <ChevronRight v-else class="w-3.5 h-3.5 text-gray-400" />
          </button>

          <!-- 网络与节点子项 (树形连线) -->
          <div v-show="isNetworkOpen" class="relative py-0.5 space-y-0.5 ml-2">
            <div class="absolute left-[15px] top-1 bottom-1 w-[1.5px] bg-gray-200 dark:bg-[#333232]"></div>

            <!-- 设备节点 -->
            <button
              type="button"
              @click="activeSubNav = 'machines'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center justify-between w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'machines'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'machines'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>设备节点</span>
              <span class="text-[11px] font-mono text-gray-400">{{ nodes.length }}</span>
            </button>

            <!-- 子网路由 -->
            <button
              type="button"
              @click="activeSubNav = 'subnets'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'subnets'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'subnets'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>子网路由 (Proxy CIDR)</span>
            </button>

            <!-- STUN 穿透与中继 -->
            <button
              type="button"
              @click="activeSubNav = 'stun'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'stun'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'stun'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>STUN 穿透与中继</span>
            </button>
          </div>
        </div>

        <!-- 3. 访问控制 (ACL) 分组 -->
        <div>
          <button
            type="button"
            @click="isAccessControlsOpen = !isAccessControlsOpen"
            class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Lock class="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span>访问控制 (ACL)</span>
            </div>
            <ChevronDown v-if="isAccessControlsOpen" class="w-3.5 h-3.5 text-gray-400" />
            <ChevronRight v-else class="w-3.5 h-3.5 text-gray-400" />
          </button>

          <!-- 访问控制子项 -->
          <div v-show="isAccessControlsOpen" class="relative py-0.5 space-y-0.5 ml-2">
            <div class="absolute left-[15px] top-1 bottom-1 w-[1.5px] bg-gray-200 dark:bg-[#333232]"></div>

            <button
              type="button"
              @click="activeSubNav = 'policies'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'policies'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'policies'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>策略规则</span>
            </button>

            <button
              type="button"
              @click="activeSubNav = 'tests'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'tests'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'tests'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>规则测试</span>
            </button>

            <button
              type="button"
              @click="activeSubNav = 'toml'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-7 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'toml'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'toml'"
                class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200 z-10"
              ></span>
              <span>配置编辑 (TOML)</span>
            </button>
          </div>
        </div>

        <!-- 4. 运行日志 -->
        <button
          type="button"
          @click="activeSubNav = 'logs'; mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal text-left transition-all duration-100 active:scale-[0.98] cursor-pointer',
            activeSubNav === 'logs'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Book class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>运行日志</span>
        </button>

        <!-- 5. 网络设置 -->
        <button
          type="button"
          @click="activeSubNav = 'settings'; mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal text-left transition-all duration-100 active:scale-[0.98] cursor-pointer',
            activeSubNav === 'settings'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Settings class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>网络设置</span>
        </button>

        
        <!-- 6. 高级节点功能 -->
        <button
          type="button"
          @click="activeSubNav = 'advanced'; mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal text-left transition-all duration-100 active:scale-[0.98] cursor-pointer',
            activeSubNav === 'advanced'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Wrench class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>高级节点功能</span>
        </button>

        
        <!-- 6. 高级节点功能 -->
        <button
          type="button"
          @click="activeSubNav = 'advanced'; mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal text-left transition-all duration-100 active:scale-[0.98] cursor-pointer',
            activeSubNav === 'advanced'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Wrench class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>高级节点功能</span>
        </button>

        <!-- 底部帮助与文档 -->
        <div class="pt-4 mt-4 border-t border-gray-200 dark:border-[#2f2e2e] space-y-0.5">
          <a
            href="javascript:void(0)"
            @click="showToast('打开 官方技术文档')"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            <BookOpen class="w-4 h-4 text-gray-400" />
            <span>使用文档</span>
          </a>
          <a
            href="javascript:void(0)"
            @click="showToast('节点连通性排查与延迟探测')"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            <CircleHelp class="w-4 h-4 text-gray-400" />
            <span>故障诊断</span>
          </a>
        </div>
      </div>

      <!-- 底部展开/收起切换与用户账号条 -->
      <div class="p-2 border-t border-gray-200 dark:border-[#2f2e2e] space-y-1">
        <!-- 切换折叠/展开按钮 (桌面端) -->
        <button
          type="button"
          @click="toggleSidebar"
          :class="[
            'hidden lg:flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer',
            isSidebarCollapsed ? 'w-10 h-10 mx-auto justify-center' : 'w-full px-2.5 py-1.5 gap-2.5 text-xs'
          ]"
          :title="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏 (仅保留图标)'"
        >
          <component :is="isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose" class="w-4 h-4 shrink-0" />
          <span v-if="!isSidebarCollapsed">收起侧边栏</span>
        </button>

        <!-- 用户身份条 -->
        <button
          type="button"
          @click="showToast('当前登录身份：网络管理员 (Administrator)')"
          :class="[
            'flex items-center hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all rounded-md cursor-pointer',
            isSidebarCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'w-full px-2 py-1.5 gap-2.5 text-left'
          ]"
          :title="`网络管理员 (admin@easytier.local)`"
        >
          <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs select-none shrink-0 bg-blue-600 dark:bg-blue-500">
            管
          </div>
          <div v-if="!isSidebarCollapsed" class="flex flex-col min-w-0 flex-1 leading-tight">
            <span class="truncate text-xs font-semibold text-gray-900 dark:text-white">网络管理员</span>
            <span class="truncate text-[11px] text-gray-500 dark:text-gray-400 font-mono">admin@easytier.local</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- 移动端遮罩层 -->
    <div
      v-if="mobileMenuOpen"
      @click="mobileMenuOpen = false"
      class="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
    ></div>

    <!-- ==================== 右侧主内容区域 (随侧边栏折叠动态拓展) ==================== -->
    <div
      :class="[
        'flex-1 min-w-0 pt-14 lg:pt-0 transition-all duration-200 ease-in-out',
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      ]"
    >
      
      <!-- -------------------- 视图 1: 网络总览 (大画幅全屏宽跨度全景) -------------------- -->
      <main v-if="activeSubNav === 'network-overview'" class="w-full pb-16 pt-5 px-4 sm:px-6 lg:px-8 space-y-5 min-w-0">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                网络总览
              </h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                主控虚拟网：{{ currentNetwork.name }}
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              查看当前虚拟局域网的全局拓扑、网段划分、接入秘钥与互联运行健康度。
            </p>
          </div>

          <div class="flex items-center gap-2.5">
            <ThemeToggle class="hidden sm:inline-flex" />

            <!-- 显示定制开关按钮与下拉菜单 -->
            <div class="relative">
              <button
                type="button"
                @click="isMetricConfigOpen = !isMetricConfigOpen"
                :class="[
                  'inline-flex items-center gap-1.5 px-3 h-9 rounded-md border text-xs font-medium transition-all shadow-2xs active:scale-[0.98] cursor-pointer',
                  isMetricConfigOpen
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'
                    : 'border-gray-300 dark:border-[#383737] bg-white dark:bg-[#282727] hover:bg-gray-50 dark:hover:bg-[#302f2f] text-gray-700 dark:text-gray-200'
                ]"
                title="自定义开启或关闭遥测指标卡片"
              >
                <SlidersHorizontal class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>显示定制</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono">
                  {{ Object.values(metricVisibility).filter(Boolean).length }}/8
                </span>
                <ChevronDown class="w-3 h-3 text-gray-400 ml-0.5" />
              </button>

              <!-- 自定义开关浮层菜单 -->
              <div
                v-if="isMetricConfigOpen"
                class="absolute right-0 top-11 w-64 bg-white dark:bg-[#252424] rounded-xl border border-gray-200 dark:border-[#383737] shadow-xl p-2.5 z-40 text-xs space-y-2 animate-in fade-in duration-100"
              >
                <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#333232]">
                  <div>
                    <span class="font-semibold text-gray-900 dark:text-white">指标卡片定制</span>
                    <p class="text-[10px] text-gray-400">勾选开启或隐藏对应监控卡片</p>
                  </div>
                  <button
                    type="button"
                    @click="showAllMetrics"
                    class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    全部开启
                  </button>
                </div>

                <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
                  <label
                    v-for="item in metricToggleList"
                    :key="item.key"
                    class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer select-none transition-colors"
                  >
                    <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <component :is="item.icon" class="w-3.5 h-3.5 text-gray-400" />
                      <span class="text-xs">{{ item.label }}</span>
                    </div>
                    <input
                      type="checkbox"
                      :checked="metricVisibility[item.key]"
                      @change="toggleMetricVisibility(item.key)"
                      class="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div class="pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px] text-gray-400">
                  <span>配置自动保存至本地</span>
                  <button
                    type="button"
                    @click="isMetricConfigOpen = false"
                    class="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    完成
                  </button>
                </div>
              </div>
            </div>

            <button
              @click="showNetworkModal = true"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-gray-300 dark:border-[#383737] bg-white dark:bg-[#282727] hover:bg-gray-50 dark:hover:bg-[#302f2f] text-gray-700 dark:text-gray-200 font-medium text-xs transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              title="打开网络详细切换与管理面板"
            >
              <Network class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>切换网络</span>
            </button>

            <button
              @click="showCreateNetworkModal = true"
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md border border-gray-300 dark:border-[#383737] bg-white dark:bg-[#282727] hover:bg-gray-50 dark:hover:bg-[#302f2f] text-gray-700 dark:text-gray-200 font-medium text-xs transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>新建网络</span>
            </button>
            <button
              @click="activeSubNav = 'machines'"
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 text-white font-medium text-xs transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <span>查看全部设备 ({{ nodes.length }})</span>
              <ArrowUpRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <!-- 当前网络核心关键参数与流量指标监控看板 (8 大子板块，4列 × 2排 宽裕布局) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- 1. 在线节点数量 -->
          <div
            v-if="metricVisibility.onlineNodes"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">在线节点数量</span>
              <div class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Server class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-gray-900 dark:text-white">{{ onlineNodesCount }}</span>
              <span class="text-xs text-gray-400 font-normal">/ {{ totalNodesCount }} 台</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>在线率 {{ onlinePercentage }}%</span>
              </span>
              <span class="text-gray-400 dark:text-gray-500 font-mono">{{ totalNodesCount - onlineNodesCount }} 离线</span>
            </div>
          </div>

          <!-- 2. 平均链路延迟 -->
          <div
            v-if="metricVisibility.avgLatency"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">平均链路延迟</span>
              <div class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Clock class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-1.5">
              <span class="text-2xl font-bold font-mono text-gray-900 dark:text-white">{{ avgLatency }}</span>
              <span class="text-xs text-gray-400 font-normal">ms</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="text-blue-600 dark:text-blue-400 font-semibold">全网直连优良</span>
              <span class="text-gray-400 dark:text-gray-500 font-mono">抖动 ±3ms</span>
            </div>
          </div>

          <!-- 3. 入网总流量 (RX) -->
          <div
            v-if="metricVisibility.rxTraffic"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">入网总流量 (RX)</span>
              <div class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-bold font-mono text-gray-900 dark:text-white">{{ currentTraffic.rxTotal }}</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">↑ {{ currentTraffic.rxSpeed }}</span>
              <span class="text-gray-400 dark:text-gray-500">今日累计接收</span>
            </div>
          </div>

          <!-- 4. 出网总流量 (TX) -->
          <div
            v-if="metricVisibility.txTraffic"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">出网总流量 (TX)</span>
              <div class="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <ArrowUpRight class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-bold font-mono text-gray-900 dark:text-white">{{ currentTraffic.txTotal }}</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="text-sky-600 dark:text-sky-400 font-mono font-semibold">↓ {{ currentTraffic.txSpeed }}</span>
              <span class="text-gray-400 dark:text-gray-500">今日累计发送</span>
            </div>
          </div>

          <!-- 5. P2P 打洞直连率 -->
          <div
            v-if="metricVisibility.p2pRate"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">P2P 直连打洞率</span>
              <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Zap class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-1.5">
              <span class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ p2pSuccessRate }}%</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ p2pNodesCount }} 节点直连</span>
              <span class="font-medium text-sky-600 dark:text-sky-400">{{ relayNodesCount }} 节点中继</span>
            </div>
          </div>

          <!-- 6. 虚拟 IPv4 广播网段 -->
          <div
            v-if="metricVisibility.ipv4Cidr"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">虚拟 IPv4 网段</span>
              <div class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Network class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-lg font-bold font-mono text-gray-900 dark:text-white truncate block">{{ currentNetwork.ipv4Cidr }}</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">DHCP 寻址正常</span>
              <span class="text-gray-400 font-mono">/24 网段</span>
            </div>
          </div>

          <!-- 7. 虚拟 IPv6 独占网段 -->
          <div
            v-if="metricVisibility.ipv6Cidr"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">虚拟 IPv6 网段</span>
              <div class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Radio class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-base font-bold font-mono text-gray-900 dark:text-white truncate block" :title="currentNetwork.ipv6Cidr">{{ currentNetwork.ipv6Cidr }}</span>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <span class="text-purple-600 dark:text-purple-400 font-semibold">原生双栈就绪</span>
              <span class="text-gray-400 font-mono">/64 路由</span>
            </div>
          </div>

          <!-- 8. 网络加入令牌 (PSK) -->
          <div
            v-if="metricVisibility.secretKey"
            class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
          >
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-medium">网络加入令牌 (PSK)</span>
              <div class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Key class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-sm font-mono text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                {{ showNetworkSecret ? currentNetwork.secretKey : '••••••••••••' }}
              </span>
              <button
                type="button"
                @click="showNetworkSecret = !showNetworkSecret"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title="显示/隐藏密钥"
              >
                <component :is="showNetworkSecret ? EyeOff : Eye" class="w-4 h-4" />
              </button>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 dark:border-[#333232] flex items-center justify-between text-[11px]">
              <button
                type="button"
                @click="copyText(currentNetwork.secretKey, '网络加入密钥')"
                class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Copy class="w-3 h-3" />
                <span>复制密钥</span>
              </button>
              <span class="text-emerald-600 dark:text-emerald-400 font-medium">端到端加密</span>
            </div>
          </div>

          <!-- 全部隐藏时的占位提示 -->
          <div
            v-if="!metricVisibility.onlineNodes && !metricVisibility.avgLatency && !metricVisibility.rxTraffic && !metricVisibility.txTraffic && !metricVisibility.p2pRate && !metricVisibility.ipv4Cidr && !metricVisibility.ipv6Cidr && !metricVisibility.secretKey"
            class="col-span-full py-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-[#252424]/50 text-gray-500 dark:text-gray-400 text-xs flex flex-col items-center justify-center gap-2.5"
          >
            <span>当前已隐藏所有监控板块</span>
            <button
              type="button"
              @click="showAllMetrics"
              class="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors cursor-pointer text-xs shadow-2xs"
            >
              一键恢复显示全部卡片
            </button>
          </div>
        </div>

        <!-- 当前网络下的网络拓扑与数字地球全景总览 -->
        <div class="space-y-3.5 pt-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                {{ currentNetwork.name }}
              </div>
              <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                节点与连接
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                查看全网直连与中继链路状态。支持网络拓扑与全球 3D 地球仪全览。
              </p>
            </div>

            <!-- 分段视图切换标签: 网络拓扑 / 3D地球仪 / 双图同屏 / 节点列表 -->
            <div class="flex items-center p-1 rounded-xl bg-gray-200/70 dark:bg-gray-800 text-xs font-medium">
              <button
                type="button"
                @click="overviewViewTab = 'topology'"
                :class="[
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-semibold',
                  overviewViewTab === 'topology'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                <GitFork class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>网络拓扑</span>
              </button>
              <button
                type="button"
                @click="overviewViewTab = 'globe'"
                :class="[
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-semibold',
                  overviewViewTab === 'globe'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                <Globe class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>3D 地球仪</span>
              </button>
              <button
                type="button"
                @click="overviewViewTab = 'split'"
                :class="[
                  'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-semibold',
                  overviewViewTab === 'split'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                <Layers class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>双图同屏</span>
              </button>
              <button
                type="button"
                @click="activeSubNav = 'machines'"
                class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <List class="w-3.5 h-3.5" />
                <span>节点列表</span>
              </button>
            </div>
          </div>

          <!-- A. 网络拓扑单图铺满 -->
          <div v-if="overviewViewTab === 'topology'" class="w-full">
            <NetworkTopology
              :nodes="nodes"
              :network-name="currentNetwork.name"
              :is-dark="isDark"
              @select-node="openDrawer"
            />
          </div>

          <!-- B. 3D 球形数字空间单图铺满 -->
          <div v-else-if="overviewViewTab === 'globe'" class="w-full">
            <GlobeMap :devices="globeDevices" :is-dark="isDark" @select-device="openDrawer" />
          </div>

          <!-- C. 双图同屏左右并排铺满 (宽屏分栏) -->
          <div v-else-if="overviewViewTab === 'split'" class="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
            <NetworkTopology
              :nodes="nodes"
              :network-name="currentNetwork.name"
              :is-dark="isDark"
              @select-node="openDrawer"
            />
            <GlobeMap :devices="globeDevices" :is-dark="isDark" @select-device="openDrawer" />
          </div>
        </div>
      </main>

      <!-- -------------------- 视图 2: 核心设备节点管理 (支持列表与 3D 球形地图双模式切换) -------------------- -->
      <main v-else-if="activeSubNav === 'machines'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                设备节点
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {{ nodes.length }} 台设备
              </span>
              <span class="text-xs text-gray-400 font-mono">所属网络: {{ currentNetwork.name }}</span>
            </div>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              管理加入当前虚拟局域网的全部设备与路由器。
              <a
                href="https://example.com"
                target="_blank"
                rel="noopener"
                class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                查看网络管理文档
                <ArrowUpRight class="w-3.5 h-3.5" />
              </a>
            </p>
          </div>

          <!-- 右侧操作栏：主题切换与添加设备按钮 -->
          <div class="flex items-center gap-2.5">
            <ThemeToggle class="hidden sm:inline-flex" />
            <button
              @click="showAddDeviceModal = true"
              type="button"
              class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <span>添加设备</span>
              <ChevronDown class="w-4 h-4 opacity-80" />
            </button>
          </div>
        </header>

        <!-- 新手引导卡片 (修复按钮文字截断问题) -->
        <section v-if="!isBannerMinimized" class="mb-8">
          <div class="rounded-lg border border-blue-200/80 dark:border-blue-900/40 relative overflow-hidden bg-blue-50/60 dark:bg-blue-950/20 shadow-2xs">
            <button
              type="button"
              @click="isBannerMinimized = true"
              class="absolute right-2 top-2 p-1.5 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 active:scale-[0.95] transition-all z-20 cursor-pointer"
              title="最小化提示横幅"
            >
              <Minus class="w-4 h-4" />
            </button>

            <div class="grid grid-cols-1 md:grid-cols-12 items-center">
              <div class="md:col-span-12 p-6 sm:p-7 flex flex-col justify-center gap-3.5">
                <h4 class="font-semibold text-lg text-gray-900 dark:text-white">
                  接入您的第一台设备
                </h4>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  三步即可将设备加入安全加密的去中心化 P2P 局域网：
                </p>

                <ol class="space-y-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-5 h-5 mt-0.5">1</span>
                    <span>在第一台设备（如家庭服务器或 NAS）上安装并启动 Mesh 核心。</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-5 h-5 mt-0.5">2</span>
                    <span>在另一台设备（如笔记本或云主机）上使用相同的网络名称加入网络。</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-5 h-5 mt-0.5">3</span>
                    <span class="font-medium text-gray-900 dark:text-white">自动完成打洞并建立点对点直连，随时随地极速访问！</span>
                  </li>
                </ol>

                <!-- 修复按钮文字截断：增加 whitespace-nowrap 与舒展的 padding -->
                <div class="pt-1">
                  <button
                    @click="showAddDeviceModal = true"
                    type="button"
                    class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                  >
                    获取快速接入命令
                  </button>
                </div>
              </div>

              </div>
          </div>
        </section>

        <!-- 工具栏：过滤药丸 + 列表/3D 球形地图双模式切换按钮 -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center p-1 rounded-md bg-gray-200/70 dark:bg-gray-800 text-xs font-medium w-fit">
              <button
                type="button"
                @click="filterTab = 'all'"
                :class="[
                  'px-3 py-1 rounded transition-all active:scale-[0.98] cursor-pointer',
                  filterTab === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                全部 ({{ nodes.length }})
              </button>
              <button
                type="button"
                @click="filterTab = 'connected'"
                :class="[
                  'px-3 py-1 rounded transition-all active:scale-[0.98] cursor-pointer',
                  filterTab === 'connected'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                在线连通 ({{ nodes.filter(n => n.status === 'online').length }})
              </button>
              <button
                type="button"
                @click="filterTab = 'exit'"
                :class="[
                  'px-3 py-1 rounded transition-all active:scale-[0.98] cursor-pointer',
                  filterTab === 'exit'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                出口网关 ({{ nodes.filter(n => n.isExitNode).length }})
              </button>
              <button
                type="button"
                @click="filterTab = 'offline'"
                :class="[
                  'px-3 py-1 rounded transition-all active:scale-[0.98] cursor-pointer',
                  filterTab === 'offline'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
              >
                离线设备 ({{ nodes.filter(n => n.status === 'offline').length }})
              </button>
            </div>

            <!-- 核心交互：列表视图 vs 拓扑视图 vs 3D 球形地图三模式切换 -->
            <div class="flex items-center p-1 rounded-md bg-gray-200/70 dark:bg-gray-800 text-xs font-medium">
              <button
                type="button"
                @click="displayMode = 'table'"
                :class="[
                  'px-2.5 py-1 rounded flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer',
                  displayMode === 'table'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
                title="列表视图"
              >
                <List class="w-3.5 h-3.5" />
                <span>表格</span>
              </button>
              <button
                type="button"
                @click="displayMode = 'topology'"
                :class="[
                  'px-2.5 py-1 rounded flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer',
                  displayMode === 'topology'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
                title="网络拓扑图视图"
              >
                <GitFork class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>拓扑</span>
              </button>
              <button
                type="button"
                @click="displayMode = 'globe'"
                :class="[
                  'px-2.5 py-1 rounded flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer',
                  displayMode === 'globe'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                ]"
                title="3D 球形地图定位视图"
              >
                <Globe class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>3D 地球</span>
              </button>
            </div>
          </div>

          <div class="relative w-full sm:w-72">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索设备名称、IP 地址或地理位置..."
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#282727] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <!-- 模式 A: 3D 球形地图实时空间展示模式 -->
        <div v-if="displayMode === 'globe'" class="mb-6 space-y-3">
          <GlobeMap :devices="globeDevices" :is-dark="isDark" @select-device="openDrawer" />
        </div>

        <!-- 模式 B: 2D 网络拓扑图模式 (参照参考图) -->
        <div v-else-if="displayMode === 'topology'" class="mb-6 space-y-3">
          <NetworkTopology
            :nodes="nodes"
            :network-name="currentNetwork.name"
            :is-dark="isDark"
            @select-node="openDrawer"
          />
        </div>

        <!-- 模式 C: Machines 设备列表表格 -->
        <div v-else class="border border-gray-200 dark:border-[#2f2e2e] rounded-lg overflow-hidden bg-white dark:bg-[#1f1e1e] shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-[#2f2e2e] bg-gray-50/70 dark:bg-[#252424] text-gray-500 dark:text-gray-400 font-medium">
                  <th class="py-2.5 px-4">设备名称 / 平台</th>
                  <th class="py-2.5 px-4">物理 IP 定位</th>
                  <th class="py-2.5 px-4">虚拟双栈地址 (IPv4 / IPv6)</th>
                  <th class="py-2.5 px-4">连接状态 / P2P 链路</th>
                  <th class="py-2.5 px-4">内网子网 / 路由宣告</th>
                  <th class="py-2.5 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-[#282727]">
                <tr
                  v-for="node in filteredNodes"
                  :key="node.id"
                  @click="openDrawer(node)"
                  class="group hover:bg-blue-50/40 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-start gap-2.5">
                      <span class="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                        <span
                          v-if="node.status === 'online'"
                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                        ></span>
                        <span
                          :class="[
                            'relative inline-flex rounded-full h-2.5 w-2.5',
                            node.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
                          ]"
                        ></span>
                      </span>

                      <div>
                        <div class="flex items-center gap-1.5">
                          <span class="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {{ node.hostname }}
                          </span>
                          <span v-if="node.isExitNode" class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            出口网关
                          </span>
                        </div>
                        <div class="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span>{{ node.os }}</span>
                          <span>·</span>
                          <span class="font-mono text-gray-400 dark:text-gray-500">{{ node.easytierVersion }}</span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span
                            v-for="tag in node.tags"
                            :key="tag"
                            class="px-1.5 py-0.2 text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono"
                          >
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- 物理定位与公网 IP -->
                  <td class="py-3 px-4 text-[11px]">
                    <div class="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                      <span>{{ node.locationName }}</span>
                    </div>
                    <div class="font-mono text-gray-400 text-[10px] mt-0.5">
                      {{ node.publicIp }}
                    </div>
                  </td>

                  <!-- 虚拟双栈 IP (IPv4 / IPv6) -->
                  <td class="py-3 px-4 font-mono text-[11px]" @click.stop>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-gray-900 dark:text-gray-200 font-medium">{{ node.ipv4 }}</span>
                        <button
                          type="button"
                          @click="copyText(node.ipv4, 'IPv4')"
                          class="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700 active:scale-[0.95] transition-all cursor-pointer"
                          title="复制 IPv4 地址"
                        >
                          <component :is="copiedKey === node.ipv4 ? Check : Copy" class="w-3 h-3 text-emerald-500" v-if="copiedKey === node.ipv4" />
                          <Copy class="w-3 h-3" v-else />
                        </button>
                      </div>

                      <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <span class="truncate max-w-[140px]">{{ node.ipv6 }}</span>
                        <button
                          type="button"
                          @click="copyText(node.ipv6, 'IPv6')"
                          class="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700 active:scale-[0.95] transition-all cursor-pointer"
                          title="复制 IPv6 地址"
                        >
                          <component :is="copiedKey === node.ipv6 ? Check : Copy" class="w-3 h-3 text-emerald-500" v-if="copiedKey === node.ipv6" />
                          <Copy class="w-3 h-3" v-else />
                        </button>
                      </div>
                    </div>
                  </td>

                  <!-- 连接状态与链路 -->
                  <td class="py-3 px-4">
                    <div>
                      <span :class="['font-medium', node.status === 'online' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400']">
                        {{ node.lastSeen }}
                      </span>
                      <div v-if="node.status === 'online'" class="flex items-center gap-1.5 text-[11px] mt-0.5">
                        <span
                          :class="[
                            'px-1.5 py-0.2 rounded font-semibold',
                            isP2PConnection(node)
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          ]"
                        >
                          {{ node.connection }}
                        </span>
                        <span class="text-gray-500 dark:text-gray-400 font-mono">{{ node.latencyMs }}ms</span>
                      </div>
                    </div>
                  </td>

                  <!-- 内网子网路由 -->
                  <td class="py-3 px-4">
                    <div v-if="node.subnets.length > 0" class="space-y-1">
                      <div v-for="sub in node.subnets" :key="sub" class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {{ sub }}
                        </span>
                        <span v-if="node.isSubnetApproved" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">已放行</span>
                      </div>
                    </div>
                    <span v-else class="text-gray-400 dark:text-gray-600 text-[11px]">无子网广播</span>
                  </td>

                  <!-- 操作列 -->
                  <td class="py-3 px-3 text-right" @click.stop>
                    <button
                      type="button"
                      @click="openDrawer(node)"
                      class="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all cursor-pointer"
                      title="打开节点配置抽屉"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-4 py-2.5 border-t border-gray-100 dark:border-[#2f2e2e] bg-gray-50/50 dark:bg-[#252424] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>当前显示 {{ filteredNodes.length }} 台设备（共 {{ nodes.length }} 台）</span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Mesh 拓扑网络全连通 · 0 丢包
            </span>
          </div>
        </div>

      </main>


      <!-- -------------------- 视图 X: 访问控制策略 (ACL) 面板 -------------------- -->
      <main v-else-if="activeSubNav === 'policies'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                访问控制 (ACL) 策略
              </h1>
            </div>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              配置细粒度的 P2P 网络访问控制规则。支持按 Tag、IP、子网 CIDR 进行流量放行或阻断。
            </p>
          </div>
          <button
            @click="editingPolicy = { id: '', name: '', src: '', dst: '', action: 'allow', priority: 100, enabled: true }; showPolicyModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95 whitespace-nowrap"
          >
            <Plus class="w-4 h-4" />
            新建策略规则
          </button>
        </header>

        <!-- 冲突检测警告面板 -->
        <div v-if="aclConflicts.length > 0" class="p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-xl">
          <div class="flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h3 class="text-sm font-bold text-orange-800 dark:text-orange-300">检测到策略规则冲突 ({{ aclConflicts.length }} 项)</h3>
              <ul class="mt-2 space-y-1">
                <li v-for="(conflict, idx) in aclConflicts" :key="idx" class="text-xs text-orange-700 dark:text-orange-400 list-disc ml-4">
                  {{ conflict.reason }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 规则列表 -->
        <div class="bg-white dark:bg-[#252424] rounded-xl border border-gray-200 dark:border-[#333232] shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50/50 dark:bg-[#1f1e1e] border-b border-gray-200 dark:border-[#333232]">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">优先级</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">规则名称</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">匹配源 (Source)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">目标 (Destination)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">动作 (Action)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">状态</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-[#333232]">
                <tr v-for="policy in aclPolicies" :key="policy.id" class="hover:bg-gray-50/50 dark:hover:bg-[#2a2929] transition-colors">
                  <td class="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">{{ policy.priority }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{{ policy.name }}</td>
                  <td class="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 rounded">{{ policy.src }}</td>
                  <td class="px-4 py-3 text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10 rounded">{{ policy.dst }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span :class="['px-2 py-1 rounded text-xs font-medium', policy.action === 'allow' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400']">
                      {{ policy.action === 'allow' ? '放行 (Allow)' : '阻断 (Deny)' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button @click="policy.enabled = !policy.enabled" :class="['relative inline-flex h-5 w-9 items-center rounded-full transition-colors', policy.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600']">
                      <span :class="['inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', policy.enabled ? 'translate-x-4' : 'translate-x-1']"></span>
                    </button>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button @click="editingPolicy = {...policy}; showPolicyModal = true" class="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2">
                      <Sliders class="w-4 h-4" />
                    </button>
                    <button @click="deletePolicy(policy.id)" class="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <X class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr v-if="aclPolicies.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    暂无访问控制策略，网络默认为全互通状态
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>


      <!-- -------------------- 视图 3: ACL 规则测试面板 -------------------- -->
      <main v-else-if="activeSubNav === 'tests'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                ACL 规则测试
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                4 项通过 · 0 项失败
              </span>
            </div>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              编写测试断言，验证数据包过滤规则与安全标签是否符合预期。
            </p>
          </div>

          <div class="flex items-center gap-2.5">
            <ThemeToggle class="hidden sm:inline-flex" />
            <button
              @click="runAllTests"
              type="button"
              :disabled="isRunningTests"
              class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-gray-300 dark:border-[#383737] bg-white dark:bg-[#282727] hover:bg-gray-50 dark:hover:bg-[#302f2f] text-gray-700 dark:text-gray-200 font-medium text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRunningTests }" />
              <span>运行全部测试</span>
            </button>
            <button
              @click="showAddTestModal = true"
              type="button"
              class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 text-white font-medium text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <Plus class="w-4 h-4" />
              <span>添加测试</span>
            </button>
          </div>
        </header>

        <!-- ACL Tests 测试用例列表表格 -->
        <div class="mt-6 border border-gray-200 dark:border-[#2f2e2e] rounded-lg overflow-hidden bg-white dark:bg-[#1f1e1e] shadow-2xs">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-[#2f2e2e] bg-gray-50/70 dark:bg-[#252424] text-gray-500 dark:text-gray-400 font-medium">
                <th class="py-2.5 px-4">测试断言描述</th>
                <th class="py-2.5 px-4">源端 (Src)</th>
                <th class="py-2.5 px-4">目标端 (Dst)</th>
                <th class="py-2.5 px-4">预期动作</th>
                <th class="py-2.5 px-4">测试结果</th>
                <th class="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-[#282727]">
              <tr
                v-for="test in aclTests"
                :key="test.id"
                class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                  <div>{{ test.name }}</div>
                  <div class="text-[11px] text-gray-400 font-mono mt-0.5">{{ test.ruleMatched }}</div>
                </td>
                <td class="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">
                  <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">{{ test.src }}</span>
                </td>
                <td class="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">
                  <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">{{ test.dst }}</span>
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider',
                      test.action === '放行'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    ]"
                  >
                    {{ test.action }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 class="w-4 h-4" />
                    <span>通过 ({{ test.latency }})</span>
                  </div>
                </td>
                <td class="py-3 px-3 text-right">
                  <button
                    type="button"
                    @click="showToast(`测试用例 ${test.id} 单独执行验证通过`)"
                    class="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all cursor-pointer"
                    title="单独运行此测试"
                  >
                    <Play class="w-3.5 h-3.5 text-blue-600" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <!-- -------------------- 视图 4: 子网路由视图 -------------------- -->
      <main v-else-if="activeSubNav === 'subnets'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6">
        <header class="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">子网路由代理 (Proxy CIDR)</h1>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">将物理局域网网段宣告给虚拟网中的其他节点跨网互联。</p>
          </div>
          <button @click="showAddSubnetModal = true" type="button" class="px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-2xs cursor-pointer active:scale-95 transition-all">
            添加子网路由
          </button>
        </header>

        <div class="border border-gray-200 dark:border-[#2f2e2e] rounded-lg overflow-hidden bg-white dark:bg-[#1f1e1e]">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50/70 dark:bg-[#252424] text-gray-500 border-b border-gray-200 dark:border-[#2f2e2e]">
              <tr>
                <th class="py-2.5 px-4">物理内网网段 (CIDR)</th>
                <th class="py-2.5 px-4">宣告网关节点</th>
                <th class="py-2.5 px-4">路由状态</th>
                <th class="py-2.5 px-4">优先级 / 跃点</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-[#282727]">
              <tr v-for="route in subnetRoutes" :key="route.id" class="hover:bg-gray-50/50 dark:hover:bg-[#2a2929] transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{{ route.cidr }}</td>
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">{{ route.gatewayName }} ({{ route.gatewayIp }})</td>
                <td class="py-3 px-4 font-semibold" :class="route.status.includes('Approved') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  ● {{ route.status }}
                </td>
                <td class="py-3 px-4 font-mono text-gray-500 dark:text-gray-400">Metric: {{ route.metric }}</td>
              </tr>
              <tr v-if="subnetRoutes.length === 0">
                <td colspan="4" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无子网路由广播，请点击右上角添加。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <!-- -------------------- 视图 5: STUN 与公共中继节点 -------------------- -->
      <main v-else-if="activeSubNav === 'stun'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6">
        <header class="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">STUN 穿透与中继节点</h1>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">管理用于 NAT 探测穿透的公共与私有 STUN 服务器及中继节点集群。</p>
          </div>
          <div class="flex items-center gap-3">
            <button @click="refreshStun" :disabled="isRefreshingStun" type="button" class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50">
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshingStun }" />
              重新探测 STUN 延迟
            </button>
            <button @click="showAddStunModal = true" type="button" class="px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-2xs cursor-pointer active:scale-95 transition-all">
              添加 STUN
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="stun in stunServers" :key="stun.id" class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ stun.name }}</span>
              <span class="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{{ stun.type }}</span>
            </div>
            <div class="font-mono text-sm font-bold text-gray-900 dark:text-white pt-1">{{ stun.host }}</div>
            <span class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              正常握手 · {{ stun.latency }}ms 延迟
            </span>
          </div>
          <div v-if="stunServers.length === 0" class="col-span-1 md:col-span-3 text-center py-10 text-gray-500 dark:text-gray-400 text-sm">暂无 STUN 服务器，请点击右上角添加。</div>
        </div>
      </main>

      <!-- -------------------- 视图 6: TOML 配置编辑视图 -------------------- -->
      <main v-else-if="activeSubNav === 'toml'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-4">
        <header class="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">配置编辑 (TOML)</h1>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">基于当前网络与节点参数自动生成的官方 core TOML 配置文件。</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="saveTomlConfig"
              type="button"
              class="px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Check class="w-3.5 h-3.5" />
              <span>保存配置</span>
            </button>
            <button
              @click="copyText(tomlContent, 'TOML 配置')"
              type="button"
              class="px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Copy class="w-3.5 h-3.5" />
              <span>复制完整 TOML</span>
            </button>
          </div>
        </header>

        <textarea
          v-model="tomlContent"
          rows="18"
          class="w-full p-5 rounded-xl bg-gray-900 text-gray-200 font-mono text-sm leading-relaxed border border-gray-800 shadow-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
          spellcheck="false"
        ></textarea>
      </main>

      <!-- -------------------- 视图 7: 运行日志 -------------------- -->
      <main v-else-if="activeSubNav === 'logs'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-4">
        <header class="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">运行日志</h1>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">实时捕捉底层节点的 P2P 穿透、心跳与加密握手事件。</p>
          </div>
          <button @click="clearLogs" type="button" class="px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs transition-colors cursor-pointer">
            清空视图
          </button>
        </header>

        <div class="p-4 rounded-xl bg-gray-900 text-gray-300 font-mono text-xs space-y-2 border border-gray-800 h-96 overflow-y-auto">
          <div v-for="log in logsList" :key="log.id" :class="{
            'text-emerald-400': log.level === 'info',
            'text-blue-400': log.level === 'stun',
            'text-gray-400': log.level === 'peer' || log.level === 'route',
            'text-amber-400': log.level === 'error'
          }">
            {{ log.text }}
          </div>
          <div v-if="logsList.length === 0" class="text-gray-600 text-center py-10">暂无日志数据</div>
        </div>
      </main>

      <!-- -------------------- 视图 8: 网络设置 -------------------- -->
      <main v-else-if="activeSubNav === 'settings'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6">
        <header class="pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">网络全局设置</h1>
          <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">修改虚拟局域网的名称、网段分配范围与入网认证秘钥。</p>
        </header>

        <div class="p-5 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] max-w-2xl space-y-4 text-xs">
          <div>
            <label class="block text-gray-500 mb-1 font-medium">网络名称 (Network Name)</label>
            <input v-model="currentNetwork.name" type="text" class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold" />
          </div>
          <div>
            <label class="block text-gray-500 mb-1 font-medium">IPv4 虚拟网段 (CIDR)</label>
            <input v-model="currentNetwork.ipv4Cidr" type="text" class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono" />
          </div>
          <div>
            <label class="block text-gray-500 mb-1 font-medium">IPv6 虚拟网段 (CIDR)</label>
            <input v-model="currentNetwork.ipv6Cidr" type="text" class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono" />
          </div>
          <div>
            <label class="block text-gray-500 mb-1 font-medium">入网安全密码 / 密钥 (PSK)</label>
            <input v-model="currentNetwork.secretKey" type="text" class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono" />
          </div>
          <div class="pt-2">
            <button @click="saveSettings" type="button" class="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold">
              保存设置
            </button>
          </div>
        </div>
      </main>

    </div>

    <!-- ==================== 右侧机器详情抽屉 ==================== -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity"
      @click="drawerOpen = false"
    >
      <div
        class="w-full max-w-xl bg-white dark:bg-[#1f1e1e] h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-[#2f2e2e] transition-transform duration-200"
        @click.stop
      >
        <div class="p-4 sm:p-5 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between bg-gray-50/70 dark:bg-[#252424]">
          <div class="flex items-center gap-3">
            <span :class="['w-3.5 h-3.5 rounded-full ring-4 shrink-0', activeNode?.status === 'online' ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-gray-400 ring-gray-400/20']"></span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-base text-gray-900 dark:text-white leading-none">
                  {{ activeNode?.hostname }}
                </h3>
                <span :class="['px-2 py-0.5 rounded text-[10px] font-semibold', activeNode?.status === 'online' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500']">
                  {{ activeNode?.status === 'online' ? '在线' : '离线' }}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
                  {{ activeNode?.osType }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {{ activeNode?.locationName }} · {{ activeNode?.domain }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="drawerOpen = false"
            class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex items-center px-4 border-b border-gray-200 dark:border-[#2f2e2e] gap-4 text-xs font-medium">
          <button
            type="button"
            @click="drawerTab = 'details'"
            :class="[
              'py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer',
              drawerTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <Server class="w-3.5 h-3.5" />
            <span>节点详情</span>
          </button>
          <button
            type="button"
            @click="drawerTab = 'routing'"
            :class="[
              'py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer',
              drawerTab === 'routing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <GitFork class="w-3.5 h-3.5" />
            <span>子网与出口路由</span>
          </button>
          <button
            type="button"
            @click="drawerTab = 'peers'"
            :class="[
              'py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer',
              drawerTab === 'peers'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <Zap class="w-3.5 h-3.5" />
            <span>P2P 对端链路 ({{ activeNode?.peersList?.length || 0 }})</span>
          </button>
          <button
            type="button"
            @click="drawerTab = 'toml'"
            :class="[
              'py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer',
              drawerTab === 'toml'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            <FolderGit2 class="w-3.5 h-3.5" />
            <span>TOML 配置文件</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          <!-- 节点详情 Tab -->
          <div v-if="drawerTab === 'details'" class="space-y-4">
            <div class="space-y-3">
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium">设备主机名 (Hostname)</label>
                <input
                  v-model="activeNode.hostname"
                  type="text"
                  class="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#282727] text-gray-900 dark:text-white font-medium"
                />
              </div>

              <!-- 物理定位与公网 IP 详情 -->
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-[#282727] border border-gray-200 dark:border-[#383737] space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">公网 IP 地理定位</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200">{{ activeNode?.locationName }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">公网 IP 地址</span>
                  <div class="flex items-center gap-1.5 font-mono">
                    <span>{{ activeNode?.publicIp }}</span>
                    <button type="button" @click="copyText(activeNode.publicIp, '公网 IP')" class="text-blue-600 dark:text-blue-400 hover:underline">复制</button>
                  </div>
                </div>
              </div>

              <!-- 双栈 IP 地址卡 -->
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-[#282727] border border-gray-200 dark:border-[#383737] space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">虚拟 IPv4 地址</span>
                  <div class="flex items-center gap-1.5 font-mono font-medium">
                    <span>{{ activeNode?.ipv4 }}</span>
                    <button type="button" @click="copyText(activeNode.ipv4, 'IPv4')" class="text-blue-600 dark:text-blue-400 hover:underline">复制</button>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">虚拟 IPv6 地址</span>
                  <div class="flex items-center gap-1.5 font-mono font-medium">
                    <span>{{ activeNode?.ipv6 }}</span>
                    <button type="button" @click="copyText(activeNode.ipv6, 'IPv6')" class="text-blue-600 dark:text-blue-400 hover:underline">复制</button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-2.5 rounded border border-gray-200 dark:border-gray-800">
                  <span class="text-gray-500 block mb-0.5">操作系统平台</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ activeNode?.os }}</span>
                </div>
                <div class="p-2.5 rounded border border-gray-200 dark:border-gray-800">
                  <span class="text-gray-500 block mb-0.5">内核版本</span>
                  <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ activeNode?.easytierVersion }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 子网与出口路由 Tab -->
          <div v-else-if="drawerTab === 'routing'" class="space-y-4">
            <div class="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">设为全局出口网关 (Exit Node)</h4>
                  <p class="text-gray-500 dark:text-gray-400 text-[11px]">允许网络中其他设备通过本节点转发全部互联网外网流量。</p>
                </div>
                <input
                  type="checkbox"
                  v-model="activeNode.isExitNode"
                  class="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div class="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-white">子网路由代理 (Proxy CIDR)</h4>
                <p class="text-gray-500 dark:text-gray-400 text-[11px]">将本机所在的物理局域网网段广播给虚拟网内的其他对端节点。</p>
              </div>

              <div v-if="activeNode?.subnets && activeNode.subnets.length > 0" class="space-y-2">
                <div
                  v-for="sub in (activeNode?.subnets || [])"
                  :key="sub"
                  class="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800"
                >
                  <span class="font-mono font-medium">{{ sub }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-emerald-600 font-medium">已放行</span>
                    <input type="checkbox" v-model="activeNode.isSubnetApproved" class="w-3.5 h-3.5 text-blue-600 cursor-pointer" />
                  </div>
                </div>
              </div>
              <div v-else class="text-gray-400 italic">
                该节点尚未广播任何物理局域网子网。
              </div>
            </div>
          </div>

          <!-- P2P 对端链路 Tab -->
          <div v-else-if="drawerTab === 'peers'" class="space-y-3">
            <p class="text-gray-500 text-[11px]">通过 STUN UDP/TCP 打洞建立的真实点对点直连链路：</p>
            <div
              v-for="p in (activeNode?.peersList || [])"
              :key="p.name"
              class="p-3 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5"
            >
              <div class="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                <span>{{ p.name }} ({{ p.ip }})</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{{ p.latency }}</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-gray-500">
                <span>穿透模式: {{ p.mode }}</span>
                <span>上行: {{ p.tx }} / 下行: {{ p.rx }}</span>
              </div>
            </div>
          </div>

          <!-- TOML 配置文件 Tab -->
          <div v-else-if="drawerTab === 'toml'" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-500 font-medium">根据当前参数动态生成的 mesh.toml</span>
              <button
                type="button"
                @click="copyText(`[network_identity]\nnetwork_name = '${currentNetwork.name}'\nnetwork_secret = '${currentNetwork.secretKey}'\n\n[host]\nhostname = '${activeNode.hostname}'`, 'TOML 配置文件')"
                class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-[0.95] transition-all cursor-pointer"
              >
                <Copy class="w-3 h-3" />
                复制配置
              </button>
            </div>
            <pre class="p-3.5 rounded-lg bg-gray-900 text-gray-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-gray-800">
# 节点自动生成配置文件
[network_identity]
network_name = "{{ currentNetwork.name }}"
network_secret = "{{ currentNetwork.secretKey }}"

[host]
hostname = "{{ activeNode.hostname }}"

[vpn_portal]
ipv4 = "{{ activeNode.ipv4 }}/24"
ipv6 = "{{ activeNode.ipv6 }}/64"
exit_node = {{ activeNode.isExitNode }}

[proxy_network]
proxy_cidrs = [{{ (activeNode?.subnets || []).map((s: string) => `"${s}"`).join(', ') }}]
</pre>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="drawerOpen = false"
            class="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium active:scale-[0.98] transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            @click="saveDrawerChanges"
            class="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            保存变更
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 添加设备模态框 ==================== -->
    <div
      v-if="showAddDeviceModal"
      class="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      @click="showAddDeviceModal = false"
    >
      <div
        class="w-full max-w-xl bg-white dark:bg-[#1f1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2f2e2e] overflow-hidden"
        @click.stop
      >
        <div class="p-5 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Plus class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-base text-gray-900 dark:text-white">添加新设备到当前网络</h3>
              <p class="text-xs text-gray-500">网络名称: {{ currentNetwork.name }} · 零配置单命令行快速入网</p>
            </div>
          </div>
          <button type="button" @click="showAddDeviceModal = false" class="text-gray-400 hover:text-gray-600 active:scale-[0.95] transition-all cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-4 text-xs">
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="os in ['linux', 'macos', 'windows', 'docker']"
              :key="os"
              type="button"
              @click="selectedOs = os as any"
              :class="[
                'py-2 px-3 rounded-md font-medium text-center border uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer',
                selectedOs === os
                  ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              ]"
            >
              {{ os }}
            </button>
          </div>

          <div class="p-3.5 rounded-lg bg-gray-900 text-gray-100 font-mono space-y-2 border border-gray-800">
            <div class="flex items-center justify-between text-[11px] text-gray-400">
              <span>一键启动加入指令 (Shell)</span>
              <button
                type="button"
                @click="copyText(`curl -fsSL https://example.com/install.sh | bash && mesh-core --ipv4 10.144.144.${nodes.length + 20} --network-name ${currentNetwork.name} --network-secret ${currentNetwork.secretKey} --peers ${currentNetwork.rpcPortal}`, '启动命令')"
                class="text-blue-400 hover:underline flex items-center gap-1 active:scale-[0.95] transition-all cursor-pointer"
              >
                <Copy class="w-3 h-3" />
                复制
              </button>
            </div>
            <div class="text-[11px] leading-relaxed break-all select-all text-emerald-400">
              curl -fsSL https://example.com/install.sh | bash && mesh-core --ipv4 10.144.144.{{ nodes.length + 20 }} --network-name {{ currentNetwork.name }} --network-secret {{ currentNetwork.secretKey }} --peers {{ currentNetwork.rpcPortal }}
            </div>
          </div>

          <p class="text-gray-500 leading-relaxed text-[11px]">
            启动后，核心将自动进行 STUN UDP 探测并建立点对点加密隧道，无需中心服务器转发数据。
          </p>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-end">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="showAddDeviceModal = false"
              class="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium active:scale-[0.98] transition-all cursor-pointer"
            >
              完成并关闭
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 专属网络切换与拓扑管理弹出面板 (Network Switcher & Detail Modal) ==================== -->
    <div
      v-if="showNetworkModal"
      class="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      @click="showNetworkModal = false"
    >
      <div
        class="w-full max-w-3xl bg-white dark:bg-[#1f1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2f2e2e] overflow-hidden flex flex-col max-h-[90vh]"
        @click.stop
      >
        <!-- 头部 -->
        <div class="p-5 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between bg-gray-50/70 dark:bg-[#252424]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Network class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-base sm:text-lg text-gray-900 dark:text-white">虚拟局域网管理与快速切换</h3>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                  {{ managedNetworks.length }} 个网络
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                当前运行主控：<span class="font-bold text-gray-800 dark:text-gray-200">{{ currentNetwork.name }}</span> ({{ currentNetwork.ipv4Cidr }}) · 支持查看底层 CIDR、中继与密钥
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="showNetworkModal = false"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 网络卡片列表 -->
        <div class="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          <div
            v-for="net in managedNetworks"
            :key="net.id"
            :class="[
              'rounded-xl border p-4 transition-all relative',
              currentNetworkId === net.id
                ? 'border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-500/30'
                : 'border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] hover:border-gray-300 dark:hover:border-gray-700'
            ]"
          >
            <!-- 卡片头部: 状态, 名称, 切换按钮 -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-[#333232]">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0"></span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-gray-900 dark:text-white">{{ net.name }}</span>
                    <span
                      v-if="currentNetworkId === net.id"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white"
                    >
                      当前生效
                    </span>
                    <span v-else class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      待机中
                    </span>
                  </div>
                  <span class="text-[11px] text-gray-400 mt-0.5 block font-mono">创建日期: {{ net.createdDate }} · 状态: 正常运行</span>
                </div>
              </div>

              <!-- 切换或当前状态按钮 -->
              <div class="flex items-center gap-2">
                <button
                  v-if="currentNetworkId !== net.id"
                  type="button"
                  @click="currentNetworkId = net.id; showNetworkModal = false; showToast(`已成功切换至主控网络: ${net.name}`)"
                  class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw class="w-3.5 h-3.5" />
                  <span>切换为此网络</span>
                </button>
                <div v-else class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs px-2 py-1">
                  <CheckCircle2 class="w-4 h-4" />
                  <span>当前主控中</span>
                </div>
                
                <button
                  v-if="managedNetworks.length > 1"
                  type="button"
                  @click.stop="deleteNetwork(net.id, net.name)"
                  class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all cursor-pointer"
                  title="删除网络"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 网络详细拓扑与技术参数 4 列网格 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
              <!-- 1. IPv4 CIDR -->
              <div class="p-2.5 rounded-lg bg-gray-50/80 dark:bg-[#1f1e1e] border border-gray-100 dark:border-[#333232]">
                <div class="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                  <span>虚拟 IPv4 网段</span>
                  <Network class="w-3 h-3 text-indigo-500" />
                </div>
                <div class="font-mono font-bold text-gray-900 dark:text-white truncate" :title="net.ipv4Cidr">
                  {{ net.ipv4Cidr }}
                </div>
                <div class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">DHCP 动态分配</div>
              </div>

              <!-- 2. IPv6 CIDR -->
              <div class="p-2.5 rounded-lg bg-gray-50/80 dark:bg-[#1f1e1e] border border-gray-100 dark:border-[#333232]">
                <div class="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                  <span>虚拟 IPv6 网段</span>
                  <Radio class="w-3 h-3 text-purple-500" />
                </div>
                <div class="font-mono font-bold text-gray-900 dark:text-white truncate" :title="net.ipv6Cidr">
                  {{ net.ipv6Cidr }}
                </div>
                <div class="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-medium">/64 双栈通信</div>
              </div>

              <!-- 3. 在线节点状态 -->
              <div class="p-2.5 rounded-lg bg-gray-50/80 dark:bg-[#1f1e1e] border border-gray-100 dark:border-[#333232]">
                <div class="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                  <span>在线设备比例</span>
                  <Server class="w-3 h-3 text-emerald-500" />
                </div>
                <div class="font-mono font-bold text-gray-900 dark:text-white">
                  {{ net.onlineCount }} <span class="text-xs font-normal text-gray-400">/ {{ net.nodeCount }} 台</span>
                </div>
                <div class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>就绪率 {{ Math.round((net.onlineCount / net.nodeCount) * 100) }}%</span>
                </div>
              </div>

              <!-- 4. RPC 发现门户 -->
              <div class="p-2.5 rounded-lg bg-gray-50/80 dark:bg-[#1f1e1e] border border-gray-100 dark:border-[#333232]">
                <div class="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                  <span>RPC 发现门户</span>
                  <Activity class="w-3 h-3 text-blue-500" />
                </div>
                <div class="font-mono text-xs font-medium text-gray-900 dark:text-white truncate" :title="net.rpcPortal">
                  {{ net.rpcPortal }}
                </div>
                <div class="mt-1">
                  <button
                    type="button"
                    @click="copyText(net.rpcPortal, 'RPC 门户')"
                    class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy class="w-2.5 h-2.5" />
                    <span>复制门户地址</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 底层通信密钥与中继集群条目 -->
            <div class="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#333232] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <!-- 通信 PSK 密钥 -->
              <div class="flex items-center gap-2">
                <span class="text-gray-400 shrink-0">入网凭证 (PSK):</span>
                <span class="font-mono font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {{ showNetworkSecret ? net.secretKey : '••••••••••••' }}
                </span>
                <button
                  type="button"
                  @click="copyText(net.secretKey, '网络 PSK 密钥')"
                  class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Copy class="w-3 h-3" />
                  <span>复制</span>
                </button>
              </div>

              <!-- 中继服务器 Hubs -->
              <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span class="shrink-0">中继节点:</span>
                <span v-if="net.relayHubs.length > 0" class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {{ net.relayHubs.join(', ') }}
                </span>
                <span v-else class="text-[10px] text-gray-400 italic">官方全球中继集群</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 弹窗底部操作条 -->
        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-between">
          <button
            type="button"
            @click="showCreateNetworkModal = true; showNetworkModal = false"
            class="px-3.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer text-xs"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>新建或加入其他虚拟局域网</span>
          </button>

          <button
            type="button"
            @click="showNetworkModal = false"
            class="px-4 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium transition-colors cursor-pointer text-xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 新建网络模态框 (按网络为中心管理) ==================== -->
    <div
      v-if="showCreateNetworkModal"
      class="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      @click="showCreateNetworkModal = false"
    >
      <div
        class="w-full max-w-md bg-white dark:bg-[#1f1e1e] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2f2e2e] overflow-hidden"
        @click.stop
      >
        <div class="p-5 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Network class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-base text-gray-900 dark:text-white">创建新的虚拟局域网</h3>
              <p class="text-xs text-gray-500">独立子网隔离与入网凭证体系</p>
            </div>
          </div>
          <button type="button" @click="showCreateNetworkModal = false" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-3.5 text-xs">
          <div>
            <label class="block text-gray-600 dark:text-gray-400 mb-1 font-medium">网络名称 (Network Name)</label>
            <input
              v-model="newNetworkForm.name"
              type="text"
              placeholder="例如: office-prod-mesh"
              class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold"
            />
          </div>
          <div>
            <label class="block text-gray-600 dark:text-gray-400 mb-1 font-medium">IPv4 虚拟网段 (CIDR)</label>
            <input
              v-model="newNetworkForm.ipv4Cidr"
              type="text"
              class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
            />
          </div>
          <div>
            <label class="block text-gray-600 dark:text-gray-400 mb-1 font-medium">IPv6 虚拟网段 (CIDR)</label>
            <input
              v-model="newNetworkForm.ipv6Cidr"
              type="text"
              class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
            />
          </div>
          <div>
            <label class="block text-gray-600 dark:text-gray-400 mb-1 font-medium">网络密码 / 认证密钥 (留空自动生成)</label>
            <input
              v-model="newNetworkForm.secretKey"
              type="password"
              placeholder="自定义通信加密秘钥"
              class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
            />
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-end gap-2">
          <button
            type="button"
            @click="showCreateNetworkModal = false"
            class="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            取消
          </button>
          <button
            type="button"
            @click="createNewNetwork"
            class="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
          >
            立即创建网络
          </button>
        </div>
      </div>
    </div>

    <!-- 全局 Toast 提示 -->
    <div id="toast-root" class="relative z-50">
      <div v-if="toastMessage" class="fixed bottom-6 right-6 z-[99]">
        <div class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2.5 border border-gray-700 dark:border-gray-200 transition-all">
          <Check class="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{{ toastMessage }}</span>
        </div>
      </div>
    </div>


    <!-- ==================== 策略编辑模态框 (Visual Policy Editor) ==================== -->
    <div
      v-if="showPolicyModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div class="bg-white dark:bg-[#1a1919] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333232] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333232]">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ editingPolicy?.id ? '编辑策略规则' : '新建策略规则' }}
          </h3>
          <button @click="showPolicyModal = false" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2929] transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">规则名称</label>
            <input
              v-if="editingPolicy"
              v-model="editingPolicy.name"
              type="text"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              placeholder="例如: default-deny-prod"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">优先级 (越小越高)</label>
              <input
                v-if="editingPolicy"
                v-model.number="editingPolicy.priority"
                type="number"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">动作 (Action)</label>
              <select
                v-if="editingPolicy"
                v-model="editingPolicy.action"
                class="w-full px-3 py-2 bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="allow">放行 (Allow)</option>
                <option value="deny">阻断 (Deny)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">匹配源 (Source)</label>
            <input
              v-if="editingPolicy"
              v-model="editingPolicy.src"
              type="text"
              class="w-full px-3 py-2 font-mono bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 focus:ring-2 focus:ring-blue-500/50 outline-none"
              placeholder="Tag / IP / CIDR (例如: tag:开发人员 或 10.144.144.0/24)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标 (Destination)</label>
            <input
              v-if="editingPolicy"
              v-model="editingPolicy.dst"
              type="text"
              class="w-full px-3 py-2 font-mono bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              placeholder="Tag / IP / CIDR:Port (例如: tag:数据库:5432)"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#333232] bg-gray-50 dark:bg-[#1f1e1e] flex justify-end gap-3">
          <button @click="showPolicyModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2929] rounded-lg transition-colors">
            取消
          </button>
          <button @click="savePolicy" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:scale-95">
            保存规则
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 添加子网路由模态框 ==================== -->
    <div
      v-if="showAddSubnetModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div class="bg-white dark:bg-[#1a1919] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333232] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333232]">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">添加子网路由 (Proxy CIDR)</h3>
          <button @click="showAddSubnetModal = false" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2929] transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">子网 CIDR</label>
            <input
              v-model="newSubnetForm.cidr"
              type="text"
              class="w-full px-3 py-2 font-mono bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              placeholder="例如: 192.168.1.0/24"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">宣告网关节点</label>
            <select
              v-model="newSubnetForm.nodeId"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
            >
              <option value="" disabled>请选择一个在线节点...</option>
              <option v-for="n in nodes" :key="n.id" :value="n.id">
                {{ n.hostname }} ({{ n.ipv4 || n.publicIp }})
              </option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#333232] bg-gray-50 dark:bg-[#1f1e1e] flex justify-end gap-3">
          <button @click="showAddSubnetModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2929] rounded-lg transition-colors cursor-pointer">
            取消
          </button>
          <button @click="addSubnetRoute" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:scale-95 cursor-pointer">
            确认添加
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 添加测试用例模态框 ==================== -->
    <div
      v-if="showAddTestModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div class="bg-white dark:bg-[#1a1919] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333232] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#333232]">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">添加 ACL 测试断言</h3>
          <button @click="showAddTestModal = false" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2929] transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">测试描述</label>
            <input
              v-model="newTestForm.name"
              type="text"
              class="w-full px-3 py-2 bg-gray-50 dark:bg-[#252424] border border-gray-300 dark:border-[#383737] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              placeholder="例如: 阻断访客访问生产库"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模拟源 (Source)</label>
            <input
              v-model="newTestForm.src"
              type="text"
              class="w-full px-3 py-2 font-mono bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 focus:ring-2 focus:ring-blue-500/50 outline-none"
              placeholder="Tag 或 IP"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模拟目标 (Destination)</label>
            <input
              v-model="newTestForm.dst"
              type="text"
              class="w-full px-3 py-2 font-mono bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              placeholder="Tag 或 IP:Port"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#333232] bg-gray-50 dark:bg-[#1f1e1e] flex justify-end gap-3">
          <button @click="showAddTestModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2929] rounded-lg transition-colors cursor-pointer">
            取消
          </button>
          <button @click="addTestCase" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:scale-95 cursor-pointer">
            确认添加
          </button>
        </div>
      </div>
    </div>

    <!-- 添加 STUN 服务器/中继弹窗 -->
    <div
      v-if="showAddStunModal"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm transition-all"
    >
      <div class="w-full max-w-md bg-white dark:bg-[#252424] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-[#333232]">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">添加 STUN 节点</h3>
          <button @click="showAddStunModal = false" class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2929] transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">节点名称</label>
            <input v-model="newStunForm.name" type="text" placeholder="例如：官方 STUN 节点 1" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a1919] border border-gray-300 dark:border-[#333232] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">节点地址 (Host:Port)</label>
            <input v-model="newStunForm.host" type="text" placeholder="例如：stun.easytier.cn:3478" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a1919] border border-gray-300 dark:border-[#333232] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-gray-900 dark:text-white text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">节点类型</label>
            <select v-model="newStunForm.type" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a1919] border border-gray-300 dark:border-[#333232] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm">
              <option value="public">公共 STUN 服务器</option>
              <option value="private">私有中继节点</option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#333232] bg-gray-50 dark:bg-[#1f1e1e] flex justify-end gap-3">
          <button @click="showAddStunModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2929] rounded-lg transition-colors cursor-pointer">
            取消
          </button>
          <button @click="addStunServer" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:scale-95 cursor-pointer">
            确认添加
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
