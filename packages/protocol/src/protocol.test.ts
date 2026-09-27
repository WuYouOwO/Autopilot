import test from 'node:test';
import assert from 'node:assert';
import { TrafficRateTracker, formatBytesPerSec } from './traffic.js';
import { transitionIntentState } from './intent.js';
import { VirtualIpSchema } from './network.js';

test('TrafficRateTracker fixes the 12.4 MB/s initial spike bug', () => {
  const tracker = new TrafficRateTracker(1.0); // instant factor for test

  const t0 = 1000000;
  // First reading: already has 12.4 MB transferred on node join
  const initialBytes = 12.4 * 1024 * 1024;
  const result0 = tracker.update(initialBytes, initialBytes, t0);

  // In the buggy official Web UI, this would show 12.4 MB/s!
  // In Autopilot, initial sample MUST establish baseline with 0 B/s.
  assert.strictEqual(result0.rxRateBps, 0);
  assert.strictEqual(result0.txRateBps, 0);
  assert.strictEqual(result0.rxFormatted, '0 B/s');

  // Second reading: after 1 second (1000ms), 100 KB transferred
  const t1 = t0 + 1000;
  const delta = 100 * 1024;
  const result1 = tracker.update(initialBytes + delta, initialBytes + delta, t1);

  assert.strictEqual(result1.rxRateBps, delta);
  assert.strictEqual(result1.txRateBps, delta);
  assert.strictEqual(result1.rxFormatted, '100.0 KB/s');

  // Third reading: node reconnects, counter resets to 0 (counter drop)
  const t2 = t1 + 1000;
  const result2 = tracker.update(0, 0, t2);

  // Must suppress underflow spike, rate reset to 0
  assert.strictEqual(result2.isSpikeSuppressed, true);
  assert.strictEqual(result2.rxRateBps, 0);
});

test('transitionIntentState protects Workstation from 3.5s heartbeat revive bullying', () => {
  // 1. User deliberately pauses on workstation
  const pauseResult = transitionIntentState('ACTIVE', 'USER_PAUSED', 'WORKSTATION_INTERACTIVE', 'USER');
  assert.strictEqual(pauseResult.allowed, true);
  assert.strictEqual(pauseResult.newState, 'USER_PAUSED');

  // 2. Gateway sends 3.5s heartbeat trying to revive
  const reviveAttempt = transitionIntentState('USER_PAUSED', 'ACTIVE', 'WORKSTATION_INTERACTIVE', 'GATEWAY_HEARTBEAT');
  assert.strictEqual(reviveAttempt.allowed, false);
  assert.strictEqual(reviveAttempt.newState, 'USER_PAUSED');
  assert.ok(reviveAttempt.reason?.includes('Workstation user paused'));

  // 3. For Server / Headless, heartbeat revive is allowed
  const serverRevive = transitionIntentState('USER_PAUSED', 'ACTIVE', 'SERVER_HEADLESS', 'GATEWAY_HEARTBEAT');
  assert.strictEqual(serverRevive.allowed, true);
  assert.strictEqual(serverRevive.newState, 'ACTIVE');

  // 4. Server cannot be paused by local user
  const serverUserPause = transitionIntentState('ACTIVE', 'USER_PAUSED', 'SERVER_HEADLESS', 'USER');
  assert.strictEqual(serverUserPause.allowed, false);
});

test('VirtualIpSchema validates IPv4 and IPv6 dual-stack', () => {
  // Valid dual-stack
  const valid = VirtualIpSchema.safeParse({
    ipv4: '10.144.1.20',
    ipv6: 'fd00:cafe::1'
  });
  assert.strictEqual(valid.success, true);

  // Valid IPv6 only
  const v6Only = VirtualIpSchema.safeParse({
    ipv6: '2001:db8::1'
  });
  assert.strictEqual(v6Only.success, true);

  // Invalid IPv4
  const invalidV4 = VirtualIpSchema.safeParse({
    ipv4: '999.1.1.1'
  });
  assert.strictEqual(invalidV4.success, false);
});
