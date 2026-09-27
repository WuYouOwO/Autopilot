/**
 * Traffic Rate Calculator (Root-cause fix for EasyTier Official 12.4 MB/s Fake Spike)
 *
 * Causes of the official bug:
 * 1. Uninitialized previous counter: on first poll, `(totalBytes - 0)` was treated as
 *    throughput over 1 second, causing an initial spike of ~12.4 MB/s on nodes with ~12MB buffer.
 * 2. Unstable sampling interval: jitter in WebSocket/HTTP polls resulted in `elapsedMs` near 0,
 *    causing division by near-zero without minimum interval clamping.
 * 3. Counter reset on network reconnect: when an instance reconnected, cumulative counters
 *    reset to 0, causing a negative delta or unsigned underflow.
 */

export interface TrafficSample {
  rxBytes: number;
  txBytes: number;
  timestamp: number; // Monotonic or epoch ms
}

export interface TrafficRateResult {
  rxRateBps: number;       // Bytes per second (RX)
  txRateBps: number;       // Bytes per second (TX)
  rxFormatted: string;     // e.g. "1.2 MB/s"
  txFormatted: string;     // e.g. "500 KB/s"
  isSpikeSuppressed: boolean;
}

export class TrafficRateTracker {
  private lastSample: TrafficSample | null = null;
  private emaRxRate: number = 0;
  private emaTxRate: number = 0;
  private readonly smoothingFactor: number;

  /**
   * @param smoothingFactor Exponential moving average factor (0 < a <= 1). Default 0.7 for responsive yet smooth readings.
   */
  constructor(smoothingFactor = 0.7) {
    this.smoothingFactor = Math.min(Math.max(smoothingFactor, 0.1), 1.0);
  }

  /**
   * Compute instantaneous and smoothed transfer rates.
   * Guaranteed never to produce false 12.4 MB/s initial or wrap-around spikes.
   */
  public update(currentRxBytes: number, currentTxBytes: number, now = Date.now()): TrafficRateResult {
    if (!this.lastSample) {
      // First sample: establish baseline, DO NOT calculate rate against 0!
      this.lastSample = {
        rxBytes: currentRxBytes,
        txBytes: currentTxBytes,
        timestamp: now
      };
      return {
        rxRateBps: 0,
        txRateBps: 0,
        rxFormatted: '0 B/s',
        txFormatted: '0 B/s',
        isSpikeSuppressed: false
      };
    }

    const elapsedMs = now - this.lastSample.timestamp;

    // Minimum interval threshold to prevent division by near-zero jitter (minimum 100ms)
    if (elapsedMs < 100) {
      return {
        rxRateBps: this.emaRxRate,
        txRateBps: this.emaTxRate,
        rxFormatted: formatBytesPerSec(this.emaRxRate),
        txFormatted: formatBytesPerSec(this.emaTxRate),
        isSpikeSuppressed: true
      };
    }

    const rxDelta = currentRxBytes - this.lastSample.rxBytes;
    const txDelta = currentTxBytes - this.lastSample.txBytes;

    let isSpikeSuppressed = false;
    let instantRxRate = 0;
    let instantTxRate = 0;

    const elapsedSec = elapsedMs / 1000;

    // Counter reset detection (e.g. node reconnected, counter reset to 0)
    if (rxDelta < 0 || txDelta < 0) {
      // Counter was reset; reset baseline without spike
      isSpikeSuppressed = true;
      instantRxRate = 0;
      instantTxRate = 0;
    } else {
      instantRxRate = rxDelta / elapsedSec;
      instantTxRate = txDelta / elapsedSec;

      // Sanity clamp: reject anomalous single-tick throughput over 10 GB/s (10 * 1024^3 B/s)
      const MAX_SANITY_BPS = 10 * 1024 * 1024 * 1024;
      if (instantRxRate > MAX_SANITY_BPS || instantTxRate > MAX_SANITY_BPS) {
        instantRxRate = 0;
        instantTxRate = 0;
        isSpikeSuppressed = true;
      }
    }

    // Apply Exponential Moving Average (EMA)
    this.emaRxRate = this.smoothingFactor * instantRxRate + (1 - this.smoothingFactor) * this.emaRxRate;
    this.emaTxRate = this.smoothingFactor * instantTxRate + (1 - this.smoothingFactor) * this.emaTxRate;

    // Update state
    this.lastSample = {
      rxBytes: currentRxBytes,
      txBytes: currentTxBytes,
      timestamp: now
    };

    return {
      rxRateBps: Math.round(this.emaRxRate),
      txRateBps: Math.round(this.emaTxRate),
      rxFormatted: formatBytesPerSec(this.emaRxRate),
      txFormatted: formatBytesPerSec(this.emaTxRate),
      isSpikeSuppressed
    };
  }

  public reset(): void {
    this.lastSample = null;
    this.emaRxRate = 0;
    this.emaTxRate = 0;
  }
}

export function formatBytesPerSec(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || isNaN(bytesPerSec)) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
  const unitIndex = Math.min(i, units.length - 1);
  const value = (bytesPerSec / Math.pow(1024, unitIndex)).toFixed(1);
  return `${value} ${units[unitIndex]}`;
}
