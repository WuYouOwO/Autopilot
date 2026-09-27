import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getLocalDb, getD1Db } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { devicesRouter } from './routes/devices.js';
import { networksRouter } from './routes/networks.js';
import { gatewayRouter } from './routes/gateway.js';
import { connectorRouter } from './routes/connector.js';
import { AppEnv } from './types.js';

export const app = new Hono<AppEnv>();

// Enable CORS & Request Logger
app.use('*', cors());
app.use('*', logger());

// Isomorphic Database Middleware:
// If running on Cloudflare Workers, c.env.DB is populated.
// If running in local Node/Bun, fall back to SQLite via getLocalDb().
app.use('*', async (c, next) => {
  if (c.env && c.env.DB) {
    c.set('db', getD1Db(c.env.DB));
  } else {
    c.set('db', getLocalDb());
  }
  await next();
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    system: 'Autopilot Zero-Trust Hub',
    version: '1.0.0',
    mode: c.env?.DB ? 'Cloudflare Workers (D1)' : 'Node.js (SQLite)',
    timestamp: Date.now()
  });
});

// Mount API subrouters
app.route('/api/v1/auth', authRouter);
app.route('/api/v1/devices', devicesRouter);
app.route('/api/v1/networks', networksRouter);
app.route('/api/v1/gateway', gatewayRouter);
app.route('/api/v1/connectors', connectorRouter);

export default app;
