# Autopilot (for EasyTier) 零信任现代化控制平面

<p align="center">
  <strong>“From Cockpit to Autopilot.”</strong><br>
  从波音 747 机械驾驶舱，到全自动巡航零信任网络。
</p>

---

## 一、 项目背景与解决的核心痛点

EasyTier 是一款出色的开源去中心化异地组网工具。但在生产与日常桌面终端使用中，传统 Web 控制台存在多项关键痛点：

1. **告别“驾驶舱”体验**：官方 Web 充满底层杂乱开关与跳线，缺乏全局网络拓扑感知；
2. **根治官方低级 Bug**：
   - **12.4 MB/s 虚假流量峰值**：官方前端由于未初始化的 baseline 采样与缺失单调时钟差值计算，在初次入网或重连计数器重置时会产生 12.4 MB/s 乃至数 GB/s 的假峰值；
   - **缺失虚拟 IPv6**：官方 UI 完全遗漏了虚拟 IPv6 配置与显示入口。
3. **终结“控制霸凌”**：原版将机房服务器与个人 PC 混为一谈，单机连入控制台后本地断开按钮直接置灰，强杀后被 3.5 秒心跳强行复活；
4. **全大厂 0 成本无状态运行**：全栈同构支持 Cloudflare Pages + Workers + D1 全球边缘部署与免维护无状态容器下发。

---

## 二、 核心原则与最高安全红线 (Guardrails)

1. **绝对禁止干预底层数据面**：
   - **严禁直接调用系统命令开关网卡（如禁用 WinTUN / NDIS / Linux 虚拟适配器）**，防止误断用户真实物理网卡造成灾难性断网；
   - 绝不重写 `easytier-core` 的底层网络驱动与加密栈（TUN/TAP、Noise X25519、OSPF、NAT 打洞继续由官方核心承载）；
2. **纯粹的元控制（Meta-Control Plane）与内存级 RPC**：
   - 客户端启停网络必须且只能通过官方原生 IPC / 本地 RPC（`delete_network_instance` / `run_network_instance`）进行平滑内存释放与接管；
3. **架构极度 AI 友好与契约优先**：
   - 严格基于 Proto 契约与 Zod Schema 驱动，状态机单向流转，坚决拒绝复杂竞态；
4. **全端同构跨平台 (Isomorphic)**：
   - 中台代码同时原生支持：**Cloudflare 云原生模式**（Workers + D1）与**本地自托管模式**（Node/Bun + SQLite）。

---

## 三、 四层系统架构

```
====================================================================================================
                                      PROJECT: AUTOPILOT
                                  (Next-Gen EasyTier Control Plane)
====================================================================================================

  [ 1. 战情交互层：Autopilot UI ] (Cloudflare Pages 静态托管 / 0 成本 Anycast CDN)
  ✦ 双轴视图：组织网络轴（网段/ACL规则）与硬件机器轴（链路状态/实时指标）无缝切换
  ✦ 几何 HUD 拓扑：○终端 ◇子网 ⬡网关，支持点击下钻诊断
  ✦ 全球资源大屏：极简深灰底图 + 冰蓝流动光束粒子 + 真实经纬度与云厂商标记
  ✦ 移动端 WAP 支持：专属轻量手机控制面板，多租户严格隔离，一键远程休眠

  [ 2. 调度中枢层：Autopilot Hub ] (Cloudflare Workers + D1 数据库 / 兼容本地 Node+SQLite)
  ✦ 唯一真理之源 (SSOT)：基于 Hono + Drizzle ORM，维护设备意图、配置版本与 ACL 规则
  ✦ 零信任认证中枢：GitHub / Google SSO 单点登录，X25519 公钥全自动生命周期与一键毫秒踢人
  ✦ 意图状态机：严格维护 ACTIVE / USER_PAUSED / ADMIN_DISABLED 三态流转
  ✦ 原生应用加速 (App Connector)：DNS 嗅探探针联动，增量宣告 /32 CIDR 并同步 Technitium DNS

  [ 3. 协议下发层：Autopilot Gateway ] (无状态容器：Hugging Face Spaces / Koyeb / Docker)
  ✦ 彻底剥离状态：运行官方原版 easytier-web，挂载 --db :memory:，无持久化包袱
  ✦ 单端口收敛：Caddyfile 统一反代，将 /api/* (11211) 与 /* (22020 WS) 统一收敛至标准 WSS 443 端口
  ✦ 声明式同构：作为无状态网关执行器，实时响应中台指令

  [ 4. 终端守护层：Autopilot Agent ] (受控端伴侣守护进程：Go 单二进制，< 8MB [实测 5.8MB])
  ✦ 本地意图代理：托盘/CLI 提供原生秒级 Toggle 开关，驱动“本地 RPC 释放 + 异步中台改库”
  ✦ 安全看门狗：配置更新启动 60 秒握手倒计时，失联自动事务性回滚原配置
  ✦ 本地意图锁：内存级拦截极速断开后飘来的偶发性滞后心跳，杜绝误拉起
====================================================================================================
```

---

## 四、 设备双轨制与秒连秒切时序

