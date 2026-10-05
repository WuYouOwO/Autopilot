declare module '@/lib/traceglobe.js' {
  export interface TraceGlobeOptions {
    tip?: HTMLElement | null
    hit?: HTMLElement | null
    centered?: boolean
    radiusRatio?: number
    mode2d?: boolean
    lockNorth?: boolean
    isDark?: boolean
    onpick?: (q: string) => void
    onhover?: (probeId: string | null) => void
    onlochover?: (loc: any, sx: number, sy: number) => void
  }

  export interface TraceGlobeController {
    setData: (model: any) => void
    setLocations: (locations: any[]) => void
    setHold: (hold: boolean) => void
    setMode: (to2d: boolean) => void
    focus: (id: string | null) => void
    setHidden: (s: Set<string> | string[]) => void
    setHideLoc: (b: boolean) => void
    setLockNorth: (b: boolean) => void
    recenter: () => void
    reset: () => void
    setHome: (lon: number, lat: number) => void
    fitRoute: () => boolean
    destroy: () => void
  }

  export function createTraceGlobe(
    canvas: HTMLCanvasElement,
    opts?: TraceGlobeOptions
  ): TraceGlobeController
}
