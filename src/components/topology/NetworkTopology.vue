<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { useTheme } from '@/composables/useTheme'
import { MeshNode } from '@/stores/network'
import Badge from '@/components/common/Badge.vue'
import { Server } from 'lucide-vue-next'

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
  <div class="w-full h-[480px] rounded-md overflow-hidden border border-slate-200 dark:border-[#262a33] bg-slate-50/50 dark:bg-[#101216] relative shadow-inner">
    <VueFlow
      :elements="flowElements"
      :default-viewport="{ zoom: 0.95, x: 20, y: 10 }"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
    >
      <Background :pattern-color="isDark ? '#262a33' : '#e2e5ea'" :gap="20" />
      <Controls position="bottom-right" />

      <!-- 自定义节点微卡片 (Cloudflare Edge Node) -->
      <template #node-customNode="{ data }">
        <div
          class="px-3.5 py-2.5 rounded-md bg-white dark:bg-[#191c22] border-2 transition-all shadow-xs min-w-[190px]"
          :class="[
            data.status === 'online'
              ? 'border-emerald-500/80 shadow-emerald-500/10'
              : data.status === 'relay'
              ? 'border-amber-500/80 shadow-amber-500/10'
              : 'border-slate-300 dark:border-zinc-700'
          ]"
        >
          <div class="flex items-center justify-between gap-2.5 mb-1.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <div class="p-1 rounded bg-orange-50 dark:bg-orange-950/40 text-[#f38020]">
                <Server class="w-3.5 h-3.5" />
              </div>
              <span class="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate max-w-[90px]" :title="data.hostname">
                {{ data.hostname }}
              </span>
            </div>
            <Badge :variant="data.status" :pulse="data.status === 'online'" size="sm">
              {{ data.status === 'online' ? '直连' : data.status === 'relay' ? '中继' : '离线' }}
            </Badge>
          </div>

          <!-- 双栈 IP 地址 -->
          <div class="space-y-0.5 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
            <div v-if="data.virtualIpv4" class="flex items-center justify-between">
              <span class="text-slate-400">IPv4</span>
              <span class="font-medium text-slate-800 dark:text-zinc-200">{{ data.virtualIpv4 }}</span>
            </div>
            <div v-if="data.virtualIpv6" class="flex items-center justify-between">
              <span class="text-slate-400">IPv6</span>
              <span class="font-medium text-orange-600 dark:text-orange-400 truncate max-w-[120px]" :title="data.virtualIpv6">
                {{ data.virtualIpv6 }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </VueFlow>

    <!-- 拓扑图例 -->
    <div class="absolute top-3 left-3 bg-white/95 dark:bg-[#191c22]/95 backdrop-blur-sm border border-slate-200 dark:border-[#262a33] rounded p-2 text-xs space-y-1 shadow-xs select-none pointer-events-none">
      <div class="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">链路状态</div>
      <div class="flex items-center gap-2 text-slate-600 dark:text-zinc-400 text-[10px]">
        <span class="w-3 h-0.5 bg-emerald-500"></span>
        <span>P2P 超低延迟直连 (Direct)</span>
      </div>
      <div class="flex items-center gap-2 text-slate-600 dark:text-zinc-400 text-[10px]">
        <span class="w-3 h-0.5 border-t-2 border-dashed border-amber-500"></span>
        <span>Relay 公网转发 (Proxied)</span>
      </div>
    </div>
  </div>
</template>
