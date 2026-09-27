import { serve } from '@hono/node-server';
import app from './index.js';

const port = Number(process.env.PORT) || 8787;

console.log(`[Autopilot Hub] Starting local self-hosted instance on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port
});
