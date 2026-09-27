import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  hostname: text('hostname').notNull(),
  persona: text('persona').notNull().default('WORKSTATION_INTERACTIVE'),
  userIntent: text('user_intent').notNull().default('ACTIVE'), // 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED'
  publicKeyX25519: text('public_key_x25519').notNull(),
  enrollmentToken: text('enrollment_token'),
  os: text('os').notNull().default('linux'),
  clientVersion: text('client_version').notNull().default('1.0.0'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  city: text('city'),
  country: text('country'),
  cloudProvider: text('cloud_provider').default('EDGE'),
  tags: text('tags').default('[]'), // JSON array of string tags
  telemetry: text('telemetry').default('{}'), // JSON object of latest telemetry
  lastHeartbeat: integer('last_heartbeat').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
});

export const networks = sqliteTable('networks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  networkSecret: text('network_secret').notNull(),
  ipv4Cidr: text('ipv4_cidr').notNull(),
  ipv6Cidr: text('ipv6_cidr'),
  dhcpEnabled: integer('dhcp_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
});

export const deviceNetworks = sqliteTable('device_networks', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  networkId: text('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  virtualIpv4: text('virtual_ipv4'),
  virtualIpv6: text('virtual_ipv6'),
  intentState: text('intent_state').notNull().default('ACTIVE'), // 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED'
  createdAt: integer('created_at').notNull()
});

export const aclRules = sqliteTable('acl_rules', {
  id: text('id').primaryKey(),
  networkId: text('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(100),
  name: text('name').notNull(),
  action: text('action').notNull().default('ALLOW'), // 'ALLOW' | 'DENY'
  sourceTags: text('source_tags').default('[]'),
  destTags: text('dest_tags').default('[]'),
  protocol: text('protocol').notNull().default('ANY'),
  destPorts: text('dest_ports').default('[]'),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull()
});

export const appConnectors = sqliteTable('app_connectors', {
  id: text('id').primaryKey(),
  networkId: text('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  domainPattern: text('domain_pattern').notNull(),
  assignedCidr32: text('assigned_cidr32').notNull(),
  targetHost: text('target_host').notNull(),
  targetPort: integer('target_port'),
  technitiumSynced: integer('technitium_synced', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull()
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorType: text('actor_type').notNull(), // 'USER' | 'ADMIN' | 'DEVICE' | 'GATEWAY'
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: text('details').default('{}'),
  timestamp: integer('timestamp').notNull()
});
