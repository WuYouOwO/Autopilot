import test from 'node:test';
import assert from 'node:assert';
import app from './index.js';

test('Autopilot Hub API End-to-End Suite', async (t) => {
  let createdNetworkId = '';
  let createdDeviceId = '';

  await t.test('1. Health check returns healthy and mode', async () => {
    const res = await app.request('/health');
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'healthy');
    assert.ok(data.mode);
  });

  await t.test('2. Create Network with Dual-Stack IPv4 and IPv6 CIDRs', async () => {
    const res = await app.request('/api/v1/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corp-ZeroTrust-Net',
        ipv4Cidr: '10.144.0.0/16',
        ipv6Cidr: 'fd00:cafe:1::/64'
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json() as any;
    assert.ok(data.id.startsWith('net_'));
    assert.strictEqual(data.ipv4Cidr, '10.144.0.0/16');
    assert.strictEqual(data.ipv6Cidr, 'fd00:cafe:1::/64');
    createdNetworkId = data.id;
  });

  await t.test('3. Enroll Workstation Device and Allocate Dual-Stack IPs', async () => {
    const res = await app.request('/api/v1/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostname: 'alice-macbook-pro',
        persona: 'WORKSTATION_INTERACTIVE',
        publicKeyX25519: '7d9834b6b66b7c4a179e8cbb6c79a4c56891000a982348b610c4d81234567890',
        networkId: createdNetworkId,
        geo: {
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          country: 'US',
          cloudProvider: 'EDGE'
        },
        tags: ['workstation', 'engineering']
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json() as any;
    assert.ok(data.deviceId.startsWith('dev_'));
    assert.strictEqual(data.persona, 'WORKSTATION_INTERACTIVE');
    assert.strictEqual(data.userIntent, 'ACTIVE');
    assert.ok(data.allocatedIp.ipv4);
    assert.ok(data.allocatedIp.ipv6);
    createdDeviceId = data.deviceId;
  });

  await t.test('4. Out-of-band Fast Channel Pause updates user_intent to USER_PAUSED', async () => {
    const res = await app.request(`/api/v1/devices/${createdDeviceId}/networks/${createdNetworkId}/pause`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.userIntent, 'USER_PAUSED');
  });

  await t.test('5. Gateway 3.5s Heartbeat does NOT revive paused Workstation', async () => {
    const res = await app.request(`/api/v1/devices/${createdDeviceId}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'GATEWAY_HEARTBEAT',
        telemetry: {
          rxBytesTotal: 1024,
          txBytesTotal: 2048
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    // CRITICAL: authoritativeIntent MUST remain USER_PAUSED, preventing auto-revive bullying!
    assert.strictEqual(data.authoritativeIntent, 'USER_PAUSED');
  });

  await t.test('6. User resume restores state to ACTIVE', async () => {
    const res = await app.request(`/api/v1/devices/${createdDeviceId}/networks/${createdNetworkId}/resume`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.userIntent, 'ACTIVE');
  });

  await t.test('7. Admin Instant Revocation ("一键毫秒踢人")', async () => {
    const res = await app.request(`/api/v1/auth/revoke/${createdDeviceId}`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'ADMIN_DISABLED');

    // Attempting to resume by user must now be rejected
    const resumeRes = await app.request(`/api/v1/devices/${createdDeviceId}/networks/${createdNetworkId}/resume`, {
      method: 'POST'
    });
    assert.strictEqual(resumeRes.status, 403);
  });

  await t.test('8. Topology Aggregation returns nodes and edges for HUD', async () => {
    const res = await app.request(`/api/v1/networks/${createdNetworkId}/topology`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.ok(data.nodes.length >= 2); // Subnet node + Device node
    assert.ok(data.edges.length >= 1);
    const subnetNode = data.nodes.find((n: any) => n.shape === 'DIAMOND');
    assert.ok(subnetNode, 'Subnet node with DIAMOND shape must be present');
  });

  await t.test('9. App Connector registration for DNS sniffing /32 CIDR', async () => {
    const res = await app.request('/api/v1/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networkId: createdNetworkId,
        deviceId: createdDeviceId,
        domainPattern: '*.internal.corp',
        assignedCidr32: '10.144.254.10/32',
        targetHost: '192.168.1.100',
        targetPort: 8080,
        syncTechnitium: true
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json() as any;
    assert.ok(data.id.startsWith('conn_'));
    assert.strictEqual(data.technitiumSynced, true);
  });
});
