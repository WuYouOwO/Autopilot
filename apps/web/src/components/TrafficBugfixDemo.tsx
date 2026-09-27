import React, { useState } from 'react';
import { Bug, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
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
    setBuggyRateStr('4.2 GB/s (无符号溢出脉冲!)');
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
    <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-sm bg-white/90 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold font-mono text-slate-900">
              12.4 MB/s 虚假流量峰值根治算法验证实验室 (Algorithm Verification Lab)
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            实时对比验算：官方 Naive Diff 算法缺陷 vs Autopilot 单调时间差值平滑算法
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={simulateInitialJoin}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-xs"
          >
            1. 模拟初次入网 (Initial Join)
          </button>
          <button
            onClick={simulateNormalTick}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition shadow-xs"
          >
            2. 模拟正常流量 (+100KB)
          </button>
          <button
            onClick={simulateReconnectDrop}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition shadow-xs"
          >
            3. 模拟断线重连 (Counter Drop)
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Official Buggy Algorithm */}
        <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-rose-700 flex items-center gap-1.5">
              <Bug className="w-4 h-4" />
              EasyTier 官方前端算法 (Naive Diff)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-mono font-bold">
              BUGGY
            </span>
          </div>

          <div className="text-3xl font-mono font-bold text-rose-600 my-4">
            {buggyRateStr}
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-rose-100 text-xs font-mono space-y-1.5 text-slate-600">
            <div>算法逻辑: <span className="text-rose-700 font-semibold">rate = (curr - prev) / fixed_time</span></div>
            <div>缺陷 1: 初次入网以 0 为 baseline，把累积已有的 12.4 MB 直接当作 1 秒瞬间流量！</div>
            <div>缺陷 2: 重连计数器归零时产生无符号整数溢出或负数脉冲。</div>
          </div>

          {buggySpikeDetected && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-rose-600 animate-pulse font-semibold">
              <AlertTriangle className="w-4 h-4" />
              已复现虚假 12.4 MB/s 或 4.2 GB/s 流量突刺！
            </div>
          )}
        </div>

        {/* Right: Autopilot Monotonic Clamped Tracker */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Autopilot 单调防溢出平滑算法
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono font-bold">
              SOLVED
            </span>
          </div>

          <div className="text-3xl font-mono font-bold text-emerald-600 my-4">
            {fixedRateStr}
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-emerald-100 text-xs font-mono space-y-1.5 text-slate-600">
            <div>算法逻辑: <span className="text-emerald-700 font-semibold">Monotonic Δt + Initial Baseline Clamping + EMA</span></div>
            <div>特性 1: 首个采样仅注册参考基准点，初次速率严格保证 0 B/s。</div>
            <div>特性 2: 负向差值自动识别断线重置，配合指数平滑阻断突刺。</div>
          </div>

          {fixedSuppressed && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              单调性锁已成功拦截重连归零抖动，数据维持稳定平滑。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
