/**
 * 健壮的 IPv4 / IPv6 双栈解析与校验引擎
 * 彻底解决原版前端将 IPv6 强制截断为 32 位掩码、以及在 blur 时篡改为 0.0.0.0 的严重缺陷。
 */

// 正则校验 IPv4 (0-255)
const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

// 健壮的 IPv6 校验 (支持 :: 缩写及 IPv4 映射)
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/

export function isValidIPv4(ip: string): boolean {
  return IPV4_REGEX.test(ip.trim())
}

export function isValidIPv6(ip: string): boolean {
  const clean = ip.trim().replace(/^\[|\]$/g, '')
  return IPV6_REGEX.test(clean)
}

export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip)
}

export interface CidrValidationResult {
  valid: boolean
  version?: 4 | 6
  ip?: string
  prefix?: number
  maxPrefix?: number
  error?: string
}

/**
 * 校验 CIDR 表达式（如 10.144.144.0/24 或 2001:db8::/64）
 */
export function validateCidr(cidrStr: string): CidrValidationResult {
  const trimmed = cidrStr.trim()
  const parts = trimmed.split('/')
  if (parts.length !== 2) {
    return { valid: false, error: '缺少掩码前缀分隔符 "/"' }
  }

  const [ipPart, prefixPart] = parts
  const prefix = parseInt(prefixPart, 10)

  if (isNaN(prefix)) {
    return { valid: false, error: '掩码前缀必须为数字' }
  }

  if (isValidIPv4(ipPart)) {
    if (prefix < 0 || prefix > 32) {
      return { valid: false, error: 'IPv4 掩码前缀必须在 0 到 32 之间' }
    }
    return { valid: true, version: 4, ip: ipPart, prefix, maxPrefix: 32 }
  }

  if (isValidIPv6(ipPart)) {
    if (prefix < 0 || prefix > 128) {
      return { valid: false, error: 'IPv6 掩码前缀必须在 0 到 128 之间' }
    }
    return { valid: true, version: 6, ip: ipPart, prefix, maxPrefix: 128 }
  }

  return { valid: false, error: '非法的 IP 地址格式' }
}

export interface ParsedTunnelUrl {
  valid: boolean
  proto: string
  host: string
  port: number | null
  path: string
  isIpv6: boolean
  formatted: string
  error?: string
}

const DEFAULT_PORTS: Record<string, number> = {
  tcp: 11010,
  udp: 11010,
  wg: 11011,
  ws: 11011,
  wss: 443,
  quic: 11012,
  faketcp: 11013,
  http: 80,
  https: 443,
}

/**
 * 健壮解析 EasyTier 节点或监听 URL，原生保护 IPv6 方括号格式
 */
export function parseTunnelUrl(urlStr: string): ParsedTunnelUrl {
  const trimmed = urlStr.trim()
  if (!trimmed) {
    return { valid: false, proto: 'tcp', host: '', port: 11010, path: '', isIpv6: false, formatted: '', error: 'URL 不能为空' }
  }

  const match = trimmed.match(/^([a-zA-Z0-9]+):\/\/(.*)$/)
  const proto = match ? match[1].toLowerCase() : 'tcp'
  const rest = match ? match[2] : trimmed

  const pathIndex = rest.search(/[/?#]/)
  const authority = pathIndex >= 0 ? rest.slice(0, pathIndex) : rest
  const path = pathIndex >= 0 ? rest.slice(pathIndex) : ''

  let host = authority
  let port: number | null = null
  let isIpv6 = false

  // 检查是否包含 IPv6 中括号语法，例如 [2408:xxx]:11010 或 [::]:11010
  if (authority.startsWith('[')) {
    isIpv6 = true
    const closingBracket = authority.indexOf(']')
    if (closingBracket > 0) {
      host = authority.slice(1, closingBracket)
      const portPart = authority.slice(closingBracket + 1)
      if (portPart.startsWith(':')) {
        const p = parseInt(portPart.slice(1), 10)
        port = isNaN(p) ? null : p
      }
    } else {
      return { valid: false, proto, host: authority, port: null, path, isIpv6: true, formatted: trimmed, error: 'IPv6 缺少闭合中括号 "]"' }
    }
  } else {
    // IPv4 或域名形式，提取端口
    const lastColon = authority.lastIndexOf(':')
    if (lastColon > 0 && !authority.includes('::')) {
      const p = parseInt(authority.slice(lastColon + 1), 10)
      if (!isNaN(p)) {
        port = p
        host = authority.slice(0, lastColon)
      }
    } else if (isValidIPv6(authority)) {
      // 裸 IPv6 没有加方括号的情况
      isIpv6 = true
      host = authority
    }
  }

  const effectivePort = port ?? DEFAULT_PORTS[proto] ?? null
  const formattedHost = isIpv6 ? `[${host}]` : host
  const portString = effectivePort !== null && effectivePort !== 0 ? `:${effectivePort}` : ''
  const formatted = `${proto}://${formattedHost}${portString}${path}`

  return {
    valid: true,
    proto,
    host,
    port: effectivePort,
    path,
    isIpv6,
    formatted,
  }
}

/**
 * 组装规范化 Tunnel URL，自动确保 IPv6 正确使用中括号
 */
export function formatTunnelUrl(proto: string, host: string, port?: number | null, path: string = ''): string {
  const cleanProto = proto.toLowerCase() || 'tcp'
  const cleanHost = host.trim().replace(/^\[|\]$/g, '')
  const isV6 = isValidIPv6(cleanHost)

  const wrappedHost = isV6 ? `[${cleanHost}]` : cleanHost
  const effectivePort = port ?? DEFAULT_PORTS[cleanProto]
  const portPart = effectivePort && effectivePort !== 0 ? `:${effectivePort}` : ''
  const cleanPath = path.startsWith('/') ? path : (path ? `/${path}` : '')

  return `${cleanProto}://${wrappedHost}${portPart}${cleanPath}`
}
