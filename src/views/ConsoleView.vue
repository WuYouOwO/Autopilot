<script setup lang="ts">
import { ref, computed } from 'vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import {
  Network,
  Users,
  Lock,
  Book,
  Settings,
  BookOpen,
  CircleHelp,
  ChevronRight,
  ChevronDown,
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
} from 'lucide-vue-next'

// --- 导航状态定义 (Tailscale 侧边栏树形按钮规范) ---
type SubNavItem = 'machines' | 'apps' | 'services' | 'dns' | 'users' | 'policies' | 'tests' | 'definitions' | 'json-editor' | 'logs' | 'settings'
const activeSubNav = ref<SubNavItem>('machines')

// 移动端菜单抽屉
const mobileMenuOpen = ref(false)

// 折叠组状态 (默认全展开，便于查看)
const isNetworkOpen = ref(true)
const isAccessControlsOpen = ref(true)
const isLogsOpen = ref(false)
const isSettingsOpen = ref(false)

// Toast 通知
const toastMessage = ref<string | null>(null)
const copiedKey = ref<string | null>(null)

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = null
  }, 2200)
}

const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  copiedKey.value = text
  showToast(`已复制 ${label}: ${text}`)
  setTimeout(() => {
    if (copiedKey.value === text) copiedKey.value = null
  }, 1800)
}

// --- ACL Tests 模块状态 ---
const aclTests = ref([
  {
    id: 'test-1',
    name: 'Developers access to Staging Database',
    src: 'group:developers',
    dst: 'tag:staging-db:5432',
    action: 'accept',
    status: 'pass',
    latency: '1.2ms',
    ruleMatched: 'Rule #3: allow-dev-to-staging',
  },
  {
    id: 'test-2',
    name: 'Developers blocked from Production Database',
    src: 'group:developers',
    dst: 'tag:prod-db:5432',
    action: 'deny',
    status: 'pass',
    latency: '0.8ms',
    ruleMatched: 'Rule #1: default-deny-prod',
  },
  {
    id: 'test-3',
    name: 'CI/CD runner deploy to Kubernetes Cluster',
    src: 'tag:github-runner',
    dst: 'tag:k8s-control-plane:6443',
    action: 'accept',
    status: 'pass',
    latency: '2.1ms',
    ruleMatched: 'Rule #7: cicd-k8s-apiserver',
  },
  {
    id: 'test-4',
    name: 'Office Guest WiFi denied from NAS Storage',
    src: 'tag:guest-wifi',
    dst: 'tag:storage-nas:*',
    action: 'deny',
    status: 'pass',
    latency: '0.4ms',
    ruleMatched: 'Rule #2: isolate-guests',
  },
])

const isRunningTests = ref(false)
const runAllTests = () => {
  isRunningTests.value = true
  showToast('正在运行全部 ACL 访问控制测试用例...')
  setTimeout(() => {
    isRunningTests.value = false
    showToast('所有 ACL 规则验证通过：4 通过，0 失败')
  }, 800)
}

// --- Machines 列表状态 ---
const isBannerMinimized = ref(false)
const showAddDeviceModal = ref(false)
const selectedOs = ref<'linux' | 'macos' | 'windows' | 'docker'>('linux')
const searchQuery = ref('')
const filterTab = ref<'all' | 'connected' | 'exit' | 'offline'>('all')

// 抽屉详情状态
const drawerOpen = ref(false)
const drawerTab = ref<'details' | 'routing' | 'peers' | 'toml'>('details')
const activeNode = ref<any | null>(null)

