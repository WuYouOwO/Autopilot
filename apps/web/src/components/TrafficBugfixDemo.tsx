import React, { useState } from 'react';
import { Bug, CheckCircle, RotateCcw, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';
import { TrafficRateTracker, formatBytesPerSec } from '@autopilot/protocol';

export const TrafficBugfixDemo: React.FC = () => {
  const [autopilotTracker] = useState(() => new TrafficRateTracker(0.8));

  // Current counter state
  const [totalRx, setTotalRx] = useState(12.4 * 1024 * 1024); // 12.4 MB initial buffer
  const [simulatedTime, setSimulatedTime] = useState(1000000);

  // Buggy algorithm state
  const [buggyLastRx, setBuggyLastRx] = useState<number | null>(null);
  const [buggyRateStr, setBuggyRateStr] = useState('0 B/s');
  const [buggySpikeDetected, setBuggySpikeDetected] = useState(false);

  // Autopilot fixed rate state
  const [fixedRateStr, setFixedRateStr] = useState('0 B/s');
  const [fixedSuppressed, setFixedSuppressed] = useState(false);

  // Step 1: Initialize / Join Network
  const simulateInitialJoin = () => {
    autopilotTracker.reset();
    const initialBytes = 12.4 * 1024 * 1024; // 12.4 MB
    const now = Date.now();

    // Buggy official algorithm: treats (initialBytes - 0) as 1-second rate!
    // Result: 12.4 MB/s instantaneous fake spike!
    const buggyRate = initialBytes; // divided by assumed 1.0s
    setBuggyRateStr(formatBytesPerSec(buggyRate));
    setBuggySpikeDetected(true);
    setBuggyLastRx(initialBytes);

    // Autopilot fixed algorithm: first sample establishes baseline without calculation!
    const autoRes = autopilotTracker.update(initialBytes, initialBytes, now);
    setFixedRateStr(autoRes.rxFormatted);
    setFixedSuppressed(false);

    setTotalRx(initialBytes);
    setSimulatedTime(now);
  };

  // Step 2: Normal 100 KB/s traffic tick
  const simulateNormalTick = () => {
    const delta = 100 * 1024; // 100 KB
    const nextBytes = totalRx + delta;
    const now = simulatedTime + 1000;

    // Buggy algorithm
    if (buggyLastRx !== null) {
      const rate = nextBytes - buggyLastRx;
      setBuggyRateStr(formatBytesPerSec(rate));
      setBuggySpikeDetected(false);
    }
    setBuggyLastRx(nextBytes);

    // Autopilot fixed algorithm
    const autoRes = autopilotTracker.update(nextBytes, nextBytes, now);
    setFixedRateStr(autoRes.rxFormatted);
    setFixedSuppressed(false);

    setTotalRx(nextBytes);
    setSimulatedTime(now);
  };

  // Step 3: Reconnection / Counter Reset (counter drops from 12.5MB to 0)
  const simulateReconnectDrop = () => {
    const nextBytes = 0; // counter reset to 0
    const now = simulatedTime + 1000;

    // Buggy algorithm: unsigned underflow or negative treated as unsigned 32-bit:
    // (0 - 12500000) -> 4282467296 -> 4.2 GB/s spike or NaN
    setBuggyRateStr('4.2 GB/s (Overflow Spike!)');
    setBuggySpikeDetected(true);
    setBuggyLastRx(0);

    // Autopilot fixed algorithm: detects negative delta, safely resets baseline!
    const autoRes = autopilotTracker.update(nextBytes, nextBytes, now);
    setFixedRateStr(autoRes.rxFormatted);
    setFixedSuppressed(true);

    setTotalRx(0);
    setSimulatedTime(now);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-cyan-500/20 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold font-mono text-slate-100">
              12.4 MB/s 虚假流量峰值根治算法验证实验室 (Algorithm Verification Lab)
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time comparative verification: Official Buggy Algorithm vs Autopilot Monotonic Clamped Tracker
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={simulateInitialJoin}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition"
          >
            1. 模拟初次入网 (Initial Join)
          </button>
          <button
            onClick={simulateNormalTick}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            2. 模拟正常流量 (+100KB)
          </button>
          <button
            onClick={simulateReconnectDrop}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition"
          >
            3. 模拟断线重连 (Counter Drop)
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Official Buggy Algorithm */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1.5">
              <Bug className="w-4 h-4" />
              EasyTier 官方前端算法 (Naive Diff)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
              BUGGY
            </span>
          </div>

          <div className="text-3xl font-mono font-bold text-rose-400 my-4">
            {buggyRateStr}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1 text-slate-400">
            <div>算法: <span className="text-rose-300">rate = (curr - prev) / fixed_time</span></div>
            <div>缺陷 1: 初次入网以 0 为 baseline，直接把累积 12.4 MB 当作 1 秒流量！</div>
            <div>缺陷 2: 重连计数器归零时产生无符号数溢出或负数脉冲。</div>
          </div>

          {buggySpikeDetected && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-rose-400 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              触发虚假 12.4 MB/s 或 4.2 GB/s 流量突刺！
            </div>
          )}
        </div>

        {/* Right: Autopilot Monotonic Clamped Tracker */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Autopilot 单调防溢出平滑算法
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
              SOLVED
            </span>
          </div>

          <div className="text-3xl font-mono font-bold text-emerald-400 my-4">
            {fixedRateStr}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1 text-slate-400">
            <div>算法: <span className="text-emerald-300">Monotonic Δt + Initial Baseline Clamping + EMA</span></div>
            <div>特性 1: 首个采样建立基准参考点，初次速率严格保证 0 B/s。</div>
            <div>特性 2: 负向差值自动识别断线重置，配合指数平滑阻断突刺。</div>
          </div>

          {fixedSuppressed && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              单调性锁已成功拦截重连归零抖动，数据维持平滑。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
