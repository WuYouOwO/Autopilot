import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject States
logic_injection = """
// --- 运行日志管理 ---
interface LogEntry { id: number, level: 'info' | 'stun' | 'peer' | 'route' | 'error', text: string }
const logsList = ref<LogEntry[]>([
  { id: 1, level: 'info', text: '[INFO] EasyTier Core v2.2.0 initialized on network.' },
  { id: 2, level: 'stun', text: '[STUN] Performing UDP hole punching with stun.easytier.top:3478 -> NAT Type: Full Cone.' },
  { id: 3, level: 'peer', text: '[PEER] Handshake completed with hk-gateway-edge (203.0.113.195).' },
  { id: 4, level: 'route', text: '[ROUTE] Proxy route 192.168.10.0/24 advertised by hk-gateway-edge -> Accepted.' }
])
const clearLogs = () => {
  logsList.value = []
  showToast('已清空实时日志视图')
}

// --- STUN 探测管理 ---
interface StunServer { id: string, name: string, host: string, latency: number | string, type: string }
const stunServers = ref<StunServer[]>([
  { id: '1', name: '官方默认 STUN 探测点', host: 'stun.easytier.top:3478', latency: 18, type: 'Full Cone NAT' },
  { id: '2', name: '腾讯云公共 STUN', host: 'stun.qq.com:3478', latency: 12, type: 'Full Cone NAT' },
  { id: '3', name: 'Cloudflare 国际 STUN', host: 'stun.cloudflare.com:3478', latency: 45, type: 'Symmetric NAT' }
])
const isRefreshingStun = ref(false)
const refreshStun = () => {
  isRefreshingStun.value = true
  showToast('正在探测 STUN 延迟与 NAT 类型...')
  setTimeout(() => {
    stunServers.value.forEach(s => {
      s.latency = Math.floor(Math.random() * 40) + 10
    })
    isRefreshingStun.value = false
    showToast('STUN 探测握手已更新')
  }, 800)
}

// --- ACL 测试管理 ---
const showAddTestModal = ref(false)
const newTestForm = ref({ name: '', src: '', dst: '' })
const addTestCase = () => {
  if (!newTestForm.value.name || !newTestForm.value.src || !newTestForm.value.dst) {
    showToast('请完整填写测试用例')
    return
  }
  aclTests.value.push({
    id: `test-${Date.now()}`,
    name: newTestForm.value.name,
    src: newTestForm.value.src,
    dst: newTestForm.value.dst,
    action: '未知',
    status: '未运行',
    latency: '-',
    ruleMatched: '-'
  })
  showAddTestModal.value = false
  newTestForm.value = { name: '', src: '', dst: '' }
  showToast('新测试用例已添加')
}
const deleteTestCase = (id: string) => {
  aclTests.value = aclTests.value.filter(t => t.id !== id)
  showToast('测试用例已删除')
}

const saveSettings = () => {
  showToast('网络全局设置已安全保存并下发！')
}
"""

content = content.replace('// -------------------- 数据加载与异常重试机制 --------------------', logic_injection + '\n// -------------------- 数据加载与异常重试机制 --------------------')


# 2. Patch ACL Tests Template
content = content.replace(
    '''<button
              @click="showToast('添加新的 ACL 访问控制测试用例')"''',
    '''<button
              @click="showAddTestModal = true"'''
)

# Replace table row actions to include delete button for tests
test_tr_old = """<td class="py-3 px-4 font-mono text-gray-500 dark:text-gray-400 max-w-[150px] truncate" :title="test.ruleMatched">{{ test.ruleMatched }}</td>
                <td class="py-3 px-4 text-right">
                  <button @click="showToast(`测试用例 ${test.id} 单独执行验证通过`)" class="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded transition-colors" title="单步运行">
                    <Play class="w-3.5 h-3.5" />
                  </button>
                </td>"""

