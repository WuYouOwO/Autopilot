<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNetworkStore } from '@/stores/network'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import api from '@/lib/api'
import {
  ShieldCheck,
  Plus,
  Users,
  Send,
  Trash2,
  Lock,
  CheckCircle2,
  ArrowRight,
  Server,
  Layers,
} from 'lucide-vue-next'

const networkStore = useNetworkStore()

interface SecurityGroup {
  id: string
  name: string
  secret: string
  description: string
  memberMachineIds: string[]
}

interface AclRuleItem {
  id: string
  name: string
  sourceGroup: string
  destGroup: string
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'Any'
  port: string
  action: 'Allow' | 'Drop'
}

// 模拟已保存的全局策略状态（可持久化到 localStorage 或后端扩展）
const STORAGE_GROUPS_KEY = 'easytier_global_groups'
const STORAGE_RULES_KEY = 'easytier_global_rules'

const securityGroups = ref<SecurityGroup[]>(
  JSON.parse(localStorage.getItem(STORAGE_GROUPS_KEY) || 'null') || [
    {
      id: 'grp-1',
      name: 'dev-team',
      secret: 'sec_dev_982f1b4c',
      description: '开发人员办公电脑与工作站',
      memberMachineIds: [],
    },
    {
      id: 'grp-2',
      name: 'prod-servers',
      secret: 'sec_prod_a771e802',
      description: '生产核心业务与数据库服务器',
      memberMachineIds: [],
    },
  ]
)

const aclRules = ref<AclRuleItem[]>(
  JSON.parse(localStorage.getItem(STORAGE_RULES_KEY) || 'null') || [
    {
      id: 'rule-1',
      name: '允许开发团队 SSH 管理生产服',
      sourceGroup: 'dev-team',
      destGroup: 'prod-servers',
      protocol: 'TCP',
      port: '22',
      action: 'Allow',
    },
    {
      id: 'rule-2',
      name: '全网禁用默认 ICMP Ping',
      sourceGroup: 'Any',
      destGroup: 'prod-servers',
      protocol: 'ICMP',
      port: '',
      action: 'Drop',
    },
  ]
)

const persistPolicies = () => {
  localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(securityGroups.value))
  localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(aclRules.value))
}

const showNewGroupDialog = ref(false)
const showNewRuleDialog = ref(false)
const syncing = ref(false)
const syncSuccess = ref(false)
const syncMessage = ref('')

const newGroupName = ref('')
const newGroupDesc = ref('')

const newRuleName = ref('')
const newRuleSrc = ref('dev-team')
const newRuleDst = ref('prod-servers')
const newRuleProto = ref<'TCP' | 'UDP' | 'ICMP' | 'Any'>('TCP')
const newRulePort = ref('80,443')
const newRuleAction = ref<'Allow' | 'Drop'>('Allow')

const createGroup = () => {
  if (!newGroupName.value) return
  const randomSecret = 'sec_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6)
  securityGroups.value.push({
    id: 'grp-' + Date.now(),
    name: newGroupName.value.trim(),
    secret: randomSecret,
    description: newGroupDesc.value.trim(),
    memberMachineIds: [],
  })
  persistPolicies()
  showNewGroupDialog.value = false
  newGroupName.value = ''
  newGroupDesc.value = ''
}

const deleteGroup = (id: string) => {
  securityGroups.value = securityGroups.value.filter((g) => g.id !== id)
  persistPolicies()
}

const createRule = () => {
  if (!newRuleName.value) return
  aclRules.value.push({
    id: 'rule-' + Date.now(),
    name: newRuleName.value,
    sourceGroup: newRuleSrc.value,
    destGroup: newRuleDst.value,
    protocol: newRuleProto.value,
    port: newRulePort.value,
    action: newRuleAction.value,
  })
  persistPolicies()
  showNewRuleDialog.value = false
  newRuleName.value = ''
}

const deleteRule = (id: string) => {
  aclRules.value = aclRules.value.filter((r) => r.id !== id)
  persistPolicies()
}

// 切换某台机器归属于某个安全组
const toggleNodeInGroup = (group: SecurityGroup, machineId: string) => {
  const idx = group.memberMachineIds.indexOf(machineId)
  if (idx >= 0) {
    group.memberMachineIds.splice(idx, 1)
  } else {
    group.memberMachineIds.push(machineId)
  }
  persistPolicies()
}

