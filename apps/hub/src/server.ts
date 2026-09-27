import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import app from './index.js';
import { getLocalDb } from './db/index.js';
import { seedInitialData } from './db/seed.js';

const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || '0.0.0.0';

// Seed initial database state if empty
const db = getLocalDb();
await seedInitialData(db);

// Serve static frontend assets from apps/web/dist
const webDistPath = path.resolve(process.cwd(), '../web/dist');
const indexHtmlPath = path.join(webDistPath, 'index.html');

app.use('/*', serveStatic({ root: '../web/dist' }));

// Client-side SPA routing fallback (return index.html for non-API web routes)
app.notFound((c) => {
  if (c.req.path.startsWith('/api/') || c.req.path === '/health') {
    return c.json({ error: 'Endpoint not found', path: c.req.path }, 404);
  }
  if (fs.existsSync(indexHtmlPath)) {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    return c.html(html);
  }
  return c.text('Autopilot Control Plane: Web UI assets building or missing.', 404);
});

console.log(`====================================================================`);
console.log(`  [AUTOPILOT CONTROL PLANE] Running Unified Instance`);
console.log(`  ✦ Access Web UI & Control Hub: http://${host}:${port}`);
console.log(`  ✦ Health Probe: http://${host}:${port}/health`);
console.log(`  ✦ API Base: http://${host}:${port}/api/v1/`);
console.log(`====================================================================`);

serve({
  fetch: app.fetch,
  port,
  hostname: host
});
