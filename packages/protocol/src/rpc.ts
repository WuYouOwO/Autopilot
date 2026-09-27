import { z } from 'zod';

/**
 * EasyTier Native In-Memory IPC/RPC Contracts.
 * Autopilot NEVER disables system adapters directly.
 * All operations are delegated purely via these in-memory IPC calls.
 */

export const EasyTierPeerConfigSchema = z.object({
  uri: z.string() // e.g. "tcp://1.2.3.4:11010", "wg://...", "wss://..."
});

export const RunNetworkInstanceReqSchema = z.object({
  instanceId: z.string().min(1),
  networkName: z.string().min(1),
  networkSecret: z.string().min(1),
  ipv4Addr: z.string().optional(),
  ipv6Addr: z.string().optional(),
  peers: z.array(EasyTierPeerConfigSchema).default([]),
  proxyNetworks: z.array(z.string()).default([]), // App Connector CIDRs
  rpcPortalPort: z.number().int().default(11211)
});

export type RunNetworkInstanceReq = z.infer<typeof RunNetworkInstanceReqSchema>;

export const DeleteNetworkInstanceReqSchema = z.object({
  instanceId: z.string().min(1)
});

export type DeleteNetworkInstanceReq = z.infer<typeof DeleteNetworkInstanceReqSchema>;

export const EasyTierPeerInfoSchema = z.object({
  peerId: z.string(),
  virtualIpv4: z.string().optional(),
  virtualIpv6: z.string().optional(),
  hostname: z.string(),
  latencyMs: z.number().default(0),
  lossRate: z.number().default(0),
  tunnelType: z.enum(['DIRECT_P2P', 'RELAY', 'DISCONNECTED']).default('DIRECT_P2P'),
  rxBytes: z.number().default(0),
  txBytes: z.number().default(0)
});

export type EasyTierPeerInfo = z.infer<typeof EasyTierPeerInfoSchema>;

export const EasyTierRouteInfoSchema = z.object({
  destCidr: z.string(),
  nextHopPeerId: z.string(),
  cost: z.number().default(1),
  isP2p: z.boolean().default(true)
});

export type EasyTierRouteInfo = z.infer<typeof EasyTierRouteInfoSchema>;

export const NetworkInstanceStatusSchema = z.object({
  instanceId: z.string(),
  isRunning: z.boolean(),
  virtualIpv4: z.string().optional(),
  virtualIpv6: z.string().optional(),
  peers: z.array(EasyTierPeerInfoSchema).default([]),
  routes: z.array(EasyTierRouteInfoSchema).default([]),
  lastError: z.string().optional()
});

export type NetworkInstanceStatus = z.infer<typeof NetworkInstanceStatusSchema>;
