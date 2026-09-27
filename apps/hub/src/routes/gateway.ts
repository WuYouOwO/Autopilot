import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { networks, devices, deviceNetworks } from '../db/schema.js';
import { AppEnv } from '../types.js';

export const gatewayRouter = new Hono<AppEnv>();

// Declarative Gateway Config Pull (Stateless Gateway Sync)
gatewayRouter.get('/config', async (c) => {
  const db = c.get('db' as any);
  const allNets = await db.select().from(networks);
  const allDevices = await db.select().from(devices);
  const allLinks = await db.select().from(deviceNetworks);

  const activeInstances = allNets.map((net: any) => {
    const netLinks = allLinks.filter((l: any) => l.networkId === net.id);
    const activePeers = netLinks
      .map((link: any) => {
        const dev = allDevices.find((d: any) => d.id === link.deviceId);
        if (!dev || dev.userIntent !== 'ACTIVE') return null; // Filter out PAUSED and REVOKED
        return {
          deviceId: dev.id,
          hostname: dev.hostname,
          publicKeyX25519: dev.publicKeyX25519,
          virtualIpv4: link.virtualIpv4,
          virtualIpv6: link.virtualIpv6,
          persona: dev.persona
        };
      })
      .filter(Boolean);

    return {
      networkId: net.id,
      name: net.name,
      networkSecret: net.networkSecret,
      ipv4Cidr: net.ipv4Cidr,
      ipv6Cidr: net.ipv6Cidr,
      peers: activePeers
    };
  });

  return c.json({
    version: Date.now(),
    gatewayRole: 'STATELESS_EXECUTOR',
    networks: activeInstances
  });
});
