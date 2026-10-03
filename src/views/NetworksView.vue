<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNetworkStore, MeshNode } from '@/stores/network'
import NetworkTopology from '@/components/topology/NetworkTopology.vue'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import api from '@/lib/api'
import { formatBytes, formatLatency, formatPercent } from '@/lib/utils'
import {
  Layers,
  Network,
  Plus,
  Copy,
  Check,
  Server,
  Settings,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  FileCode,
  Terminal,
  ExternalLink,
  ShieldAlert,
} from 'lucide-vue-next'

const networkStore = useNetworkStore()

const viewMode = ref<'topology' | 'grid'>('topology')
const showWizard = ref(false)
const showRawTomlDialog = ref(false)
const selectedNode = ref<MeshNode | null>(null)
const selectedNodeConfig = ref<string>('')
const tomlSaving = ref(false)
const tomlError = ref('')

const copiedIp = ref<string | null>(null)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedIp.value = text
    setTimeout(() => {
      copiedIp.value = null
    }, 1800)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}

const currentMesh = computed(() => networkStore.currentNetwork)
const currentNodes = computed(() => currentMesh.value?.nodes || [])

// 统计数据
const onlineRatio = computed(() => {
  if (!currentMesh.value || currentMesh.value.totalNodes === 0) return '0%'
  return `${Math.round((currentMesh.value.onlineNodes / currentMesh.value.totalNodes) * 100)}%`
})

const totalTx = computed(() => {
  return currentNodes.value.reduce((acc, n) => acc + n.uploadBytes, 0)
})

const totalRx = computed(() => {
  return currentNodes.value.reduce((acc, n) => acc + n.downloadBytes, 0)
})

const p2pCount = computed(() => {
  return currentNodes.value.filter((n) => n.status === 'online').length
})

// 打开原生 TOML 编辑器
const openTomlEditor = async (node: MeshNode) => {
  selectedNode.value = node
  tomlError.value = ''
  try {
    const rawConfig = await api.getNetworkConfig(node.machineId, node.instanceId)
    const tomlStr = await api.generateTomlConfig(rawConfig)
    selectedNodeConfig.value = tomlStr
    showRawTomlDialog.value = true
  } catch (err: any) {
    alert('加载配置文件失败: ' + err.message)
  }
}

// 保存原生 TOML 编辑器内容
const saveTomlEditor = async () => {
  if (!selectedNode.value) return
  tomlSaving.value = true
  tomlError.value = ''

  try {
    const parsedConfig = await api.parseTomlConfig(selectedNodeConfig.value)
    await api.saveNetworkConfig(selectedNode.value.machineId, selectedNode.value.instanceId, parsedConfig)
    await api.runNetworkInstance(selectedNode.value.machineId, parsedConfig, true)
    showRawTomlDialog.value = false
    await networkStore.fetchAll()
  } catch (err: any) {
    tomlError.value = '保存失败: ' + (err.message || '格式错误')
  } finally {
    tomlSaving.value = false
  }
}

