# Autopilot (for EasyTier) 生产级全栈部署指南

本文档详细说明 **Autopilot 零信任现代化控制平面** 的生产级部署流程，涵盖两大主流方案：
- **方案 A（推荐）：Cloudflare 0 成本全球边缘云原生模式**（Pages + Workers + D1 + 无状态 Gateway 容器）；
- **方案 B：私有 IDC / 本地自托管模式**（Node.js/Bun + SQLite + Caddy + Systemd）；
- **终端部署：Autopilot Agent 客户端接入与守护**。

---

## 目录
1. [系统总体拓扑与环境要求](#一-系统总体拓扑与环境要求)
2. [方案 A：Cloudflare 全球边缘部署 (0 成本推荐)](#二-方案-a-cloudflare-全球边缘部署-0-成本推荐)
   - [2.1 初始化 Cloudflare D1 边缘数据库](#21-初始化-cloudflare-d1-边缘数据库)
   - [2.2 部署调度中枢 (Autopilot Hub)](#22-部署调度中枢-autopilot-hub)
   - [2.3 部署前端控制台 (Autopilot UI / Pages)](#23-部署前端控制台-autopilot-ui--pages)
   - [2.4 部署无状态下发网关 (Autopilot Gateway)](#24-部署无状态下发网关-autopilot-gateway)
3. [方案 B：私有服务器 / 单机自托管部署](#三-方案-b-私有服务器--单机自托管部署)
   - [3.1 Hub 服务 Systemd 配置与 SQLite 持久化](#31-hub-服务-systemd-配置与-sqlite-持久化)
   - [3.2 Caddy 统一反代与静态前端挂载](#32-caddy-统一反代与静态前端挂载)
4. [终端守护层部署 (Autopilot Agent)](#四-终端守护层部署-autopilot-agent)
   - [4.1 二进制安装与 Systemd 守护进程](#41-二进制安装与-systemd-守护进程)
   - [4.2 联动官方原生 EasyTier 核心 (RPC 端口配置)](#42-联动官方原生-easytier-核心-rpc-端口配置)
   - [4.3 常用维护命令 (秒切/秒连/状态查询)](#43-常用维护命令-秒切秒连状态查询)
5. [系统安全红线与故障排查 (Troubleshooting)](#五-系统安全红线与故障排查-troubleshooting)

---

## 一、 系统总体拓扑与环境要求

```
                                  [ 用户终端设备 ]
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
             (HTTPS / 443)                             (WSS / 443)
                    ▼                                         ▼
     ┌─────────────────────────────┐           ┌─────────────────────────────┐
     │  Autopilot UI (战情看板)    │           │ Autopilot Gateway (无状态)  │
     │  Cloudflare Pages / Nginx   │           │ Koyeb / Docker / Caddy      │
     └──────────────┬──────────────┘           │ 挂载 --db :memory:          │
                    │                                         ▲
             (JSON API 调用)                                  │ (每30s拉取中台配置)
                    ▼                                         │
     ┌────────────────────────────────────────────────────────┴┐
     │                Autopilot Hub (调度中枢)                 │
     │      Cloudflare Workers + D1 或 Node.js + SQLite        │
     │      SSOT 唯一真理之源 • 意图状态机 • 零信任毫秒吊销    │
     └──────────────────────────────┬──────────────────────────┘
                                    ▲
                                    │ (秒断带外异步 30~50ms / 3.5s 心跳巡检)
                                    │
                       ┌────────────┴────────────┐
                       │  Autopilot Agent 终端   │
                       │  Go 守护进程 (< 8MB)    │
                       │  本地意图锁 + 60s看门狗 │
                       └────────────┬────────────┘
                                    │
                        (< 10ms 本地原生 RPC)
                                    ▼
                       ┌─────────────────────────┐
                       │   easytier-core 进程    │
                       │   (TUN句柄 / Noise隧道) │
                       └─────────────────────────┘
```

### 环境要求
- **编译/构建环境**：
  - Node.js >= 20.x（推荐 v22.x LTS）；
  - pnpm >= 9.x / 12.x；
  - Go >= 1.22（推荐 1.24+）；
- **运行环境**：
  - 边缘部署：Cloudflare 账号（免费版 Workers + D1 + Pages 额度即可完全承载数千台节点）；
  - 容器网关：具备公网 IP 或 Anycast 入口的主机 / Koyeb / Hugging Face Spaces / Docker 宿主机；
  - 终端客户端：Linux / macOS / Windows（需安装 `easytier-core` 原生核心）。

---

## 二、 方案 A：Cloudflare 全球边缘部署 (0 成本推荐)

本方案利用 Cloudflare 全球 Anycast 边缘网络，前端、中台、数据库均运行在边缘节点，0 运维、0 服务器成本，兼具毫秒级全球响应与防 DDoS 能力。

### 2.1 初始化 Cloudflare D1 边缘数据库

1. **登录 Cloudflare 认证**：
   ```bash
   npx wrangler login
   ```
2. **创建 D1 数据库实例**：
   ```bash
   npx wrangler d1 create autopilot_d1
   ```
   终端会输出如下配置信息：
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "autopilot_d1"
   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
3. **回填至配置文件**：
   打开 [apps/hub/wrangler.toml](file:///root/workspace/Autopilot/apps/hub/wrangler.toml)，将输出的 `database_id` 填入对应的字段中。

4. **应用数据库迁移表结构**：
   在 D1 实例中创建数据表：
   ```bash
   cd apps/hub
   npx wrangler d1 execute autopilot_d1 --command="
     CREATE TABLE IF NOT EXISTS devices (
       id TEXT PRIMARY KEY,
       hostname TEXT NOT NULL,
       persona TEXT NOT NULL DEFAULT 'WORKSTATION_INTERACTIVE',
       user_intent TEXT NOT NULL DEFAULT 'ACTIVE',
       public_key_x25519 TEXT NOT NULL,
       enrollment_token TEXT,
       os TEXT NOT NULL DEFAULT 'linux',
       client_version TEXT NOT NULL DEFAULT '1.0.0',
       latitude REAL,
       longitude REAL,
       city TEXT,
       country TEXT,
       cloud_provider TEXT DEFAULT 'EDGE',
       tags TEXT DEFAULT '[]',
       telemetry TEXT DEFAULT '{}',
       last_heartbeat INTEGER NOT NULL,
       created_at INTEGER NOT NULL,
       updated_at INTEGER NOT NULL
     );

     CREATE TABLE IF NOT EXISTS networks (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       network_secret TEXT NOT NULL,
       ipv4_cidr TEXT NOT NULL,
       ipv6_cidr TEXT,
       dhcp_enabled INTEGER NOT NULL DEFAULT 1,
       created_at INTEGER NOT NULL,
       updated_at INTEGER NOT NULL
     );

     CREATE TABLE IF NOT EXISTS device_networks (
       id TEXT PRIMARY KEY,
       device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
       network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
       virtual_ipv4 TEXT,
       virtual_ipv6 TEXT,
       intent_state TEXT NOT NULL DEFAULT 'ACTIVE',
       created_at INTEGER NOT NULL
     );

     CREATE TABLE IF NOT EXISTS acl_rules (
       id TEXT PRIMARY KEY,
       network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
       priority INTEGER NOT NULL DEFAULT 100,
       name TEXT NOT NULL,
       action TEXT NOT NULL DEFAULT 'ALLOW',
       source_tags TEXT DEFAULT '[]',
       dest_tags TEXT DEFAULT '[]',
       protocol TEXT NOT NULL DEFAULT 'ANY',
       dest_ports TEXT DEFAULT '[]',
       description TEXT,
       enabled INTEGER NOT NULL DEFAULT 1,
       created_at INTEGER NOT NULL
     );

     CREATE TABLE IF NOT EXISTS app_connectors (
       id TEXT PRIMARY KEY,
       network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
       device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
       domain_pattern TEXT NOT NULL,
       assigned_cidr32 TEXT NOT NULL,
       target_host TEXT NOT NULL,
       target_port INTEGER,
       technitium_synced INTEGER NOT NULL DEFAULT 0,
       enabled INTEGER NOT NULL DEFAULT 1,
       created_at INTEGER NOT NULL
     );

     CREATE TABLE IF NOT EXISTS audit_logs (
       id TEXT PRIMARY KEY,
       actor_type TEXT NOT NULL,
       actor_id TEXT NOT NULL,
       action TEXT NOT NULL,
       target_type TEXT NOT NULL,
       target_id TEXT NOT NULL,
       details TEXT DEFAULT '{}',
       timestamp INTEGER NOT NULL
     );
   "
   ```

### 2.2 部署调度中枢 (Autopilot Hub)

1. 进入 `apps/hub` 目录，执行编译与部署：
   ```bash
   cd apps/hub
   pnpm build
   npx wrangler deploy
   ```
2. 记录输出的 Workers 路由域名，例如：
   `https://autopilot-hub.<your-subdomain>.workers.dev`
3. 验证中枢健康探测：
   ```bash
   curl -s https://autopilot-hub.<your-subdomain>.workers.dev/health
   # 预期返回: {"status":"healthy","system":"Autopilot Zero-Trust Hub",...}
   ```

### 2.3 部署前端控制台 (Autopilot UI / Pages)

1. 编译静态产物：
   ```bash
   cd apps/web
   pnpm build
   ```
   构建产物输出于 `apps/web/dist`。
2. 部署至 Cloudflare Pages：
   ```bash
   npx wrangler pages deploy dist --project-name=autopilot-ui
   ```
3. 在 Cloudflare 后台或自定义域名绑定（例如 `autopilot.yourdomain.com`）。

### 2.4 部署无状态下发网关 (Autopilot Gateway)

网关负责与 EasyTier 原生节点建立隧道。本架构核心创新在于：**彻底剥离持久化状态，挂载 `--db :memory:`，通过 Caddyfile 统揽单端口**。

1. **环境变量**：
   - `PORT=443`
   - `AUTOPILOT_HUB_URL=https://autopilot-hub.<your-subdomain>.workers.dev`
2. **在 Docker / Koyeb / Hugging Face Spaces 部署**：
   使用 [apps/gateway/Dockerfile](file:///root/workspace/Autopilot/apps/gateway/Dockerfile) 直接部署：
   ```bash
   cd apps/gateway
   docker build -t autopilot-gateway:latest .
   docker run -d \
     --name autopilot-gateway \
     -p 443:443 \
     -e PORT=443 \
     -e AUTOPILOT_HUB_URL=https://autopilot-hub.<your-subdomain>.workers.dev \
     autopilot-gateway:latest
   ```

---

## 三、 方案 B：私有服务器 / 单机自托管部署

若机房环境不允许访问外部云服务，Autopilot 架构支持同构运行在私有 Linux 服务器上。

### 3.1 Hub 服务 Systemd 配置与 SQLite 持久化

1. 编译 Hub 生产代码：
   ```bash
   cd apps/hub
   pnpm build
   ```
2. 创建 Systemd 服务配置文件 `/etc/systemd/system/autopilot-hub.service`：
   ```ini
   [Unit]
   Description=Autopilot Hub Control Center (Node.js + SQLite)
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/root/workspace/Autopilot/apps/hub
   ExecStart=/usr/bin/node dist/server.js
   Restart=always
   RestartSec=3
   Environment=NODE_ENV=production
   Environment=PORT=8787

   [Install]
   WantedBy=multi-user.target
   ```
3. 启动并启用开机自启：
   ```bash
   systemctl daemon-reload
   systemctl enable --now autopilot-hub
   systemctl status autopilot-hub
   ```

### 3.2 Caddy 统一反代与静态前端挂载

编辑 `/etc/caddy/Caddyfile`，将 UI 静态文件与 Hub API 汇聚：
```caddyfile
autopilot.internal.corp {
    # 静态前端资源
    root * /root/workspace/Autopilot/apps/web/dist
    file_server

    # 反向代理 Hub API
    handle /api/* {
        reverse_proxy localhost:8787
    }

    # 404 回退给前端单页路由
    try_files {path} /index.html
}
```
运行 Caddy：
```bash
caddy reload --config /etc/caddy/Caddyfile
```

---

## 四、 终端守护层部署 (Autopilot Agent)

### 4.1 二进制安装与 Systemd 守护进程

1. **编译 Agent 单二进制**：
   ```bash
   cd apps/agent
   go build -ldflags="-s -w" -o bin/autopilot-agent .
   cp bin/autopilot-agent /usr/local/bin/autopilot-agent
   chmod +x /usr/local/bin/autopilot-agent
   ```
   > 实测体积仅 **5.8 MB**，无任何 glibc / 外部动态库依赖。

2. **注册守护进程服务**：
   创建 `/etc/systemd/system/autopilot-agent.service`：
   ```ini
   [Unit]
   Description=Autopilot Zero-Trust Agent Companion Daemon
   After=network.target easytier.service

   [Service]
   Type=simple
   ExecStart=/usr/local/bin/autopilot-agent start \
     --hub http://127.0.0.1:8787 \
     --device dev_srv_01 \
     --network net_corp_zero_trust \
     --persona server
   Restart=always
   RestartSec=5
   LimitNOFILE=65535

   [Install]
   WantedBy=multi-user.target
   ```
3. **启动守护**：
   ```bash
   systemctl daemon-reload
   systemctl enable --now autopilot-agent
   ```

### 4.2 联动官方原生 EasyTier 核心 (RPC 端口配置)

> **最高安全声明**：Autopilot 绝不会通过 `ifconfig / ip link set dev down / netsh` 强杀用户物理网卡或禁用适配器。
> 启停网络必须由 EasyTier 原生内存 RPC 接管。

启动原生 `easytier-core` 时，请务必开启 `--rpc-portal`（默认端口为 `11211`）：
```bash
easytier-core \
  --ipv4 10.144.1.10 \
  --network-name net_corp_zero_trust \
  --network-secret autopilot-sec-9921 \
  --rpc-portal 127.0.0.1:11211
```

### 4.3 常用维护命令 (秒切/秒连/状态查询)

在工作站或个人电脑上，用户享有最高控制人权：

1. **查看本地意图与链路状态**：
   ```bash
   autopilot-agent status
   ```
2. **秒级休眠网络（乐观执行 <10ms，带外改库 30~50ms）**：
   ```bash
   autopilot-agent pause --network net_corp_zero_trust
   ```
   > 终端 TUN 句柄立即在内存释放，物理网络瞬间恢复本地状态；中台标记为 `USER_PAUSED`，阻断 3.5s 心跳自愈强拉。
3. **秒级重连网络**：
   ```bash
   autopilot-agent resume --network net_corp_zero_trust
   ```

---

## 五、 系统安全红线与故障排查 (Troubleshooting)

| 异常现象 | 可能原因 | 解决排查步骤 |
| :--- | :--- | :--- |
| **执行 pause 后依然被重新拉起** | 设备被误设为 `SERVER_HEADLESS` 画像 | 执行 `PATCH /api/v1/devices/:id/persona` 将设备切换为 `WORKSTATION_INTERACTIVE` 画像。 |
| **提示 RPC 连接 11211 失败** | 本地 `easytier-core` 未开启 RPC 入口 | 启动 easytier 时添加 `--rpc-portal 127.0.0.1:11211`。 |
| **设备显示被 ADMIN_DISABLED** | 安全管理员触发了“一键毫秒踢人” | 由控制台管理员解封或重新生成 Enrollment Token 进行重新注册。 |
| **60秒看门狗自动回滚原配置** | 新下发配置导致节点失联或心跳中断 | 看门狗判定握手失败，已自动事务回滚至上一版可用配置，请检查目标 IP/CIDR 是否冲突。 |
| **官方控制台显示 12.4 MB/s 假峰值** | 仍在运行官方老旧算法前端 | 使用 Autopilot 官方重构 UI，内建单调时间戳差值与首次采样基准锚定算法，彻底根除假峰值。 |
