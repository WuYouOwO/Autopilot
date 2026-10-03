# EasyTier Console · Cloudflare Edition

<p align="center">
  <img src="./public/logo.svg" alt="EasyTier Console Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>下一代去中心化 Mesh 虚拟网络与零信任边缘控制平台</strong><br>
  <em>Next-Generation Decentralized Mesh Network & Zero Trust Edge Control Plane</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4fc08d?logo=vuedotjs" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.x-646cff?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/EasyTier-v2.6.4_Compatible-0051c3" alt="EasyTier">
  <img src="https://img.shields.io/badge/UI_Style-Cloudflare_Pale_Light-orange" alt="Cloudflare Pale Light">
  <img src="https://img.shields.io/badge/Tests-15%2F15_Passing-emerald" alt="Q/A 100% Pass">
</p>

---

## 📖 项目背景与演进动因

**EasyTier** 是一款极具创新性的去中心化 Mesh 组网工具，底层 Rust 核心引擎支持完整的 NAT 穿透、WireGuard 协议隧道、Noise_IK 密码学端到端加密以及出色的双栈 IPv6 路由能力。

然而，官方自带的原始 Web 管理端存在多项难以忽视的工程缺陷与体验瓶颈：

1. **IPv6 格式截断与白屏 Bug**：官方原生前端中间层表单验证器包含严重缺陷，针对 IP 字段强行施加单一 IPv4 正则校验，导致输入双栈 IPv6 或带有子网掩码（如 `fd00::1/64`）时配置被静默截断、丢弃甚至直接导致节点配置崩溃。**底层核心虽然早已完整支持 IPv6，但前端这层实现导致该能力几乎不可用。**
2. **零信任与高级管控缺失**：EasyTier 核心原生具备的 ACL 访问控制链、安全标签组（Security Tags）、PKI 令牌凭证（Credentials）与出站连接器探针，在官方 UI 中完全未暴露控制面板。
3. **视觉风格沉重单一**：仅提供灰暗的单一暗色风格，缺乏主次视觉焦点，链路状态灯与警告信息辨识度低，无系统级日间模式支持。

**EasyTier Console (Cloudflare Edition)** 为此而生：在**完全不魔改任何 EasyTier Rust 官方二进制**的前提下，通过纯净前端重构与 Proto RPC 逆向对齐，带来现代化、工业级的全功能边缘网络管理控制台。

---

## 🎨 视觉设计哲学：Cloudflare 风格淡色系与重点高饱和色阶

本项目采用了深思熟虑的 **Cloudflare Modern Dashboard** 视觉语言体系，严格贯彻**淡色底调搭配高饱和度焦点提示**：

### 1. 基础画布（Pale Canvas）
- **日间浅色模式（默认推荐）**：采用纯正的淡雅冷灰白背景（`#f8fafc`），搭配纯白悬浮卡片（`#ffffff`）与极细微的低对比度边框（`#e2e8f0`），彻底告别沉闷压抑。
- **夜间沉浸模式**：采用 Slate Navy 炭海蓝灰（`#0c1322` 页面底色，`#162136` 卡片背景，`#23324d` 细边框），高对比护眼。
- **主交互基调**：经典科技蓝 **Classic Tech Blue**（`#0051c3` / `#2563eb`），用于主要操作、高亮选中态及拓扑节点连线。

### 2. 重点区域色彩分级（Focal Attention Hierarchy）
为了让运维人员在一秒内捕捉网络中的风险与关键动作，重点区域采用高饱和度警戒色：
- 🚨 **高饱和度火烈鸟红（Vivid Red `#ef4444`）**：
  - 节点彻底失联 / 心跳中断（`离线 (Lost)`）；
  - 零信任全局拦截规则（`BLOCK / DENY`）；
  - PKI 访问令牌即时吊销操作（`Revoke Token`）；
  - 实时链路丢包率异常（`Loss Rate > 5%`）。
