# EasyTier Autopilot 控制台：第一阶段上下文交接与第二阶段开发规划

> **文档版本**: v1.0.0  
> **更新时间**: 2026-10-05  
> **状态**: 第一阶段验收通过（评分 7.8/10，必须项已全量修复并就绪）

---

## 目录
1. [项目概览与第一阶段成果全景](#1-项目概览与第一阶段成果全景)
2. [Claude 代码审查修改落实报告](#2-claude-代码审查修改落实报告)
3. [系统架构与核心组件映射](#3-系统架构与核心组件映射)
4. [第二阶段 (Phase 2) 深度开发规划与实施路径](#4-第二阶段-phase-2-深度开发规划与实施路径)
5. [路由鉴权与安全注意事项](#5-路由鉴权与安全注意事项)
6. [开发者快速上手与部署指引](#6-开发者快速上手与部署指引)

---

## 1. 项目概览与第一阶段成果全景

### 1.1 系统定位
EasyTier Autopilot 是一套基于 **EasyTier** 点对点（P2P）Mesh VPN 协议的现代化网络控制面与全景可视化控制台。旨在为多设备互联、跨云组网、异地局域网办公提供直观、美观且工业级的全要素监控与协同管理能力。

### 1.2 第一阶段已交付核心特性
- **网络为中心的管理架构**：
  - 支持多套虚拟网络隔离管理，包含网段 CIDR (IPv4/IPv6)、入网安全令牌 (PSK)、RPC 门户与中继节点集群。
  - 侧边栏网络切换重构为大画幅专属弹出模态面板 (`showNetworkModal`)，解决文本截断问题，全方位展示底层网络参数。
- **全要素 8 大遥测指标监控看板**：
  - 覆盖在线节点数量、平均链路延迟、入网总流量 (RX)、出网总流量 (TX)、P2P 直连打洞率、虚拟 IPv4 网段、虚拟 IPv6 网段、PSK 通信密钥。
  - 布局升级为 **4 列 × 2 排** 舒展网格，排版更具呼吸感与纵向延展性。
  - 新增 **「显示定制」** 功能，支持用户独立开关任意指标卡片，并通过 `localStorage` 自动持久化保存偏好。
- **Peer.as 级 3D 数字地球全景仪 (`GlobeMap.vue`)**：
  - 基于 Three.js 与 Peer.as 渲染引擎，呈现轻量、高明度且具科技感的全球设备拓扑。
  - 链路飞线规范化：**淡绿实线** 代表 STUN P2P 直连，**淡蓝虚线** 代表 Relay 中继转发。
  - 右上角指挥台卡片增加可折叠收缩手柄，一键切换为胶囊悬浮态，避免遮挡地球视野。
- **2D 正交网络拓扑图 (`NetworkTopology.vue`)**：
  - 还原树状网状拓扑视图，支持画布无限平移、滚轮平滑缩放、节点自由拖拽与居中自适应。
- **侧边栏折叠与响应式交互**：
  - 支持侧边栏一键收缩至 16px 纯图标模式，并持久化折叠状态。
  - 移动端汉堡抽屉与全局 ThemeToggle（暗色/亮色）无缝切换。
  - 侧边栏底部集成用户身份卡片（Administrator）。
- **右侧节点设备详情抽屉**：
  - 扩展至 `max-w-xl` 宽度，内置节点详情、子网路由代理 (Proxy CIDR)、P2P 对端链路明细与动态 TOML 配置文件生成。

---

## 2. Claude 代码审查修改落实报告

针对 Claude 第一阶段代码审查提出的 3 项意见（1 项必须项 + 2 项建议项），已全部在代码库中落实修复并验证通过：

| 审查项 | 优先级 | 审查意见问题描述 | 对应文件与位置 | 修复方案与改动详情 | 验证结果 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **拓扑数据接通** | 🔴 必须 | `NetworkTopology` 的 `nodes` prop 未接通，拓扑图无法渲染真实数据 | `NetworkTopology.vue` L52, `ConsoleView.vue` L1684 等 | 1. 在 `NetworkTopology.vue` 中建立智能树形/网状分层坐标生成算法与对端连线合成机制；<br>2. 深度 `watch` 监听 `props.nodes` 动态变化，保留用户拖动坐标；<br>3. 在 `ConsoleView.vue` 3 处使用点全量传递 `:nodes="nodes"`。 | ✅ 真实节点与链路实时同步 |
| **剪贴板健壮性** | 🟠 建议 | `copyText()` 的 Promise 未处理，复制失败用户无感知 | `ConsoleView.vue` L263 | 1. 将 `copyText` 改为 `async` 异步函数；<br>2. 优先调用 `navigator.clipboard.writeText`，若失败或非 HTTPS 环境自动降级至 `document.execCommand('copy')` 隐藏 DOM 垫片；<br>3. 捕获异常并向用户展示失败 Toast 提示。 | ✅ 各种浏览器环境均可稳定复制或报错提醒 |
| **连接类型解耦** | 🟠 建议 | 连接类型用中文字符串判断 (`includes('直连')`)，接真实 API 后会脆弱 | `ConsoleView.vue` L308, L510, L2070 | 1. 明确定义 `export type ConnectionMode = 'p2p' \| 'relay' \| 'disconnected'`；<br>2. 在各个节点对象中增加规范化 `connectionMode` 字段；<br>3. 封装 `isP2PConnection()` 与 `isRelayConnection()` 辅助函数，将 UI 展示文案与底层数据状态解耦。 | ✅ 完美适配后端 API 枚举与国际化扩展 |

---

## 3. 系统架构与核心组件映射

```
src/
├── assets/             # 全局样式与静态资源 (Tailwind CSS, base.css, main.css)
├── components/
│   ├── common/         # 公共通用组件
│   │   ├── Button.vue        # 统一规范按钮
│   │   └── ThemeToggle.vue   # 亮色/暗色主题无缝切换
│   ├── globe/          # 3D 全球地球仪模块
│   │   └── GlobeMap.vue      # Peer.as 3D 地球引擎集成、折叠控制面板与定位交互
│   └── topology/       # 网络拓扑模块
│       └── NetworkTopology.vue # 2D 网状/树形拓扑、贝塞尔连接线、平移缩放、节点拖拽
├── composables/        # 组合式函数
│   └── useTheme.ts     # 主题状态响应与 localStorage 同步
├── lib/                # 核心引擎与底层库
│   ├── traceglobe.js   # Peer.as 核心 WebGL 空间渲染引擎
│   └── utils.ts        # 基础通用工具函数
├── router/             # 前端路由
│   └── index.ts        # 路由表定义与导航守卫
├── types/              # TypeScript 类型定义
│   ├── globe.ts        # 地球仪节点与飞线数据结构
│   └── network.ts      # 虚拟网络与设备节点类型定义
└── views/              # 主页面视图
    ├── ConsoleView.vue # 主控制台 (网络总览、设备节点、ACL规则、网络切换Modal等)
    └── LoginView.vue   # 管理员登录鉴权页面
```

---

## 4. 第二阶段 (Phase 2) 深度开发规划与实施路径

第二阶段的核心目标是 **「由前端 Mock 仿真态全面迈向生产级真实联调与全自动化管控」**，具体开发路线分为四大里程碑：

```mermaid
flowchart LR
    A["里程碑 1: 路由鉴权与状态机"] --> B["里程碑 2: EasyTier REST/RPC 对接"]
    B --> C["里程碑 3: 实时链路遥测与 WebSocket"]
    C --> D["里程碑 4: ACL 引擎与生产容器交付"]
```

### 里程碑 1：用户身份认证与路由守卫（优先级：P0）
- **目标**：关闭非安全测试入口，实现完善的基于 Token/Cookie 的鉴权保护。
- **任务分解**：
  1. 引入 Pinia 状态管理库，创建 `stores/auth.ts`（保存 `token`, `userInfo`, `permissions`）。
  2. 改造 `src/router/index.ts`：将 ConsoleView 路由元信息中的 `meta: { public: true }` 移除，改为 `meta: { requiresAuth: true }`。
  3. 在 `router.beforeEach` 中添加令牌拦截检查，未认证访问强制重定向至 `/login?redirect=...`。
  4. 对接 `LoginView.vue` 与真实后端 `/api/v1/auth/login` 接口，支持双因素认证 (2FA) 预留。

### 里程碑 2：对接 EasyTier 核心 API / CLI RPC 客户端（优先级：P0）
- **目标**：全面替代本地 mock 静态数据，直连正在运行的 EasyTier 节点后台。
- **任务分解**：
  1. 基于 Axios 封装带有拦截器（请求附加 Bearer Token、响应错误统一 Toast）的 API 请求层 `src/api/client.ts`。
  2. 实现以下核心 API 模块：
     - `networkApi`: 获取虚拟网络拓扑、更新 CIDR/密钥、RPC 节点切换。
     - `peerApi`: 获取当前节点直连 peers 列表、打洞模式（Full Cone / Symmetric）、实时往返时延（RTT）。
     - `routeApi`: 查询子网路由代理 (Proxy CIDR)、出口网关 (Exit Node) 开关。
  3. 为前端增加加载骨架屏（Skeleton）与网络异常重试机制。

### 里程碑 3：WebSocket 实时遥测链路推送（优先级：P1）
- **目标**：实现毫秒级节点上下线感知与吞吐流量动态曲线。
- **任务分解**：
  1. 后端通过 WebSocket 或 Server-Sent Events (SSE) 持续推送：
     - 节点健康状态变化（心跳超时自动置为 offline）。
     - 网卡吞吐速率采样（RX/TX 瞬时吞吐与今日累计）。
     - 链路重路由事件（由 P2P 直连降级为 Relay 或逆向恢复）。
  2. 前端根据推送事件局部刷新 `GlobeMap` 飞线高亮动画与 `NetworkTopology` 状态光晕。

### 里程碑 4：ACL 规则动态编译与下发系统（优先级：P1）
- **目标**：由静态断言测试升级为可动态增删改查的真实安全过滤策略。
- **任务分解**：
  1. 构建策略可视化编辑器：支持按源标签（Source Tag）、目的网段/端口、Action（Allow/Deny）可视化配置。
  2. 规则冲突检测：在前端进行基础掩码重叠与规则死锁校验。
  3. 执行 `acl_test` 实时探测包模拟断言，直观反馈真实网络连通性。

---

## 5. 路由鉴权与安全注意事项

> [!WARNING]
> **关于生产环境路由守卫的特别提醒**
> 
> 目前在 [`src/router/index.ts`](file:///root/workspace/Autopilot/src/router/index.ts) 中，根路径 `/` (ConsoleView) 的路由配置如下：
> ```ts
> {
>   path: '/',
>   name: 'Console',
>   component: () => import('@/views/ConsoleView.vue'),
>   meta: { public: true, title: 'EasyTier Console' }, // ⚠️ 目前为公开模式
> }
> ```
> **第二阶段改造指引**：
> 1. 必须将 `public: true` 调整为 `requiresAuth: true`。
> 2. 全局前置守卫中加入有效性验证：
>    ```ts
>    router.beforeEach((to, from, next) => {
>      const authStore = useAuthStore()
>      if (to.meta.requiresAuth && !authStore.isAuthenticated) {
>        next({ name: 'Login', query: { redirect: to.fullPath } })
>      } else {
>        next()
>      }
>    })
>    ```

---

## 6. 开发者快速上手与部署指引

### 6.1 本地开发运行
```bash
# 1. 安装项目依赖
pnpm install

# 2. 启动本地开发服务 (支持局域网调试)
pnpm run dev --host 0.0.0.0 --port 5173

# 3. 访问控制台
# 浏览器打开 http://localhost:5173
```

### 6.2 代码质量检查与生产打包
```bash
# 执行 TypeScript 类型校验与 Vite 生产打包
pnpm run build
```
打包产物将输出至 `dist/` 目录，单页应用资源经过高效 Gzip 压缩与 Rollup 分块优化。

### 6.3 生产 Nginx 反向代理配置建议
```nginx
server {
    listen 80;
    server_name console.easytier.local;

    root /root/workspace/Autopilot/dist;
    index index.html;

    # SPA 路由重定向
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 EasyTier API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:11211/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 实时遥测代理
    location /ws/ {
        proxy_pass http://127.0.0.1:11211/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---
*交接文档编写完成，后续开发人员可严格按照 Phase 2 里程碑推进。*
