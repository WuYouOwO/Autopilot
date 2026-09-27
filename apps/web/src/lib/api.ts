export interface DeviceData {
  id: string;
  hostname: string;
  persona: 'SERVER_HEADLESS' | 'WORKSTATION_INTERACTIVE';
  userIntent: 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED';
  publicKeyX25519: string;
  os: string;
  clientVersion: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  cloudProvider: string;
  tags: string[];
  telemetry: {
    cpuUsagePercent?: number;
    memoryUsagePercent?: number;
    rxBytesTotal: number;
    txBytesTotal: number;
    uptimeSeconds?: number;
  };
  lastHeartbeat: number;
  networks: Array<{
    networkId: string;
    virtualIpv4?: string;
    virtualIpv6?: string;
    intentState: string;
  }>;
}

export interface NetworkData {
  id: string;
  name: string;
  networkSecret: string;
  ipv4Cidr: string;
  ipv6Cidr?: string;
  dhcpEnabled: boolean;
  createdAt: number;
}

export interface ACLRuleData {
  id: string;
  networkId: string;
  priority: number;
  name: string;
  action: 'ALLOW' | 'DENY';
  sourceTags: string[];
  destTags: string[];
  protocol: string;
  destPorts: number[];
  description?: string;
  enabled?: boolean;
}

export interface AppConnectorData {
  id: string;
  networkId: string;
  deviceId?: string;
  domainPattern: string;
  assignedCidr32: string;
  targetHost: string;
  targetPort?: number;
  technitiumSynced: boolean;
  enabled?: boolean;
}

export interface TopologyData {
  network: NetworkData;
  nodes: Array<{
    id: string;
    label: string;
    type: 'TERMINAL' | 'GATEWAY' | 'SUBNET';
    shape: 'CIRCLE' | 'HEXAGON' | 'DIAMOND';
    persona?: 'SERVER_HEADLESS' | 'WORKSTATION_INTERACTIVE';
    userIntent?: 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED';
    publicKeyX25519?: string;
    virtualIpv4?: string;
    virtualIpv6?: string;
    os?: string;
    telemetry?: any;
    geo?: any;
    lastSeenSecondsAgo?: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    active: boolean;
    latencyMs: number;
  }>;
  connectors: any[];
}

const DEFAULT_NETWORKS: NetworkData[] = [
  {
    id: 'net_corp_zero_trust',
    name: 'Production Zero-Trust SD-WAN',
    networkSecret: 'autopilot-sec-9921',
    ipv4Cidr: '10.144.0.0/16',
    ipv6Cidr: 'fd00:cafe:2026::/64',
    dhcpEnabled: true,
    createdAt: Date.now() - 86400000 * 3
  }
];

const DEFAULT_DEVICES: DeviceData[] = [
  {
    id: 'dev_gw_hk01',
    hostname: 'hk-edge-gw-01',
    persona: 'SERVER_HEADLESS',
    userIntent: 'ACTIVE',
    publicKeyX25519: 'e89c091f09bbac41d9238804ad723019842bf45091aef02187654321fedcba09',
    os: 'linux',
    clientVersion: '1.2.0',
    latitude: 22.3193,
    longitude: 114.1694,
    city: 'Hong Kong',
    country: 'HK',
    cloudProvider: 'CLOUDFLARE',
    tags: ['gateway', 'edge-pop', 'anycast'],
    telemetry: {
      cpuUsagePercent: 14,
      memoryUsagePercent: 32,
      rxBytesTotal: 182390192,
      txBytesTotal: 293810291,
      uptimeSeconds: 345600
    },
    lastHeartbeat: Date.now() - 1200,
    networks: [
      {
        networkId: 'net_corp_zero_trust',
        virtualIpv4: '10.144.0.1',
        virtualIpv6: 'fd00:cafe:2026::1',
        intentState: 'ACTIVE'
      }
    ]
  },
  {
    id: 'dev_ws_mac01',
    hostname: 'sarah-macbook-pro',
    persona: 'WORKSTATION_INTERACTIVE',
    userIntent: 'ACTIVE',
    publicKeyX25519: '7d9834b6b66b7c4a179e8cbb6c79a4c56891000a982348b610c4d81234567890',
    os: 'darwin',
    clientVersion: '1.2.0',
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    country: 'US',
    cloudProvider: 'EDGE',
    tags: ['workstation', 'security-eng'],
    telemetry: {
      cpuUsagePercent: 8,
      memoryUsagePercent: 45,
      rxBytesTotal: 9820391,
      txBytesTotal: 4120938,
      uptimeSeconds: 12000
    },
    lastHeartbeat: Date.now() - 2500,
    networks: [
      {
        networkId: 'net_corp_zero_trust',
        virtualIpv4: '10.144.1.15',
        virtualIpv6: 'fd00:cafe:2026::15',
        intentState: 'ACTIVE'
      }
    ]
  },
  {
    id: 'dev_ws_thinkpad',
    hostname: 'dev-thinkpad-x1',
    persona: 'WORKSTATION_INTERACTIVE',
    userIntent: 'USER_PAUSED',
    publicKeyX25519: '66a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcde',
    os: 'linux',
    clientVersion: '1.2.0',
    latitude: 35.6762,
    longitude: 139.6503,
    city: 'Tokyo',
    country: 'JP',
    cloudProvider: 'EDGE',
    tags: ['workstation', 'frontend'],
    telemetry: {
      cpuUsagePercent: 2,
      memoryUsagePercent: 28,
      rxBytesTotal: 4501923,
      txBytesTotal: 1029384,
      uptimeSeconds: 58000
    },
    lastHeartbeat: Date.now() - 14000,
    networks: [
      {
        networkId: 'net_corp_zero_trust',
        virtualIpv4: '10.144.1.20',
        virtualIpv6: 'fd00:cafe:2026::20',
        intentState: 'USER_PAUSED'
      }
    ]
  },
  {
    id: 'dev_srv_k8s',
    hostname: 'sg-cluster-worker-01',
    persona: 'SERVER_HEADLESS',
    userIntent: 'ACTIVE',
    publicKeyX25519: '98ab01cd23ef4567890abcdef1234567890abcdef1234567890abcdef1234567',
    os: 'linux',
    clientVersion: '1.2.0',
    latitude: 1.3521,
    longitude: 103.8198,
    city: 'Singapore',
    country: 'SG',
    cloudProvider: 'AWS',
    tags: ['k8s', 'production', 'database'],
    telemetry: {
      cpuUsagePercent: 62,
      memoryUsagePercent: 78,
      rxBytesTotal: 849201948,
      txBytesTotal: 991820391,
      uptimeSeconds: 980200
    },
    lastHeartbeat: Date.now() - 1800,
    networks: [
      {
        networkId: 'net_corp_zero_trust',
        virtualIpv4: '10.144.2.10',
        virtualIpv6: 'fd00:cafe:2026::2:10',
        intentState: 'ACTIVE'
      }
    ]
  }
];

