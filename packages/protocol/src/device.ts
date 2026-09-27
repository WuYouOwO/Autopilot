import { z } from 'zod';
import { DevicePersonaSchema } from './persona.js';
import { IntentStateSchema } from './intent.js';
import { VirtualIpSchema } from './network.js';

export const DeviceTelemetrySchema = z.object({
  cpuUsagePercent: z.number().min(0).max(100).default(0),
  memoryUsagePercent: z.number().min(0).max(100).default(0),
  rxBytesTotal: z.number().nonnegative().default(0),
  txBytesTotal: z.number().nonnegative().default(0),
  latencyMs: z.record(z.string(), z.number()).default({}), // peerId -> latency ms
  uptimeSeconds: z.number().nonnegative().default(0)
});

export type DeviceTelemetry = z.infer<typeof DeviceTelemetrySchema>;

export const GeoLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().optional(),
  country: z.string().optional(),
  cloudProvider: z.enum(['AWS', 'GCP', 'AZURE', 'CLOUDFLARE', 'ALIBABA', 'TENCENT', 'ORACLE', 'ON_PREMISE', 'EDGE']).default('EDGE')
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

export const DeviceSchema = z.object({
  id: z.string().min(1),
  hostname: z.string().min(1),
  persona: DevicePersonaSchema,
  userIntent: IntentStateSchema.default('ACTIVE'),
  publicKeyX25519: z.string().min(32), // Base64 or Hex public key for zero-trust authorization
  virtualIps: z.record(z.string(), VirtualIpSchema).default({}), // networkId -> VirtualIp
  clientVersion: z.string().default('1.0.0'),
  os: z.string().default('linux'),
  geo: GeoLocationSchema.optional(),
  tags: z.array(z.string()).default([]),
  lastHeartbeat: z.number(),
  telemetry: DeviceTelemetrySchema.optional()
});

export type Device = z.infer<typeof DeviceSchema>;