// 向导平台选项
const wizardPlatform = ref<'linux' | 'docker' | 'windows'>('linux')
const wizardOneLiner = computed(() => {
  const netName = currentMesh.value?.name || 'easytier'
  switch (wizardPlatform.value) {
    case 'docker':
      return `docker run -d --net=host --privileged --name easytier-node \\
  easytier/easytier:latest -n "${netName}" -s "your_secret" \\
  --listeners "tcp://0.0.0.0:11010" --listeners "udp://[::]:11010"`
    case 'windows':
      return `easytier-core.exe -n "${netName}" -s "your_secret" --listeners "tcp://0.0.0.0:11010" --listeners "udp://[::]:11010"`
    default:
      return `sudo easytier-core -n "${netName}" -s "your_secret" \\
  --listeners "tcp://0.0.0.0:11010" \\
  --listeners "udp://[::]:11010"`
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部概览与大屏指标 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <span>{{ currentMesh?.name || '虚拟网络概览' }}</span>
          <Badge variant="primary">Mesh 全景</Badge>
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          当前网络共有 {{ currentNodes.length }} 个节点成员，实时呈现链路穿透与连通度
        </p>
      </div>

      <!-- 操作与视图切换 -->
      <div class="flex items-center gap-3">
        <!-- 视图切换单选按钮 -->
        <div class="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
          <button
            type="button"
            @click="viewMode = 'topology'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
              viewMode === 'topology'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            ]"
          >
            <Activity class="w-3.5 h-3.5 text-indigo-500" />
            <span>拓扑大屏</span>
          </button>
          <button
            type="button"
            @click="viewMode = 'grid'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
              viewMode === 'grid'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            ]"
          >
            <Server class="w-3.5 h-3.5" />
            <span>节点列表</span>
          </button>
        </div>

        <!-- 快速入网按钮 -->
        <Button variant="primary" size="md" @click="showWizard = true">
          <Plus class="w-4 h-4" />
          <span>接入新节点</span>
        </Button>
      </div>
    </div>

    <!-- 关键指标卡片 (Metric Cards) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card :padding="true" class="bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-950">
        <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">网络节点规模</div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-slate-900 dark:text-white">{{ currentNodes.length }}</span>
          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{{ onlineRatio }} 在线</span>
        </div>
      </Card>

      <Card :padding="true" class="bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-950">
        <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">P2P 直连覆盖率</div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{{ p2pCount }}</span>
          <span class="text-xs text-slate-400">直连点</span>
        </div>
      </Card>

      <Card :padding="true" class="bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-950">
        <div class="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
          <ArrowUpRight class="w-3.5 h-3.5 text-blue-500" />
          <span>全网发送总流量</span>
        </div>
        <div class="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
          {{ formatBytes(totalTx) }}
        </div>
      </Card>

      <Card :padding="true" class="bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-900 dark:to-zinc-950">
        <div class="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
          <ArrowDownLeft class="w-3.5 h-3.5 text-emerald-500" />
          <span>全网接收总流量</span>
        </div>
        <div class="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
          {{ formatBytes(totalRx) }}
        </div>
      </Card>
    </div>

    <!-- 模式 A：交互式拓扑图视图 -->
    <div v-if="viewMode === 'topology'">
      <NetworkTopology :nodes="currentNodes" />
    </div>

    <!-- 模式 B：现代节点卡片列表视图 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="node in currentNodes"
        :key="node.machineId"
        class="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>
          <!-- 卡片头部 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200">
                <Server class="w-5 h-5" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]" :title="node.hostname">
                  {{ node.hostname }}
                </h4>
                <span class="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{{ node.osName }}</span>
              </div>
            </div>
            <Badge :variant="node.status" :pulse="node.status === 'online'">
              {{ node.status === 'online' ? 'P2P直连' : node.status === 'relay' ? '中继连接' : '离线' }}
            </Badge>
          </div>

          <!-- 双栈虚拟 IP (一键点击复制) -->
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800/80 space-y-2 mb-4 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-400">虚拟 IPv4</span>
              <button
                type="button"
                @click="copyToClipboard(node.virtualIpv4 || '')"
                class="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="点击复制 IPv4"
              >
                <span>{{ node.virtualIpv4 || '未分配' }}</span>
                <Check v-if="copiedIp === node.virtualIpv4" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div class="flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800/60 pt-1.5">
              <span class="text-[11px] text-slate-400">虚拟 IPv6</span>
              <button
                type="button"
                @click="copyToClipboard(node.virtualIpv6 || '')"
                class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline max-w-[170px] truncate"
                title="点击复制 IPv6"
              >
                <span class="truncate">{{ node.virtualIpv6 || '未开启' }}</span>
                <Check v-if="copiedIp === node.virtualIpv6" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <Copy v-else class="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          <!-- 链路情况 -->
          <div class="text-xs text-slate-500 dark:text-zinc-400 space-y-1 mb-4">
            <div class="flex justify-between">
              <span>已建立对等连接</span>
              <span class="font-mono font-medium text-slate-900 dark:text-zinc-200">{{ node.peers.length }} 个节点</span>
            </div>
            <div class="flex justify-between">
              <span>总上传 / 下载</span>
              <span class="font-mono text-[11px]">{{ formatBytes(node.uploadBytes) }} / {{ formatBytes(node.downloadBytes) }}</span>
            </div>
          </div>
        </div>

        <!-- 卡片底部快捷操作 -->
        <div class="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            @click="openTomlEditor(node)"
            class="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
          >
            <FileCode class="w-3.5 h-3.5 text-indigo-500" />
            <span>纯 TOML 编辑</span>
          </button>
          <span class="text-[11px] font-mono text-slate-400">EasyTier {{ node.version || 'v2.6' }}</span>
        </div>
      </div>
    </div>

    <!-- 弹窗 1：快速接入新节点向导 (Quick Connect Wizard) -->
    <Dialog
      :open="showWizard"
      title="接入新节点 (10 秒快速向导)"
      description="在目标机器上运行以下自动生成的指令，该设备将自动加入本 Mesh 网络"
      @close="showWizard = false"
      max-width="max-w-2xl"
    >
      <div class="space-y-4">
        <!-- 平台选择 -->
        <div class="flex gap-2">
          <button
            v-for="p in [
              { id: 'linux', label: 'Linux (Systemd)' },
              { id: 'docker', label: 'Docker 容器' },
              { id: 'windows', label: 'Windows (PowerShell)' }
            ]"
            :key="p.id"
            type="button"
            @click="wizardPlatform = p.id as any"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              wizardPlatform === p.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
            ]"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- 命令复制框 -->
        <div class="relative">
          <pre class="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-black font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">{{ wizardOneLiner }}</pre>
          <button
            type="button"
            @click="copyToClipboard(wizardOneLiner)"
            class="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <Check v-if="copiedIp === wizardOneLiner" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copiedIp === wizardOneLiner ? '已复制' : '复制命令' }}</span>
          </button>
        </div>

        <div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
          💡 已预配置支持 IPv4 + IPv6 双栈原生监听（含 <code>[::]:11010</code>），节点启动后将秒级自动出现在上方拓扑大屏。
        </div>
      </div>
    </Dialog>

    <!-- 弹窗 2：真·纯文本 TOML 配置文件编辑器 -->
    <Dialog
      :open="showRawTomlDialog"
      :title="`原生 TOML 配置 · ${selectedNode?.hostname || ''}`"
      description="真·纯文本直存模式：完整支持 IPv6、路由及高级参数，绝不经前端结构体二次破坏截断"
      @close="showRawTomlDialog = false"
      max-width="max-w-3xl"
    >
      <div class="space-y-3">
        <div v-if="tomlError" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <ShieldAlert class="w-4 h-4 shrink-0" />
          <span>{{ tomlError }}</span>
        </div>

        <div class="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <textarea
            v-model="selectedNodeConfig"
            rows="18"
            spellcheck="false"
            class="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 dark:bg-black resize-none focus:outline-none leading-relaxed"
            placeholder="# 在此编辑 TOML 配置，支持任意 IPv6 字段与高级配置"
          ></textarea>
        </div>

        <div class="text-[11px] text-slate-400 dark:text-zinc-500">
          提示：保存后将自动提交给 EasyTier 内核进行配置校验并热更新，无需担心前端二次抹除未知字段。
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showRawTomlDialog = false">取消</Button>
        <Button variant="primary" size="sm" :loading="tomlSaving" @click="saveTomlEditor">保存并应用</Button>
      </template>
    </Dialog>
  </div>
</template>
