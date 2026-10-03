import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { MachineItem, NetworkInstanceInfo } from '@/lib/api'
import { formatIpAddress, uuidToStr } from '@/lib/utils'

export interface MeshNode {
  machineId: string
  instanceId: string
  hostname: string
  osName?: string
  version?: string
  publicIp?: string
  virtualIpv4?: string
  virtualIpv6?: string
  status: 'online' | 'relay' | 'offline'
  uploadBytes: number
  downloadBytes: number
  latencyUs?: number
  peers: Array<{
    hostname: string
    ipv4: string
    cost: number
    isP2P: boolean
    latencyUs?: number
    lossRate?: number
    tunnelProto?: string
    txBytes?: number
    rxBytes?: number
  }>
}

export interface MeshNetwork {
  name: string
  nodes: MeshNode[]
  totalNodes: number
  onlineNodes: number
}

export const useNetworkStore = defineStore('network', () => {
  const machines = ref<MachineItem[]>([])
  const machineNetworkInfos = ref<Record<string, Record<string, NetworkInstanceInfo>>>({})
  const networkConfigs = ref<Record<string, Record<string, any>>>({})
  const activeNetworkName = ref<string>('default')
  const loading = ref(false)
  const lastUpdated = ref<Date | null>(null)

  // 刷新全量机器和网络信息
  const fetchAll = async () => {
    try {
      const machineList = await api.listMachines()
      machines.value = machineList

      const infoMap: Record<string, Record<string, NetworkInstanceInfo>> = {}
      const configMap: Record<string, Record<string, any>> = {}

      // 并发拉取每台在线机器的网络信息
      await Promise.all(
        machineList.map(async (m) => {
          const mid = uuidToStr(m.info?.machine_id)
          if (!mid) return
          try {
            const netInfo = await api.getMachineAllNetworksInfo(mid)
            infoMap[mid] = netInfo

            // 提取各网络实例的配置元数据
            configMap[mid] = {}
            for (const rawInstId of Object.keys(netInfo)) {
              const instId = uuidToStr(rawInstId)
              try {
                const cfg = await api.getNetworkConfig(mid, instId)
                configMap[mid][instId] = cfg
              } catch {
                // 忽略未拉取到的局部配置
              }
            }
          } catch (e) {
            console.debug('Failed to fetch machine network details for', mid, e)
          }
        })
      )

      machineNetworkInfos.value = infoMap
      networkConfigs.value = configMap
      lastUpdated.value = new Date()
    } catch (err) {
      console.error('Fetch all network data error:', err)
    }
  }

  // 聚合计算：以“虚拟网”为维度的网络集合
  const meshNetworks = computed<Record<string, MeshNetwork>>(() => {
    const networks: Record<string, MeshNetwork> = {}

    machines.value.forEach((m) => {
      const mid = m.info?.machine_id
      if (!mid) return

      const instances = machineNetworkInfos.value[mid] || {}
      const configs = networkConfigs.value[mid] || {}

      Object.entries(instances).forEach(([instId, inst]) => {
        const cfg = configs[instId]
        const netName = cfg?.network_name || 'default'

        if (!networks[netName]) {
          networks[netName] = {
            name: netName,
            nodes: [],
            totalNodes: 0,
            onlineNodes: 0,
          }
        }

        const myNode = inst.detail?.my_node_info
        const virtualIpv4 = myNode?.virtual_ipv4 ? formatIpAddress(myNode.virtual_ipv4) : ''
        const virtualIpv6 = myNode?.virtual_ipv6 ? formatIpAddress(myNode.virtual_ipv6) : (cfg?.ipv6 || '')
        const publicIp = m.info?.ips?.public_ipv4 ? formatIpAddress(m.info.ips.public_ipv4) : ''

        let totalTx = 0
        let totalRx = 0
        const peersList: MeshNode['peers'] = []

        const peerPairs = inst.detail?.peer_route_pairs || []
        peerPairs.forEach((pair) => {
          const cost = pair.route?.cost || 1
          const isP2P = cost === 1
          const firstConn = pair.conns?.[0]
          const stats = firstConn?.stats

          const tx = stats?.tx_bytes || 0
          const rx = stats?.rx_bytes || 0
          totalTx += tx
          totalRx += rx

          peersList.push({
            hostname: pair.route?.hostname || 'Unknown',
            ipv4: formatIpAddress(pair.route?.ipv4_addr),
            cost,
            isP2P,
            latencyUs: stats?.latency_us,
            lossRate: stats?.loss_rate,
            tunnelProto: firstConn?.tunnel?.tunnel_type,
            txBytes: tx,
            rxBytes: rx,
          })
        })

        const isRunning = inst.running !== false
        networks[netName].nodes.push({
          machineId: mid,
          instanceId: instId,
          hostname: m.info?.hostname || mid.slice(0, 8),
          osName: m.info?.os_info?.name || 'Linux',
          version: m.info?.version,
          publicIp,
          virtualIpv4,
          virtualIpv6,
          status: isRunning ? (peersList.length > 0 ? (peersList.some((p) => p.isP2P) ? 'online' : 'relay') : 'online') : 'offline',
          uploadBytes: totalTx,
          downloadBytes: totalRx,
          peers: peersList,
        })

        networks[netName].totalNodes++
        if (isRunning) {
          networks[netName].onlineNodes++
        }
      })
    })

    return networks
  })

  // 扁平化设备资产列表
  const deviceList = computed<DeviceItem[]>(() => {
    return machines.value.map((m) => {
      const mid = uuidToStr(m.info?.machine_id)
      return {
        machine_id: mid,
        hostname: m.info?.hostname || (mid ? mid.slice(0, 8) : '未命名设备'),
        os_name: m.info?.os_info?.name || 'Linux',
        version: m.info?.version || 'v2.6.x',
        report_time: m.info?.report_time,
        running_instances: (m.info?.running_network_instances || []).map(uuidToStr),
        failed_instances: [],
        location: m.location,
        client_url: m.client_url,
      }
    })
  })

  // 当前选中的虚拟网成员
  const currentNetwork = computed<MeshNetwork | null>(() => {
    const list = Object.values(meshNetworks.value)
    if (list.length === 0) return null
    return meshNetworks.value[activeNetworkName.value] || list[0]
  })

  const fetchSummary = fetchAll

  return {
    machines,
    deviceList,
    machineNetworkInfos,
    networkConfigs,
    activeNetworkName,
    meshNetworks,
    currentNetwork,
    loading,
    lastUpdated,
    fetchAll,
    fetchSummary,
  }
})

export interface DeviceItem {
  machine_id: string
  hostname: string
  os_name: string
  version: string
  report_time?: string | number
  running_instances: string[]
  failed_instances: string[]
  location?: any
  client_url?: string
}

