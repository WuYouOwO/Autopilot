# Autopilot Console 开发指南

## 1. 技术栈

本平台基于现代化的前端技术栈构建，具有极高的响应速度和优秀的开发者体验：
- **核心框架**: [Vue 3](https://vuejs.org/) (Composition API / `<script setup>`)
- **构建工具**: [Vite](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/) (强类型约束，提升代码健壮性)
- **UI & 样式**: [Tailwind CSS](https://tailwindcss.com/) (实用优先的 CSS 框架)
- **图标库**: [lucide-vue-next](https://lucide.dev/) (简洁、轻量的一致性矢量图标)
- **状态管理**: 基于 Vue 3 内置的响应式 API (`ref`, `computed`, `reactive`) 配合轻量级 Store。

## 2. 目录结构

```text
Autopilot/
├── docs/                 # 项目相关文档（使用指南、开发指南）
├── src/
│   ├── assets/           # 静态资源文件（CSS / 字体等）
│   ├── components/       # 可复用组件库
│   │   ├── common/       # 通用基础组件（按钮、弹窗、骨架屏等）
│   │   ├── globe/        # 3D 地球仪组件（Three.js / WebGL 等）
│   │   └── topology/     # 网络拓扑图渲染组件
│   ├── lib/              # 核心工具库、第三方库的封装与工具函数
│   │   ├── api.ts        # 后端/核心 API 接口通信封装
│   │   ├── dualStack.ts  # IPv4/IPv6 双栈解析校验逻辑
│   │   └── ws.ts         # WebSocket 实时通信封装
│   ├── router/           # Vue Router 路由配置表
│   ├── views/            # 全局页面级组件
│   │   ├── ConsoleView.vue  # 控制台主应用界面
│   │   └── LoginView.vue    # 登录/鉴权界面
│   ├── App.vue           # Vue 根组件
│   └── main.ts           # 应用入口执行文件
├── index.html            # Vite HTML 模板入口
├── package.json          # 依赖清单和 NPM Scripts
├── tsconfig.json         # TypeScript 配置文件
└── vite.config.ts        # Vite 构建配置文件
```

## 3. 本地开发流程

### 3.1 环境准备
- Node.js >= 18.x
- [pnpm](https://pnpm.io/) >= 8.x (推荐)

### 3.2 安装依赖
```bash
pnpm install
```

### 3.3 启动开发服务器
```bash
pnpm run dev
```
项目将在默认的 `http://localhost:5173` 启动（如需更改 IP / 端口请带上 `--host 0.0.0.0` 参数）。开发环境下自带 Vite 的热更新（HMR），能够无缝响应 UI 代码的变更。

### 3.4 生产环境构建
```bash
pnpm run build
```
执行后将利用 `vue-tsc` 进行严格的 TypeScript 类型推断与检查，接着通过 Vite 进行打包、代码分割压缩、清理多余 CSS，生成的生产就绪代码将会保存在 `dist/` 目录下。

## 4. 关键架构设计与最佳实践

### 4.1 全局状态管理
应用的主视图 `ConsoleView.vue` 涵盖了几乎所有的交互模块，因此大量的数据模型（如网络列表、设备节点状态等）均在此文件中以顶层 `ref` 声明。通过向下游拆分的子组件透传 `props` 和响应 `emit` 事件来实现解耦。

### 4.2 Tailwind CSS 标准
由于控制台具备深浅色双模式支持：
- 在使用 Tailwind 编写样式时，必须同时考虑 `dark:` 前缀。
- **排雷注意**：Tailwind 默认预设配置中不支持带小数的尺寸（如 `w-4.5`，`h-4.5`）。必须使用合法的类名（如 `w-4`，`w-5`，`w-px`）或显式的内联自定义数值（如 `w-[18px]`），否则容易出现元素无宽高的样式坍塌（渲染成小黑点）。

### 4.3 假数据（Mock）机制的清理
本项目曾用于无后端的 UI 原型展示。目前的机制已将假数据与前端硬编码状态解除绑定（移除了假流量、假延迟数据、遗留版权等内容）。若需要拓展后续核心协议层数据交互，请直接在 `src/lib/api.ts` 和 `src/lib/ws.ts` 中实现实际的 HTTP 抓取与 Websocket 实时推送并对接至视图响应式 `ref` 即可。

## 5. 贡献准则
1. 提交前确保所有 TypeScript 检验通过（`pnpm run build` 不能报错）。
2. Vue 组件需遵循 `<script setup lang="ts">` 写法。
3. 未经过实际生产环境或真实 Node API 测试的功能特性，需在组件侧加注 TODO 注释以便追溯。
