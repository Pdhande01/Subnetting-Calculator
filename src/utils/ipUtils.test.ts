/**
 * Unit Tests for SubnetMaster IP Utilities
 */
import { 
  ipToLong, 
  longToIp, 
  validateIp, 
  validateSubnetMask, 
  getCidrFromMask, 
  getMaskFromCidr, 
  calculateSubnetDetails, 
  calculateFLSM, 
  calculateVLSM 
} from './ipUtils';

// Simple manual test runner helper
export function runAllTests() {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean) {
    if (condition) {
      passed++;
      results.push(`[PASS] ${name}`);
    } else {
      failed++;
      results.push(`[FAIL] ${name}`);
    }
  }

  try {
    // 1. IP conversions
    assert('ipToLong(192.168.1.1)', ipToLong('192.168.1.1') === 3232235777);
    assert('longToIp(3232235777)', longToIp(3232235777) === '192.168.1.1');
    assert('validateIp(valid)', validateIp('192.168.1.0') === true);
    assert('validateIp(invalid)', validateIp('256.100.1.1') === false);

    // 2. Subnet Mask validations
    assert('validateSubnetMask(valid)', validateSubnetMask('255.255.255.0') === true);
    assert('validateSubnetMask(invalid)', validateSubnetMask('255.255.254.128') === false);
    assert('getCidrFromMask(255.255.255.0)', getCidrFromMask('255.255.255.0') === 24);
    assert('getMaskFromCidr(24)', getMaskFromCidr(24) === '255.255.255.0');
    assert('getMaskFromCidr(30)', getMaskFromCidr(30) === '255.255.255.252');

    // 3. Subnet details calculations
    const details = calculateSubnetDetails('192.168.10.15', 24);
    assert('calculateSubnetDetails - Network', details.networkAddress === '192.168.10.0');
    assert('calculateSubnetDetails - Broadcast', details.broadcastAddress === '192.168.10.255');
    assert('calculateSubnetDetails - Usable Count', details.usableHosts === 254);
    assert('calculateSubnetDetails - Class', details.addressClass === 'Class C');

    // 4. FLSM
    const flsm = calculateFLSM('192.168.10.0', 24, 4);
    assert('FLSM - Count', flsm.length === 4);
    assert('FLSM - Subnet 1 Net', flsm[0].networkAddress === '192.168.10.0');
    assert('FLSM - Subnet 1 Mask', flsm[0].subnetMask === '255.255.255.192'); // /26
    assert('FLSM - Subnet 4 Broadcast', flsm[3].broadcastAddress === '192.168.10.255');

    // 5. VLSM
    const vlsm = calculateVLSM('192.168.10.0', 24, [
      { name: 'Group A', size: 100 },
      { name: 'Group B', size: 50 },
      { name: 'Group C', size: 20 }
    ]);
    assert('VLSM - Size', vlsm.length === 3);
    // Group A should get /25 (128 block size)
    assert('VLSM - Group A Mask', vlsm[0].cidr === 25 && vlsm[0].networkAddress === '192.168.10.0');
    // Group B should get /26 (64 block size) allocated next
    assert('VLSM - Group B Net', vlsm[1].cidr === 26 && vlsm[1].networkAddress === '192.168.10.128');

  } catch (e: any) {
    failed++;
    results.push(`[ERROR] Unexpected crash during test execution: ${e.message}`);
  }

  return {
    passed,
    failed,
    results
  };
}
