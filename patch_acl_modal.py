import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

modal_code = """
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
"""

content = content.replace('    <!-- ==================== 右侧全屏抽屉：节点详情 ==================== -->', modal_code + '\n    <!-- ==================== 右侧全屏抽屉：节点详情 ==================== -->')

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
