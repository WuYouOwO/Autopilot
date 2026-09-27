import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

export type AutopilotDb = ReturnType<typeof drizzleSqlite<typeof schema>> | ReturnType<typeof drizzleD1<typeof schema>>;

let localSqliteInstance: any = null;

export function getLocalDb(dbPath = 'autopilot.sqlite'): ReturnType<typeof drizzleSqlite<typeof schema>> {
  if (!localSqliteInstance) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    
    // Auto-create tables for local mode if not exists
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        hostname TEXT NOT NULL,
        persona TEXT NOT NULL DEFAULT 'WORKSTATION_INTERACTIVE',
        user_intent TEXT NOT NULL DEFAULT 'ACTIVE',
        public_key_x25519 TEXT NOT NULL,
        enrollment_token TEXT,
        os TEXT NOT NULL DEFAULT 'linux',
        client_version TEXT NOT NULL DEFAULT '1.0.0',
        latitude REAL,
        longitude REAL,
        city TEXT,
        country TEXT,
        cloud_provider TEXT DEFAULT 'EDGE',
        tags TEXT DEFAULT '[]',
        telemetry TEXT DEFAULT '{}',
        last_heartbeat INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS networks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        network_secret TEXT NOT NULL,
        ipv4_cidr TEXT NOT NULL,
        ipv6_cidr TEXT,
        dhcp_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_networks (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
        virtual_ipv4 TEXT,
        virtual_ipv6 TEXT,
        intent_state TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS acl_rules (
        id TEXT PRIMARY KEY,
        network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
        priority INTEGER NOT NULL DEFAULT 100,
        name TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT 'ALLOW',
        source_tags TEXT DEFAULT '[]',
        dest_tags TEXT DEFAULT '[]',
        protocol TEXT NOT NULL DEFAULT 'ANY',
        dest_ports TEXT DEFAULT '[]',
        description TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_connectors (
        id TEXT PRIMARY KEY,
        network_id TEXT NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        domain_pattern TEXT NOT NULL,
        assigned_cidr32 TEXT NOT NULL,
        target_host TEXT NOT NULL,
        target_port INTEGER,
        technitium_synced INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        timestamp INTEGER NOT NULL
      );
    `);

    localSqliteInstance = drizzleSqlite(sqlite, { schema });
  }
  return localSqliteInstance;
}

export function getD1Db(d1: any): ReturnType<typeof drizzleD1<typeof schema>> {
  return drizzleD1(d1, { schema });
}