- ⚠️ **高饱和度琥珀耀橙（Vivid Orange / Amber `#f97316` / `#ea580c`）**：
  - 全网 ACL 策略下发广播（`一键分发至全网节点` CTA）；
  - 底层原生 TOML 配置直接修改的安全警示横幅；
  - 刚刚签发、仅展示一次的凭证密钥（Secret Key）高危提示；
  - 往返链路高延迟警示（`RTT > 80ms`）。
- 🟢 **清新翡翠薄荷绿（Mint Emerald `#059669` / `#10b981`）**：
  - 节点健康在线与心跳正常；
  - Noise_IK 端到端加密处于就绪态；
  - 节点间打洞成功建立的 Direct P2P 极速隧道。

### 3. 平滑细腻的微交互动效（Silky Micro-interactions）
- **页面级切换动效**：通过 Vue Router 与 `page-fade` 实现 200ms 的缓动淡入与微位移切换，消除突兀白屏。
- **选项卡切换动效**：`tab-fade` 配合 CSS 贝塞尔曲线，拓扑图大屏与节点表格平滑交替。
- **弹窗与浮层遮罩**：`Dialog` 组件使用 `Teleport` 与 `dialog-fade` / `dialog-panel` 联动，遮罩虚化与模态框微缩放同步呼应。
- **按压与悬浮反馈**：交互卡片带有微悬浮抬升效果（`hover:-translate-y-0.5`），按钮具备自然的触摸回弹缩放（`active:scale-[0.98]`）。

---

## ⚡ 架构对齐：零侵入式 EasyTier Proto RPC 通信

本项目**无需改动任何 EasyTier 后端程序**。系统通过对官方 `easytier-web` 和 `easytier-core` 的 Protobuf / RPC 规范进行逆向还原，实现 100% 官方二进制兼容：

```
+-------------------------------------------------------------------------+
|                  EasyTier Console (Vue 3 + Vite SPA)                    |
|       (Cloudflare Pale UI · High-Sat Alerts · Zero-Truncation TOML)     |
+------------------------------------+------------------------------------+
                                     | Reverse Proxy / REST & Proxy-RPC
                                     v
+-------------------------------------------------------------------------+
|                Official EasyTier Web Daemon (Port 11211)                |
|                - SQLite 存储持久化 (/root/easytier-runtime/et.db)        |
|                - MD5 Pre-hash 身份认证与会话管理                         |
|                - 128-bit Proto UUID 机器资产管理                         |
+------------------------------------+------------------------------------+
                                     | UDP 22020 Config Server / Proxy-RPC
                                     v
+-------------------------------------------------------------------------+
|                   EasyTier Core 引擎 (Rust Native Node)                 |
|  - api.instance.PeerCenterManageRpcService (全局 Mesh 拓扑，支持 digest) |
|  - api.instance.PeerManageRpcService (对等节点与实时路由表)              |
|  - api.instance.ConnectorManageRpcService (出站连接器排障)              |
|  - api.logger.LoggerRpcService (动态热切换运行时日志级别)                 |
|  - api.config.ConfigRpcService (无损热补丁下发 patch_config)             |
|  - api.instance.AclManageRpcService (零信任访问控制链统计)                |
|  - api.instance.CredentialManageRpcService (PKI 凭证签发与吊销)          |
|  - api.instance.StatsRpcService (Prometheus 运行监控数据)               |
+-------------------------------------------------------------------------+
```

---

## 🚀 核心功能全览

### 1. 虚拟网络拓扑与原生 TOML 编辑 (Networks)
- **交互式 Mesh 拓扑大屏**：基于 VueFlow 渲染的拓扑图，直观以连线粗细、虚实区分 P2P 直连与中继转发链路，节点微卡片实时标注主机操作系统与状态。
- **无损原生 TOML 文本编辑 (Zero-Truncation Editor)**：直通底层配置中心，彻底终结官方前端对 IPv6 CIDR（`fd00:144::1/64`）的截断 bug，支持高级 WireGuard、KCP 等配置项的自由编辑。
- **全网数据统计 KPI**：节点规模、在线率、P2P 直连率、全网收发流量实时统计。