// 节点数据
const nodes = ref([
  {
    id: 'node-hk-gw',
    hostname: 'hk-gateway-edge',
    domain: 'hk-gateway-edge.seelcmo.org',
    os: 'Ubuntu 24.04 LTS (x86_64)',
    osType: 'linux',
    ipv4: '10.144.144.1',
    ipv6: 'fd00:144:144::1',
    status: 'online',
    connection: 'Direct',
    latencyMs: 14,
    lastSeen: 'Connected',
    subnets: ['192.168.10.0/24'],
    isSubnetApproved: true,
    isExitNode: true,
    tags: ['tag:gateway', 'tag:prod'],
    keyExpiry: 'Never',
    easytierVersion: 'v2.2.0-rc1',
    listeners: ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010', 'wg://0.0.0.0:11011'],
    peersList: [
      { name: 'mbp-m3-dev', ip: '10.144.144.2', mode: 'Direct (STUN Cone)', latency: '24ms', rx: '14.2 MB', tx: '88.5 MB' },
      { name: 'shanghai-nas', ip: '10.144.144.10', mode: 'Relay (HK-Hub)', latency: '78ms', rx: '1.2 GB', tx: '450 MB' },
    ],
  },
  {
    id: 'node-mac-m3',
    hostname: 'mbp-m3-dev',
    domain: 'mbp-m3-dev.seelcmo.org',
    os: 'macOS Sequoia 15.1 (Apple Silicon)',
    osType: 'macos',
    ipv4: '10.144.144.2',
    ipv6: 'fd00:144:144::2',
    status: 'online',
    connection: 'Direct',
    latencyMs: 24,
    lastSeen: 'Connected',
    subnets: [],
    isSubnetApproved: false,
    isExitNode: false,
    tags: ['tag:developer', 'tag:laptop'],
    keyExpiry: 'In 88 days',
    easytierVersion: 'v2.2.0-rc1',
    listeners: ['tcp://0.0.0.0:11010', 'udp://0.0.0.0:11010'],
    peersList: [
      { name: 'hk-gateway-edge', ip: '10.144.144.1', mode: 'Direct (STUN Cone)', latency: '24ms', rx: '88.5 MB', tx: '14.2 MB' },
    ],
  },
  {
    id: 'node-sh-nas',
    hostname: 'shanghai-storage-nas',
    domain: 'shanghai-nas.seelcmo.org',
    os: 'Debian GNU/Linux 12 (bookworm)',
    osType: 'linux',
    ipv4: '10.144.144.10',
    ipv6: 'fd00:144:144::10',
    status: 'online',
    connection: 'Relay',
    latencyMs: 78,
    lastSeen: 'Connected',
    subnets: ['10.0.0.0/16'],
    isSubnetApproved: true,
    isExitNode: false,
    tags: ['tag:storage', 'tag:backup'],
    keyExpiry: 'Never',
    easytierVersion: 'v2.1.8',
    listeners: ['tcp://0.0.0.0:11010'],
    peersList: [
      { name: 'hk-gateway-edge', ip: '10.144.144.1', mode: 'Relay (HK-Hub)', latency: '78ms', rx: '450 MB', tx: '1.2 GB' },
    ],
  },
  {
    id: 'node-win-pc',
    hostname: 'win11-workstation',
    domain: 'win11-workstation.seelcmo.org',
    os: 'Windows 11 Pro 24H2',
    osType: 'windows',
    ipv4: '10.144.144.15',
    ipv6: 'fd00:144:144::15',
    status: 'offline',
    connection: 'Disconnected',
    latencyMs: 0,
    lastSeen: '2 hours ago',
    subnets: [],
    isSubnetApproved: false,
    isExitNode: false,
    tags: ['tag:office'],
    keyExpiry: 'Expired',
    easytierVersion: 'v2.1.7',
    listeners: ['udp://0.0.0.0:11010'],
    peersList: [],
  },
])

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
        n.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })
})

const openDrawer = (node: any) => {
  activeNode.value = JSON.parse(JSON.stringify(node))
  drawerOpen.value = true
}

const saveDrawerChanges = () => {
  if (!activeNode.value) return
  const idx = nodes.value.findIndex((n) => n.id === activeNode.value.id)
  if (idx !== -1) {
    nodes.value[idx] = JSON.parse(JSON.stringify(activeNode.value))
  }
  drawerOpen.value = false
  showToast(`已成功保存节点 ${activeNode.value.hostname} 的网络配置`)
}

