/**
 * SubnetMaster IP Subnetting Logic Utility
 */

export interface SubnetDetails {
  ipAddress: string;
  cidr: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableHost: string;
  lastUsableHost: string;
  totalHosts: number;
  usableHosts: number;
  addressClass: string;
  isPrivate: boolean;
  ipType: 'Public' | 'Private' | 'Special';
  specialUseInfo: string | null;
  rfcInfo: string | null;
  binaryIp: string;
  binaryMask: string;
  binaryNetwork: string;
  binaryBroadcast: string;
  networkBits: number;
  hostBits: number;
}

export interface FLSMSubnet {
  subnetNumber: number;
  networkAddress: string;
  firstHost: string;
  lastHost: string;
  broadcastAddress: string;
  defaultGateway: string;
  subnetMask: string;
  wildcardMask: string;
  cidr: number;
  usableHosts: number;
  binaryNetwork: string;
}

export interface VLSMSubnet {
  name: string;
  requiredHosts: number;
  usableHosts: number;
  networkAddress: string;
  firstHost: string;
  lastHost: string;
  broadcastAddress: string;
  defaultGateway: string;
  subnetMask: string;
  cidr: number;
  wildcardMask: string;
}

// Convert IP string to 32-bit unsigned integer
export function ipToLong(ip: string): number {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// Convert 32-bit unsigned integer to IP string
export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

// Validate IP string
export function validateIp(ip: string): boolean {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip.trim());
}

// Validate Subnet Mask (must be contiguous 1 bits followed by contiguous 0 bits)
export function validateSubnetMask(mask: string): boolean {
  if (!validateIp(mask)) return false;
  const long = ipToLong(mask);
  const not = ~long >>> 0;
  // A valid mask has a bitwise NOT that, when added to 1, is a power of 2.
  // Also, (~long + 1) AND (~long) must equal 0.
  // We also check that the mask is not 0 (except if allowed, but 0.0.0.0 is /0)
  return (not & (not + 1)) === 0;
}

// Get CIDR prefix length from Subnet Mask
export function getCidrFromMask(mask: string): number {
  if (!validateSubnetMask(mask)) return 24;
  const long = ipToLong(mask);
  return long.toString(2).split('1').length - 1;
}

// Get Subnet Mask from CIDR prefix length
export function getMaskFromCidr(cidr: number): string {
  if (cidr < 0 || cidr > 32) return '255.255.255.0';
  if (cidr === 0) return '0.0.0.0';
  const long = (~0 << (32 - cidr)) >>> 0;
  return longToIp(long);
}

// Get Wildcard Mask from CIDR
export function getWildcardMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) return '0.0.0.255';
  if (cidr === 0) return '255.255.255.255';
  const maskLong = (~0 << (32 - cidr)) >>> 0;
  const wildcardLong = ~maskLong >>> 0;
  return longToIp(wildcardLong);
}

// Get binary representation of an IP address (dotted octets)
export function ipToBinary(ip: string): string {
  if (!validateIp(ip)) return '00000000.00000000.00000000.00000000';
  return ip.split('.').map(octet => {
    return parseInt(octet, 10).toString(2).padStart(8, '0');
  }).join('.');
}

// Get Class of IP address
export function getIpClass(ip: string): string {
  if (!validateIp(ip)) return 'Unknown';
  const firstOctet = parseInt(ip.split('.')[0], 10);
  if (firstOctet >= 1 && firstOctet <= 126) return 'Class A';
  if (firstOctet === 127) return 'Class A (Loopback)';
  if (firstOctet >= 128 && firstOctet <= 191) return 'Class B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'Class C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'Class D (Multicast)';
  if (firstOctet >= 240 && firstOctet <= 255) return 'Class E (Reserved)';
  return 'Unknown';
}