### 2. 边缘计算节点与物理设备 (Devices)
- **多平台资产管理**：支持识别 Linux、macOS、Windows、Android 等多架构边缘设备。
- **128-bit Proto UUID 自动转换**：无缝转换 Rust 原生高低位 `part1~part4` 结构体为工业标准 UUIDv4 字符串。
- **双栈 IP 资产洞察**：清晰展示节点物理网卡 IPv4/IPv6、公网映射出口 IP 及当前承载的 Mesh 实例。

### 3. 零信任访问控制策略 (Zero Trust Policies)
- **安全标签驱动 (Tags-based Security)**：定义 `tag:dev`、`tag:database`、`tag:gateway` 等安全组，摆脱繁琐脆弱的固定 IP 绑定。
- **入站 / 出站规则链配置**：按协议（TCP/UDP/ICMP）、端口段（如 `3306, 5432`）精准配置 `ALLOW` 与高饱和红色 `BLOCK` 规则。
- **一键全网热分发**：配置完成后一键调用 `ConfigRpcService.patch_config`，秒级热推送到网内全部在线节点，无需重启进程。

### 4. PKI 身份凭证与令牌体系 (Credentials)
- **临时服务令牌签发**：为新加入边缘节点按需签发接入 Token，指定有效期 TTL（如 2小时、7天、永久）。
- **权限与中继约束**：控制是否允许中继转发（`allow_relay`）、限制代理网段 CIDR。
- **即时吊销与熔断**：发现被盗风险时一键 Revoke，即刻令令牌失效并从节点白名单注销。

### 5. 链路诊断与探针体检 (Diagnostics)
- **动态日志热切换 (Dynamic Log Level)**：无需重启节点即可通过 RPC 将日志等级在 `TRACE / DEBUG / INFO / WARN / ERROR` 间即时切换。开启高开销 Debug/Trace 时自动亮起橙色高负载指示灯。
- **出站连接器探测 (Connector Probe)**：枚举当前节点的全部出站 Peer Connector，诊断连接状态（CONNECTED / CONNECTING / DISCONNECTED）及底层协议类型（TCP / UDP / WG / WS）。
- **对等节点与路由表查阅**：直连查询底层节点的 `list_peer` 与 `list_route`，掌握跳数、下一跳及延迟情况。
- **Prometheus 监控导出**：直接拉取 EasyTier 核心暴露的 1800+ 字符标准 Prometheus 指标文本，方便无缝接入 Grafana。

---

## 🛠️ 项目结构与资源概览

```text
Autopilot/
├── public/
│   ├── favicon.ico             # 32x32 经典高保真浏览器图标 (Vista+ PNG 容器)
│   ├── favicon.svg             # 矢量极速 Favicon 图标
│   ├── favicon-32x32.png       # 32x32 标准 PNG 图标
│   ├── apple-touch-icon.png    # 180x180 iOS / macOS 触控图标
│   ├── icon-192.png            # 192x192 PWA 高清图标
│   ├── icon-512.png            # 512x512 PWA 超清启动图标
│   ├── logo.svg                # 品牌 Logo (科技蓝渐变云朵 + 橙色核心节点)
│   └── site.webmanifest        # PWA Web 应用清单
├── scripts/
│   ├── generate_icons.py       # 纯 Python 4x4 超采样抗锯齿图标生成工具
│   └── qa_validation.py        # 第二轮 15 项端到端全链路集成回归测试脚本
├── src/
│   ├── assets/styles/main.css  # Cloudflare 色彩 Token、动效及精美滚动条
│   ├── components/
│   │   ├── common/             # Button, Badge, Card, Dialog, ThemeToggle
│   │   ├── layout/             # AppHeader, AppSidebar, AppLayout
│   │   └── topology/           # 基于 VueFlow 的 NetworkTopology 大屏
│   ├── composables/            # useTheme (深浅色记忆), usePolling (智能自适应轮询)
│   ├── lib/
│   │   ├── api.ts              # 封装 100% 兼容的 EasyTier Proto RPC 与 REST API
│   │   ├── tomlParser.ts       # 原生无损 TOML 双栈转换器
│   │   └── utils.ts            # 128位 UUID 互转、双栈 IP 格式化、流量格式化
│   ├── router/                 # 路由及登录鉴权守卫
│   ├── stores/                 # Pinia 状态层 (auth, network)
│   └── views/                  # NetworksView, DevicesView, PoliciesView, CredentialsView, DiagnosticsView, LoginView
├── index.html                  # 注入主题预加载脚本、PWA 声明与图标
├── tailwind.config.cjs         # Cloudflare 主题色阶扩展定义
├── tsconfig.json
└── vite.config.ts              # Vite 反向代理配置
```