// 快速添加模拟节点
const addNewMockDevice = () => {
  const newId = `node-${Date.now().toString().slice(-4)}`
  const newNode = {
    id: newId,
    hostname: `new-device-${nodes.value.length + 1}`,
    domain: `new-device-${nodes.value.length + 1}.seelcmo.org`,
    os: 'Linux (Arch rolling)',
    osType: 'linux',
    ipv4: `10.144.144.${nodes.value.length + 20}`,
    ipv6: `fd00:144:144::${nodes.value.length + 20}`,
    status: 'online',
    connection: 'Direct',
    latencyMs: 18,
    lastSeen: 'Connected',
    subnets: [],
    isSubnetApproved: false,
    isExitNode: false,
    tags: ['tag:new'],
    keyExpiry: 'Never',
    easytierVersion: 'v2.2.0-rc1',
    listeners: ['tcp://0.0.0.0:11010'],
    peersList: [],
  }
  nodes.value.unshift(newNode)
  showAddDeviceModal.value = false
  showToast(`设备 ${newNode.hostname} 已成功接入 EasyTier Tailnet！`)
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
          aria-label="Open menu"
        >
          <Menu class="w-5 h-5" />
        </button>
        <span class="font-semibold text-sm">seelcmo.org</span>
      </div>
      <ThemeToggle />
    </header>

    <!-- ==================== 左侧固定导航栏 (Tailscale 1:1 结构) ==================== -->
    <aside
      :class="[
        'fixed top-0 bottom-0 left-0 w-60 border-r border-gray-200 dark:border-[#2f2e2e] bg-[#f9fafb] dark:bg-[#1f1e1e] z-50 select-none flex flex-col transition-transform duration-200 lg:translate-x-0',
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      ]"
    >
      <!-- 组织网络标题栏 (::: seelcmo.org  [Free]) -->
      <div class="h-14 px-3 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between">
        <a href="javascript:void(0)" class="flex items-center min-w-0 gap-2.5 hover:opacity-80 transition-opacity">
          <!-- Tailscale 3x3 九宫格 Dot Matrix 图标 -->
          <svg width="18" height="18" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 text-gray-900 dark:text-white" aria-hidden="true">
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
          <span class="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">seelcmo.org</span>
        </a>
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium border border-gray-200 dark:border-transparent bg-gray-200/80 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
            Free
          </span>
          <button
            type="button"
            @click="mobileMenuOpen = false"
            class="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 导航列表项 (层级树引导线 + 选中指示暗条) -->
      <div class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
        
        <!-- 1. Network 分组 -->
        <div>
          <button
            type="button"
            @click="isNetworkOpen = !isNetworkOpen"
            class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Network class="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span>Network</span>
            </div>
            <ChevronDown v-if="isNetworkOpen" class="w-3.5 h-3.5 text-gray-400" />
            <ChevronRight v-else class="w-3.5 h-3.5 text-gray-400" />
          </button>

          <!-- Network 子级菜单 (树形引导线 + 按钮项) -->
          <div v-show="isNetworkOpen" class="relative pl-6 py-0.5 space-y-0.5">
            <div class="absolute left-[21px] top-1 bottom-1 w-[1px] bg-gray-200 dark:bg-[#333232]"></div>

            <!-- Machines -->
            <button
              type="button"
              @click="activeSubNav = 'machines'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'machines'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'machines'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Machines</span>
            </button>

            <!-- Apps -->
            <button
              type="button"
              @click="activeSubNav = 'apps'; showToast('切换至 Apps 应用连接网关'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'apps'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'apps'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Apps</span>
            </button>

            <!-- Services -->
            <button
              type="button"
              @click="activeSubNav = 'services'; showToast('切换至 Services 网络服务列表'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'services'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'services'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Services</span>
            </button>

            <!-- DNS -->
            <button
              type="button"
              @click="activeSubNav = 'dns'; showToast('切换至 MagicDNS 域名配置'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'dns'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'dns'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>DNS</span>
            </button>
          </div>
        </div>

        <!-- 2. Users -->
        <button
          type="button"
          @click="activeSubNav = 'users'; showToast('切换至 Users 用户管理'); mobileMenuOpen = false"
          :class="[
            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md font-normal transition-all duration-100 active:scale-[0.98] cursor-pointer text-left',
            activeSubNav === 'users'
              ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
              : 'text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800'
          ]"
        >
          <Users class="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span>Users</span>
        </button>

        <!-- 3. Access controls 分组 -->
        <div>
          <button
            type="button"
            @click="isAccessControlsOpen = !isAccessControlsOpen"
            class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Lock class="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span>Access controls</span>
            </div>
            <ChevronDown v-if="isAccessControlsOpen" class="w-3.5 h-3.5 text-gray-400" />
            <ChevronRight v-else class="w-3.5 h-3.5 text-gray-400" />
          </button>

          <!-- Access controls 子级菜单 -->
          <div v-show="isAccessControlsOpen" class="relative pl-6 py-0.5 space-y-0.5">
            <div class="absolute left-[21px] top-1 bottom-1 w-[1px] bg-gray-200 dark:bg-[#333232]"></div>

            <!-- Policies -->
            <button
              type="button"
              @click="activeSubNav = 'policies'; showToast('切换至 ACL Policies 策略规则'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'policies'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'policies'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Policies</span>
            </button>

            <!-- Tests -->
            <button
              type="button"
              @click="activeSubNav = 'tests'; mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'tests'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'tests'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Tests</span>
            </button>

            <!-- Definitions -->
            <button
              type="button"
              @click="activeSubNav = 'definitions'; showToast('切换至 Definitions 别名与标签定义'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'definitions'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'definitions'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>Definitions</span>
            </button>

            <!-- JSON editor -->
            <button
              type="button"
              @click="activeSubNav = 'json-editor'; showToast('切换至 JSON 策略代码编辑器'); mobileMenuOpen = false"
              :class="[
                'relative flex items-center w-full pl-6 pr-2.5 py-1.5 rounded-md text-sm transition-all duration-100 text-left active:scale-[0.98] cursor-pointer',
                activeSubNav === 'json-editor'
                  ? 'bg-[#ebebeb] dark:bg-[#2e2d2d] text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282727] hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <span
                v-if="activeSubNav === 'json-editor'"
                class="absolute left-[20px] top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-full bg-gray-700 dark:bg-gray-200"
              ></span>
              <span>JSON editor</span>
            </button>
          </div>
        </div>

        <!-- 4. Logs -->
        <button
          type="button"
          @click="isLogsOpen = !isLogsOpen; showToast('展开/收起 Logs 审计流转')"
          class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
        >
          <div class="flex items-center gap-2.5">
            <Book class="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span>Logs</span>
          </div>
          <ChevronRight class="w-3.5 h-3.5 text-gray-400" />
        </button>

        <!-- 5. Settings -->
        <button
          type="button"
          @click="isSettingsOpen = !isSettingsOpen; showToast('展开/收起 Settings 网络配置')"
          class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md font-normal text-gray-800 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-100 cursor-pointer"
        >
          <div class="flex items-center gap-2.5">
            <Settings class="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span>Settings</span>
          </div>
          <ChevronRight class="w-3.5 h-3.5 text-gray-400" />
        </button>

        <!-- 底部 Resource Hub & Help -->
        <div class="pt-4 mt-4 border-t border-gray-200 dark:border-[#2f2e2e] space-y-0.5">
          <a
            href="javascript:void(0)"
            @click="showToast('打开 EasyTier 官方知识库')"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            <BookOpen class="w-4 h-4 text-gray-400" />
            <span>Resource hub</span>
          </a>
          <a
            href="javascript:void(0)"
            @click="showToast('帮助与支持')"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            <CircleHelp class="w-4 h-4 text-gray-400" />
            <span>Help</span>
          </a>
        </div>
      </div>

      <!-- 用户账号条 (Wu You) -->
      <div class="p-2 border-t border-gray-200 dark:border-[#2f2e2e]">
        <button
          type="button"
          @click="showToast('当前登录用户: Wu You (seelcmo.org 管理员)')"
          class="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-left hover:bg-gray-200/60 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
        >
          <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-white text-xs select-none shrink-0" style="background-color: rgb(196, 76, 52);">
            W
          </div>
          <div class="flex flex-col min-w-0 flex-1 leading-tight">
            <span class="truncate text-xs font-semibold text-gray-900 dark:text-white">Wu You</span>
            <span class="truncate text-[11px] text-gray-500 dark:text-gray-400">WuYou@SeeLcmo.org</span>
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

    <!-- ==================== 右侧主内容区域 ==================== -->
    <div class="flex-1 min-w-0 lg:pl-60 pt-14 lg:pt-0">
      
      <!-- -------------------- 视图 A: 当 activeSubNav === 'tests' 时呈现 (ACL 规则测试) -------------------- -->
      <main v-if="activeSubNav === 'tests'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                ACL Tests
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                4 Passed · 0 Failed
              </span>
            </div>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              Write assertions to test that your EasyTier packet filter rules and ACL policies behave as expected.
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
              <span>Run all tests</span>
            </button>
            <button
              @click="showToast('添加新的 ACL 规则断言测试')"
              type="button"
              class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <Plus class="w-4 h-4" />
              <span>Add test</span>
            </button>
          </div>
        </header>

        <!-- ACL Tests 测试用例列表表格 -->
        <div class="mt-6 border border-gray-200 dark:border-[#2f2e2e] rounded-lg overflow-hidden bg-white dark:bg-[#1f1e1e] shadow-2xs">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-[#2f2e2e] bg-gray-50/70 dark:bg-[#252424] text-gray-500 dark:text-gray-400 font-medium">
                <th class="py-2.5 px-4">Test Assertion</th>
                <th class="py-2.5 px-4">Source (Src)</th>
                <th class="py-2.5 px-4">Destination (Dst)</th>
                <th class="py-2.5 px-4">Expected Action</th>
                <th class="py-2.5 px-4">Result</th>
                <th class="py-2.5 px-3 text-right">Actions</th>
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
                      'px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider',
                      test.action === 'accept'
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
                    <span>Pass ({{ test.latency }})</span>
                  </div>
                </td>
                <td class="py-3 px-3 text-right">
                  <button
                    type="button"
                    @click="showToast(`测试用例 ${test.id} 单独执行通过`)"
                    class="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all"
                    title="Run single test"
                  >
                    <Play class="w-3.5 h-3.5 text-blue-600" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="px-4 py-2.5 border-t border-gray-100 dark:border-[#2f2e2e] bg-gray-50/50 dark:bg-[#252424] flex items-center justify-between text-[11px] text-gray-500">
            <span>All EasyTier packet filters and ACL rules match desired security boundary.</span>
            <span class="font-mono">Policy Hash: sha256:7b91d3e8</span>
          </div>
        </div>
      </main>

      <!-- -------------------- 视图 B: 当 activeSubNav === 'machines' 时呈现 (Machines 设备管理) -------------------- -->
      <main v-else class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Machines
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {{ nodes.length }} devices
              </span>
            </div>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              Manage the devices connected to your tailnet.
              <a
                href="https://tailscale.com/docs/features/access-control/device-management"
                target="_blank"
                rel="noopener"
                class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                See how to manage devices
                <ArrowUpRight class="w-3.5 h-3.5" />
              </a>
            </p>
          </div>

          <!-- 右侧 Add device 按钮与主题切换 -->
          <div class="flex items-center gap-2.5">
            <ThemeToggle class="hidden sm:inline-flex" />
            <button
              @click="showAddDeviceModal = true"
              type="button"
              class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
              <span>Add device</span>
              <ChevronDown class="w-4 h-4 opacity-80" />
            </button>
          </div>
        </header>

        <!-- 新手引导卡片 -->
        <section v-if="!isBannerMinimized" class="mb-8">
          <div class="rounded-lg border border-blue-200/80 dark:border-blue-900/40 relative overflow-hidden bg-blue-50/60 dark:bg-blue-950/20 shadow-2xs">
            <button
              type="button"
              @click="isBannerMinimized = true"
              class="absolute right-2 top-2 p-1.5 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 active:scale-[0.95] transition-all z-20 cursor-pointer"
              title="Minimize banner"
            >
              <Minus class="w-4 h-4" />
            </button>

            <div class="grid grid-cols-1 md:grid-cols-12 items-center">
              <div class="md:col-span-7 p-6 sm:p-7 flex flex-col justify-center gap-3.5">
                <h4 class="font-semibold text-lg text-gray-900 dark:text-white">
                  Add your first device
                </h4>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  How to connect devices to your secure, private network:
                </p>

                <ol class="space-y-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-4.5 h-4.5 mt-0.5">1</span>
                    <span>Install EasyTier on your first device like a laptop or phone.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-4.5 h-4.5 mt-0.5">2</span>
                    <span>Install EasyTier on another device like a desktop or server.</span>
                  </li>
                  <li class="flex items-start gap-2.5">
                    <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-xs font-bold w-4.5 h-4.5 mt-0.5">3</span>
                    <span class="font-medium text-gray-900 dark:text-white">Now you can access them from anywhere!</span>
                  </li>
                </ol>

                <div class="pt-1">
                  <button
                    @click="showAddDeviceModal = true"
                    type="button"
                    class="inline-flex items-center px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Add first device
                  </button>
                </div>
              </div>

              <!-- Tailscale 原生矢量波浪图 -->
              <div class="hidden md:flex md:col-span-5 h-full items-end justify-end overflow-hidden p-2">
                <svg width="280" height="175" viewBox="0 0 325 195" fill="none" xmlns="http://www.w3.org/2000/svg" class="dark:hidden select-none">
                  <path d="M259.465 194.6C223.632 194.6 194.598 165.566 194.598 129.733L259.465 129.733L259.465 194.6Z" fill="#ADC7FC"/>
                  <path d="M324.331 129.733C324.331 165.566 295.296 194.6 259.464 194.6L259.464 129.733L324.331 129.733Z" fill="#ADC7FC"/>
                  <path d="M324.334 64.8668C324.334 100.699 295.3 129.733 259.467 129.733L259.467 64.8668L324.334 64.8668Z" fill="#ADC7FC"/>
                  <path d="M64.8657 129.733C64.8657 93.901 93.9 64.8667 129.732 64.8667L129.732 129.733L64.8657 129.733Z" fill="#6C94EC"/>
                  <path d="M194.601 129.733C194.601 165.566 165.566 194.6 129.734 194.6L129.734 129.733L194.601 129.733Z" fill="#6C94EC"/>
                  <path d="M324.334 0C324.334 35.8324 295.3 64.8667 259.467 64.8667L259.467 7.73527e-07L324.334 0Z" fill="#6C94EC"/>
                  <path d="M324.334 129.733C324.334 165.566 295.3 194.6 259.467 194.6L259.467 129.733L324.334 129.733Z" fill="#6C94EC"/>
                  <rect x="194.601" y="64.8668" width="64.8667" height="64.8667" rx="32.4333" fill="#6C94EC"/>
                  <rect x="194.601" width="64.8667" height="64.8667" rx="32.4333" fill="#ADC7FC"/>
                  <rect x="64.8657" y="129.733" width="64.8667" height="64.8667" rx="32.4333" fill="#ADC7FC"/>
                  <rect y="129.733" width="64.8667" height="64.8667" rx="32.4333" fill="#6C94EC"/>
                  <rect x="129.733" y="64.8668" width="64.8667" height="64.8667" rx="32.4333" fill="#ADC7FC"/>
                </svg>

                <svg width="280" height="175" viewBox="0 0 324 195" fill="none" xmlns="http://www.w3.org/2000/svg" class="hidden dark:block select-none">
                  <path d="M259.198 194.4C223.402 194.4 194.398 165.396 194.398 129.6L259.198 129.6L259.198 194.4Z" fill="#3F5DB3"/>
                  <path d="M323.997 129.6C323.997 165.395 294.993 194.4 259.197 194.4L259.197 129.6L323.997 129.6Z" fill="#3F5DB3"/>
                  <path d="M324 64.8001C324 100.596 294.996 129.6 259.2 129.6L259.2 64.8001L324 64.8001Z" fill="#3F5DB3"/>
                  <path d="M64.7993 129.6C64.7993 93.8045 93.8038 64.8 129.599 64.8L129.599 129.6L64.7993 129.6Z" fill="#6C94EC"/>
                  <path d="M194.4 129.6C194.4 165.396 165.396 194.4 129.6 194.4L129.6 129.6L194.4 129.6Z" fill="#6C94EC"/>
                  <path d="M324 0C324 35.7955 294.996 64.8 259.2 64.8L259.2 7.72732e-07L324 0Z" fill="#6C94EC"/>
                  <path d="M324 129.6C324 165.396 294.996 194.4 259.2 194.4L259.2 129.6L324 129.6Z" fill="#6C94EC"/>
                  <rect x="194.4" y="64.8001" width="64.8" height="64.8" rx="32.4" fill="#6C94EC"/>
                  <rect x="194.4" width="64.8" height="64.8" rx="32.4" fill="#3F5DB3"/>
                  <rect x="64.7993" y="129.6" width="64.8" height="64.8" rx="32.4" fill="#3F5DB3"/>
                  <rect y="129.6" width="64.8" height="64.8" rx="32.4" fill="#6C94EC"/>
                  <rect x="129.6" y="64.8001" width="64.8" height="64.8" rx="32.4" fill="#3F5DB3"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <!-- 药丸过滤控制条 -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
              All ({{ nodes.length }})
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
              Connected ({{ nodes.filter(n => n.status === 'online').length }})
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
              Exit nodes ({{ nodes.filter(n => n.isExitNode).length }})
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
              Offline ({{ nodes.filter(n => n.status === 'offline').length }})
            </button>
          </div>

          <div class="relative w-full sm:w-72">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name, IP, or tag..."
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#282727] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <!-- Machines 表格 -->
        <div class="border border-gray-200 dark:border-[#2f2e2e] rounded-lg overflow-hidden bg-white dark:bg-[#1f1e1e] shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-[#2f2e2e] bg-gray-50/70 dark:bg-[#252424] text-gray-500 dark:text-gray-400 font-medium">
                  <th class="py-2.5 px-4">Machine</th>
                  <th class="py-2.5 px-4">Addresses (IPv4 / IPv6)</th>
                  <th class="py-2.5 px-4">Last seen</th>
                  <th class="py-2.5 px-4">Routing / Capabilities</th>
                  <th class="py-2.5 px-3 text-right">Actions</th>
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
                            Exit node
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

                  <td class="py-3 px-4 font-mono text-[11px]" @click.stop>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-gray-900 dark:text-gray-200">{{ node.ipv4 }}</span>
                        <button
                          type="button"
                          @click="copyText(node.ipv4, 'IPv4')"
                          class="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700 active:scale-[0.95] transition-all"
                          title="Copy IPv4"
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
                          class="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700 active:scale-[0.95] transition-all"
                          title="Copy IPv6"
                        >
                          <component :is="copiedKey === node.ipv6 ? Check : Copy" class="w-3 h-3 text-emerald-500" v-if="copiedKey === node.ipv6" />
                          <Copy class="w-3 h-3" v-else />
                        </button>
                      </div>
                    </div>
                  </td>

                  <td class="py-3 px-4">
                    <div>
                      <span :class="['font-medium', node.status === 'online' ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400']">
                        {{ node.lastSeen }}
                      </span>
                      <div v-if="node.status === 'online'" class="flex items-center gap-1 text-[11px] mt-0.5">
                        <span
                          :class="[
                            'px-1.5 py-0.2 rounded font-semibold',
                            node.connection === 'Direct'
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

                  <td class="py-3 px-4">
                    <div v-if="node.subnets.length > 0" class="space-y-1">
                      <div v-for="sub in node.subnets" :key="sub" class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {{ sub }}
                        </span>
                        <span v-if="node.isSubnetApproved" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Approved</span>
                      </div>
                    </div>
                    <span v-else class="text-gray-400 dark:text-gray-600 text-[11px]">-</span>
                  </td>

                  <td class="py-3 px-3 text-right" @click.stop>
                    <button
                      type="button"
                      @click="openDrawer(node)"
                      class="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all"
                      title="Machine options"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-4 py-2.5 border-t border-gray-100 dark:border-[#2f2e2e] bg-gray-50/50 dark:bg-[#252424] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>Showing {{ filteredNodes.length }} of {{ nodes.length }} machines</span>
            <span>EasyTier mesh network active · 0 packet loss</span>
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
        class="w-full max-w-lg bg-white dark:bg-[#1f1e1e] h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-[#2f2e2e] transition-transform duration-200"
        @click.stop
      >
        <div class="p-4 sm:p-5 border-b border-gray-200 dark:border-[#2f2e2e] flex items-center justify-between bg-gray-50/60 dark:bg-[#252424]">
          <div class="flex items-center gap-3">
            <span :class="['w-3 h-3 rounded-full', activeNode?.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400']"></span>
            <div>
              <h3 class="font-bold text-base text-gray-900 dark:text-white leading-none">
                {{ activeNode?.hostname }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {{ activeNode?.domain }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="drawerOpen = false"
            class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.95] transition-all"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex items-center px-4 border-b border-gray-200 dark:border-[#2f2e2e] gap-4 text-xs font-medium">
          <button
            type="button"
            @click="drawerTab = 'details'"
            :class="[
              'py-3 border-b-2 transition-colors cursor-pointer',
              drawerTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Machine Details
          </button>
          <button
            type="button"
            @click="drawerTab = 'routing'"
            :class="[
              'py-3 border-b-2 transition-colors cursor-pointer',
              drawerTab === 'routing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Subnets & Exit
          </button>
          <button
            type="button"
            @click="drawerTab = 'peers'"
            :class="[
              'py-3 border-b-2 transition-colors cursor-pointer',
              drawerTab === 'peers'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            P2P Peers ({{ activeNode?.peersList?.length || 0 }})
          </button>
          <button
            type="button"
            @click="drawerTab = 'toml'"
            :class="[
              'py-3 border-b-2 transition-colors cursor-pointer',
              drawerTab === 'toml'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            EasyTier TOML
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          <div v-if="drawerTab === 'details'" class="space-y-4">
            <div class="space-y-3">
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Machine Name</label>
                <input
                  v-model="activeNode.hostname"
                  type="text"
                  class="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#282727] text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div class="p-3 rounded-lg bg-gray-50 dark:bg-[#282727] border border-gray-200 dark:border-[#383737] space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Virtual IPv4</span>
                  <div class="flex items-center gap-1.5 font-mono font-medium">
                    <span>{{ activeNode?.ipv4 }}</span>
                    <button type="button" @click="copyText(activeNode.ipv4, 'IPv4')" class="text-blue-600 dark:text-blue-400 hover:underline">Copy</button>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Virtual IPv6</span>
                  <div class="flex items-center gap-1.5 font-mono font-medium">
                    <span>{{ activeNode?.ipv6 }}</span>
                    <button type="button" @click="copyText(activeNode.ipv6, 'IPv6')" class="text-blue-600 dark:text-blue-400 hover:underline">Copy</button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-2.5 rounded border border-gray-200 dark:border-gray-800">
                  <span class="text-gray-500 block mb-0.5">Operating System</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ activeNode?.os }}</span>
                </div>
                <div class="p-2.5 rounded border border-gray-200 dark:border-gray-800">
                  <span class="text-gray-500 block mb-0.5">EasyTier Core</span>
                  <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ activeNode?.easytierVersion }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="drawerTab === 'routing'" class="space-y-4">
            <div class="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">Use as Exit Node</h4>
                  <p class="text-gray-500 dark:text-gray-400 text-[11px]">Route all network internet traffic through this machine.</p>
                </div>
                <input
                  type="checkbox"
                  v-model="activeNode.isExitNode"
                  class="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div v-else-if="drawerTab === 'peers'" class="space-y-3">
            <p class="text-gray-500 text-[11px]">Direct P2P links established via EasyTier UDP Hole Punching (STUN/ICE):</p>
            <div
              v-for="p in activeNode.peersList"
              :key="p.name"
              class="p-3 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5"
            >
              <div class="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                <span>{{ p.name }} ({{ p.ip }})</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{{ p.latency }}</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-gray-500">
                <span>NAT Punch Mode: {{ p.mode }}</span>
                <span>Tx: {{ p.tx }} / Rx: {{ p.rx }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="drawerTab === 'toml'" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-500 font-medium">Live generated easytier.toml</span>
              <button
                type="button"
                @click="copyText(`[network]\ninstance_name = '${activeNode.hostname}'\nipv4 = '${activeNode.ipv4}'\nipv6 = '${activeNode.ipv6}'`, 'TOML Config')"
                class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-[0.95] transition-all"
              >
                <Copy class="w-3 h-3" />
                Copy TOML
              </button>
            </div>
            <pre class="p-3 rounded-lg bg-gray-900 text-gray-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-gray-800">
# EasyTier Autopilot Machine Spec
instance_name = "{{ activeNode.hostname }}"
ipv4 = "{{ activeNode.ipv4 }}/24"
ipv6 = "{{ activeNode.ipv6 }}/64"
exit_node = {{ activeNode.isExitNode }}
</pre>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="drawerOpen = false"
            class="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="saveDrawerChanges"
            class="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== Add Device 模态框 ==================== -->
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
              <h3 class="font-bold text-base text-gray-900 dark:text-white">Add a device to your tailnet</h3>
              <p class="text-xs text-gray-500">Run EasyTier with zero-configuration peer enrollment</p>
            </div>
          </div>
          <button type="button" @click="showAddDeviceModal = false" class="text-gray-400 hover:text-gray-600 active:scale-[0.95] transition-all">
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
                'py-2 px-3 rounded-md font-medium text-center border uppercase tracking-wider transition-all active:scale-[0.98]',
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
              <span>One-line join command</span>
              <button
                type="button"
                @click="copyText(`curl -fsSL https://easytier.top/install.sh | bash && easytier-core --ipv4 10.144.144.${nodes.length + 20} --peers tcp://seelcmo.org:11010`, 'Command')"
                class="text-blue-400 hover:underline flex items-center gap-1 active:scale-[0.95] transition-all"
              >
                <Copy class="w-3 h-3" />
                Copy
              </button>
            </div>
            <div class="text-[11px] leading-relaxed break-all select-all text-emerald-400">
              curl -fsSL https://easytier.top/install.sh | bash && easytier-core --ipv4 10.144.144.{{ nodes.length + 20 }} --peers tcp://seelcmo.org:11010
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-[#2f2e2e] bg-gray-50 dark:bg-[#252424] flex items-center justify-between">
          <span class="text-gray-500 text-[11px]">No account login required for peer nodes</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="showAddDeviceModal = false"
              class="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="addNewMockDevice"
              class="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium active:scale-[0.98] transition-all cursor-pointer"
            >
              Simulate Device Join
            </button>
          </div>
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

  </div>
</template>