// 【核弹功能】一键编译并全网同步（彻底消灭一台一台机器复制粘贴）
const syncAllAclToNodes = async () => {
  syncing.value = true
  syncSuccess.value = false
  syncMessage.value = ''

  try {
    const nodes = networkStore.currentNetwork?.nodes || []
    if (nodes.length === 0) {
      throw new Error('当前网络中无可用在线节点')
    }

    // 针对网络中的每一台机器，编译其对应的专属 ACL 配置并同步
    let updatedCount = 0
    await Promise.all(
      nodes.map(async (node) => {
        try {
          const cfg = await api.getNetworkConfig(node.machineId, node.instanceId)

          // 编译群组声明 (declares) 与成员关系 (members)
          const declares = securityGroups.value.map((g) => ({
            group_name: g.name,
            group_secret: g.secret,
          }))

          const memberGroups = securityGroups.value
            .filter((g) => g.memberMachineIds.includes(node.machineId))
            .map((g) => g.name)

          // 编译入站链规则 (Inbound)
          const inboundRules = aclRules.value.map((r, rIdx) => ({
            name: r.name,
            description: `Auto-compiled by Policy Center`,
            priority: 100 - rIdx,
            enabled: true,
            protocol: r.protocol === 'TCP' ? 1 : r.protocol === 'UDP' ? 2 : r.protocol === 'ICMP' ? 3 : 5,
            ports: r.port ? r.port.split(',').map((p) => p.trim()) : [],
            action: r.action === 'Allow' ? 1 : 2,
            source_groups: r.sourceGroup !== 'Any' ? [r.sourceGroup] : [],
            destination_groups: r.destGroup !== 'Any' ? [r.destGroup] : [],
          }))

          cfg.acl = {
            acl_v1: {
              group: {
                declares,
                members: memberGroups,
              },
              chains: [
                {
                  name: 'Inbound',
                  chain_type: 1, // Inbound
                  enabled: true,
                  default_action: 1, // Allow
                  rules: inboundRules,
                },
              ],
            },
          }

          // 提交并应用到节点
          await api.saveNetworkConfig(node.machineId, node.instanceId, cfg)
          await api.runNetworkInstance(node.machineId, cfg, true)
          updatedCount++
        } catch (e) {
          console.error(`Failed to dispatch ACL to node ${node.hostname}:`, e)
        }
      })
    )

    syncSuccess.value = true
    syncMessage.value = `全网策略同步完成！已成功为 ${updatedCount} 台节点编译并推送最新零信任访问控制策略。`
    setTimeout(() => {
      syncSuccess.value = false
    }, 4500)
  } catch (err: any) {
    alert('全网同步失败: ' + err.message)
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 顶栏与核心行动 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <span>零信任安全策略中心 (Policy Center)</span>
          <Badge variant="online">中央编排</Badge>
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          在全局统一调度安全组与访问控制规则，告别在每台设备上手动重复复制粘贴密钥与规则的低效操作
        </p>
      </div>

      <!-- 一键全网下发按钮 -->
      <Button
        variant="primary"
        size="md"
        :loading="syncing"
        @click="syncAllAclToNodes"
        class="shadow-indigo-600/30 shadow-md"
      >
        <Send class="w-4 h-4" />
        <span>一键编译并全网同步</span>
      </Button>
    </div>

    <!-- 成功提示通知条 -->
    <div
      v-if="syncSuccess"
      class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in duration-200"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span class="font-medium">{{ syncMessage }}</span>
    </div>

    <!-- 区域 1：全局安全组字典 (Security Groups) -->
    <Card :padding="true">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users class="w-4 h-4 text-indigo-500" />
              <span>全局安全组字典 (Tags / Groups)</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              节点只有在持有相同群组密码时才能相互认证身份，中央平台已自动为每个组生成防伪密匙
            </p>
          </div>
          <Button variant="secondary" size="sm" @click="showNewGroupDialog = true">
            <Plus class="w-3.5 h-3.5" />
            <span>创建新安全组</span>
          </Button>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="grp in securityGroups"
          :key="grp.id"
          class="p-4 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-900 dark:text-zinc-100 font-mono">@{{ grp.name }}</span>
                <span class="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {{ grp.memberMachineIds.length }} 成员
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">{{ grp.description || '无附加描述' }}</p>
            </div>
            <button
              type="button"
              @click="deleteGroup(grp.id)"
              class="text-slate-400 hover:text-rose-600 transition-colors"
              title="删除该安全组"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <!-- 自动生成的群组密匙预览 -->
          <div class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
            <Lock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="text-slate-400 text-[10px]">加密密匙:</span>
            <span class="truncate font-semibold">{{ grp.secret }}</span>
          </div>

          <!-- 勾选哪些在线节点归入该安全组 -->
          <div>
            <div class="text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1.5">归属节点分配:</div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="node in networkStore.currentNetwork?.nodes || []"
                :key="node.machineId"
                type="button"
                @click="toggleNodeInGroup(grp, node.machineId)"
                :class="[
                  'px-2 py-1 rounded-md text-xs font-mono flex items-center gap-1 transition-all',
                  grp.memberMachineIds.includes(node.machineId)
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                ]"
              >
                <span>{{ node.hostname }}</span>
                <span v-if="grp.memberMachineIds.includes(node.machineId)" class="text-[10px]">✓</span>
              </button>
              <span v-if="!(networkStore.currentNetwork?.nodes.length)" class="text-[11px] text-slate-400 italic">
                暂无在线节点可分配
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- 区域 2：访问控制规则矩阵 (Access Control Rules) -->
    <Card :padding="true">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 text-emerald-500" />
              <span>声明式访问控制规则 (ACL Rules)</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              基于源组和目的组的零信任权限声明，点击【一键同步】即可自动编译为节点的有状态防火墙链
            </p>
          </div>
          <Button variant="secondary" size="sm" @click="showNewRuleDialog = true">
            <Plus class="w-3.5 h-3.5" />
            <span>添加访问策略</span>
          </Button>
        </div>
      </template>

      <div class="divide-y divide-slate-100 dark:divide-zinc-800/80">
        <div
          v-for="(rule, idx) in aclRules"
          :key="rule.id"
          class="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 font-mono text-[11px] flex items-center justify-center font-bold text-slate-500">
              #{{ idx + 1 }}
            </span>
            <div>
              <div class="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{{ rule.name }}</div>
              <div class="flex items-center gap-2 mt-1 font-mono text-xs text-slate-500 dark:text-zinc-400">
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300">
                  @{{ rule.sourceGroup }}
                </span>
                <ArrowRight class="w-3.5 h-3.5 text-slate-400" />
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300">
                  @{{ rule.destGroup }}
                </span>
                <span class="text-slate-300 dark:text-zinc-600">|</span>
                <span>{{ rule.protocol }} {{ rule.port ? `:${rule.port}` : '' }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <Badge :variant="rule.action === 'Allow' ? 'online' : 'offline'" :dot="false">
              {{ rule.action === 'Allow' ? '允许 (ALLOW)' : '静默丢弃 (DROP)' }}
            </Badge>
            <button
              type="button"
              @click="deleteRule(rule.id)"
              class="text-slate-400 hover:text-rose-600 transition-colors p-1"
              title="删除此规则"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>

    <!-- 弹窗：创建新安全组 -->
    <Dialog
      :open="showNewGroupDialog"
      title="创建安全组 (Security Group)"
      description="系统将自动为该组派发密码学群组密钥"
      @close="showNewGroupDialog = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">安全组名称</label>
          <input
            v-model="newGroupName"
            type="text"
            placeholder="例如: database-cluster"
            class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950 font-mono"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">用途描述</label>
          <input
            v-model="newGroupDesc"
            type="text"
            placeholder="例如: 生产核心 MySQL/Redis 节点"
            class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950"
          />
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" size="sm" @click="showNewGroupDialog = false">取消</Button>
        <Button variant="primary" size="sm" @click="createGroup">创建安全组</Button>
      </template>
    </Dialog>

    <!-- 弹窗：创建访问控制策略 -->
    <Dialog
      :open="showNewRuleDialog"
      title="添加零信任访问策略"
      description="定义哪些安全组可以相互发起特定协议或端口的通信"
      @close="showNewRuleDialog = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">策略名称</label>
          <input
            v-model="newRuleName"
            type="text"
            placeholder="例如: 允许监控节点采集指标"
            class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">源安全组 (Source)</label>
            <select
              v-model="newRuleSrc"
              class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950"
            >
              <option value="Any">全网任意节点 (Any)</option>
              <option v-for="g in securityGroups" :key="g.id" :value="g.name">@{{ g.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">目标安全组 (Dest)</label>
            <select
              v-model="newRuleDst"
              class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950"
            >
              <option value="Any">全网任意节点 (Any)</option>
              <option v-for="g in securityGroups" :key="g.id" :value="g.name">@{{ g.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">协议</label>
            <select
              v-model="newRuleProto"
              class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP (Ping)</option>
              <option value="Any">任意协议 (Any)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">端口范围</label>
            <input
              v-model="newRulePort"
              type="text"
              placeholder="例如: 22 或 80,443"
              class="block w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-950 font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">行为</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 text-xs cursor-pointer">
              <input type="radio" v-model="newRuleAction" value="Allow" class="text-indigo-600" />
              <span>放行 (Allow)</span>
            </label>
            <label class="flex items-center gap-2 text-xs cursor-pointer">
              <input type="radio" v-model="newRuleAction" value="Drop" class="text-indigo-600" />
              <span>静默拦截 (Drop)</span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showNewRuleDialog = false">取消</Button>
        <Button variant="primary" size="sm" @click="createRule">确认添加</Button>
      </template>
    </Dialog>
  </div>
</template>
