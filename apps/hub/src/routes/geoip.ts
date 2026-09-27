import { Hono } from 'hono';
import { resolveGeoIP } from '../services/geoip.js';
import { AppEnv } from '../types.js';

export const geoipRouter = new Hono<AppEnv>();

// Lookup an IP
geoipRouter.get('/lookup', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    return c.json({ error: 'ip query parameter is required' }, 400);
  }
  const result = resolveGeoIP(ip);
  return c.json({ success: true, result });
});

// Detect and lookup caller's IP
geoipRouter.get('/myip', async (c) => {
  const clientIp = 
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

  const result = resolveGeoIP(clientIp);
  return c.json({
    clientIp,
    ...result
  });
});
