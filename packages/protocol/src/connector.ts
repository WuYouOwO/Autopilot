import { z } from 'zod';

export const AppConnectorRouteSchema = z.object({
  id: z.string().min(1),
  networkId: z.string().min(1),
  deviceId: z.string().min(1),
  domainPattern: z.string().min(1), // e.g. "*.corp.internal", "git.internal"
  assignedCidr32: z.string().min(1), // e.g. "10.144.254.10/32"
  targetHost: z.string().min(1),      // Real backend host or IP
  targetPort: z.number().int().min(1).max(65535).optional(),
  technitiumRecordSynced: z.boolean().default(false),
  enabled: z.boolean().default(true),
  createdAt: z.number()
});

export type AppConnectorRoute = z.infer<typeof AppConnectorRouteSchema>;

export const TechnitiumSyncReqSchema = z.object({
  domain: z.string(),
  ipAddress: z.string(),
  zone: z.string().default('autopilot.internal'),
  recordType: z.enum(['A', 'AAAA']).default('A'),
  ttlSeconds: z.number().int().default(60)
});

export type TechnitiumSyncReq = z.infer<typeof TechnitiumSyncReqSchema>;
