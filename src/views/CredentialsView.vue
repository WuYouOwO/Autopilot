<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
          <Key class="w-3.5 h-3.5" />
          <span>ZERO TRUST SERVICE TOKENS</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          访问凭证与服务令牌 (Service Tokens)
        </h1>
        <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          为计算设备与终端签发专属非对称公私钥访问凭据。支持按角色组绑定、限制代理 CIDR、设置有效时限并支持一键即时吊销。
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Target Machine Selector -->
        <div v-if="machineOptions.length > 0" class="flex items-center gap-2">
          <span class="text-xs text-slate-500 dark:text-zinc-400">发行节点:</span>
          <select
            v-model="selectedMachineId"
            @change="fetchCredentials"
            class="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-[#262a33] bg-white dark:bg-[#191c22] text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option v-for="m in machineOptions" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.os }})
            </option>
          </select>
        </div>

        <Button variant="secondary" size="sm" :loading="loading" @click="fetchCredentials">
          <RefreshCw class="w-3.5 h-3.5 mr-1" />
          刷新
        </Button>
        <Button variant="primary" size="sm" @click="openCreateModal">
          <Plus class="w-3.5 h-3.5 mr-1" />
          签发新凭证令牌
        </Button>
      </div>
    </div>

    <!-- Cloudflare Security Notice -->
    <div class="rounded border border-orange-200 dark:border-orange-950/60 bg-orange-50/60 dark:bg-orange-950/20 p-4 text-xs leading-relaxed text-orange-950 dark:text-orange-200 flex items-start gap-3">
      <ShieldCheck class="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
      <div>
        <span class="font-bold">云原生 PKI 边缘鉴权机制：</span>
        通过 <code class="font-mono font-semibold bg-white/60 dark:bg-zinc-800 px-1 py-0.5 rounded">CredentialManageRpc</code> 签发的令牌内置独立的非对称密钥指纹。终端加入时直接与发行节点建立加密会话。一旦设备失窃或人员变动，仅需点击「吊销」，即可将其在全网剔除，无需重置网络共享密钥！
      </div>
    </div>

    <!-- Empty or Loading State -->
    <div v-if="loading && credentials.length === 0" class="py-16 text-center text-slate-400 text-xs">
      <Loader2 class="w-6 h-6 mx-auto animate-spin mb-2 text-orange-500" />
      正在检索凭证密钥库...
    </div>

    <div v-else-if="!selectedMachineId" class="py-16 text-center">
      <ServerOff class="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
      <p class="text-sm font-semibold text-slate-700 dark:text-zinc-300">暂无在线发行节点</p>
      <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1">请先在「物理设备」或「虚拟网络」中接入至少一台节点并上报心跳。</p>
    </div>

    <div v-else-if="credentials.length === 0" class="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded bg-white/50 dark:bg-zinc-900/40">
      <KeyRound class="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
      <h3 class="text-sm font-semibold text-slate-800 dark:text-zinc-200">当前节点暂未签发专属凭据</h3>
      <p class="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
        专属凭证可精细控制客户端加入后的角色组与代理网段，点击上方按钮签发。
      </p>
      <Button variant="primary" size="sm" class="mt-4" @click="openCreateModal">
        <Plus class="w-3.5 h-3.5 mr-1" />
        签发第一张令牌
      </Button>
    </div>

    <!-- CF Tokens Table -->
    <Card v-else class="border-slate-200 dark:border-[#262a33] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-[#191c22] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#262a33]">
            <tr>
              <th class="px-4 py-3 font-semibold">凭证标识 (Token ID)</th>
              <th class="px-4 py-3 font-semibold">公钥指纹 (Fingerprint)</th>
              <th class="px-4 py-3 font-semibold">关联安全组 (Groups)</th>
              <th class="px-4 py-3 font-semibold">状态</th>
              <th class="px-4 py-3 font-semibold">有效期至</th>
              <th class="px-4 py-3 font-semibold">中继模式</th>
              <th class="px-4 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#262a33] text-slate-700 dark:text-zinc-300">
            <tr v-for="cred in credentials" :key="cred.credential_id" class="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
              <!-- Token ID -->
              <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-zinc-100">
                <div class="flex items-center gap-1.5">
                  <span>{{ cred.credential_id }}</span>
                  <button
                    @click="copyText(cred.credential_id, 'Token ID')"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    title="复制 Token ID"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <!-- Fingerprint -->
              <td class="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                {{ formatFingerprint(cred.public_key_fingerprint) }}
              </td>

              <!-- Groups -->
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="grp in (cred.groups || ['*'])"
                    :key="grp"
                    class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono border border-slate-200 dark:border-zinc-700"
                  >
                    {{ grp }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3">
                <Badge :variant="isExpired(cred.expiry_unix) ? 'danger' : 'success'" size="sm" dot>
                  {{ isExpired(cred.expiry_unix) ? '已失效' : '生效中 (Active)' }}
                </Badge>
              </td>

              <!-- Expiry -->
              <td class="px-4 py-3">
                <span :class="isExpired(cred.expiry_unix) ? 'text-rose-500 font-semibold' : 'text-slate-700 dark:text-zinc-300'">
                  {{ formatTimestamp(cred.expiry_unix) }}
                </span>
                <span class="text-[10px] text-slate-400 ml-1 block">
                  {{ formatRelativeTime(cred.expiry_unix) }}
                </span>
              </td>

              <!-- Relay -->
              <td class="px-4 py-3 text-slate-600 dark:text-zinc-400">
                {{ cred.allow_relay ? '允许中继' : '禁止中继' }}
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-right">
                <Button
                  variant="danger"
                  size="sm"
                  :loading="revokingId === cred.credential_id"
                  @click="confirmRevoke(cred)"
                >
                  <Trash2 class="w-3 h-3 mr-1" />
                  吊销
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Create Modal -->
    <Dialog :open="showCreateModal" title="签发动态 PKI 服务凭据" @close="showCreateModal = false">
      <div class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            凭证标识 (Token ID, 可选自定义别名)
          </label>
          <input
            v-model="createForm.credential_id"
            type="text"
            placeholder="例如: laptop-macbook-pro 或留空系统自动生成 UUID"
            class="w-full px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            绑定安全标签 / 权限角色组 (多个用逗号隔开)
          </label>
          <input
            v-model="createForm.groupsText"
            type="text"
            placeholder="例如: tag:finance, role:developer, group:guest"
            class="w-full px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              有效期限 (TTL)
            </label>
            <select
              v-model="createForm.ttlSeconds"
              class="w-full px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option :value="3600">1 小时 (临时运维)</option>
              <option :value="86400">1 天</option>
              <option :value="604800">7 天</option>
              <option :value="2592000">30 天 (推荐)</option>
              <option :value="31536000">1 年 (长期终端)</option>
              <option :value="315360000">10 年 (永久基础架构)</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              复用模式
            </label>
            <select
              v-model="createForm.reusable"
              class="w-full px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option :value="true">允许多设备复用</option>
              <option :value="false">单次加入 (激活后作废)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            限制子网代理 CIDR (可选，留空表示不限制)
          </label>
          <input
            v-model="createForm.proxyCidrsText"
            type="text"
            placeholder="例如: 192.168.1.0/24, fd00:1::/64"
            class="w-full px-3 py-2 font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowRelay"
            v-model="createForm.allowRelay"
            class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-zinc-700"
          />
          <label for="allowRelay" class="text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
            允许此设备充当中继节点 (Allow Relay)
          </label>
        </div>

        <div v-if="createError" class="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
          {{ createError }}
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" size="sm" @click="showCreateModal = false">取消</Button>
        <Button variant="primary" size="sm" :loading="creating" @click="handleCreateCredential">立即签发</Button>
      </template>
    </Dialog>

    <!-- Issued Success Modal -->
    <Dialog :open="showIssuedModal" title="服务凭据签发成功" @close="showIssuedModal = false">
      <div class="space-y-4 text-xs">
        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            请妥善保存私钥密文！关闭窗口后，由于非对称加密机制，控制台将无法再次显示明文私钥。
          </span>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            凭证标识 ID
          </label>
          <div class="flex items-center gap-2">
            <input
              type="text"
              readonly
              :value="issuedResult.credential_id"
              class="w-full px-3 py-2 font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 select-all"
            />
            <Button variant="secondary" size="sm" @click="copyText(issuedResult.credential_id, 'Token ID')">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            凭证私钥 (Secret Key)
          </label>
          <div class="flex items-center gap-2">
            <textarea
              readonly
              rows="3"
              :value="issuedResult.credential_secret"
              class="w-full px-3 py-2 font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 select-all"
            ></textarea>
            <Button variant="secondary" size="sm" @click="copyText(issuedResult.credential_secret, '凭证私钥')">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
            EasyTier CLI 快速接入命令
          </label>
          <div class="relative">
            <pre class="p-3 text-[11px] font-mono rounded bg-slate-950 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">{{ generatedCliCommand }}</pre>
            <Button
              variant="secondary"
              size="sm"
              class="absolute top-2 right-2"
              @click="copyText(generatedCliCommand, 'CLI 命令')"
            >
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
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
      allowed_proxy_cidrs: allowed_proxy_cidrs,
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
