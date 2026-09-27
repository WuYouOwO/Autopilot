import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { networks, deviceNetworks, devices, aclRules, appConnectors } from '../db/schema.js';
import { cryptoRandomString } from '../utils.js';
import { AppEnv } from '../types.js';

export const networksRouter = new Hono<AppEnv>();

// List all networks
networksRouter.get('/', async (c) => {
  const db = c.get('db' as any);
  const allNets = await db.select().from(networks);
  return c.json({ networks: allNets });
});

// Create Network with Dual-Stack CIDR
networksRouter.post('/', async (c) => {
  const db = c.get('db' as any);
  const body = await c.req.json<{
    name: string;
    ipv4Cidr: string;
    ipv6Cidr?: string;
    networkSecret?: string;
  }>();

  if (!body.name || !body.ipv4Cidr) {
    return c.json({ error: 'name and ipv4Cidr are required' }, 400);
  }

  const networkId = `net_${cryptoRandomString(12)}`;
  const now = Date.now();
  const secret = body.networkSecret || cryptoRandomString(16);

  await db.insert(networks).values({
    id: networkId,
    name: body.name,
    networkSecret: secret,
    ipv4Cidr: body.ipv4Cidr,
    ipv6Cidr: body.ipv6Cidr || null,
    dhcpEnabled: true,
    createdAt: now,
    updatedAt: now
  });

  return c.json({
    id: networkId,
    name: body.name,
    ipv4Cidr: body.ipv4Cidr,
    ipv6Cidr: body.ipv6Cidr,
    networkSecret: secret,
    message: 'Network created successfully.'
  }, 201);
});

// Update Network Configuration (e.g. update IPv4 / IPv6 CIDR)
networksRouter.patch('/:id', async (c) => {
  const networkId = c.req.param('id');
  const db = c.get('db' as any);
  const body = await c.req.json<{
    name?: string;
    ipv4Cidr?: string;
    ipv6Cidr?: string;
  }>();

  const updateData: any = { updatedAt: Date.now() };
  if (body.name) updateData.name = body.name;
  if (body.ipv4Cidr) updateData.ipv4Cidr = body.ipv4Cidr;
  if (body.ipv6Cidr !== undefined) updateData.ipv6Cidr = body.ipv6Cidr;

  await db.update(networks).set(updateData).where(eq(networks.id, networkId));

  const updated = await db.select().from(networks).where(eq(networks.id, networkId)).get();
  return c.json({
    success: true,
    network: updated,
    message: 'Network configuration updated successfully.'
  });
});

// Topology Aggregation Endpoint for HUD:
networksRouter.get('/:id/topology', async (c) => {
  const networkId = c.req.param('id');
  const db = c.get('db' as any);

  const net = await db.select().from(networks).where(eq(networks.id, networkId)).get();
  if (!net) {
    return c.json({ error: 'Network not found' }, 404);
  }

  const links = await db.select().from(deviceNetworks).where(eq(deviceNetworks.networkId, networkId));
  const allDevices = await db.select().from(devices);
  const allConnectors = await db.select().from(appConnectors).where(eq(appConnectors.networkId, networkId));

  const nodes: any[] = [];
  const edges: any[] = [];

  // Add Subnet center node (◇ Subnet)
  nodes.push({
    id: `subnet_${net.id}`,
    label: net.name,
    type: 'SUBNET',
    shape: 'DIAMOND',
    cidr4: net.ipv4Cidr,
    cidr6: net.ipv6Cidr,
    virtualIpv4: net.ipv4Cidr,
    virtualIpv6: net.ipv6Cidr,
    status: 'ACTIVE'
  });

  for (const link of links) {
    const dev = allDevices.find((d: any) => d.id === link.deviceId);
    if (!dev) continue;

    const isGateway = dev.persona === 'SERVER_HEADLESS' && (dev.tags?.includes('gateway') || false);
    const nodeType = isGateway ? 'GATEWAY' : 'TERMINAL';
    const shape = isGateway ? 'HEXAGON' : 'CIRCLE';

    nodes.push({
      id: dev.id,
      label: dev.hostname,
      type: nodeType,
      shape: shape,
      persona: dev.persona,
      userIntent: dev.userIntent,
      publicKeyX25519: dev.publicKeyX25519,
      virtualIpv4: link.virtualIpv4,
      virtualIpv6: link.virtualIpv6,
      os: dev.os,
      geo: {
        latitude: dev.latitude,
        longitude: dev.longitude,
        city: dev.city,
        country: dev.country,
        cloudProvider: dev.cloudProvider
      },
      telemetry: JSON.parse(dev.telemetry || '{}'),
      lastSeenSecondsAgo: Math.round((Date.now() - dev.lastHeartbeat) / 1000)
    });

    edges.push({
      id: `edge_${dev.id}_subnet`,
      source: dev.id,
      target: `subnet_${net.id}`,
      active: dev.userIntent === 'ACTIVE',
      latencyMs: dev.userIntent === 'ACTIVE' ? Math.floor(Math.random() * 25) + 5 : 0
    });
  }

  return c.json({
    network: net,
    nodes,
    edges,
    connectors: allConnectors
  });
});

// ACL Rules for Network
networksRouter.get('/:id/acl', async (c) => {
  const networkId = c.req.param('id');
  const db = c.get('db' as any);
  const rules = await db.select().from(aclRules).where(eq(aclRules.networkId, networkId));
  return c.json({ rules });
});

networksRouter.post('/:id/acl', async (c) => {
  const networkId = c.req.param('id');
  const db = c.get('db' as any);
  const body = await c.req.json<{
    name: string;
    priority?: number;
    action?: 'ALLOW' | 'DENY';
    sourceTags?: string[];
    destTags?: string[];
    protocol?: string;
    destPorts?: number[];
    description?: string;
  }>();

  const ruleId = `acl_${cryptoRandomString(12)}`;
  const now = Date.now();

  const ruleName = body.name || `ACL-Rule-${ruleId.slice(4, 10)}`;

  await db.insert(aclRules).values({
    id: ruleId,
    networkId,
    priority: body.priority ?? 100,
    name: ruleName,
    action: body.action ?? 'ALLOW',
    sourceTags: JSON.stringify(body.sourceTags || []),
    destTags: JSON.stringify(body.destTags || []),
    protocol: body.protocol || 'ANY',
    destPorts: JSON.stringify(body.destPorts || []),
    description: body.description || '',
    enabled: true,
    createdAt: now
  });

  return c.json({
    id: ruleId,
    networkId,
    name: ruleName,
    priority: body.priority ?? 100,
    action: body.action ?? 'ALLOW',
    sourceTags: body.sourceTags || [],
    destTags: body.destTags || [],
    protocol: body.protocol || 'ANY',
    destPorts: body.destPorts || [],
    message: 'ACL rule created successfully.'
  }, 201);
});

// Delete ACL Rule
networksRouter.delete('/:id/acl/:ruleId', async (c) => {
  const ruleId = c.req.param('ruleId');
  const db = c.get('db' as any);
  await db.delete(aclRules).where(eq(aclRules.id, ruleId));
  return c.json({ success: true, ruleId, message: 'ACL rule deleted' });
});
