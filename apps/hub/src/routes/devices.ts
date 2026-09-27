import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { devices, deviceNetworks, networks, auditLogs } from '../db/schema.js';
import { transitionIntentState, DevicePersona } from '@autopilot/protocol';
import { cryptoRandomString, allocateIpv4, allocateIpv6 } from '../utils.js';
import { AppEnv } from '../types.js';

export const devicesRouter = new Hono<AppEnv>();

// List all devices
devicesRouter.get('/', async (c) => {
  const db = c.get('db' as any);
  const allDevices = await db.select().from(devices);
  const allLinks = await db.select().from(deviceNetworks);

  const enriched = allDevices.map((d: any) => {
    const links = allLinks.filter((l: any) => l.deviceId === d.id);
    return {
      ...d,
      tags: JSON.parse(d.tags || '[]'),
      telemetry: JSON.parse(d.telemetry || '{}'),
      networks: links.map((l: any) => ({
        networkId: l.networkId,
        virtualIpv4: l.virtualIpv4,
        virtualIpv6: l.virtualIpv6,
        intentState: l.intentState
      }))
    };
  });

  return c.json({ devices: enriched });
});

// Register or Onboard a Device
devicesRouter.post('/', async (c) => {
  const db = c.get('db' as any);
  const body = await c.req.json<{
    hostname: string;
    persona?: DevicePersona;
    publicKeyX25519: string;
    os?: string;
    clientVersion?: string;
    networkId?: string;
    geo?: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
      cloudProvider?: string;
    };
    tags?: string[];
  }>();

  if (!body.hostname || !body.publicKeyX25519) {
    return c.json({ error: 'hostname and publicKeyX25519 are required' }, 400);
  }

  const deviceId = `dev_${cryptoRandomString(12)}`;
  const now = Date.now();
  const persona: DevicePersona = body.persona || 'WORKSTATION_INTERACTIVE';

  await db.insert(devices).values({
    id: deviceId,
    hostname: body.hostname,
    persona,
    userIntent: 'ACTIVE',
    publicKeyX25519: body.publicKeyX25519,
    os: body.os || 'linux',
    clientVersion: body.clientVersion || '1.0.0',
    latitude: body.geo?.latitude ?? 37.7749,
    longitude: body.geo?.longitude ?? -122.4194,
    city: body.geo?.city || 'San Francisco',
    country: body.geo?.country || 'US',
    cloudProvider: body.geo?.cloudProvider || 'EDGE',
    tags: JSON.stringify(body.tags || []),
    telemetry: JSON.stringify({ rxBytesTotal: 0, txBytesTotal: 0 }),
    lastHeartbeat: now,
    createdAt: now,
    updatedAt: now
  });

  // If a networkId is specified, join it automatically and allocate IP
  let allocatedIp: { ipv4?: string; ipv6?: string } = {};
  if (body.networkId) {
    const net = await db.select().from(networks).where(eq(networks.id, body.networkId)).get();
    if (net) {
      const existingMembers = await db.select().from(deviceNetworks).where(eq(deviceNetworks.networkId, body.networkId));
      const memberIndex = existingMembers.length;
      allocatedIp = {
        ipv4: allocateIpv4(net.ipv4Cidr, memberIndex),
        ipv6: net.ipv6Cidr ? allocateIpv6(net.ipv6Cidr, memberIndex) : undefined
      };

      await db.insert(deviceNetworks).values({
        id: `dn_${cryptoRandomString(12)}`,
        deviceId,
        networkId: body.networkId,
        virtualIpv4: allocatedIp.ipv4,
        virtualIpv6: allocatedIp.ipv6,
        intentState: 'ACTIVE',
        createdAt: now
      });
    }
  }

  return c.json({
    deviceId,
    hostname: body.hostname,
    persona,
    userIntent: 'ACTIVE',
    allocatedIp,
    message: 'Device enrolled successfully.'
  }, 201);
});

