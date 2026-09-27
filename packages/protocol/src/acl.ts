import { z } from 'zod';

export const ACLActionSchema = z.enum(['ALLOW', 'DENY']);
export type ACLAction = z.infer<typeof ACLActionSchema>;

export const ProtocolTypeSchema = z.enum(['TCP', 'UDP', 'ICMP', 'ANY']);
export type ProtocolType = z.infer<typeof ProtocolTypeSchema>;

export const ACLRuleSchema = z.object({
  id: z.string().min(1),
  networkId: z.string().min(1),
  priority: z.number().int().default(100), // Lower number = higher priority
  name: z.string().min(1),
  action: ACLActionSchema.default('ALLOW'),
  sourceTags: z.array(z.string()).default([]), // Empty means any
  destTags: z.array(z.string()).default([]),   // Empty means any
  protocol: ProtocolTypeSchema.default('ANY'),
  destPorts: z.array(z.number().int().min(1).max(65535)).default([]), // Empty means all
  description: z.string().optional(),
  enabled: z.boolean().default(true)
});

export type ACLRule = z.infer<typeof ACLRuleSchema>;
