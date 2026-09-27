import geoip from 'geoip-lite';

export interface GeoIPResult {
  ip: string;
  isPrivate: boolean;
  country: string;
  city: string;
  region?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  cloudProvider: string;
}

// Known ASN / Cloud Provider IP prefixes
function detectCloudProvider(ip: string, country: string): string {
  if (ip.startsWith('104.') || ip.startsWith('172.64.') || ip.startsWith('1.1.1.') || ip.startsWith('1.0.0.')) {
    return 'CLOUDFLARE';
  }
  if (ip.startsWith('3.') || ip.startsWith('15.') || ip.startsWith('18.') || ip.startsWith('52.') || ip.startsWith('54.')) {
    return 'AWS';
  }
  if (ip.startsWith('34.') || ip.startsWith('35.') || ip.startsWith('8.8.') || ip.startsWith('8.34.')) {
    return 'GOOGLE_CLOUD';
  }
  if (ip.startsWith('13.') || ip.startsWith('20.') || ip.startsWith('40.') || ip.startsWith('51.')) {
    return 'AZURE';
  }
  if (ip.startsWith('47.') || ip.startsWith('106.11.') || ip.startsWith('223.5.')) {
    return 'ALIBABA_CLOUD';
  }
  if (ip.startsWith('119.29.') || ip.startsWith('129.204.') || ip.startsWith('150.158.')) {
    return 'TENCENT_CLOUD';
  }
  if (ip.startsWith('156.231.')) {
    return 'DEVLAB_EDGE';
  }
  return country === 'CN' ? 'CHINA_TELECOM' : 'EDGE_POP';
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  // Normalize IPv4-mapped IPv6
  const cleanIp = ip.replace(/^::ffff:/, '');

  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }
  if (cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.') || cleanIp.startsWith('198.18.')) {
    return true;
  }
  if (cleanIp.startsWith('172.')) {
    const parts = cleanIp.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:') || cleanIp.startsWith('fe80:')) {
    return true;
  }
  return false;
}

export function resolveGeoIP(rawIp?: string): GeoIPResult {
  const ip = (rawIp || '').trim().replace(/^::ffff:/, '');

  if (!ip || isPrivateIp(ip)) {
    return {
      ip: ip || '127.0.0.1',
      isPrivate: true,
      country: 'CN',
      city: 'Local Lab',
      region: 'DevLab',
      latitude: 31.2304,
      longitude: 121.4737,
      timezone: 'Asia/Shanghai',
      cloudProvider: 'DEVLAB_HOST'
    };
  }

  try {
    const geo = geoip.lookup(ip);
    if (geo) {
      const lat = geo.ll?.[0] ?? 31.2304;
      const lon = geo.ll?.[1] ?? 121.4737;
      const country = geo.country || 'Global';
      const city = geo.city || geo.region || country;

      return {
        ip,
        isPrivate: false,
        country,
        city,
        region: geo.region,
        latitude: lat,
        longitude: lon,
        timezone: geo.timezone,
        cloudProvider: detectCloudProvider(ip, country)
      };
    }
  } catch (err) {
    console.warn(`[GeoIP] Lookup failed for ${ip}:`, err);
  }

  // Fallback if public IP not in DB
  return {
    ip,
    isPrivate: false,
    country: 'GLOBAL',
    city: 'Anycast Node',
    latitude: 0,
    longitude: 0,
    cloudProvider: 'EDGE_ANYCAST'
  };
}
