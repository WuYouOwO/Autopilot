import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Clear Logs and STUN data
content = content.replace(
    """const logsList = ref<LogEntry[]>([
  { id: 1, level: 'info', text: '[INFO] EasyTier Core v2.2.0 initialized on network.' },
  { id: 2, level: 'stun', text: '[STUN] Performing UDP hole punching with stun.easytier.top:3478 -> NAT Type: Full Cone.' },
  { id: 3, level: 'peer', text: '[PEER] Handshake completed with hk-gateway-edge (203.0.113.195).' },
  { id: 4, level: 'route', text: '[ROUTE] Proxy route 192.168.10.0/24 advertised by hk-gateway-edge -> Accepted.' }
])""",
    """const logsList = ref<LogEntry[]>([])"""
)

content = content.replace(
    """const stunServers = ref<StunServer[]>([
  { id: '1', name: '官方默认 STUN 探测点', host: 'stun.easytier.top:3478', latency: 18, type: 'Full Cone NAT' },
  { id: '2', name: '腾讯云公共 STUN', host: 'stun.qq.com:3478', latency: 12, type: 'Full Cone NAT' },
  { id: '3', name: 'Cloudflare 国际 STUN', host: 'stun.cloudflare.com:3478', latency: 45, type: 'Symmetric NAT' }
])""",
    """const stunServers = ref<StunServer[]>([])"""
)


all_modals = """
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
"""

content = content.replace('  </div>\n</template>', all_modals + '\n  </div>\n</template>')

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
