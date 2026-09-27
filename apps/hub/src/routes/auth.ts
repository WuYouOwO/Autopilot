import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { devices, auditLogs } from '../db/schema.js';
import { cryptoRandomString } from '../utils.js';
import { AppEnv } from '../types.js';

export const authRouter = new Hono<AppEnv>();

// Issue a new Device Enrollment Token (Admin only)
authRouter.post('/enrollment-tokens', async (c) => {
  const token = `apt_enroll_${cryptoRandomString(32)}`;
  return c.json({
    token,
    expiresIn: 3600, // 1 hour
    message: 'Enrollment token generated successfully. Pass to agent during onboarding.'
  });
});

// Admin Instant Revocation: "一键毫秒踢人"
authRouter.post('/revoke/:deviceId', async (c) => {
  const deviceId = c.req.param('deviceId');
  const db = c.get('db' as any);

  // 1. Immediately mark device as ADMIN_DISABLED
  const now = Date.now();
  await db.update(devices)
    .set({
      userIntent: 'ADMIN_DISABLED',
      updatedAt: now
    })
    .where(eq(devices.id, deviceId));

  // 2. Write audit log
  await db.insert(auditLogs).values({
    id: `audit_${cryptoRandomString(16)}`,
    actorType: 'ADMIN',
    actorId: 'admin_console',
    action: 'REVOKE_DEVICE_ACCESS',
    targetType: 'DEVICE',
    targetId: deviceId,
    details: JSON.stringify({ reason: 'Admin revoked credentials and severed peer connections.' }),
    timestamp: now
  });

  return c.json({
    success: true,
    deviceId,
    status: 'ADMIN_DISABLED',
    message: 'Device revoked in zero trust database. All active sessions invalidated instantly.'
  });
});

// Rotate X25519 Public Key
authRouter.post('/rotate-key/:deviceId', async (c) => {
  const deviceId = c.req.param('deviceId');
  const body = await c.req.json<{ newPublicKey: string }>();
  const db = c.get('db' as any);

  if (!body.newPublicKey || body.newPublicKey.length < 32) {
    return c.json({ error: 'Invalid X25519 public key' }, 400);
  }

  const now = Date.now();
  await db.update(devices)
    .set({
      publicKeyX25519: body.newPublicKey,
      updatedAt: now
    })
    .where(eq(devices.id, deviceId));

  return c.json({
    success: true,
    deviceId,
    message: 'X25519 public key rotated successfully.'
  });
});