// Detect special IP addresses and RFC information
export function getSpecialUseDetails(ip: string): {
  type: 'Public' | 'Private' | 'Special';
  info: string | null;
  rfc: string | null;
} {
  if (!validateIp(ip)) return { type: 'Public', info: null, rfc: null };
  const long = ipToLong(ip);

  // 10.0.0.0/8 - Private-Use
  if (long >= ipToLong('10.0.0.0') && long <= ipToLong('10.255.255.255')) {
    return { type: 'Private', info: 'Private-Use Networks', rfc: 'RFC 1918' };
  }
  // 172.16.0.0/12 - Private-Use
  if (long >= ipToLong('172.16.0.0') && long <= ipToLong('172.31.255.255')) {
    return { type: 'Private', info: 'Private-Use Networks', rfc: 'RFC 1918' };
  }
  // 192.168.0.0/16 - Private-Use
  if (long >= ipToLong('192.168.0.0') && long <= ipToLong('192.168.255.255')) {
    return { type: 'Private', info: 'Private-Use Networks', rfc: 'RFC 1918' };
  }
  // 127.0.0.0/8 - Loopback
  if (long >= ipToLong('127.0.0.0') && long <= ipToLong('127.255.255.255')) {
    return { type: 'Special', info: 'Loopback', rfc: 'RFC 1122' };
  }
  // 169.254.0.0/16 - Link Local
  if (long >= ipToLong('169.254.0.0') && long <= ipToLong('169.254.255.255')) {
    return { type: 'Special', info: 'Link-Local', rfc: 'RFC 3927' };
  }
  // 224.0.0.0/4 - Multicast
  if (long >= ipToLong('224.0.0.0') && long <= ipToLong('239.255.255.255')) {
    return { type: 'Special', info: 'Multicast Address Block', rfc: 'RFC 5771' };
  }
  // 240.0.0.0/4 - Reserved / Experimental
  if (long >= ipToLong('240.0.0.0') && long <= ipToLong('255.255.255.254')) {
    return { type: 'Special', info: 'Reserved/Experimental', rfc: 'RFC 1112' };
  }
  // 255.255.255.255/32 - Limited Broadcast
  if (long === 0xFFFFFFFF) {
    return { type: 'Special', info: 'Limited Broadcast', rfc: 'RFC 919' };
  }
  // 0.0.0.0/8 - "This host on this network"
  if (long >= ipToLong('0.0.0.0') && long <= ipToLong('0.255.255.255')) {
    return { type: 'Special', info: 'Current Network (Only Valid as Source Address)', rfc: 'RFC 1122' };
  }
  // 100.64.0.0/10 - Shared Address Space (Carrier-Grade NAT)
  if (long >= ipToLong('100.64.0.0') && long <= ipToLong('100.127.255.255')) {
    return { type: 'Special', info: 'Carrier-Grade NAT (CGNAT) Shared Space', rfc: 'RFC 6598' };
  }
  // 192.0.0.0/24 - IETF Protocol Assignments
  if (long >= ipToLong('192.0.0.0') && long <= ipToLong('192.0.0.255')) {
    return { type: 'Special', info: 'IETF Protocol Assignments', rfc: 'RFC 6890' };
  }
  // 192.0.2.0/24 - TEST-NET-1 (Documentation)
  if (long >= ipToLong('192.0.2.0') && long <= ipToLong('192.0.2.255')) {
    return { type: 'Special', info: 'Documentation (TEST-NET-1)', rfc: 'RFC 5737' };
  }
  // 198.51.100.0/24 - TEST-NET-2 (Documentation)
  if (long >= ipToLong('198.51.100.0') && long <= ipToLong('198.51.100.255')) {
    return { type: 'Special', info: 'Documentation (TEST-NET-2)', rfc: 'RFC 5737' };
  }
  // 203.0.113.0/24 - TEST-NET-3 (Documentation)
  if (long >= ipToLong('203.0.113.0') && long <= ipToLong('203.0.113.255')) {
    return { type: 'Special', info: 'Documentation (TEST-NET-3)', rfc: 'RFC 5737' };
  }
  // 198.18.0.0/15 - Benchmarking
  if (long >= ipToLong('198.18.0.0') && long <= ipToLong('198.19.255.255')) {
    return { type: 'Special', info: 'Network Interconnect Device Benchmark Testing', rfc: 'RFC 2544' };
  }

  return { type: 'Public', info: 'Global Unicast (Public Internet)', rfc: 'RFC 791' };
}

