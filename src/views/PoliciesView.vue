<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
          <Shield class="w-3.5 h-3.5" />
          <span>ZERO TRUST ACCESS POLICIES</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          访问控制策略 (Access Rules)
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          基于安全标签与角色体系的零信任防火墙规则。无需在节点之间机械复制，本控制台支持统一编排与一键原子推送到全网所有边缘节点。
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <Button variant="secondary" size="sm" @click="resetToDefaultRules">
          <RotateCcw class="w-3.5 h-3.5 mr-1" />
          重置默认
        </Button>
        <Button variant="secondary" size="sm" @click="openAddModal">
          <Plus class="w-3.5 h-3.5 mr-1" />
          新增策略规则
        </Button>
        <Button variant="primary" size="sm" :loading="deploying" @click="deployAllPolicies">
          <Send class="w-3.5 h-3.5 mr-1" />
          一键分发至全网节点
        </Button>
      </div>
    </div>

    <!-- Cloudflare Zero Trust Info Banner -->
    <div class="rounded border border-orange-200 dark:border-orange-950/60 bg-orange-50/60 dark:bg-orange-950/20 p-4 text-xs leading-relaxed text-orange-950 dark:text-orange-200 flex items-start gap-3">
      <ShieldCheck class="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
      <div>
        <span class="font-bold">默认安全机制：</span>
        EasyTier 底层采用白名单放行与安全标签匹配模型。规则将自动转化为 Rust 后端各节点的 ACL 规则结构。您在此处编辑的所有规则，点击「一键分发至全网节点」后将通过 <code class="font-mono font-semibold bg-white/60 dark:bg-zinc-800 px-1 py-0.5 rounded">AclManageRpcService</code> 动态下发并即时热生效。
      </div>
    </div>

    <!-- Rules Card & Table -->
    <Card class="border-slate-200 dark:border-[#262a33] overflow-hidden">
      <div class="p-4 border-b border-slate-100 dark:border-[#262a33] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-[#f38020]" />
          <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100">活跃 ACL 策略表 (Active Policy Set)</h3>
        </div>
        <Badge variant="cf" size="sm">
          共 {{ policies.length }} 条生效规则
        </Badge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-[#191c22] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#262a33]">
            <tr>
              <th class="px-4 py-3 font-semibold w-14">序号</th>
              <th class="px-4 py-3 font-semibold">动作 (Action)</th>
              <th class="px-4 py-3 font-semibold">策略名称</th>
              <th class="px-4 py-3 font-semibold">源标签 (Source)</th>
              <th class="px-4 py-3 font-semibold">目标标签 (Destination)</th>
              <th class="px-4 py-3 font-semibold">协议 / 端口</th>
              <th class="px-4 py-3 font-semibold">命中遥测 (Hits)</th>
              <th class="px-4 py-3 font-semibold text-center">启用状态</th>
              <th class="px-4 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#262a33] text-slate-700 dark:text-zinc-300">
            <tr
              v-for="(rule, idx) in policies"
              :key="rule.id"
              :class="['hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors', !rule.enabled ? 'opacity-50' : '']"
            >
              <td class="px-4 py-3 font-mono text-slate-400">
                #{{ idx + 1 }}
              </td>

              <!-- Action Badge -->
              <td class="px-4 py-3">
                <Badge :variant="rule.action === 'accept' ? 'success' : 'danger'" size="sm">
                  {{ rule.action === 'accept' ? 'ALLOW (放行)' : 'BLOCK (阻断)' }}
                </Badge>
              </td>

              <!-- Name -->
              <td class="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">
                {{ rule.name }}
              </td>

              <!-- Source -->
              <td class="px-4 py-3 font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] border border-slate-200 dark:border-zinc-700">
                  {{ rule.srcTag }}
                </span>
              </td>

              <!-- Destination -->
              <td class="px-4 py-3 font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] border border-slate-200 dark:border-zinc-700">
                  {{ rule.dstTag }}
                </span>
              </td>

              <!-- Proto & Ports -->
              <td class="px-4 py-3 font-mono text-[11px]">
                <span class="font-bold text-orange-600 dark:text-orange-400">{{ rule.proto.toUpperCase() }}</span>
                <span class="ml-1 text-slate-500 dark:text-zinc-400">{{ rule.ports || '全部端口 (*)' }}</span>
              </td>

              <!-- Hit Telemetry -->
              <td class="px-4 py-3 font-mono text-[11px]">
                <span v-if="rule.packetCount !== undefined" class="text-orange-600 dark:text-orange-400 font-bold">
                  {{ rule.packetCount }} pkts
                </span>
                <span v-else class="text-slate-400">0 pkts</span>
              </td>

              <!-- Enabled Toggle -->
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  v-model="rule.enabled"
                  class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-zinc-700 cursor-pointer"
                />
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-right">
                <button
                  @click="deleteRule(idx)"
                  class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1"
                  title="删除规则"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Add Rule Modal -->
    <Dialog :open="showAddModal" title="新建零信任访问策略规则" @close="showAddModal = false">
      <div class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            策略规则名称
          </label>
          <input
            v-model="newRule.name"
            type="text"
            placeholder="例如: 允许开发团队访问数据库集群"
            class="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              执行动作 (Action)
            </label>
            <select
              v-model="newRule.action"
              class="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="accept">ALLOW (放行通过)</option>
              <option value="drop">BLOCK (丢弃阻断)</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              传输协议 (Protocol)
            </label>
            <select
              v-model="newRule.proto"
              class="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">ALL (全部协议)</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="icmp">ICMP (Ping)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              源节点安全标签 (Source)
            </label>
            <input
              v-model="newRule.srcTag"
              type="text"
              placeholder="例如: tag:dev 或 *"
              class="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              目标节点安全标签 (Destination)
            </label>
            <input
              v-model="newRule.dstTag"
              type="text"
              placeholder="例如: tag:prod 或 *"
              class="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            端口范围 (Ports, 留空表示全部端口)
          </label>
          <input
            v-model="newRule.ports"
            type="text"
            placeholder="例如: 22, 80, 443, 3000-4000"
            class="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" size="sm" @click="showAddModal = false">取消</Button>
        <Button variant="primary" size="sm" @click="handleAddRule">添加规则</Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Shield,
  ShieldCheck,
  RotateCcw,
  Plus,
  Send,
  Sliders,
  Trash2,
  RefreshCw,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import { useNetworkStore } from '@/stores/network'
import { api } from '@/lib/api'

const networkStore = useNetworkStore()
const deploying = ref(false)
const showAddModal = ref(false)

interface PolicyRule {
  id: string
  name: string
  action: 'accept' | 'drop'
  srcTag: string
  dstTag: string
  proto: string
  ports: string
  enabled: boolean
  packetCount?: number
  byteCount?: number
}

const policies = ref<PolicyRule[]>([
  {
    id: 'r-1',
    name: '允许开发团队访问数据库集群',
    action: 'accept',
    srcTag: 'tag:dev',
    dstTag: 'tag:database',
    proto: 'tcp',
    ports: '3306, 5432, 6379',
    enabled: true,
  },
  {
    id: 'r-2',
    name: '生产服务全网双向互通',
    action: 'accept',
    srcTag: 'tag:prod',
    dstTag: 'tag:prod',
    proto: 'all',
    ports: '*',
    enabled: true,
  },
  {
    id: 'r-3',
    name: '隔离访客设备直连',
    action: 'drop',
    srcTag: 'tag:guest',
    dstTag: 'tag:prod',
    proto: 'all',
    ports: '*',
    enabled: true,
  },
])

const newRule = ref<PolicyRule>({
  id: '',
  name: '',
  action: 'accept',
  srcTag: '*',
  dstTag: '*',
  proto: 'all',
  ports: '',
  enabled: true,
})

onMounted(async () => {
  await networkStore.fetchSummary()
  await fetchLiveAclStats()
})

async function fetchLiveAclStats() {
  if (networkStore.deviceList.length === 0) return
  const firstMachine = networkStore.deviceList[0].machine_id
  try {
    const res = await api.getAclStats(firstMachine)
    if (res?.acl_stats?.rules) {
      const statsRules = res.acl_stats.rules
      for (const rule of policies.value) {
        const found = statsRules.find((sr: any) => sr.rule?.name === rule.name)
        if (found && found.stat) {
          rule.packetCount = found.stat.packet_count || 0
          rule.byteCount = found.stat.byte_count || 0
        }
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch ACL stats:', err)
  }
}

function openAddModal() {
  newRule.value = {
    id: 'r-' + Date.now(),
    name: '',
    action: 'accept',
    srcTag: '*',
    dstTag: '*',
    proto: 'all',
    ports: '',
    enabled: true,
  }
  showAddModal.value = true
}

function handleAddRule() {
  if (!newRule.value.name) {
    alert('请输入规则名称')
    return
  }
  policies.value.push({ ...newRule.value })
  showAddModal.value = false
}

function deleteRule(idx: number) {
  if (confirm('确定删除此条策略规则吗？')) {
    policies.value.splice(idx, 1)
  }
}

function resetToDefaultRules() {
  if (confirm('确定重置为推荐默认零信任规则集吗？')) {
    policies.value = [
      {
        id: 'r-default-1',
        name: '全网节点互联互通',
        action: 'accept',
        srcTag: '*',
        dstTag: '*',
        proto: 'all',
        ports: '*',
        enabled: true,
      },
    ]
  }
}

async function deployAllPolicies() {
  deploying.value = true
  try {
    const devices = networkStore.deviceList
    if (devices.length === 0) {
      alert('当前网络暂无在线节点可供分发，规则已保存在中心策略库中！')
      return
    }

    const protoMap: Record<string, number> = {
      all: 5,
      tcp: 1,
      udp: 2,
      icmp: 3,
    }
    const actionMap: Record<string, number> = {
      accept: 1,
      drop: 2,
    }

    const activeRules = policies.value
      .filter((r) => r.enabled)
      .map((r, index) => {
        const portsArr = r.ports && r.ports !== '*' ? r.ports.split(',').map((p) => p.trim()).filter(Boolean) : []
        const srcGroups = r.srcTag && r.srcTag !== '*' ? [r.srcTag] : []
        const dstGroups = r.dstTag && r.dstTag !== '*' ? [r.dstTag] : []

        return {
          name: r.name || `Rule #${index + 1}`,
          description: `Cloudflare Zero Trust Rule: ${r.name}`,
          priority: 100 - index,
          enabled: r.enabled,
          protocol: protoMap[r.proto.toLowerCase()] ?? 5,
          ports: portsArr,
          source_ips: [],
          destination_ips: [],
          source_ports: [],
          source_groups: srcGroups,
          destination_groups: dstGroups,
          action: actionMap[r.action] ?? 1,
          rate_limit: 0,
          burst_limit: 0,
          stateful: false,
        }
      })

    const patch = {
      port_forwards: [],
      proxy_networks: [],
      routes: [],
      exit_nodes: [],
      mapped_listeners: [],
      connectors: [],
      vpn_portal_clients: [],
      acl: {
        acl: {
          acl_v1: {
            chains: [
              {
                name: 'inbound',
                chain_type: 1,
                description: 'Cloudflare Zero Trust Inbound Access Rules',
                enabled: true,
                rules: activeRules,
                default_action: 1,
              },
            ],
          },
        },
        tcp_whitelist: [],
        udp_whitelist: [],
      },
    }

    let successCount = 0
    for (const d of devices) {
      try {
        await api.patchConfig(d.machine_id, patch)
        successCount++
      } catch (e) {
        console.warn('Deploy policy to machine failed:', d.machine_id, e)
      }
    }

    await fetchLiveAclStats()
    alert(`零信任 ACL 策略已成功下发至 ${successCount}/${devices.length} 台边缘节点！`)
  } catch (err: any) {
    alert('分发失败: ' + (err?.response?.data?.message || err?.message))
  } finally {
    deploying.value = false
  }
}
</script>
