import re

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix invalid w-4.5 h-4.5
    content = content.replace('w-4.5 h-4.5', 'w-5 h-5')

    # Remove the geometric SVG blocks
    content = re.sub(r'<!-- Tailscale 矢量几何波浪艺术图 -->.*?</div>\s*</div>\s*</div>', '</div>\n          </div>', content, flags=re.DOTALL)

    # Change col-span for the left side since image is removed
    content = content.replace('md:col-span-7 p-6', 'md:col-span-12 p-6')

    # Replace copyright/branded strings
    replacements = {
        'EasyTier Mesh 拓扑网络全连通': 'Mesh 拓扑网络全连通',
        'EasyTier 官方技术文档': '官方技术文档',
        '管理加入当前 EasyTier 虚拟局域网的全部设备与路由器': '管理加入当前虚拟局域网的全部设备与路由器',
        '安装并启动 EasyTier 核心': '安装并启动 Mesh 核心',
        '验证 EasyTier 数据包过滤规则': '验证数据包过滤规则',
        '宣告给 EasyTier 虚拟网': '宣告给虚拟网',
        '管理 EasyTier 用于 NAT 探测穿透': '管理用于 NAT 探测穿透',
        '配置编辑 (EasyTier TOML)': '配置编辑 (TOML)',
        'easytier-core TOML': 'core TOML',
        'EasyTier Autopilot 网络集中配置文件': '网络集中配置文件',
        '底层 EasyTier 节点': '底层节点',
        'EasyTier 内核版本': '内核版本',
        '通过 EasyTier STUN UDP/TCP': '通过 STUN UDP/TCP',
        'EasyTier 节点自动生成配置文件': '节点自动生成配置文件',
        'EasyTier 将自动进行 STUN UDP 探测': '核心将自动进行 STUN UDP 探测',
        'EasyTier 官方全球中继集群': '官方全球中继集群',
        'EasyTier 数据包过滤规则断言测试': '数据包过滤规则断言测试',
        '注册 EasyTier 账户': '注册网络账户',
        '登录 EasyTier 控制台': '登录网络控制台',
        'EasyTier Console': 'Autopilot Console',
        'easytier.top': 'example.com',
        'easytier-core': 'mesh-core',
    }

    for k, v in replacements.items():
        content = content.replace(k, v)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('src/views/ConsoleView.vue')
process_file('src/views/LoginView.vue')
process_file('index.html')
process_file('src/router/index.ts')

