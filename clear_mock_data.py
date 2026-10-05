import re

with open('src/views/ConsoleView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Clear managedNetworks
content = re.sub(
    r'const managedNetworks = ref<ManagedNetwork\[\]>\(\[.*?\]\)',
    """const managedNetworks = ref<ManagedNetwork[]>([
  {
    id: 'net-default',
    name: 'default-mesh',
    status: 'active',
    nodeCount: 0,
    onlineCount: 0,
    ipv4Cidr: '10.144.144.0/24',
    ipv6Cidr: '',
    secretKey: '',
    rpcPortal: '',
    relayHubs: [],
    createdDate: new Date().toISOString().split('T')[0],
  }
])""",
    content,
    flags=re.DOTALL
)

# Clear networkTrafficMap
content = re.sub(
    r'const networkTrafficMap = ref<Record<string, NetworkTrafficStats>>\(\{.*?\}\)',
    "const networkTrafficMap = ref<Record<string, NetworkTrafficStats>>({})",
    content,
    flags=re.DOTALL
)

# Clear nodes
content = re.sub(
    r'const nodes = ref\(\[.*?\]\)',
    "const nodes = ref<any[]>([])",
    content,
    flags=re.DOTALL
)

# Clear aclPolicies
content = re.sub(
    r'const aclPolicies = ref<AclPolicy\[\]>\(\[.*?\]\)',
    "const aclPolicies = ref<AclPolicy[]>([])",
    content,
    flags=re.DOTALL
)

# Clear aclTests
content = re.sub(
    r'const aclTests = ref\(\[.*?\]\)',
    "const aclTests = ref<any[]>([])",
    content,
    flags=re.DOTALL
)

with open('src/views/ConsoleView.vue', 'w', encoding='utf-8') as f:
    f.write(content)

