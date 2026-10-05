export interface GlobeDevice {
  id: string
  hostname: string
  locationName: string
  countryCode: string
  publicIp: string
  ipv4: string
  ipv6: string
  lat: number
  lng: number
  status: 'online' | 'offline'
  connection: string
  latencyMs: number
  natType: string
  peers?: string[]
}
