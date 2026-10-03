<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { useTheme } from '@/composables/useTheme'
import { MeshNode } from '@/stores/network'
import Badge from '@/components/common/Badge.vue'
import { Monitor, Smartphone, Server, Laptop, Wifi } from 'lucide-vue-next'

const props = defineProps<{
  nodes: MeshNode[]
}>()

const { isDark } = useTheme()

// 计算拓扑图节点与连线数据
const flowElements = computed(() => {
  const elements: any[] = []
  const count = props.nodes.length
  if (count === 0) return []

  const centerX = 350
  const centerY = 220
  const radius = Math.max(160, count * 55)

  // 环状均匀布局
  props.nodes.forEach((node, index) => {
    const angle = (index / count) * 2 * Math.PI
    const x = count === 1 ? centerX : centerX + radius * Math.cos(angle)
    const y = count === 1 ? centerY : centerY + radius * Math.sin(angle)

    elements.push({
      id: node.machineId,
      type: 'customNode',
      position: { x, y },
      data: node,
    })
  })

  // 连线关系 (依据对等节点 peer_route_pairs)
  props.nodes.forEach((sourceNode) => {
    sourceNode.peers.forEach((peer) => {
      const targetNode = props.nodes.find(
        (n) => n.virtualIpv4 === peer.ipv4 || n.hostname === peer.hostname
      )
      if (targetNode && sourceNode.machineId < targetNode.machineId) {
        const isP2P = peer.isP2P
        elements.push({
          id: `edge-${sourceNode.machineId}-${targetNode.machineId}`,
          source: sourceNode.machineId,
          target: targetNode.machineId,
          animated: true,
          style: {
            stroke: isP2P ? '#10b981' : '#f59e0b',
            strokeWidth: 2,
            strokeDasharray: isP2P ? undefined : '5,5',
          },
          label: peer.latencyUs ? `${(peer.latencyUs / 1000).toFixed(0)}ms` : undefined,
          labelStyle: {
            fill: isDark.value ? '#a1a1aa' : '#64748b',
            fontSize: '11px',
            fontFamily: 'monospace',
          },
        })
      }
    })
  })

  return elements
})
</script>

<template>
  <div class="w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative shadow-inner">
    <VueFlow
      :elements="flowElements"
      :default-viewport="{ zoom: 0.95, x: 20, y: 10 }"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
    >
      <Background :pattern-color="isDark ? '#27272a' : '#e2e8f0'" :gap="20" />
      <Controls position="bottom-right" />

      <!-- 自定义节点微卡片 -->
      <template #node-customNode="{ data }">
        <div
          class="px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border-2 transition-all shadow-md dark:shadow-none min-w-[200px]"
          :class="[
            data.status === 'online'
              ? 'border-emerald-500/80 shadow-emerald-500/10'
              : data.status === 'relay'
              ? 'border-amber-500/80 shadow-amber-500/10'
              : 'border-slate-300 dark:border-zinc-700'
          ]"
        >
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2">
              <div class="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                <Server class="w-4 h-4" />
              </div>
              <span class="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate max-w-[100px]" :title="data.hostname">
                {{ data.hostname }}
              </span>
            </div>
            <Badge :variant="data.status" :pulse="data.status === 'online'">
              {{ data.status === 'online' ? 'P2P直连' : data.status === 'relay' ? '中继' : '离线' }}
            </Badge>
          </div>

          <!-- 双栈 IP 地址 -->
          <div class="space-y-1 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
            <div v-if="data.virtualIpv4" class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400">IPv4</span>
              <span class="font-medium text-slate-800 dark:text-zinc-200">{{ data.virtualIpv4 }}</span>
            </div>
            <div v-if="data.virtualIpv6" class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400">IPv6</span>
              <span class="font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[130px]" :title="data.virtualIpv6">
                {{ data.virtualIpv6 }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </VueFlow>

    <!-- 拓扑图例 -->
    <div class="absolute top-3 left-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs space-y-1.5 shadow-sm select-none pointer-events-none">
      <div class="font-semibold text-slate-800 dark:text-zinc-200 text-[11px]">全景链路状态</div>
      <div class="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
        <span class="w-3 h-0.5 bg-emerald-500"></span>
        <span>P2P 超低延迟直连</span>
      </div>
      <div class="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
        <span class="w-3 h-0.5 border-t-2 border-dashed border-amber-500"></span>
        <span>Relay 公网转发</span>
      </div>
    </div>
  </div>
</template>
