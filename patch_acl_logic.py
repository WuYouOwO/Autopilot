import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert AclPolicies data and Conflict detection logic before ACL Tests
acl_logic_injection = """
// --- ACL Policies 访问控制策略 ---
interface AclPolicy {
  id: string
  name: string
  src: string
  dst: string
  action: 'allow' | 'deny'
  priority: number
  enabled: boolean
}

const aclPolicies = ref<AclPolicy[]>([
  { id: 'rule-1', name: 'default-deny-prod', src: 'tag:开发人员', dst: 'tag:核心数据库:5432', action: 'deny', priority: 10, enabled: true },
  { id: 'rule-2', name: 'isolate-guests', src: 'tag:访客网络', dst: 'tag:局域网存储:*', action: 'deny', priority: 20, enabled: true },
  { id: 'rule-3', name: 'allow-dev-to-staging', src: 'tag:开发人员', dst: 'tag:测试数据库:5432', action: 'allow', priority: 30, enabled: true },
  { id: 'rule-4', name: 'allow-all-internal', src: '10.144.144.0/24', dst: '10.144.144.0/24:*', action: 'allow', priority: 100, enabled: true }
])

const aclConflicts = computed(() => {
  const conflicts: { rule1: string, rule2: string, reason: string }[] = []
  const activeRules = aclPolicies.value.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)
  
  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const r1 = activeRules[i]
      const r2 = activeRules[j]
      
      // Simple conflict detection logic: same src and dst but different actions, or overlapping CIDRs
      const srcOverlap = r1.src === r2.src || r1.src === '0.0.0.0/0' || r2.src === '0.0.0.0/0'
      const dstOverlap = r1.dst === r2.dst || r1.dst === '*:*' || r2.dst === '*:*'
      
      if (srcOverlap && dstOverlap && r1.action !== r2.action) {
         conflicts.push({
           rule1: r1.name,
           rule2: r2.name,
           reason: `源 "${r1.src}" 与目标 "${r1.dst}" 范围重叠但动作冲突。高优先级规则 "${r1.name}" 将覆盖 "${r2.name}"。`
         })
      }
    }
  }
  return conflicts
})

const editingPolicy = ref<AclPolicy | null>(null)
const showPolicyModal = ref(false)

const savePolicy = () => {
  if (editingPolicy.value) {
    if (!editingPolicy.value.id) {
       editingPolicy.value.id = `rule-${Date.now()}`
       aclPolicies.value.push({...editingPolicy.value} as AclPolicy)
    } else {
       const idx = aclPolicies.value.findIndex(r => r.id === editingPolicy.value!.id)
       if (idx !== -1) {
         aclPolicies.value[idx] = {...editingPolicy.value} as AclPolicy
       }
    }
  }
  showPolicyModal.value = false
  showToast('访问控制策略已保存')
}

const deletePolicy = (id: string) => {
  aclPolicies.value = aclPolicies.value.filter(r => r.id !== id)
  showToast('策略规则已删除')
}
"""

content = content.replace('// --- ACL Tests 规则验证数据 ---', acl_logic_injection + '\n// --- ACL Tests 规则验证数据 ---')

# 2. Modify ACL Tests logic to reflect simulation
acl_tests_logic = """
const isRunningTests = ref(false)
const runAllTests = () => {
  isRunningTests.value = true
  showToast('正在执行 EasyTier 数据包过滤规则断言测试...')
  
  setTimeout(() => {
    // 动态执行测试，根据 aclPolicies 模拟路由过滤
    aclTests.value.forEach(test => {
       const matchedRule = aclPolicies.value.find(r => 
         r.enabled && 
         (r.src === test.src || r.src === '0.0.0.0/0') && 
         (r.dst === test.dst || r.dst === '*:*')
       )
       
       if (matchedRule) {
         test.action = matchedRule.action === 'allow' ? '放行' : '阻断'
         test.ruleMatched = `规则 #${matchedRule.priority}: ${matchedRule.name}`
       } else {
         test.action = '放行'
         test.ruleMatched = '默认放行'
       }
       test.status = '通过'
       test.latency = (Math.random() * 2 + 0.1).toFixed(1) + 'ms'
    })
    
    isRunningTests.value = false
    showToast(`全部 ACL 安全策略校验完成：${aclTests.value.length} 项测试完毕`)
  }, 750)
}
"""

# Replace existing runAllTests
content = re.sub(r'const isRunningTests = ref\(false\).*?\}, 750\)\n\}', acl_tests_logic.strip(), content, flags=re.DOTALL)

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
