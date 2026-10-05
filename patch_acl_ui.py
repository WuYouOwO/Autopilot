import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

policies_ui = """
      <!-- -------------------- 视图 X: 访问控制策略 (ACL) 面板 -------------------- -->
      <main v-else-if="activeSubNav === 'policies'" class="w-full mx-auto pb-20 pt-6 px-4 sm:px-8 lg:px-10 max-w-6xl space-y-6">
        <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#2f2e2e]">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                访问控制 (ACL) 策略
              </h1>
            </div>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              配置细粒度的 P2P 网络访问控制规则。支持按 Tag、IP、子网 CIDR 进行流量放行或阻断。
            </p>
          </div>
          <button
            @click="editingPolicy = { id: '', name: '', src: '', dst: '', action: 'allow', priority: 100, enabled: true }; showPolicyModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95 whitespace-nowrap"
          >
            <Plus class="w-4 h-4" />
            新建策略规则
          </button>
        </header>

        <!-- 冲突检测警告面板 -->
        <div v-if="aclConflicts.length > 0" class="p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-xl">
          <div class="flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h3 class="text-sm font-bold text-orange-800 dark:text-orange-300">检测到策略规则冲突 ({{ aclConflicts.length }} 项)</h3>
              <ul class="mt-2 space-y-1">
                <li v-for="(conflict, idx) in aclConflicts" :key="idx" class="text-xs text-orange-700 dark:text-orange-400 list-disc ml-4">
                  {{ conflict.reason }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 规则列表 -->
        <div class="bg-white dark:bg-[#252424] rounded-xl border border-gray-200 dark:border-[#333232] shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50/50 dark:bg-[#1f1e1e] border-b border-gray-200 dark:border-[#333232]">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">优先级</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">规则名称</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">匹配源 (Source)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">目标 (Destination)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">动作 (Action)</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">状态</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-[#333232]">
                <tr v-for="policy in aclPolicies" :key="policy.id" class="hover:bg-gray-50/50 dark:hover:bg-[#2a2929] transition-colors">
                  <td class="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">{{ policy.priority }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{{ policy.name }}</td>
                  <td class="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 rounded">{{ policy.src }}</td>
                  <td class="px-4 py-3 text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10 rounded">{{ policy.dst }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span :class="['px-2 py-1 rounded text-xs font-medium', policy.action === 'allow' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400']">
                      {{ policy.action === 'allow' ? '放行 (Allow)' : '阻断 (Deny)' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button @click="policy.enabled = !policy.enabled" :class="['relative inline-flex h-5 w-9 items-center rounded-full transition-colors', policy.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600']">
                      <span :class="['inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', policy.enabled ? 'translate-x-4' : 'translate-x-1']"></span>
                    </button>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button @click="editingPolicy = {...policy}; showPolicyModal = true" class="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2">
                      <Sliders class="w-4 h-4" />
                    </button>
                    <button @click="deletePolicy(policy.id)" class="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <X class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr v-if="aclPolicies.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    暂无访问控制策略，网络默认为全互通状态
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

"""

# Insert right before the tests main tag
content = content.replace('      <!-- -------------------- 视图 3: ACL 规则测试面板 -------------------- -->', policies_ui + '\n      <!-- -------------------- 视图 3: ACL 规则测试面板 -------------------- -->')

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
