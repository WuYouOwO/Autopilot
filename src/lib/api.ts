import axios, { AxiosInstance, AxiosError } from 'axios'
import { Md5 } from 'ts-md5'

export function formatUuid(obj: { part1: number; part2: number; part3: number; part4: number }): string {
  const buf = new Uint8Array(16)
  const view = new DataView(buf.buffer)
  view.setUint32(0, obj.part1, false)
  view.setUint32(4, obj.part2, false)
  view.setUint32(8, obj.part3, false)
  view.setUint32(12, obj.part4, false)

  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export interface Summary {
  device_count: number
}

export interface MachineLocation {
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
}

export interface MachineItem {
  client_url?: string
  info?: {
    machine_id?: string
    hostname?: string
    version?: string
    running_network_instances?: string[]
    ips?: {
      interface_ipv4s?: any[]
      interface_ipv6s?: any[]
      public_ipv4?: any
      public_ipv6?: any
    }
    report_time?: number
    os_info?: {
      name?: string
      version?: string
    }
  }
  location?: MachineLocation
}

export interface NetworkInstanceInfo {
  instance_id: string
  running: boolean
  error_msg?: string
  detail?: {
    my_node_info?: any
    events?: string[]
    peer_route_pairs?: Array<{
      route: {
        ipv4_addr?: any
        hostname?: string
        version?: string
        cost?: number
        stun_info?: any
        feature_flag?: {
          is_public_server?: boolean
          avoid_relay_data?: boolean
        }
      }
      peer?: any
      conns?: Array<{
        tunnel?: {
          tunnel_type?: string
          local_addr?: { url?: string }
          remote_addr?: { url?: string }
        }
        stats?: {
          tx_bytes?: number
          rx_bytes?: number
          latency_us?: number
          loss_rate?: number
        }
      }>
    }>
  }
}

export interface NetworkInstanceIds {
  running_inst_ids: string[]
  disabled_inst_ids: string[]
}

export interface ProxyRpcPayload {
  service_name: string
  method_name: string
  payload: Record<string, any>
  scope?: string
}

class ApiService {
  private client: AxiosInstance
  private onUnauthorizedCb: (() => void) | null = null

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (this.onUnauthorizedCb) {
            this.onUnauthorizedCb()
          }
        }
        return Promise.reject(error)
      }
    )
  }

  public setUnauthorizedCallback(cb: () => void) {
    this.onUnauthorizedCb = cb
  }

  public setBaseUrl(baseUrl: string) {
    const clean = baseUrl.replace(/\/+$/, '')
    this.client.defaults.baseURL = `${clean}/api/v1`
  }

  // --- 身份认证 ---
  public getCaptchaUrl(): string {
    return `${this.client.defaults.baseURL}/auth/captcha?t=${Date.now()}`
  }

  public async login(username: string, password: string):Promise<boolean> {
    const hashed = Md5.hashStr(password)
    await this.client.post('/auth/login', {
      username,
      password: hashed,
    })
    return true
  }

  public async logout(): Promise<void> {
    try {
      await this.client.get('/auth/logout')
    } finally {
      if (this.onUnauthorizedCb) {
        this.onUnauthorizedCb()
      }
    }
  }

  public async register(username: string, password: string, captcha: string): Promise<void> {
    const hashed = Md5.hashStr(password)
    await this.client.post('/auth/register', {
      credentials: {
        username,
        password: hashed,
      },
      captcha,
    })
  }

  public async checkLoginStatus(): Promise<boolean> {
    try {
      await this.client.get('/auth/check_login_status')
      return true
    } catch {
      return false
    }
  }

  public async changePassword(newPassword: string): Promise<void> {
    const hashed = Md5.hashStr(newPassword)
    await this.client.put('/auth/password', {
      new_password: hashed,
    })
  }

  // --- 节点与概览 ---
  public async getSummary(): Promise<Summary> {
    return await this.client.get('/summary')
  }

  public async listMachines(): Promise<MachineItem[]> {
    const resp: { machines: MachineItem[] } = await this.client.get('/machines')
    return resp.machines || []
  }

  // --- 虚拟网络 ---
  public async listMachineNetworks(machineId: string): Promise<NetworkInstanceIds> {
    return await this.client.get(`/machines/${machineId}/networks`)
  }

  public async getMachineAllNetworksInfo(machineId: string): Promise<Record<string, NetworkInstanceInfo>> {
    const resp: { info?: { map?: Record<string, NetworkInstanceInfo> } } = await this.client.get(
      `/machines/${machineId}/networks/info`
    )
    return resp.info?.map || {}
  }

  public async getMachineOneNetworkInfo(machineId: string, instId: string): Promise<NetworkInstanceInfo | undefined> {
    const resp: { info?: { map?: Record<string, NetworkInstanceInfo> } } = await this.client.get(
      `/machines/${machineId}/networks/info/${instId}`
    )
    return resp.info?.map?.[instId]
  }

  public async getNetworkConfig(machineId: string, instId: string): Promise<any> {
    return await this.client.get(`/machines/${machineId}/networks/config/${instId}`)
  }

  public async saveNetworkConfig(machineId: string, instId: string, config: any): Promise<void> {
    await this.client.put(`/machines/${machineId}/networks/config/${instId}`, { config })
  }

  public async runNetworkInstance(machineId: string, config: any, save: boolean = true): Promise<void> {
    await this.client.post(`/machines/${machineId}/networks`, { config, save })
  }

  public async updateNetworkState(machineId: string, instId: string, disabled: boolean): Promise<void> {
    await this.client.put(`/machines/${machineId}/networks/${instId}`, { disabled })
  }

  public async deleteNetwork(machineId: string, instId: string): Promise<void> {
    await this.client.delete(`/machines/${machineId}/networks/${instId}`)
  }

  // --- 原生 TOML 文本转换 ---
  public async generateTomlConfig(config: any): Promise<string> {
    const resp: { toml_config?: string; error?: string } = await this.client.post('/generate-config', { config })
    if (resp.error) throw new Error(resp.error)
    return resp.toml_config || ''
  }

  public async parseTomlConfig(tomlConfig: string): Promise<any> {
    const resp: { config?: any; error?: string } = await this.client.post('/parse-config', { toml_config: tomlConfig })
    if (resp.error) throw new Error(resp.error)
    return resp.config
  }

  // --- 万能代理 RPC 透传 ---
  public async proxyRpc<T = any>(machineId: string, payload: ProxyRpcPayload): Promise<T> {
    return (await this.client.post(`/machines/${machineId}/proxy-rpc`, payload)) as T
  }

  // RPC 便捷调用：全局网络拓扑
  public async getGlobalPeerMap(machineId: string, digest: number = 0): Promise<any> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.PeerCenterManageRpcService',
      method_name: 'get_global_peer_map',
      payload: {
        digest,
      },
    })
  }

  // RPC 便捷调用：出站连接器排障
  public async listConnectors(machineId: string): Promise<any> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.ConnectorManageRpcService',
      method_name: 'list_connector',
      payload: {},
    })
  }

  // RPC 便捷调用：动态日志级别设置
  public async setLoggerConfig(machineId: string, level: number): Promise<any> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.logger.LoggerRpcService',
      method_name: 'set_logger_config',
      payload: {
        level,
      },
    })
  }

  public async getLoggerConfig(machineId: string): Promise<{ level?: number }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.logger.LoggerRpcService',
      method_name: 'get_logger_config',
      payload: {},
    })
  }

  // RPC 便捷调用：运行时动态配置补丁 (ConfigRpcService)
  public async patchConfig(machineId: string, patch: any, instName?: string): Promise<any> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.config.ConfigRpcService',
      method_name: 'patch_config',
      payload: {
        patch,
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  public async getConfig(machineId: string, instName?: string): Promise<{ config?: any; toml_config?: string }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.config.ConfigRpcService',
      method_name: 'get_config',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  // RPC 便捷调用：零信任访问控制 (AclManageRpcService)
  public async getAclStats(machineId: string, instName?: string): Promise<{ acl_stats?: any }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.AclManageRpcService',
      method_name: 'get_acl_stats',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  public async getAclWhitelist(machineId: string, instName?: string): Promise<{ tcp_ports?: string[]; udp_ports?: string[] }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.AclManageRpcService',
      method_name: 'get_whitelist',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  // RPC 便捷调用：PKI 凭证管理
  public async listCredentials(machineId: string, instName?: string): Promise<{ credentials?: any[] }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.CredentialManageRpcService',
      method_name: 'list_credentials',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  public async generateCredential(
    machineId: string,
    params: {
      groups?: string[]
      allow_relay?: boolean
      allowed_proxy_cidrs?: string[]
      ttl_seconds: number
      credential_id?: string
      reusable?: boolean
      instName?: string
    }
  ): Promise<{ credential_id: string; credential_secret: string; expiry_unix: number }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.CredentialManageRpcService',
      method_name: 'generate_credential',
      payload: {
        groups: params.groups || [],
        allow_relay: params.allow_relay ?? true,
        allowed_proxy_cidrs: params.allowed_proxy_cidrs || [],
        ttl_seconds: params.ttl_seconds,
        credential_id: params.credential_id || undefined,
        reusable: params.reusable ?? true,
        instance: params.instName ? { instance_selector: { name: params.instName } } : undefined,
      },
    })
  }

  public async revokeCredential(machineId: string, credentialId: string, instName?: string): Promise<{ success: boolean }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.CredentialManageRpcService',
      method_name: 'revoke_credential',
      payload: {
        credential_id: credentialId,
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  // RPC 便捷调用：节点与路由表
  public async listPeers(machineId: string, instName?: string): Promise<{ peer_infos?: any[] }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.PeerManageRpcService',
      method_name: 'list_peer',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  public async listRoutes(machineId: string, instName?: string): Promise<{ routes?: any[] }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.PeerManageRpcService',
      method_name: 'list_route',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }

  // RPC 便捷调用：Prometheus 指标导出
  public async getPrometheusStats(machineId: string, instName?: string): Promise<{ prometheus_text?: string }> {
    return await this.proxyRpc(machineId, {
      service_name: 'api.instance.StatsRpcService',
      method_name: 'get_prometheus_stats',
      payload: {
        instance: instName ? { instance_selector: { name: instName } } : undefined,
      },
    })
  }
}

export const api = new ApiService()
export default api
