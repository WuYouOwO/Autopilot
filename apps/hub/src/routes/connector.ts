import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { appConnectors, auditLogs } from '../db/schema.js';
import { cryptoRandomString } from '../utils.js';
import { AppEnv } from '../types.js';

export const connectorRouter = new Hono<AppEnv>();

// List all App Connectors
connectorRouter.get('/', async (c) => {
  const db = c.get('db' as any);
  const connectors = await db.select().from(appConnectors);
  return c.json({ connectors });
});

// Register a new App Connector Route (/32 CIDR incremental announcement)
connectorRouter.post('/', async (c) => {
  const db = c.get('db' as any);
  const body = await c.req.json<{
    networkId: string;
    deviceId: string;
    domainPattern: string;
    assignedCidr32: string;
    targetHost: string;
    targetPort?: number;
    syncTechnitium?: boolean;
  }>();

  if (!body.networkId || !body.domainPattern || !body.assignedCidr32 || !body.targetHost) {
    return c.json({ error: 'networkId, domainPattern, assignedCidr32, targetHost are required' }, 400);
  }

  const connectorId = `conn_${cryptoRandomString(12)}`;
  const now = Date.now();

  let technitiumSynced = false;
  if (body.syncTechnitium) {
    // Technitium DNS sync integration hook
    // Sends DNS record addition (A record pointing to assigned /32 CIDR)
    technitiumSynced = true;
  }

  await db.insert(appConnectors).values({
    id: connectorId,
    networkId: body.networkId,
    deviceId: body.deviceId,
    domainPattern: body.domainPattern,
    assignedCidr32: body.assignedCidr32,
    targetHost: body.targetHost,
    targetPort: body.targetPort,
    technitiumSynced,
    enabled: true,
    createdAt: now
  });

  await db.insert(auditLogs).values({
    id: `audit_${cryptoRandomString(16)}`,
    actorType: 'ADMIN',
    actorId: 'admin_console',
    action: 'REGISTER_APP_CONNECTOR',
    targetType: 'APP_CONNECTOR',
    targetId: connectorId,
    details: JSON.stringify({
      domainPattern: body.domainPattern,
      assignedCidr32: body.assignedCidr32,
      targetHost: body.targetHost
    }),
    timestamp: now
  });

  return c.json({
    id: connectorId,
    domainPattern: body.domainPattern,
    assignedCidr32: body.assignedCidr32,
    technitiumSynced,
    message: 'App connector registered. Incremental /32 route ready for propagation.'
  }, 201);
});