// Out-of-band Fast Channel: User clicks "Disconnect/Pause" in Agent tray or Web
// Sets D1 user_intent = PAUSED (30~50ms async update)
devicesRouter.post('/:id/networks/:net_id/pause', async (c) => {
  const deviceId = c.req.param('id');
  const networkId = c.req.param('net_id');
  const db = c.get('db' as any);

  const device = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
  if (!device) {
    return c.json({ error: 'Device not found' }, 404);
  }

  const transition = transitionIntentState(
    device.userIntent as any,
    'USER_PAUSED',
    device.persona as any,
    'USER'
  );

  if (!transition.allowed) {
    return c.json({ error: transition.reason || 'Pause not permitted' }, 403);
  }

  const now = Date.now();
  await db.update(devices)
    .set({ userIntent: 'USER_PAUSED', updatedAt: now })
    .where(eq(devices.id, deviceId));

  await db.update(deviceNetworks)
    .set({ intentState: 'USER_PAUSED' })
    .where(and(eq(deviceNetworks.deviceId, deviceId), eq(deviceNetworks.networkId, networkId)));

  await db.insert(auditLogs).values({
    id: `audit_${cryptoRandomString(16)}`,
    actorType: 'USER',
    actorId: deviceId,
    action: 'USER_PAUSE_NETWORK',
    targetType: 'NETWORK',
    targetId: networkId,
    details: JSON.stringify({ reason: 'User toggled network off locally.' }),
    timestamp: now
  });

  return c.json({
    success: true,
    deviceId,
    networkId,
    userIntent: 'USER_PAUSED',
    message: 'User intent updated to PAUSED. Gateway will recognize expected sleep and suppress auto-revival.'
  });
});

// User clicks "Connect/Resume" in Agent tray or Web
devicesRouter.post('/:id/networks/:net_id/resume', async (c) => {
  const deviceId = c.req.param('id');
  const networkId = c.req.param('net_id');
  const db = c.get('db' as any);

  const device = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
  if (!device) {
    return c.json({ error: 'Device not found' }, 404);
  }

  if (device.userIntent === 'ADMIN_DISABLED') {
    return c.json({ error: 'Device is disabled by Admin policy. Cannot resume.' }, 403);
  }

  const now = Date.now();
  await db.update(devices)
    .set({ userIntent: 'ACTIVE', updatedAt: now })
    .where(eq(devices.id, deviceId));

  await db.update(deviceNetworks)
    .set({ intentState: 'ACTIVE' })
    .where(and(eq(deviceNetworks.deviceId, deviceId), eq(deviceNetworks.networkId, networkId)));

  return c.json({
    success: true,
    deviceId,
    networkId,
    userIntent: 'ACTIVE',
    message: 'User intent resumed to ACTIVE.'
  });
});

// Heartbeat & Telemetry Reporter from Agent or Gateway
devicesRouter.post('/:id/heartbeat', async (c) => {
  const deviceId = c.req.param('id');
  const body = await c.req.json<{
    telemetry?: any;
    actor?: 'GATEWAY_HEARTBEAT' | 'AGENT';
  }>();
  const db = c.get('db' as any);

  const device = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
  if (!device) {
    return c.json({ error: 'Device not found' }, 404);
  }

  const now = Date.now();
  const updateData: any = {
    lastHeartbeat: now,
    updatedAt: now
  };

  if (body.telemetry) {
    updateData.telemetry = JSON.stringify(body.telemetry);
  }

  // If a gateway heartbeat tries to revive a paused device:
  if (body.actor === 'GATEWAY_HEARTBEAT' && device.userIntent === 'USER_PAUSED') {
    const transition = transitionIntentState(
      device.userIntent as any,
      'ACTIVE',
      device.persona as any,
      'GATEWAY_HEARTBEAT'
    );
    if (transition.allowed) {
      updateData.userIntent = 'ACTIVE';
    }
  }

  await db.update(devices).set(updateData).where(eq(devices.id, deviceId));

  // Fetch updated device state and all associated network states
  const updatedDevice = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
  const networksForDevice = await db.select().from(deviceNetworks).where(eq(deviceNetworks.deviceId, deviceId));

  return c.json({
    deviceId,
    authoritativeIntent: updatedDevice.userIntent, // 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED'
    networks: networksForDevice.map((n: any) => ({
      networkId: n.networkId,
      virtualIpv4: n.virtualIpv4,
      virtualIpv6: n.virtualIpv6,
      intentState: n.intentState
    })),
    timestamp: now
  });
});

// Update Persona (Switch between Headless and Workstation)
devicesRouter.patch('/:id/persona', async (c) => {
  const deviceId = c.req.param('id');
  const body = await c.req.json<{ persona: DevicePersona }>();
  const db = c.get('db' as any);

  if (!body.persona) {
    return c.json({ error: 'persona is required' }, 400);
  }

  await db.update(devices)
    .set({ persona: body.persona, updatedAt: Date.now() })
    .where(eq(devices.id, deviceId));

  return c.json({
    deviceId,
    persona: body.persona,
    message: `Device persona updated to ${body.persona}`
  });
});
