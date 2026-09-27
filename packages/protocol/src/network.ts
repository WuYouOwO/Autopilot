import { z } from 'zod';

// IPv4 regex (standard 0-255.0-255.0-255.0-255)
export const IPv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 regex (comprehensive RFC 4291 compliant)
export const IPv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

export const IPv4CIDRRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;

export const IPv6CIDRRegex = /^([0-9a-fA-F:]+)\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;

/**
 * Dual-Stack Virtual IP definition.
 * Official EasyTier Web frontend missed virtual IPv6 input.
 * Autopilot provides native, fully validated first-class IPv4 & IPv6 dual-stack support.
 */
export const VirtualIpSchema = z.object({
  ipv4: z.string().regex(IPv4Regex, { message: 'Invalid virtual IPv4 address' }).optional(),
  ipv6: z.string().regex(IPv6Regex, { message: 'Invalid virtual IPv6 address' }).optional()
}).refine(data => data.ipv4 !== undefined || data.ipv6 !== undefined, {
  message: 'At least one virtual IP (IPv4 or IPv6) must be specified'
});

export type VirtualIp = z.infer<typeof VirtualIpSchema>;

/**
 * Network Instance Definition in Autopilot SSOT
 */
export const NetworkConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  networkSecret: z.string().min(6), // Network secret token for EasyTier
  ipv4Cidr: z.string().regex(IPv4CIDRRegex, { message: 'Invalid IPv4 CIDR (e.g. 10.144.0.0/16)' }),
  ipv6Cidr: z.string().regex(IPv6CIDRRegex, { message: 'Invalid IPv6 CIDR (e.g. fd00:cafe::/64)' }).optional(),
  dhcpEnabled: z.boolean().default(true),
  allowedPeers: z.array(z.string()).default([]), // List of allowed device IDs or '*'
  createdAt: z.number(),
  updatedAt: z.number()
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
