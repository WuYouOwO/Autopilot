import { eq } from 'drizzle-orm';
import { networks } from './schema.js';

export async function seedInitialData(db: any) {
  try {
    const defaultNet = await db.select().from(networks).where(eq(networks.id, 'net_corp_zero_trust')).get();
    if (defaultNet) {
      return; // Default network already seeded
    }

    console.log('[Autopilot Seed] Initializing clean default zero-trust network...');
    const now = Date.now();

    // Ensure Default Production Network exists
    const netId = 'net_corp_zero_trust';
    await db.insert(networks).values({
      id: netId,
      name: 'Production Zero-Trust SD-WAN',
      networkSecret: 'autopilot-sec-9921',
      ipv4Cidr: '10.144.0.0/16',
      ipv6Cidr: 'fd00:cafe:2026::/64',
      dhcpEnabled: true,
      createdAt: now,
      updatedAt: now
    });

    console.log('[Autopilot Seed] Default network initialized in clean state (waiting for real nodes).');
  } catch (err) {
    console.error('[Autopilot Seed] Failed to seed initial data:', err);
  }
}