// Calculate full subnet details for a given IP and CIDR prefix
export function calculateSubnetDetails(ip: string, cidr: number): SubnetDetails {
  if (!validateIp(ip)) {
    throw new Error('Invalid IP Address format.');
  }
  if (cidr < 0 || cidr > 32) {
    throw new Error('CIDR prefix must be between 0 and 32.');
  }

  const ipLong = ipToLong(ip);
  const maskLong = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const wildcardLong = ~maskLong >>> 0;

  const networkLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (networkLong | wildcardLong) >>> 0;

  const subnetMask = longToIp(maskLong);
  const wildcardMask = longToIp(wildcardLong);
  const networkAddress = longToIp(networkLong);
  const broadcastAddress = longToIp(broadcastLong);

  let firstUsableLong = 0;
  let lastUsableLong = 0;
  let totalHosts = 0;
  let usableHosts = 0;

  if (cidr === 32) {
    firstUsableLong = networkLong;
    lastUsableLong = networkLong;
    totalHosts = 1;
    usableHosts = 1;
  } else if (cidr === 31) {
    firstUsableLong = networkLong;
    lastUsableLong = broadcastLong;
    totalHosts = 2;
    usableHosts = 2; // RFC 3021
  } else {
    firstUsableLong = networkLong + 1;
    lastUsableLong = broadcastLong - 1;
    totalHosts = Math.pow(2, 32 - cidr);
    usableHosts = totalHosts - 2;
  }

  const firstUsableHost = longToIp(firstUsableLong);
  const lastUsableHost = longToIp(lastUsableLong);

  const addressClass = getIpClass(ip);
  const specialDetails = getSpecialUseDetails(ip);
  const isPrivate = specialDetails.type === 'Private';

  return {
    ipAddress: ip.trim(),
    cidr,
    subnetMask,
    wildcardMask,
    networkAddress,
    broadcastAddress,
    firstUsableHost,
    lastUsableHost,
    totalHosts,
    usableHosts,
    addressClass,
    isPrivate,
    ipType: specialDetails.type,
    specialUseInfo: specialDetails.info,
    rfcInfo: specialDetails.rfc,
    binaryIp: ipToBinary(ip),
    binaryMask: ipToBinary(subnetMask),
    binaryNetwork: ipToBinary(networkAddress),
    binaryBroadcast: ipToBinary(broadcastAddress),
    networkBits: cidr,
    hostBits: 32 - cidr
  };
}

// Generate all subnets automatically (FLSM)
export function calculateFLSM(
  baseIp: string,
  baseCidr: number,
  subnetsCount: number
): FLSMSubnet[] {
  if (!validateIp(baseIp)) return [];
  
  // Calculate borrowed bits to fit the required subnets
  const borrowedBits = Math.ceil(Math.log2(subnetsCount));
  const newCidr = baseCidr + borrowedBits;

  if (newCidr > 32) {
    // Cannot split beyond /32
    return [];
  }

  const baseDetails = calculateSubnetDetails(baseIp, baseCidr);
  const startNetworkLong = ipToLong(baseDetails.networkAddress);
  const subnetSize = Math.pow(2, 32 - newCidr);
  
  const subnets: FLSMSubnet[] = [];

  for (let i = 0; i < subnetsCount; i++) {
    const netLong = (startNetworkLong + (i * subnetSize)) >>> 0;
    
    // Check if we overflow the base network bounds (if not 0.0.0.0/0)
    if (baseCidr > 0) {
      const baseMaskLong = (~0 << (32 - baseCidr)) >>> 0;
      const baseNetLong = (startNetworkLong & baseMaskLong) >>> 0;
      const currentBaseNetLong = (netLong & baseMaskLong) >>> 0;
      if (baseNetLong !== currentBaseNetLong) {
        break; // Out of bounds of base network
      }
    }

    const broadcastLong = (netLong + subnetSize - 1) >>> 0;
    
    let firstHostLong = 0;
    let lastHostLong = 0;
    let usable = 0;

    if (newCidr === 32) {
      firstHostLong = netLong;
      lastHostLong = netLong;
      usable = 1;
    } else if (newCidr === 31) {
      firstHostLong = netLong;
      lastHostLong = broadcastLong;
      usable = 2;
    } else {
      firstHostLong = netLong + 1;
      lastHostLong = broadcastLong - 1;
      usable = subnetSize - 2;
    }

    subnets.push({
      subnetNumber: i + 1,
      networkAddress: longToIp(netLong),
      firstHost: longToIp(firstHostLong),
      lastHost: longToIp(lastHostLong),
      broadcastAddress: longToIp(broadcastLong),
      defaultGateway: longToIp(firstHostLong), // Typically first host
      subnetMask: getMaskFromCidr(newCidr),
      wildcardMask: getWildcardMask(newCidr),
      cidr: newCidr,
      usableHosts: usable,
      binaryNetwork: ipToBinary(longToIp(netLong))
    });
  }

  return subnets;
}