### 1. 设备双轨画像模型 (Device Persona)
- **`Server / Headless`（无头机房模式）**：
  - 针对 IDC 主机、云虚拟机、NAS、软路由；
  - 维持声明式控制台绝对控制（SSOT），禁止本地随意变更，保持 3.5 秒心跳自动巡检与故障自愈拉起。
- **`Workstation / Interactive`（有头终端模式）**：
  - 针对员工笔记本、个人台式机、移动端；
  - **人权第一，本地控制权最高**：桌面托盘提供清晰的单网络 Toggle 开关。

### 2. 本地秒连秒切时序（乐观本地执行 + 异步状态对齐）
```text
[ 用户在 Agent 托盘/CLI 点击：断开网络 ]
       │
       ├──► 1. 本地极速通道 (< 10ms)：
       │       Agent 立即调用本地 easytier-core RPC (delete_network_instance) 释放 TUN 句柄与 Noise 隧道。
       │       物理网络不受丝毫干扰，UI 瞬间变灰，零感知延迟。
       │
       └──► 2. 并发带外上报通道 (30~50ms 异步完成)：
               Agent 并发请求 Cloudflare Workers (Hub)：
               POST /api/v1/devices/{id}/networks/{net_id}/pause
               中台 D1 写入：`user_intent = PAUSED`。
               
[ 结果 ]：下发端点（Gateway）在后续 3.5s 心跳对齐时，检测到 D1 状态为 PAUSED，
         自动判定为“预期休眠”，绝不越权强制拉起！
```

---

## 五、 根治 12.4 MB/s 虚假流量算法原理

官方算法使用简单的未对齐差值：`rate = (curr_bytes - prev_bytes)`。当节点加入网络或重连时，上报的累积字节通常已达数兆（如 12.4 MB），如果 `prev_bytes` 为 0 或未初始化，直接除以采样时间导致瞬时显示 12.4 MB/s 乃至数 GB/s 的暴涨。

Autopilot 在 `@autopilot/protocol` 的 `TrafficRateTracker` 中彻底重构了该计算逻辑：
1. **严格基准锁定**：首个采样仅注册 baseline 计数与单调高精度时间戳，首次速率严格输出 `0 B/s`；
2. **抖动抑制**：当采样间隔小于 100ms 时抑制除法抖动，重用上周期 EMA 平滑值；
3. **断线重置自愈**：检测到 `curr_bytes < prev_bytes`（EasyTier 重启计数器清零）时，自动触发重置并阻断负数溢出脉冲；
4. **EMA 平滑滤波**：结合指数移动平均（EMA），提供极度真实的平滑带宽感知。

---

## 六、 快速上手与运行指南

### 1. 安装开发依赖与全栈构建
```bash
# 全局依赖安装
pnpm install

# 运行所有自动化测试套件
pnpm test
pnpm test:agent

# 编译所有模块 (UI + Hub + Agent)
pnpm build
pnpm build:agent
```

### 2. 调度中枢层 (Autopilot Hub)
- **本地自托管运行（Node.js + SQLite）**：
  ```bash
  cd apps/hub
  pnpm dev # 默认监听 http://localhost:8787
  ```
- **Cloudflare Workers + D1 部署**：
  ```bash
  cd apps/hub
  wrangler d1 create autopilot_d1
  wrangler deploy
  ```

### 3. 战情交互层 (Autopilot UI)
- **本地开发**：
  ```bash
  cd apps/web
  pnpm dev # 访问 http://localhost:3000
  ```
- **Cloudflare Pages 静态产物构建**：
  ```bash
  cd apps/web
  pnpm build # 产物生成于 apps/web/dist，可直接一键托管至 Cloudflare Pages
  ```

### 4. 终端守护进程 (Autopilot Agent)
- 单二进制体积：**5.8 MB**（无外部依赖）。
- 启动守护进程：
  ```bash
  apps/agent/bin/autopilot-agent start --hub http://localhost:8787 --device dev_my_mac --persona workstation
  ```
- 秒级断开与休眠：
  ```bash
  apps/agent/bin/autopilot-agent pause --network net_corp_zero_trust
  ```
- 秒级重连与恢复：
  ```bash
  apps/agent/bin/autopilot-agent resume --network net_corp_zero_trust
  ```

### 5. 协议下发层 (Autopilot Gateway)
- 使用 Docker / Caddyfile 单端口收敛（443 端口统揽 REST 与 WebSocket）：
  ```bash
  cd apps/gateway
  docker-compose up -d
  ```

---

## 七、 自动化测试报告

全流水线通过率 100%：
- `packages/protocol`: 3/3 passed (12.4 MB/s 算法抑制测试、双轨制意图锁状态转移测试、双栈 IPv4/IPv6 正则校验测试)
- `apps/hub`: 10/10 passed (健康探测、双栈网络创建、工作站入网与 IP 分配、带外极速休眠、3.5s 心跳防复活霸凌拦截、一键毫秒踢人、HUD 拓扑聚合、App Connector DNS 嗅探)
- `apps/agent`: 5/5 passed (本地意图锁过滤测试、无头服务器意图限制测试、管理员吊销阻断测试、RPC 内存释放测试、Watchdog 60s 回滚测试)