---

## 🧪 自动化 Q/A 集成验证（15/15 全部通过）

在开发过程中，本控制台经过严格的自动化回归测试验证，涵盖与正在运行的 `easytier-web` 和 `easytier-core` 实例的实际交互：

```bash
$ python3 scripts/qa_validation.py
====================================================================
 EasyTier Cloudflare Dashboard - Round 2 Q/A & Regression Suite
====================================================================
[TEST] 1. Static Brand & Icon Assets Delivery (/favicon.ico, /favicon.svg, /apple-touch-icon.png, /site.webmanifest) ... PASS ✔
[TEST] 2. Frontend SPA Shell Delivery & Pale Theme Metadata ... PASS ✔
[TEST] 3. Reverse Proxy -> Captcha Endpoint ... PASS ✔
[TEST] 4. MD5 Pre-hash Auth & Session Creation ... PASS ✔
[TEST] 5. Auth Session Verification (/auth/check_login_status) ... PASS ✔
[TEST] 6. Machine Discovery & 128-bit Proto UUID Parsing ... PASS ✔
[TEST] 7. Native TOML Round-Trip: Parse & Generate with Dual-Stack IPv6 CIDR ... PASS ✔
[TEST] 8. Diagnostics: Outbound Connector Probe via Proxy-RPC ... PASS ✔
[TEST] 9. Diagnostics: Runtime Dynamic Log Level via LoggerRpcService ... PASS ✔
[TEST] 10. Diagnostics: Peer & Route Queries (PeerManageRpcService) ... PASS ✔
[TEST] 11. Diagnostics: Prometheus Telemetry Metrics (StatsRpcService) ... PASS ✔
[TEST] 12. Topology: PeerCenter Global Mesh RPC (with digest=0) ... PASS ✔
[TEST] 13. Zero Trust ACL: Policy Patch & Real-time Rule Telemetry ... PASS ✔
[TEST] 14. Zero Trust PKI: Full Credential Lifecycle (Gen, List, Revoke) ... PASS ✔
[TEST] 15. Auth Logout & Re-auth Security Enforcement ... PASS ✔
====================================================================
Results: 15 Passed, 0 Failed (Total: 15)
====================================================================
```

---

## 📦 快速上手与部署

### 1. 本地运行与开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器（支持热重载，默认反向代理至本地 11211 端口）
pnpm run dev --host 0.0.0.0 --port 5173

# 3. 运行静态类型检查与生产构建
pnpm exec vue-tsc --noEmit && pnpm run build
```

### 2. 生产环境部署（Nginx 反向代理配置）

构建产物位于 `dist/` 目录，可直接交付任何静态 Web 服务器托管：

```nginx
server {
    listen 80;
    server_name easytier.your-domain.com;

    root /var/www/easytier-console/dist;
    index index.html;

    # SPA 路由兜底
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 反向代理官方 easytier-web REST API 及 RPC 通道
    location /api/ {
        proxy_pass http://127.0.0.1:11211/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📄 开源与协议

- EasyTier 核心项目遵循 Apache 2.0 开源协议。
- EasyTier Console (Cloudflare Edition) 采用 MIT 协议开源。