// Generate VLSM subnets.
// Inputs: Base network (e.g. 192.168.10.0/24) and requested host group sizes.
// Automatically allocates by sorting requests descending (largest first) to avoid overlaps.
export function calculateVLSM(
  baseIp: string,
  baseCidr: number,
  hostsRequests: { name: string; size: number }[]
): VLSMSubnet[] {
  if (!validateIp(baseIp) || baseCidr < 0 || baseCidr > 32 || hostsRequests.length === 0) {
    return [];
  }

  // Sort groups by size descending (crucial for VLSM algorithm)
  const sortedRequests = [...hostsRequests]
    .map((r, index) => ({
      originalIndex: index,
      name: r.name || `Subnet ${index + 1}`,
      size: r.size
    }))
    .sort((a, b) => b.size - a.size);

  const baseDetails = calculateSubnetDetails(baseIp, baseCidr);
  let currentIpLong = ipToLong(baseDetails.networkAddress);
  const baseNetworkEndLong = (currentIpLong + Math.pow(2, 32 - baseCidr) - 1) >>> 0;

  const allocatedSubnets: (VLSMSubnet & { originalIndex: number })[] = [];

  for (const req of sortedRequests) {
    const needed = req.size;
    
    // Find the prefix length that can support at least `needed` usable hosts.
    // Usable hosts for CIDR <= 30 is 2^(32-CIDR) - 2.
    // For /31 it is 2 usable hosts.
    // For /32 it is 1 usable host.
    let allocatedCidr = 32;
    for (let c = 32; c >= 0; c--) {
      let usable = 0;
      if (c === 32) usable = 1;
      else if (c === 31) usable = 2;
      else usable = Math.pow(2, 32 - c) - 2;

      if (usable >= needed) {
        allocatedCidr = c;
        break;
      }
    }

    const blockSize = Math.pow(2, 32 - allocatedCidr);
    
    // Align currentIpLong to the block size boundary.
    // E.g. for block size 64, address must be multiple of 64.
    if (currentIpLong % blockSize !== 0) {
      currentIpLong = (Math.ceil(currentIpLong / blockSize) * blockSize) >>> 0;
    }

    // Check if we exceed base network bounds
    if (currentIpLong + blockSize - 1 > baseNetworkEndLong) {
      // Out of address space!
      // Add as unallocated
      allocatedSubnets.push({
        originalIndex: req.originalIndex,
        name: req.name,
        requiredHosts: needed,
        usableHosts: 0,
        networkAddress: 'Address Space Exhausted',
        firstHost: 'N/A',
        lastHost: 'N/A',
        broadcastAddress: 'N/A',
        defaultGateway: 'N/A',
        subnetMask: 'N/A',
        cidr: 0,
        wildcardMask: 'N/A'
      });
      continue;
    }

    const netLong = currentIpLong;
    const broadcastLong = (netLong + blockSize - 1) >>> 0;

    let firstHostLong = 0;
    let lastHostLong = 0;
    let usableHostsCount = 0;

    if (allocatedCidr === 32) {
      firstHostLong = netLong;
      lastHostLong = netLong;
      usableHostsCount = 1;
    } else if (allocatedCidr === 31) {
      firstHostLong = netLong;
      lastHostLong = broadcastLong;
      usableHostsCount = 2;
    } else {
      firstHostLong = netLong + 1;
      lastHostLong = broadcastLong - 1;
      usableHostsCount = blockSize - 2;
    }

    allocatedSubnets.push({
      originalIndex: req.originalIndex,
      name: req.name,
      requiredHosts: needed,
      usableHosts: usableHostsCount,
      networkAddress: longToIp(netLong),
      firstHost: longToIp(firstHostLong),
      lastHost: longToIp(lastHostLong),
      broadcastAddress: longToIp(broadcastLong),
      defaultGateway: longToIp(firstHostLong),
      subnetMask: getMaskFromCidr(allocatedCidr),
      cidr: allocatedCidr,
      wildcardMask: getWildcardMask(allocatedCidr)
    });

    // Advance pointer
    currentIpLong = (broadcastLong + 1) >>> 0;
  }

  // Sort back to matches the original input order for consistent listing
  return allocatedSubnets
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(({ originalIndex, ...subnet }) => subnet);
}
