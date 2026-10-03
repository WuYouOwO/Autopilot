/**
 * 通用格式化工具函数
 */

export function formatBytes(bytes: number | undefined | null, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  if (i < 0) return `${bytes} B`
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'PB'}`
}

export function formatRate(bytesPerSec: number | undefined | null): string {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s'
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatLatency(us: number | undefined | null): string {
  if (us === undefined || us === null || us < 0) return '—'
  if (us < 1000) return `${us} µs`
  const ms = (us / 1000).toFixed(1)
  return `${ms} ms`
}

export function formatPercent(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) return '0%'
  return `${(rate * 100).toFixed(1)}%`
}

export function formatIpAddress(ipObj: any): string {
  if (!ipObj) return ''
  if (typeof ipObj === 'string') return ipObj
  if (typeof ipObj === 'number') {
    // 32-bit integer to IPv4
    return [
      (ipObj >>> 24) & 255,
      (ipObj >>> 16) & 255,
      (ipObj >>> 8) & 255,
      ipObj & 255,
    ].join('.')
  }
  if (ipObj.addr) return formatIpAddress(ipObj.addr)
  if (ipObj.part1 !== undefined && ipObj.part2 !== undefined) {
    // 128-bit IPv6 split into four 32-bit parts
    const parts = [ipObj.part1, ipObj.part2, ipObj.part3, ipObj.part4]
    const hex = parts.map((p: number) => (p >>> 0).toString(16).padStart(8, '0')).join('')
    const groups = hex.match(/.{1,4}/g) || []
    return groups.join(':')
  }
  return String(ipObj)
}

export function uuidToStr(uuid: any): string {
  if (!uuid) return ''
  if (typeof uuid === 'string') return uuid
  if (typeof uuid === 'object' && uuid.part1 !== undefined) {
    const p1 = (uuid.part1 >>> 0).toString(16).padStart(8, '0')
    const p2 = (uuid.part2 >>> 0).toString(16).padStart(8, '0')
    const p3 = (uuid.part3 >>> 0).toString(16).padStart(8, '0')
    const p4 = (uuid.part4 >>> 0).toString(16).padStart(8, '0')
    return `${p1}-${p2.substring(0, 4)}-${p2.substring(4, 8)}-${p3.substring(0, 4)}-${p3.substring(4, 8)}${p4}`
  }
  return String(uuid)
}
