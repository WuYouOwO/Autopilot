import { eq } from 'drizzle-orm';
import { networks, devices, deviceNetworks, aclRules, appConnectors } from './schema.js';

export async function seedInitialData(db: any) {
  try {
    const defaultNet = await db.select().from(networks).where(eq(networks.id, 'net_corp_zero_trust')).get();
    if (defaultNet) {
      return; // Default network already seeded
    }

    console.log('[Autopilot Seed] Initializing default zero-trust network topology...');
    const now = Date.now();

    // 1. Production Network
    const netId = 'net_corp_zero_trust';
    await db.insert(networks).values({
      id: netId,
      name: 'Production Zero-Trust SD-WAN',
      networkSecret: 'autopilot-sec-9921',
      ipv4Cidr: '10.144.0.0/16',
      ipv6Cidr: 'fd00:cafe:2026::/64',
      dhcpEnabled: true,
      createdAt: now,
      updatedAt: now
    });

    // 2. Devices
    const devList = [
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
        tags: JSON.stringify(['gateway', 'edge-pop', 'anycast']),
        telemetry: JSON.stringify({
          cpuUsagePercent: 14,
          memoryUsagePercent: 32,
          rxBytesTotal: 182390192,
          txBytesTotal: 293810291,
          uptimeSeconds: 345600
        }),
        virtualIpv4: '10.144.0.1',
        virtualIpv6: 'fd00:cafe:2026::1'
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
        tags: JSON.stringify(['workstation', 'security-eng']),
        telemetry: JSON.stringify({
          cpuUsagePercent: 8,
          memoryUsagePercent: 45,
          rxBytesTotal: 9820391,
          txBytesTotal: 4120938,
          uptimeSeconds: 12000
        }),
        virtualIpv4: '10.144.1.15',
        virtualIpv6: 'fd00:cafe:2026::15'
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
        tags: JSON.stringify(['workstation', 'frontend']),
        telemetry: JSON.stringify({
          cpuUsagePercent: 2,
          memoryUsagePercent: 28,
          rxBytesTotal: 4501923,
          txBytesTotal: 1029384,
          uptimeSeconds: 58000
        }),
        virtualIpv4: '10.144.1.20',
        virtualIpv6: 'fd00:cafe:2026::20'
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
        tags: JSON.stringify(['k8s', 'production', 'database']),
        telemetry: JSON.stringify({
          cpuUsagePercent: 62,
          memoryUsagePercent: 78,
          rxBytesTotal: 849201948,
          txBytesTotal: 991820391,
          uptimeSeconds: 980200
        }),
        virtualIpv4: '10.144.2.10',
        virtualIpv6: 'fd00:cafe:2026::2:10'
      }
    ];

    for (const d of devList) {
      await db.insert(devices).values({
        id: d.id,
        hostname: d.hostname,
        persona: d.persona,
        userIntent: d.userIntent,
        publicKeyX25519: d.publicKeyX25519,
        os: d.os,
        clientVersion: d.clientVersion,
        latitude: d.latitude,
        longitude: d.longitude,
        city: d.city,
        country: d.country,
        cloudProvider: d.cloudProvider,
        tags: d.tags,
        telemetry: d.telemetry,
        lastHeartbeat: now - 1500,
        createdAt: now - 3600000,
        updatedAt: now
      });

      await db.insert(deviceNetworks).values({
        id: `dn_${d.id}`,
        deviceId: d.id,
        networkId: netId,
        virtualIpv4: d.virtualIpv4,
        virtualIpv6: d.virtualIpv6,
        intentState: d.userIntent,
        createdAt: now
      });
    }

    // 3. ACL Rules
    await db.insert(aclRules).values({
      id: 'acl_dns',
      networkId: netId,
      priority: 10,
      name: 'Allow Intra-Mesh DNS',
      action: 'ALLOW',
      sourceTags: JSON.stringify(['*']),
      destTags: JSON.stringify(['gateway']),
      protocol: 'UDP',
      destPorts: JSON.stringify([53]),
      enabled: true,
      createdAt: now
    });

    await db.insert(aclRules).values({
      id: 'acl_ssh',
      networkId: netId,
      priority: 20,
      name: 'Allow Admin SSH to Headless IDC',
      action: 'ALLOW',
      sourceTags: JSON.stringify(['security-eng']),
      destTags: JSON.stringify(['production']),
      protocol: 'TCP',
      destPorts: JSON.stringify([22]),
      enabled: true,
      createdAt: now
    });

    // 4. App Connectors
    await db.insert(appConnectors).values({
      id: 'conn_git',
      networkId: netId,
      deviceId: 'dev_srv_k8s',
      domainPattern: 'gitlab.corp.internal',
      assignedCidr32: '10.144.254.10/32',
      targetHost: '192.168.1.100',
      technitiumSynced: true,
      enabled: true,
      createdAt: now
    });

    console.log('[Autopilot Seed] Initialization complete with 4 nodes and dual-stack subnets.');
  } catch (err) {
    console.error('[Autopilot Seed] Failed to seed initial data:', err);
  }
}
