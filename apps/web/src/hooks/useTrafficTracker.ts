import { useState, useEffect, useRef } from 'react';
import { TrafficRateTracker, TrafficRateResult } from '@autopilot/protocol';

export function useTrafficTracker(
  totalRxBytes: number,
  totalTxBytes: number,
  intervalMs = 1000
): TrafficRateResult {
  const trackerRef = useRef<TrafficRateTracker | null>(null);
  const [rates, setRates] = useState<TrafficRateResult>({
    rxRateBps: 0,
    txRateBps: 0,
    rxFormatted: '0 B/s',
    txFormatted: '0 B/s',
    isSpikeSuppressed: false
  });

  if (!trackerRef.current) {
    trackerRef.current = new TrafficRateTracker(0.7);
  }

  useEffect(() => {
    if (!trackerRef.current) return;
    const res = trackerRef.current.update(totalRxBytes, totalTxBytes, Date.now());
    setRates(res);
  }, [totalRxBytes, totalTxBytes]);

  return rates;
}
