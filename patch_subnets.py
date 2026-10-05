import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert states and computed props
subnet_logic = """
// --- 子网路由 (Proxy CIDR) 逻辑 ---
interface SubnetRoute {
  id: string
  cidr: string
  nodeId: string
  gatewayName: string
  gatewayIp: string
  status: string
  metric: number
}

const subnetRoutes = computed<SubnetRoute[]>(() => {
  const routes: SubnetRoute[] = []
  nodes.value.forEach(node => {
    if (Array.isArray(node.subnets)) {
      node.subnets.forEach((cidr: string, idx: number) => {
        routes.push({
          id: `${node.id}-${idx}`,
          cidr: cidr,
          nodeId: node.id,
          gatewayName: node.hostname,
          gatewayIp: node.ipv4 || node.publicIp || 'Unknown',
          status: node.isSubnetApproved !== false ? '已放行 (Approved)' : '待审批 (Pending)',
          metric: node.latencyMs < 50 ? 1 : 2
        })
      })
    }
  })
  return routes
})

const showAddSubnetModal = ref(false)
const newSubnetForm = ref({ cidr: '', nodeId: '' })

const addSubnetRoute = () => {
  if (!newSubnetForm.value.cidr || !newSubnetForm.value.nodeId) {
    showToast('请填写子网 CIDR 并选择网关节点')
    return
  }
  const targetNode = nodes.value.find(n => n.id === newSubnetForm.value.nodeId)
  if (targetNode) {
    if (!Array.isArray(targetNode.subnets)) targetNode.subnets = []
    if (targetNode.subnets.includes(newSubnetForm.value.cidr)) {
      showToast('该子网路由已存在于选定节点中')
      return
    }
    targetNode.subnets.push(newSubnetForm.value.cidr)
    showToast(`已成功为节点 ${targetNode.hostname} 添加子网路由 ${newSubnetForm.value.cidr}`)
    showAddSubnetModal.value = false
    newSubnetForm.value.cidr = ''
    newSubnetForm.value.nodeId = ''
  } else {
    showToast('未找到选定的网关节点')
  }
}
"""

content = content.replace('// --- ACL Policies 访问控制策略 ---', subnet_logic + '\n// --- ACL Policies 访问控制策略 ---')

# 2. Replace hardcoded table rows
old_tbody = """            <tbody class="divide-y divide-gray-100 dark:divide-[#282727]">
              <tr>
                <td class="py-3 px-4 font-mono font-bold text-blue-600">192.168.10.0/24</td>
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">hk-gateway-edge (10.144.144.1)</td>
                <td class="py-3 px-4 text-emerald-600 font-semibold">● 已放行 (Approved)</td>
                <td class="py-3 px-4 font-mono text-gray-500">Metric: 1 (直连)</td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-mono font-bold text-blue-600">10.0.0.0/16</td>
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">office-nas-storage (10.144.144.10)</td>
                <td class="py-3 px-4 text-emerald-600 font-semibold">● 已放行 (Approved)</td>
                <td class="py-3 px-4 font-mono text-gray-500">Metric: 2 (中继)</td>
              </tr>
            </tbody>"""

new_tbody = """            <tbody class="divide-y divide-gray-100 dark:divide-[#282727]">
              <tr v-for="route in subnetRoutes" :key="route.id" class="hover:bg-gray-50/50 dark:hover:bg-[#2a2929] transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{{ route.cidr }}</td>
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">{{ route.gatewayName }} ({{ route.gatewayIp }})</td>
                <td class="py-3 px-4 font-semibold" :class="route.status.includes('Approved') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  ● {{ route.status }}
                </td>
                <td class="py-3 px-4 font-mono text-gray-500 dark:text-gray-400">Metric: {{ route.metric }}</td>
              </tr>
              <tr v-if="subnetRoutes.length === 0">
                <td colspan="4" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无子网路由广播，请点击右上角添加。</td>
              </tr>
            </tbody>"""

content = content.replace(old_tbody, new_tbody)

# 3. Modify button @click
content = content.replace(
    '''<button @click="showToast('添加新的子网路由广播')" type="button" class="px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-2xs">
            添加子网路由
          </button>''',
    '''<button @click="showAddSubnetModal = true" type="button" class="px-3.5 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-2xs cursor-pointer active:scale-95 transition-all">
            添加子网路由
          </button>'''
)

# 4. Insert Modal
modal_ui = """
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
"""

content = content.replace('    <!-- ==================== 策略编辑模态框 (Visual Policy Editor) ==================== -->', modal_ui + '\n    <!-- ==================== 策略编辑模态框 (Visual Policy Editor) ==================== -->')

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