class AutopilotApi {
  private baseURL: string = '';

  constructor() {
    this.baseURL = window.location.origin;
  }

  async getNetworks(): Promise<NetworkData[]> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks`);
      if (res.ok) {
        const data = await res.json();
        return data.networks?.length > 0 ? data.networks : DEFAULT_NETWORKS;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_NETWORKS;
  }

  async updateNetwork(networkId: string, data: { name?: string; ipv4Cidr?: string; ipv6Cidr?: string }): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks/${networkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getDevices(): Promise<DeviceData[]> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices`);
      if (res.ok) {
        const data = await res.json();
        return data.devices?.length > 0 ? data.devices : DEFAULT_DEVICES;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DEVICES;
  }

  async enrollDevice(deviceData: {
    hostname: string;
    persona: 'SERVER_HEADLESS' | 'WORKSTATION_INTERACTIVE';
    publicKeyX25519: string;
    networkId?: string;
    tags?: string[];
    geo?: any;
  }): Promise<any> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      return await res.json();
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices/${deviceId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async updateDevicePersona(deviceId: string, persona: 'SERVER_HEADLESS' | 'WORKSTATION_INTERACTIVE'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices/${deviceId}/persona`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async pauseDevice(deviceId: string, networkId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices/${deviceId}/networks/${networkId}/pause?actor=ADMIN`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async resumeDevice(deviceId: string, networkId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/devices/${deviceId}/networks/${networkId}/resume`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async revokeDevice(deviceId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/auth/revoke/${deviceId}`, {
        method: 'POST'
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  async getAclRules(networkId: string): Promise<ACLRuleData[]> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks/${networkId}/acl`);
      if (res.ok) {
        const data = await res.json();
        return data.rules?.map((r: any) => ({
          ...r,
          sourceTags: typeof r.sourceTags === 'string' ? JSON.parse(r.sourceTags) : r.sourceTags,
          destTags: typeof r.destTags === 'string' ? JSON.parse(r.destTags) : r.destTags,
          destPorts: typeof r.destPorts === 'string' ? JSON.parse(r.destPorts) : r.destPorts
        })) || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  async createAclRule(networkId: string, rule: any): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks/${networkId}/acl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async deleteAclRule(networkId: string, ruleId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks/${networkId}/acl/${ruleId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getConnectors(): Promise<AppConnectorData[]> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/connectors`);
      if (res.ok) {
        const data = await res.json();
        return data.connectors || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  async createConnector(data: any): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async deleteConnector(connectorId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/connectors/${connectorId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getTopology(networkId: string): Promise<TopologyData> {
    try {
      const res = await fetch(`${this.baseURL}/api/v1/networks/${networkId}/topology`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const net = DEFAULT_NETWORKS[0];
    const nodes: any[] = [
      {
        id: `subnet_${net.id}`,
        label: net.name,
        type: 'SUBNET',
        shape: 'DIAMOND',
        virtualIpv4: net.ipv4Cidr,
        virtualIpv6: net.ipv6Cidr
      },
      ...DEFAULT_DEVICES.map(d => ({
        id: d.id,
        label: d.hostname,
        type: d.tags.includes('gateway') ? 'GATEWAY' : 'TERMINAL',
        shape: d.tags.includes('gateway') ? 'HEXAGON' : 'CIRCLE',
        persona: d.persona,
        userIntent: d.userIntent,
        publicKeyX25519: d.publicKeyX25519,
        virtualIpv4: d.networks[0]?.virtualIpv4,
        virtualIpv6: d.networks[0]?.virtualIpv6,
        os: d.os,
        telemetry: d.telemetry,
        geo: {
          latitude: d.latitude,
          longitude: d.longitude,
          city: d.city,
          country: d.country,
          cloudProvider: d.cloudProvider
        },
        lastSeenSecondsAgo: Math.round((Date.now() - d.lastHeartbeat) / 1000)
      }))
    ];

    const edges = DEFAULT_DEVICES.map(d => ({
      id: `edge_${d.id}`,
      source: d.id,
      target: `subnet_${net.id}`,
      active: d.userIntent === 'ACTIVE',
      latencyMs: d.userIntent === 'ACTIVE' ? Math.floor(Math.random() * 25) + 8 : 0
    }));

    return { network: net, nodes, edges, connectors: [] };
  }
}

export const api = new AutopilotApi();
