# Autopilot (for EasyTier) 核心开发上下文交接文档

欢迎加入 **Autopilot** 项目核心开发团队！

本文档专为接手 Autopilot 架构演进与日常维护的研发工程师编写，详细阐述**系统哲学、最高安全红线、核心代码架构索引、关键设计时序、已修复官方 Bug 剖析及未来路线**。

---

## 目录
1. [项目背景与设计哲学](#一-项目背景与设计哲学)
2. [最高安全红线与不可逾越之禁区 (Critical Guardrails)](#二-最高安全红线与不可逾越之禁区-critical-guardrails)
3. [Monorepo 架构索引与模块导航](#三-monorepo-架构索引与模块导航)
4. [核心突破性机制与时序分析](#四-核心突破性机制与时序分析)
   - [4.1 本地秒断秒连时序（乐观执行 + 带外异步对齐）](#41-本地秒断秒连时序乐观执行--带外异步对齐)
   - [4.2 安全看门狗 60 秒事务性回滚时序](#42-安全看门狗-60-秒事务性回滚时序)
   - [4.3 内存级本地意图锁 (IntentLock) 工作原理](#43-内存级本地意图锁-intentlock-工作原理)
5. [官方两大关键 Bug 修复深度复盘](#五-官方两大关键-bug-修复深度复盘)
   - [5.1 彻底根治 12.4 MB/s 虚假流量峰值](#51-彻底根治-124-mbs-虚假流量峰值)
   - [5.2 补全虚拟 IPv6 全生命周期校验与分配](#52-补全虚拟-ipv6-全生命周期校验与分配)
6. [日常开发与调试工作流](#六-日常开发与调试工作流)
7. [未来演进路线 (Future Roadmap)](#七-未来演进路线-future-roadmap)

---

## 一、 项目背景与设计哲学

- **项目 Slogan**：“From Cockpit to Autopilot.”（从波音 747 机械驾驶舱，到全自动巡航零信任网络）。
- **原版痛点与破局**：
  - EasyTier 具备优秀的底层传输能力（TUN/TAP、Noise 协议握手、P2P 打洞、Kademlia 寻址），但官方 Web 控制台存在“驾驶舱化”缺陷——充斥着繁杂的底层跳线开关，却缺失全局网络拓扑感知；
  - 混淆了“无头机房服务器（Headless Server）”与“个人终端工作站（Interactive Workstation）”的边界，造成恶劣的控制霸凌（PC 端本地断开置灰，强杀后被 3.5 秒心跳强行复活）；
  - 控制台存在 12.4 MB/s 假流量脉冲、缺少虚拟 IPv6 入口等低级瑕疵。
- **Autopilot 破局定位**：
  - **纯粹的元控制平面（Meta-Control Plane）**；
  - **双轨画像与人权第一**；
  - **全大厂 0 成本无状态运行**（Cloudflare Pages + Workers + D1 全栈同构）。

---

## 二、 最高安全红线与不可逾越之禁区 (Critical Guardrails)

在任何后续开发、自动化测试、脚本编写中，**必须严格遵守以下四大红线**：

1. **绝对禁止干预底层数据面与系统级网络适配器**：
   - 严禁通过 `exec.Command` 调用任何系统适配器开关命令（如 `netsh interface set interface ...`、`ip link set dev ... down`、WinTUN/NDIS 卸载命令）；
   - 禁用适配器会引发误断宿主真实物理网卡的灾难性事故；
   - 网络底层加密、TUN 路由、NAT 打洞全权交由 `easytier-core` 官方核心负责。
2. **纯粹的内存级原生 RPC 控制**：
   - 启停网络必须且只能通过官方原生 IPC / RPC 接口（`delete_network_instance` 释放 TUN 句柄与 Noise 隧道，`run_network_instance` 装载运行）；
3. **环境生命线安全注意**：
   - 当前 Linux 服务器的外网出海能力由宿主机运行的 **Mihomo (PID 15595, 网卡 `Meta`, `198.18.0.1/30`)** 提供；
   - 严禁在测试或脚本中终止 Mihomo、刷新系统路由表（`ip route` / `ip rule`）或防火墙（`iptables` / `nftables`）。
4. **契约优先与单向状态机**：
   - 状态流转只允许：`ACTIVE` ⟷ `USER_PAUSED`，或由安全管理员触发 `ADMIN_DISABLED`；
   - 一旦置为 `ADMIN_DISABLED`，任何本地用户行为均无法恢复，必须由管理员在鉴权中台解封。

---

## 三、 Monorepo 架构索引与模块导航

工程采用 pnpm monorepo 组织，所有模块职责分明：

```text
/root/workspace/Autopilot
├── packages/
│   └── protocol/              # [核心协议层] 共享 Zod Schema、TS 类型、算法、RPC 契约
│       ├── src/persona.ts     # 双轨画像 (SERVER_HEADLESS vs WORKSTATION_INTERACTIVE)
│       ├── src/intent.ts      # 意图状态机状态转移函数 (transitionIntentState)
│       ├── src/traffic.ts     # 12.4 MB/s 根治单调差值与平滑计算器 (TrafficRateTracker)
│       ├── src/network.ts     # 双栈 IPv4/IPv6 正则校验与 CIDR 分配
│       ├── src/device.ts      # 遥测指标、X25519 公钥、HUD 经纬度位置契约
│       ├── src/acl.ts         # 零信任 ACL 策略规则 Schema
│       ├── src/rpc.ts         # 原生 EasyTier 内存 RPC 调用契约
│       └── src/connector.ts   # App Connector /32 路由宣告与 Technitium DNS 契约
├── apps/
│   ├── hub/                   # [调度中枢层] Hono + Drizzle ORM 同构中台
│   │   ├── src/index.ts       # Cloudflare Workers & Node.js 同构入口
│   │   ├── src/server.ts      # 自托管 Node.js 独立运行入口 (端口 8787)
│   │   ├── src/db/schema.ts   # D1 / SQLite 兼容的 Drizzle ORM 数据表定义
│   │   ├── src/db/index.ts    # 动态切换 D1 (Cloudflare) 或 better-sqlite3 (本地)
│   │   ├── src/routes/auth.ts # 零信任 Enrollment Token、X25519 轮转、一键毫秒踢人
│   │   ├── src/routes/devices.ts # 设备生命周期、带外快速休眠/唤醒、3.5s 智能过滤
│   │   ├── src/routes/networks.ts# 双栈网段分配、ACL 策略管理、HUD 拓扑聚合
│   │   ├── src/routes/gateway.ts # 针对无状态网关的声明式配置下发 (GET /config)
│   │   └── src/routes/connector.ts# App Connector 域名增量路由与 DNS 联动
│   ├── gateway/               # [协议下发层] 无状态网关执行器
│   │   ├── Caddyfile          # 443 WSS 单端口统揽反代 (11211 RPC + 22020 WebSocket)
│   │   ├── entrypoint.sh      # 挂载 easytier-web --db :memory: 并启动 Caddy
│   │   └── Dockerfile         # 多阶段极轻量容器镜像构建
│   ├── agent/                 # [终端守护层] Go 单二进制 (< 8MB，实测 5.8MB)
│   │   ├── main.go            # 命令行入口 (start / pause / resume / status)
│   │   ├── internal/intent/   # 内存级本地意图锁 (IntentLock)，过滤 3.5s 偶发滞后心跳
│   │   ├── internal/rpc/      # 内存级原生 RPC 客户端 (Run/DeleteNetworkInstance)
│   │   ├── internal/sync/     # 30~50ms 带外异步中台报告器 (HubClient)
│   │   └── internal/watchdog/ # 60 秒安全看门狗与事务性回滚引擎 (Watchdog)
│   └── web/                   # [战情交互层] Vite + React 19 + TailwindCSS
│       ├── src/App.tsx        # 战情中枢主界面与五大 Tab 调度
│       ├── src/components/TopologyHUD.tsx # 几何 HUD 拓扑 (○终端 ◇子网 ⬡网关)
│       ├── src/components/DiagnosticInspectorModal.tsx # 点击下钻诊断模态窗
│       ├── src/components/NetworkAxisView.tsx # 组织网络轴：双栈 CIDR 与 ACL 矩阵
│       ├── src/components/HardwareAxisView.tsx # 硬件机器轴：双画像管理与即时 Toggle
│       ├── src/components/MobileWAPView.tsx # 专属移动端面板：一键触控休眠
│       └── src/components/TrafficBugfixDemo.tsx # 12.4 MB/s 算法验证实验室
```

---

## 四、 核心突破性机制与时序分析

### 4.1 本地秒断秒连时序（乐观执行 + 带外异步对齐）

官方控制台最大的缺陷是：PC 终端本地不能决定断开，强行断开后又被控制台 3.5s 心跳强拉。Autopilot 彻底颠覆了此逻辑：

```text
[ 工作站用户点击：断开网络 / 执行 agent pause ]
       │
       ├──► [ 步骤 1: 内存级极速通道 (< 10ms) ]
       │       1. Agent 立即将本地 IntentLock 置为 `USER_PAUSED`；
       │       2. 通过本地 HTTP/RPC (127.0.0.1:11211) 调用 `delete_network_instance`；
       │       3. easytier-core 在内存释放 TUN 句柄与 Noise 隧道；
       │       4. 用户物理网络丝毫不受影响，UI 瞬间变灰，零延迟感知。
       │
       ├──► [ 步骤 2: 内存级意图锁 (IntentLock) 即时生效 ]
       │       若在此刻网关或中台滞后飘来 3.5s 心跳包或拉起指令，
       │       本地 IntentLock.HandleInboundHeartbeat() 立即判定为 ErrRevivalSuppressed 并丢弃！
       │
       └──► [ 步骤 3: 并发带外上报通道 (30~50ms 异步完成) ]
               Agent 向 Cloudflare Workers (Hub) 发起带外请求：
               POST /api/v1/devices/{id}/networks/{net_id}/pause
               中台 D1 写入：`user_intent = PAUSED`。

[ 终态结果 ]
后续 3.5 秒网关在拉取/巡检 D1 状态时，识别到 `user_intent == PAUSED`，
自动标记为“预期休眠”，绝不越权强制复活拉起！
```

### 4.2 安全看门狗 60 秒事务性回滚时序

当在中台修改配置（例如变更虚网 IP、网段密钥或下发新路由）时，网络可能出现短暂动荡，若新配置导致失联，节点将永远沦为“失联孤岛”。

Autopilot Agent 设计了事务性看门狗：
1. **启动配置更新**：Agent 接收新配置前，先对当前健康运行的配置制作内存快照 `backupConfig`；
2. **装载新配置并倒计时**：调用 RPC 应用新配置，同时启动一个 60 秒硬倒计时定时器；
3. **握手判定验证**：
   - **分支 A（握手成功）**：新链路连通，成功向 Hub 发送验证心跳，调用 `Watchdog.Commit()`，取消定时器，提交新配置；
   - **分支 B（失联超时）**：若 60 秒内无法建立连接或握手超时，定时器触发 `executeRollback()`，自动调用 RPC 将 `backupConfig` 原样回滚重新装载，确保节点自愈恢复。

### 4.3 内存级本地意图锁 (IntentLock) 工作原理

详见代码 [apps/agent/internal/intent/lock.go](file:///root/workspace/Autopilot/apps/agent/internal/intent/lock.go)：
```go
// 工作站用户意图为 PAUSED 时，拦截网关自愈拉起
if l.currentState == StateUserPaused {
    if l.persona == config.PersonaWorkstationInteractive {
        return ErrRevivalSuppressed
    }
}
```
- **对于 `WORKSTATION_INTERACTIVE`（有头终端）**：本地人权最高，心跳自愈一律被锁抑制；
- **对于 `SERVER_HEADLESS`（机房无头）**：不允许本地用户直接 Toggle，心跳自愈保持开启，保障 IDC 服务 7x24 高可用。

---

## 五、 官方两大关键 Bug 修复深度复盘

### 5.1 彻底根治 12.4 MB/s 虚假流量峰值

#### 官方 Bug 根因
1. **缺少首次基准锚定**：官方前端将第一次获取到的网卡累计总流量字节数（例如新节点加入时累计已传输 12.4 MB）直接与 0 算差值 `(12.4MB - 0)`，并假定耗时为 1 秒，导致进入仪表盘第一秒瞬时爆出 **12.4 MB/s** 虚假峰值；
2. **WebSocket 轮询抖动**：网络卡顿时两个数据包间隔可能仅几毫秒，除以极小的 `elapsedTime` 导致瞬时速率除法溢出；
3. **重连计数器清零**：底层节点断线重连后，`rx_bytes` 从数兆归零，做无符号相减产生 `2^32 - 1` 溢出（显示数 GB/s 尖刺）。

#### Autopilot 修复实现 (`TrafficRateTracker`)
代码位于 [packages/protocol/src/traffic.ts](file:///root/workspace/Autopilot/packages/protocol/src/traffic.ts)：
1. **严格 Baseline 注册**：
   ```ts
   if (!this.lastSample) {
     this.lastSample = { rxBytes: currentRxBytes, txBytes: currentTxBytes, timestamp: now };
     return { rxRateBps: 0, txRateBps: 0, rxFormatted: '0 B/s', ... };
   }
   ```
   首次采样只记录参考点，严格返回 `0 B/s`；
2. **最小采样保护**：`elapsedMs < 100` 视为网络抖动，直接沿用平滑值；
3. **负向差值重置保护**：当 `rxDelta < 0`，自动判定底层重连计数器重置，平滑重设 baseline；
4. **EMA 移动指数平滑滤波**：结合因子为 0.7 的指数移动加权，提供专业雷达般的稳定带宽感。

可在前端界面的 **“12.4 MB/s 修复验算实验室”**（[TrafficBugfixDemo.tsx](file:///root/workspace/Autopilot/apps/web/src/components/TrafficBugfixDemo.tsx)）实时点击模拟并对比官方算法与 Autopilot 的差异。

### 5.2 补全虚拟 IPv6 全生命周期校验与分配

- 官方 Web 遗漏了虚拟 IPv6 的输入框与校验逻辑，导致 EasyTier 强大的 IPv6 双栈能力无法在图形界面使用；
- Autopilot 在协议层定义了 RFC 4291 严谨正则 `IPv6Regex` 与 `IPv6CIDRRegex`，中台在设备入网时根据网络 `ipv6_cidr`（如 `fd00:cafe:2026::/64`）自动分配无冲突的虚拟 IPv6 地址，并在战情看板中首发呈现。

---

## 六、 日常开发与调试工作流

### 1. 常用开发调试命令

```bash
# 进入根目录
cd /root/workspace/Autopilot

# 1. 运行所有单元测试与集成测试 (通过率 100%)
pnpm test
pnpm test:agent

# 2. 本地启动 Hub 中台 (监听 http://localhost:8787)
pnpm --filter @autopilot/hub dev

# 3. 本地启动 Web 战情前端 (监听 http://localhost:3000)
pnpm --filter @autopilot/web dev

# 4. 编译 Go Agent 二进制
pnpm build:agent # 产物位于 apps/agent/bin/autopilot-agent
```

### 2. 契约优先修改建议
如果需要扩展新的数据字段（例如给设备增加“电池电量”或“Wi-Fi SSID”）：
1. 先在 `packages/protocol/src/device.ts` 中更新 Zod Schema 与 TypeScript 类型定义；
2. 运行 `pnpm --filter @autopilot/protocol build`；
3. 在 `apps/hub/src/db/schema.ts` 中增补 Drizzle 字段；
4. 在 `apps/web/src/components` 中进行前端 UI 渲染绑定。

---

## 七、 未来演进路线 (Future Roadmap)

1. **跨区域集群联邦 (Multi-Region Mesh Federation)**：
   - 利用 Cloudflare D1 读复制特性，支持跨大洲多个 Hub 节点就近接入；
2. **WebAuthn / Passkey 硬件密钥支持**：
   - 将 X25519 设备注册与 FIDO2 / YubiKey 联动，实现硬件级零信任准入；
3. **原生桌面托盘图形集成 (Tauri / Fyne)**：
   - 当前 Agent 提供了完善的 CLI 与 RPC 代理能力，可基于现有 Go 架构外包一层轻量级系统原生托盘图标（Tray Menu），提供 Windows / macOS 一键 Switch 动效；
4. **Technitium DNS HTTP 实时对齐**：
   - 当前已预留 `apps/hub/src/routes/connector.ts`，未来可直接配置 Technitium DNS 服务器的 API Key，实现解析记录实时落盘与热重载。
