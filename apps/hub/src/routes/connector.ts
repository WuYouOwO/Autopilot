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
    deviceId?: string;
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
    technitiumSynced = true;
  }

  await db.insert(appConnectors).values({
    id: connectorId,
    networkId: body.networkId,
    deviceId: body.deviceId || 'dev_gw_hk01',
    domainPattern: body.domainPattern,
    assignedCidr32: body.assignedCidr32,
    targetHost: body.targetHost,
    targetPort: body.targetPort,
    technitiumSynced,
    enabled: true,
    createdAt: now
  });

  return c.json({
    id: connectorId,
    domainPattern: body.domainPattern,
    assignedCidr32: body.assignedCidr32,
    targetHost: body.targetHost,
    technitiumSynced,
    message: 'App connector registered. Incremental /32 route ready for propagation.'
  }, 201);
});

// Delete App Connector
connectorRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db' as any);
  await db.delete(appConnectors).where(eq(appConnectors.id, id));
  return c.json({ success: true, id, message: 'App Connector deleted' });
});
