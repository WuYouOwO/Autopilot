import { ref } from 'vue'

export interface TelemetryEvent {
  type: 'node_status' | 'throughput' | 'route_change'
  machineId?: string
  payload: any
  timestamp: number
}

type EventCallback = (event: TelemetryEvent) => void

class WsTelemetryManager {
  private ws: WebSocket | null = null
  private listeners: Set<EventCallback> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private mockTimer: ReturnType<typeof setInterval> | null = null
  public isConnected = ref(false)

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/`
    
    try {
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('[Telemetry] WebSocket connected.')
        this.isConnected.value = true
        this.stopMockStream()
      }

      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          this.broadcast(data)
        } catch (e) {
          console.warn('[Telemetry] Failed to parse message', e)
        }
      }

      this.ws.onclose = () => {
        this.isConnected.value = false
        console.log('[Telemetry] WebSocket disconnected, starting mock fallback...')
        // If backend WS is not ready, start mock stream for prototype
        this.startMockStream()
        
        // Try to reconnect every 10 seconds
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this.reconnectTimer = setTimeout(() => this.connect(), 10000)
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch (e) {
      console.error('[Telemetry] WebSocket setup failed', e)
      this.startMockStream()
    }
  }

  public subscribe(cb: EventCallback) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private broadcast(event: TelemetryEvent) {
    this.listeners.forEach((cb) => cb(event))
  }

  // Prototype: Simulate real-time backend events when WS is not available
  private startMockStream() {
    if (this.mockTimer) return
    this.mockTimer = setInterval(() => {
      const types: TelemetryEvent['type'][] = ['throughput', 'route_change', 'node_status']
      const type = types[Math.floor(Math.random() * types.length)]
      
      const event: TelemetryEvent = {
        type,
        timestamp: Date.now(),
        payload: {}
      }

      if (type === 'throughput') {
        event.payload = {
          rx_bps: Math.random() * 5 * 1024 * 1024, // 0-5MB/s
          tx_bps: Math.random() * 2 * 1024 * 1024,
        }
      } else if (type === 'route_change') {
        event.payload = {
          peer_id: 'mock-peer-1',
          new_mode: Math.random() > 0.8 ? 'relay' : 'p2p',
          latency: Math.floor(Math.random() * 80 + 10)
        }
      } else if (type === 'node_status') {
        // Less frequent status changes
        if (Math.random() > 0.95) {
          event.payload = {
            peer_id: 'mock-peer-2',
            status: Math.random() > 0.5 ? 'online' : 'offline'
          }
        } else {
          return // skip dispatch
        }
      }

      this.broadcast(event)
    }, 2000)
  }

  private stopMockStream() {
    if (this.mockTimer) {
      clearInterval(this.mockTimer)
      this.mockTimer = null
    }
  }
}

export const telemetry = new WsTelemetryManager()
