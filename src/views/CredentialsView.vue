<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Key class="w-6 h-6 text-indigo-500" />
          PKI 凭证与访问令牌
        </h1>
        <p class="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          基于公私钥对与 ACL 标签的安全访问凭证管理。无需共享全局网络明文密码，支持按角色签发、有效期限制与一键即时吊销。
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Target Machine Selector -->
        <div v-if="machineOptions.length > 0" class="flex items-center gap-2">
          <span class="text-xs text-slate-500 dark:text-zinc-400">发行节点:</span>
          <select
            v-model="selectedMachineId"
            @change="fetchCredentials"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="m in machineOptions" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.os }})
            </option>
          </select>
        </div>

        <Button variant="secondary" size="sm" :loading="loading" @click="fetchCredentials">
          <RefreshCw class="w-4 h-4 mr-1.5" />
          刷新
        </Button>

        <Button variant="primary" size="sm" @click="openCreateModal">
          <Plus class="w-4 h-4 mr-1.5" />
          签发新凭证
        </Button>
      </div>
    </div>

    <!-- Info banner -->
    <div class="rounded-xl border border-indigo-200/60 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 text-xs leading-relaxed text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
      <ShieldCheck class="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
      <div>
        <span class="font-semibold">零信任动态凭据机制 (Dynamic PKI Peers)：</span>
        签发凭证会为加入节点生成独立的私钥与指纹，并在发行节点注册公钥。凭证自动绑定预设的 ACL 标签与子网代理白名单。若某一终端设备遗失或被盗，仅需在下方列表点击「吊销」，即可将其永久踢出虚拟网络，无需重置全网密码！
      </div>
    </div>

    <!-- Credentials Table / Cards -->
    <div v-if="loading && credentials.length === 0" class="py-16 text-center text-slate-400 dark:text-zinc-500 text-sm">
      <Loader2 class="w-7 h-7 mx-auto animate-spin mb-3 text-indigo-500" />
      正在检索网络凭证数据库...
    </div>

    <div v-else-if="!selectedMachineId" class="py-16 text-center">
      <ServerOff class="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
      <p class="text-sm font-medium text-slate-700 dark:text-zinc-300">暂无在线节点</p>
      <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">请先在「网络互联」或「物理设备」中连接至少一台 EasyTier 节点。</p>
    </div>

    <div v-else-if="credentials.length === 0" class="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50">
      <KeyRound class="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
      <h3 class="text-sm font-semibold text-slate-700 dark:text-zinc-200">当前节点暂未签发专属凭据</h3>
      <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
        使用专属凭证可以精确控制客户端接入后的访问权限与代理行为，点击上方按钮立即签发。
      </p>
      <Button variant="primary" size="sm" class="mt-4" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1.5" />
        签发第一张凭证
      </Button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="cred in credentials"
        :key="cred.credential_id"
        class="border border-slate-200 dark:border-zinc-800 hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div class="p-4 space-y-3">
          <!-- Top Row: ID & Status -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                  {{ cred.credential_id }}
                </span>
                <button
                  @click="copyText(cred.credential_id, '凭证 ID')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                  title="复制 ID"
                >
                  <Copy class="w-3 h-3" />
                </button>
              </div>
              <div class="text-[11px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5 truncate" :title="cred.public_key_fingerprint">
                指纹: {{ formatFingerprint(cred.public_key_fingerprint) }}
              </div>
            </div>

            <Badge :variant="isExpired(cred.expiry_unix) ? 'danger' : 'success'" size="sm">
              {{ isExpired(cred.expiry_unix) ? '已过期' : '生效中' }}
            </Badge>
          </div>

          <!-- Groups / Tags -->
          <div>
            <div class="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">绑定安全标签 (Groups):</div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="grp in (cred.groups || ['*'])"
                :key="grp"
                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
              >
                {{ grp }}
              </span>
            </div>
          </div>

          <!-- Details & Rules -->
          <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">中继权限</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300">
                {{ cred.allow_relay ? '允许中继转发' : '禁止中继' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">复用模式</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300">
                {{ cred.reusable !== false ? '多设备复用' : '单次使用' }}
              </span>
            </div>
            <div class="col-span-2">
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">有效期至</span>
              <span class="font-medium text-slate-700 dark:text-zinc-300" :class="{ 'text-rose-500': isExpired(cred.expiry_unix) }">
                {{ formatTimestamp(cred.expiry_unix) }}
                <span class="text-[10px] text-slate-400 font-normal ml-1">({{ formatRelativeTime(cred.expiry_unix) }})</span>
              </span>
            </div>
            <div v-if="cred.allowed_proxy_cidrs && cred.allowed_proxy_cidrs.length" class="col-span-2">
              <span class="text-slate-400 dark:text-zinc-500 block text-[10px]">允许代理网段</span>
              <span class="font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                {{ cred.allowed_proxy_cidrs.join(', ') }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex justify-end">
            <Button
              variant="danger"
              size="sm"
              :loading="revokingId === cred.credential_id"
              @click="confirmRevoke(cred)"
            >
              <Trash2 class="w-3.5 h-3.5 mr-1" />
              吊销凭证
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Create Credential Modal -->
    <Dialog :open="showCreateModal" title="签发动态 PKI 访问凭证" @close="showCreateModal = false">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            凭证标识 ID (可选自定义别名)
          </label>
          <input
            v-model="createForm.credential_id"
            type="text"
            placeholder="例如: laptop-macbook-pro 或留空随机生成"
            class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            绑定安全标签 / 角色组 (多个用逗号隔开)
          </label>
          <input
            v-model="createForm.groupsText"
            type="text"
            placeholder="例如: tag:finance, role:developer, group:guest"
            class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span class="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
            将直接与「零信任策略」中的安全标签体系配合，用于精确匹配放行/阻断规则。
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              有效期限 (TTL)
            </label>
            <select
              v-model="createForm.ttlSeconds"
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option :value="3600">1 小时 (临时运维)</option>
              <option :value="86400">1 天</option>
              <option :value="604800">7 天</option>
              <option :value="2592000">30 天 (推荐测试)</option>
              <option :value="31536000">1 年 (长期终端)</option>
              <option :value="315360000">10 年 (永久基础设施)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              复用模式
            </label>
            <select
              v-model="createForm.reusable"
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option :value="true">允许多设备复用</option>
              <option :value="false">单次加入 (激活后失效)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            限制子网代理 CIDR (可选，多个逗号隔开)
          </label>
          <input
            v-model="createForm.proxyCidrsText"
            type="text"
            placeholder="例如: 192.168.1.0/24, fd00:1::/64 (留空表示允许全部)"
            class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowRelay"
            v-model="createForm.allowRelay"
            class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-zinc-700"
          />
          <label for="allowRelay" class="text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
            允许此设备充当 P2P 中继节点 (Allow Relay)
          </label>
        </div>

        <div v-if="createError" class="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
          {{ createError }}
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" size="sm" @click="showCreateModal = false">取消</Button>
        <Button variant="primary" size="sm" :loading="creating" @click="handleCreateCredential">立即签发</Button>
      </template>
    </Dialog>

    <!-- Credential Issued Success Modal -->
    <Dialog :open="showIssuedModal" title="凭证签发成功" @close="showIssuedModal = false">
      <div class="space-y-4">
        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            请务必立即复制并安全保存下方的私钥密文字符串！出于非对称密钥安全机制，密文在关闭窗口后将无法再次查看。
          </span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            凭证标识 ID
          </label>
          <div class="flex items-center gap-2">
            <input
              type="text"
              readonly
              :value="issuedResult.credential_id"
              class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 select-all"
            />
            <Button variant="secondary" size="sm" @click="copyText(issuedResult.credential_id, '凭据 ID')">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            凭证密钥 (Secret Key)
          </label>
          <div class="flex items-center gap-2">
            <textarea
              readonly
              rows="3"
              :value="issuedResult.credential_secret"
              class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 select-all"
            ></textarea>
            <Button variant="secondary" size="sm" @click="copyText(issuedResult.credential_secret, '凭证私钥')">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            EasyTier 客户端 CLI 一键接入命令
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded-lg bg-slate-900 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">{{ generatedCliCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(generatedCliCommand, 'CLI 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制命令
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="primary" size="sm" @click="showIssuedModal = false">我已妥善保存</Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Key,
  KeyRound,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  ShieldCheck,
  ServerOff,
  AlertTriangle,
  Loader2,
} from 'lucide-vue-next'
import Button from '@/components/common/Button.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import Dialog from '@/components/common/Dialog.vue'
import { api } from '@/lib/api'
import { useNetworkStore } from '@/stores/network'

const networkStore = useNetworkStore()
const loading = ref(false)
const credentials = ref<any[]>([])
const selectedMachineId = ref('')
const revokingId = ref<string | null>(null)

const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref({
  credential_id: '',
  groupsText: '',
  ttlSeconds: 2592000,
  reusable: true,
  proxyCidrsText: '',
  allowRelay: true,
})

const showIssuedModal = ref(false)
const issuedResult = ref({
  credential_id: '',
  credential_secret: '',
  expiry_unix: 0,
})

const machineOptions = computed(() => {
  return networkStore.deviceList.map((m) => ({
    id: m.machine_id,
    name: m.hostname || m.machine_id.slice(0, 8),
    os: m.os_name || 'Linux',
  }))
})

const generatedCliCommand = computed(() => {
  const secret = issuedResult.value.credential_secret || '<CREDENTIAL_SECRET>'
  return `easytier-core --network-secret "${secret}"`
})

onMounted(async () => {
  await networkStore.fetchSummary()
  if (networkStore.deviceList.length > 0 && !selectedMachineId.value) {
    selectedMachineId.value = networkStore.deviceList[0].machine_id
  }
  await fetchCredentials()
})

async function fetchCredentials() {
  if (!selectedMachineId.value) return
  loading.value = true
  try {
    const res = await api.listCredentials(selectedMachineId.value)
    credentials.value = res.credentials || []
  } catch (err: any) {
    console.error('Failed to list credentials:', err)
    credentials.value = []
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  createError.value = ''
  createForm.value = {
    credential_id: '',
    groupsText: '',
    ttlSeconds: 2592000,
    reusable: true,
    proxyCidrsText: '',
    allowRelay: true,
  }
  showCreateModal.value = true
}

async function handleCreateCredential() {
  if (!selectedMachineId.value) return
  creating.value = true
  createError.value = ''

  const groups = createForm.value.groupsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const allowed_proxy_cidrs = createForm.value.proxyCidrsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  try {
    const res = await api.generateCredential(selectedMachineId.value, {
      credential_id: createForm.value.credential_id || undefined,
      groups: groups.length > 0 ? groups : undefined,
      allowed_proxy_cidrs: allowed_proxy_cidrs.length > 0 ? allowed_proxy_cidrs : undefined,
      ttl_seconds: Number(createForm.value.ttlSeconds),
      reusable: createForm.value.reusable,
      allow_relay: createForm.value.allowRelay,
    })

    issuedResult.value = res
    showCreateModal.value = false
    showIssuedModal.value = true
    await fetchCredentials()
  } catch (err: any) {
    createError.value = err?.response?.data?.message || err?.message || '签发凭证失败'
  } finally {
    creating.value = false
  }
}

async function confirmRevoke(cred: any) {
  if (!selectedMachineId.value) return
  if (!confirm(`确定要立即吊销凭证 "${cred.credential_id}" 吗？该凭证的所有关联节点将立即断开连接。`)) {
    return
  }

  revokingId.value = cred.credential_id
  try {
    await api.revokeCredential(selectedMachineId.value, cred.credential_id)
    await fetchCredentials()
  } catch (err: any) {
    alert('吊销失败: ' + (err?.response?.data?.message || err?.message))
  } finally {
    revokingId.value = null
  }
}

function isExpired(expiryUnix: number): boolean {
  if (!expiryUnix) return false
  return Date.now() / 1000 > expiryUnix
}

function formatTimestamp(unix: number): string {
  if (!unix) return '永久有效'
  const date = new Date(unix * 1000)
  return date.toLocaleString()
}

function formatRelativeTime(unix: number): string {
  if (!unix) return '永久'
  const diffSec = Math.floor(unix - Date.now() / 1000)
  if (diffSec <= 0) return '已过期'
  const days = Math.floor(diffSec / 86400)
  if (days > 0) return `剩余 ${days} 天`
  const hours = Math.floor(diffSec / 3600)
  if (hours > 0) return `剩余 ${hours} 小时`
  return `剩余 ${Math.floor(diffSec / 60)} 分钟`
}

function formatFingerprint(fp: string): string {
  if (!fp) return '-'
  return fp.length > 20 ? fp.slice(0, 10) + '...' + fp.slice(-8) : fp
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert(`已复制 ${label} 到剪贴板`)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    alert(`已复制 ${label} 到剪贴板`)
  }
}
</script>