test_tr_new = """<td class="py-3 px-4 font-mono text-gray-500 dark:text-gray-400 max-w-[150px] truncate" :title="test.ruleMatched">{{ test.ruleMatched }}</td>
                <td class="py-3 px-4 text-right flex justify-end gap-1.5">
                  <button @click="showToast(`测试用例 ${test.id} 单独执行验证通过`)" class="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded transition-colors cursor-pointer" title="单步运行">
                    <Play class="w-3.5 h-3.5" />
                  </button>
                  <button @click="deleteTestCase(test.id)" class="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded transition-colors cursor-pointer" title="删除用例">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </td>"""

content = content.replace(test_tr_old, test_tr_new)


# 3. Patch STUN View
stun_view_old = """<button @click="showToast('刷新 STUN 探测握手')" type="button" class="px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
            重新探测 STUN 延迟
          </button>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] space-y-1">
            <span class="text-xs text-gray-400">官方默认 STUN 探测点</span>
            <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">stun.easytier.top:3478</div>
            <span class="text-xs text-emerald-600">正常握手 · 18ms 延迟</span>
          </div>
          <div class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] space-y-1">
            <span class="text-xs text-gray-400">腾讯云公共 STUN</span>
            <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">stun.qq.com:3478</div>
            <span class="text-xs text-emerald-600">正常握手 · 12ms 延迟</span>
          </div>
          <div class="p-4 rounded-xl border border-gray-200 dark:border-[#2f2e2e] bg-white dark:bg-[#252424] space-y-1">
            <span class="text-xs text-gray-400">Cloudflare 国际 STUN</span>
            <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">stun.cloudflare.com:3478</div>
            <span class="text-xs text-emerald-600">正常握手 · 45ms 延迟</span>
          </div>
        </div>"""

stun_view_new = """<button @click="refreshStun" :disabled="isRefreshingStun" type="button" class="inline-flex items-center gap-2 px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50">
            <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshingStun }" />
            重新探测 STUN 延迟
          </button>
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
        </div>"""

content = content.replace(stun_view_old, stun_view_new)


# 4. Patch Logs View
logs_view_old = """<button @click="showToast('已清空实时日志视图')" type="button" class="px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs">
            清空视图
          </button>
        </header>

        <div class="p-4 rounded-xl bg-gray-900 text-gray-300 font-mono text-xs space-y-2 border border-gray-800 h-96 overflow-y-auto">
          <div class="text-emerald-400">[INFO] EasyTier Core v2.2.0 initialized on network '{{ currentNetwork.name }}'.</div>
          <div class="text-blue-400">[STUN] Performing UDP hole punching with stun.easytier.top:3478 -> NAT Type: Full Cone.</div>
          <div class="text-gray-400">[PEER] Handshake completed with 'hk-gateway-edge' (203.0.113.195) -> Latency: 14ms (Direct WireGuard P2P).</div>
          <div class="text-gray-400">[ROUTE] Proxy route 192.168.10.0/24 advertised by hk-gateway-edge -> Accepted.</div>
          <div class="text-amber-400">[RELAY] Direct STUN attempt with 'office-nas-storage' timed out (Symmetric NAT) -> Switched to Relay mode.</div>
          <div class="text-emerald-400">[PING] Periodic keepalive ok: 4 peers connected, loss rate: 0.00%.</div>
        </div>"""

logs_view_new = """<button @click="clearLogs" type="button" class="px-3.5 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs transition-colors cursor-pointer">
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
        </div>"""

content = content.replace(logs_view_old, logs_view_new)

# 5. Patch Settings
content = content.replace(
    '''<button @click="showToast('已成功保存网络全局设置！')"''',
    '''<button @click="saveSettings"'''
)


# 6. Add "Add Test Case Modal" to the end of template
modal_ui = """
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
"""

content = content.replace('    <!-- ==================== 添加子网路由模态框 ==================== -->', modal_ui + '\n    <!-- ==================== 添加子网路由模态框 ==================== -->')

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
