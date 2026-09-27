import crypto from 'node:crypto';

export function cryptoRandomString(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Generate a deterministic or sequential virtual IPv4 address within a CIDR.
 * e.g. for CIDR 10.144.0.0/16 and index 5 -> 10.144.0.5
 */
export function allocateIpv4(cidr: string, index: number): string {
  const [baseIp] = cidr.split('/');
  const parts = baseIp.split('.').map(Number);
  const offset = index + 2; // reserve .1 for gateway
  parts[3] = (parts[3] + offset) % 256;
  parts[2] = parts[2] + Math.floor((parts[3] + offset) / 256);
  return parts.join('.');
}

/**
 * Generate a virtual IPv6 address within a CIDR.
 * e.g. for CIDR fd00:cafe::/64 and index 5 -> fd00:cafe::5
 */
export function allocateIpv6(cidr: string, index: number): string {
  const [basePrefix] = cidr.split('/');
  const cleanPrefix = basePrefix.endsWith('::') ? basePrefix : `${basePrefix}::`;
  return `${cleanPrefix}${index + 2}`;
}
