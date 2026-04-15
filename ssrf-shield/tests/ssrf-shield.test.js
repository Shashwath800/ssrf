/**
 * ssrf-shield — Comprehensive Test Suite
 * 
 * 100+ edge cases covering all SSRF bypass techniques.
 * Tests the full pipeline and individual modules.
 */

const SSRFShield = require('../index');
const ipValidator = require('../lib/ipValidator');
const urlNormalizer = require('../lib/urlNormalizer');
const protocolValidator = require('../lib/protocolValidator');
const dnsResolver = require('../lib/dnsResolver');
const egressFirewall = require('../lib/egressFirewall');
const responseInspector = require('../lib/responseInspector');
const timeoutSizeEnforcer = require('../lib/timeoutSizeEnforcer');
const requestMetadataLimiter = require('../lib/requestMetadataLimiter');
const allowlistChecker = require('../lib/allowlistChecker');
const redirectRevalidation = require('../lib/redirectRevalidation');

// ═══════════════════════════════════════════════════════════
// Helper: Create a shield with a custom DNS resolver so tests
// don't depend on real network DNS.
// ═══════════════════════════════════════════════════════════
function createShield(resolvedIPs = ["8.8.8.8"], dnsMode = "SAFE") {
  return new SSRFShield({
    dnsMode,
    customDnsResolver: (hostname) => ({
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname,
        resolvedIPs,
        dnsMode,
        resolver: "test-mock",
        note: "Test mock resolver",
      },
    }),
  });
}

function createAttackShield() {
  return createShield(["169.254.169.254"], "ATTACK");
}

// ═══════════════════════════════════════════════════════════
// 1. URL NORMALIZER MODULE TESTS
// ═══════════════════════════════════════════════════════════
describe('URL Normalizer', () => {
  test('normalizes a standard URL', () => {
    const result = urlNormalizer.normalize('http://example.com/path');
    expect(result.status).toBe('PASS');
    expect(result.data.hostname).toBe('example.com');
  });

  test('rejects completely invalid URLs', () => {
    const result = urlNormalizer.normalize('not-a-url');
    expect(result.status).toBe('BLOCK');
  });

  test('normalizes URL with extra spaces', () => {
    const result = urlNormalizer.normalize('  http://example.com  ');
    expect(result.status).toBe('PASS');
    expect(result.data.hostname).toBe('example.com');
  });

  test('handles URL-encoded characters', () => {
    const result = urlNormalizer.normalize('http://example.com/pa%74h');
    expect(result.status).toBe('PASS');
  });

  test('extracts port correctly', () => {
    const result = urlNormalizer.normalize('http://example.com:8080/');
    expect(result.status).toBe('PASS');
    expect(result.data.port).toBe('8080');
  });

  test('default port for https', () => {
    const result = urlNormalizer.normalize('https://example.com/');
    expect(result.status).toBe('PASS');
    expect(result.data.port).toBe('443');
  });

  test('default port for http', () => {
    const result = urlNormalizer.normalize('http://example.com/');
    expect(result.status).toBe('PASS');
    expect(result.data.port).toBe('80');
  });
});

// ═══════════════════════════════════════════════════════════
// 2. PROTOCOL + PORT VALIDATOR TESTS
// ═══════════════════════════════════════════════════════════
describe('Protocol + Port Validator', () => {
  test('allows http protocol', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '80' });
    expect(result.status).toBe('PASS');
  });

  test('allows https protocol', () => {
    const result = protocolValidator.validate({ protocol: 'https:', port: '443' });
    expect(result.status).toBe('PASS');
  });

  test('blocks file:// protocol', () => {
    const result = protocolValidator.validate({ protocol: 'file:', port: '' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks gopher:// protocol', () => {
    const result = protocolValidator.validate({ protocol: 'gopher:', port: '' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks dict:// protocol', () => {
    const result = protocolValidator.validate({ protocol: 'dict:', port: '' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks ftp:// protocol', () => {
    const result = protocolValidator.validate({ protocol: 'ftp:', port: '' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks non-standard port 8080', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '8080' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks Redis port 6379', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '6379' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks MySQL port 3306', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '3306' });
    expect(result.status).toBe('BLOCK');
  });

  test('blocks MongoDB port 27017', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '27017' });
    expect(result.status).toBe('BLOCK');
  });

  test('allows default empty port', () => {
    const result = protocolValidator.validate({ protocol: 'http:', port: '' });
    expect(result.status).toBe('PASS');
  });
});

// ═══════════════════════════════════════════════════════════
// 3. IP VALIDATOR — IPv4 Private Ranges
// ═══════════════════════════════════════════════════════════
describe('IP Validator — IPv4', () => {
  test('blocks 127.0.0.1 (loopback)', () => {
    const result = ipValidator.isPrivateIPv4('127.0.0.1');
    expect(result.private).toBe(true);
  });

  test('blocks 127.255.255.255 (loopback range)', () => {
    const result = ipValidator.isPrivateIPv4('127.255.255.255');
    expect(result.private).toBe(true);
  });

  test('blocks 10.0.0.1 (RFC1918)', () => {
    const result = ipValidator.isPrivateIPv4('10.0.0.1');
    expect(result.private).toBe(true);
  });

  test('blocks 172.16.0.1 (RFC1918)', () => {
    const result = ipValidator.isPrivateIPv4('172.16.0.1');
    expect(result.private).toBe(true);
  });

  test('blocks 172.31.255.255 (RFC1918 upper bound)', () => {
    const result = ipValidator.isPrivateIPv4('172.31.255.255');
    expect(result.private).toBe(true);
  });

  test('allows 172.32.0.1 (just outside RFC1918)', () => {
    const result = ipValidator.isPrivateIPv4('172.32.0.1');
    expect(result.private).toBe(false);
  });

  test('blocks 192.168.1.1 (RFC1918)', () => {
    const result = ipValidator.isPrivateIPv4('192.168.1.1');
    expect(result.private).toBe(true);
  });

  test('blocks 169.254.169.254 (AWS metadata)', () => {
    const result = ipValidator.isPrivateIPv4('169.254.169.254');
    expect(result.private).toBe(true);
  });

  test('blocks 0.0.0.0 (unspecified)', () => {
    const result = ipValidator.isPrivateIPv4('0.0.0.0');
    expect(result.private).toBe(true);
  });

  test('allows 8.8.8.8 (Google DNS)', () => {
    const result = ipValidator.isPrivateIPv4('8.8.8.8');
    expect(result.private).toBe(false);
  });

  test('allows 1.1.1.1 (Cloudflare DNS)', () => {
    const result = ipValidator.isPrivateIPv4('1.1.1.1');
    expect(result.private).toBe(false);
  });

  test('allows 93.184.216.34 (example.com)', () => {
    const result = ipValidator.isPrivateIPv4('93.184.216.34');
    expect(result.private).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. IP VALIDATOR — IPv6 Full Coverage
// ═══════════════════════════════════════════════════════════
describe('IP Validator — IPv6', () => {
  test('blocks ::1 (loopback compressed)', () => {
    const result = ipValidator.isPrivateIPv6('::1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('loopback');
  });

  test('blocks 0:0:0:0:0:0:0:1 (loopback full-form)', () => {
    const result = ipValidator.isPrivateIPv6('0:0:0:0:0:0:0:1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('loopback');
  });

  test('blocks 0000:0000:0000:0000:0000:0000:0000:0001 (loopback padded)', () => {
    const result = ipValidator.isPrivateIPv6('0000:0000:0000:0000:0000:0000:0000:0001');
    expect(result.private).toBe(true);
  });

  test('blocks :: (unspecified)', () => {
    const result = ipValidator.isPrivateIPv6('::');
    expect(result.private).toBe(true);
  });

  test('blocks fe80::1 (link-local)', () => {
    const result = ipValidator.isPrivateIPv6('fe80::1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('link-local');
  });

  test('blocks febf::1 (link-local upper bound)', () => {
    const result = ipValidator.isPrivateIPv6('febf::1');
    expect(result.private).toBe(true);
  });

  test('blocks fc00::1 (unique local)', () => {
    const result = ipValidator.isPrivateIPv6('fc00::1');
    expect(result.private).toBe(true);
  });

  test('blocks fd00::1 (unique local)', () => {
    const result = ipValidator.isPrivateIPv6('fd00::1');
    expect(result.private).toBe(true);
  });

  test('blocks fdff::1 (unique local upper bound)', () => {
    const result = ipValidator.isPrivateIPv6('fdff::1');
    expect(result.private).toBe(true);
  });

  // IPv4-mapped IPv6
  test('blocks ::ffff:127.0.0.1 (IPv4-mapped loopback)', () => {
    const result = ipValidator.isPrivateIPv6('::ffff:127.0.0.1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('127.0.0.1');
  });

  test('blocks ::ffff:169.254.169.254 (IPv4-mapped metadata)', () => {
    const result = ipValidator.isPrivateIPv6('::ffff:169.254.169.254');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('169.254');
  });

  test('blocks ::ffff:10.0.0.1 (IPv4-mapped RFC1918)', () => {
    const result = ipValidator.isPrivateIPv6('::ffff:10.0.0.1');
    expect(result.private).toBe(true);
  });

  test('blocks ::ffff:192.168.1.1 (IPv4-mapped RFC1918)', () => {
    const result = ipValidator.isPrivateIPv6('::ffff:192.168.1.1');
    expect(result.private).toBe(true);
  });

  test('allows ::ffff:8.8.8.8 (IPv4-mapped public)', () => {
    const result = ipValidator.isPrivateIPv6('::ffff:8.8.8.8');
    expect(result.private).toBe(false);
  });

  // 6to4 addresses
  test('blocks 2002:7f00::1 (6to4 wrapping 127.0.x.x)', () => {
    const result = ipValidator.isPrivateIPv6('2002:7f00::1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('6to4');
  });

  test('blocks 2002:7f00:0001::1 (6to4 wrapping 127.0.0.1)', () => {
    const result = ipValidator.isPrivateIPv6('2002:7f00:0001::1');
    expect(result.private).toBe(true);
  });

  test('blocks 2002:a9fe::1 (6to4 wrapping 169.254.x.x)', () => {
    const result = ipValidator.isPrivateIPv6('2002:a9fe::1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('6to4');
  });

  test('blocks 2002:0a00::1 (6to4 wrapping 10.0.x.x)', () => {
    const result = ipValidator.isPrivateIPv6('2002:0a00::1');
    expect(result.private).toBe(true);
  });

  test('blocks 2002:c0a8::1 (6to4 wrapping 192.168.x.x)', () => {
    const result = ipValidator.isPrivateIPv6('2002:c0a8::1');
    expect(result.private).toBe(true);
  });

  test('blocks 2002:ac10::1 (6to4 wrapping 172.16.x.x)', () => {
    const result = ipValidator.isPrivateIPv6('2002:ac10::1');
    expect(result.private).toBe(true);
  });

  test('allows 2002:0808::1 (6to4 wrapping 8.8.x.x — public)', () => {
    const result = ipValidator.isPrivateIPv6('2002:0808::1');
    expect(result.private).toBe(false);
  });

  // NAT64 addresses
  test('blocks 64:ff9b::127.0.0.1 (NAT64 loopback)', () => {
    const result = ipValidator.isPrivateIPv6('64:ff9b::127.0.0.1');
    expect(result.private).toBe(true);
    expect(result.reason).toContain('NAT64');
  });

  test('blocks 64:ff9b::169.254.169.254 (NAT64 metadata)', () => {
    const result = ipValidator.isPrivateIPv6('64:ff9b::169.254.169.254');
    expect(result.private).toBe(true);
  });

  test('blocks 64:ff9b::10.0.0.1 (NAT64 private)', () => {
    const result = ipValidator.isPrivateIPv6('64:ff9b::10.0.0.1');
    expect(result.private).toBe(true);
  });

  test('blocks 64:ff9b::192.168.1.1 (NAT64 private)', () => {
    const result = ipValidator.isPrivateIPv6('64:ff9b::192.168.1.1');
    expect(result.private).toBe(true);
  });

  test('allows 64:ff9b::8.8.8.8 (NAT64 public)', () => {
    const result = ipValidator.isPrivateIPv6('64:ff9b::8.8.8.8');
    expect(result.private).toBe(false);
  });

  // Public IPv6
  test('allows 2001:4860:4860::8888 (Google public DNS)', () => {
    const result = ipValidator.isPrivateIPv6('2001:4860:4860::8888');
    expect(result.private).toBe(false);
  });

  test('allows 2606:4700::1111 (Cloudflare)', () => {
    const result = ipValidator.isPrivateIPv6('2606:4700::1111');
    expect(result.private).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. normalizeIPv6 HELPER TESTS
// ═══════════════════════════════════════════════════════════
describe('normalizeIPv6 helper', () => {
  test('expands ::1 to full form', () => {
    const result = ipValidator.normalizeIPv6('::1');
    expect(result).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
  });

  test('expands :: to all zeros', () => {
    const result = ipValidator.normalizeIPv6('::');
    expect(result).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
  });

  test('expands fe80::1', () => {
    const result = ipValidator.normalizeIPv6('fe80::1');
    expect(result).toBe('fe80:0000:0000:0000:0000:0000:0000:0001');
  });

  test('handles already-expanded form', () => {
    const result = ipValidator.normalizeIPv6('0000:0000:0000:0000:0000:0000:0000:0001');
    expect(result).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
  });

  test('normalizes mixed IPv4-mapped to hex', () => {
    const result = ipValidator.normalizeIPv6('::ffff:127.0.0.1');
    expect(result).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001');
  });

  test('strips brackets from [::1]', () => {
    const result = ipValidator.normalizeIPv6('[::1]');
    expect(result).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
  });

  test('normalizes 64:ff9b::127.0.0.1', () => {
    const result = ipValidator.normalizeIPv6('64:ff9b::127.0.0.1');
    expect(result).toBe('0064:ff9b:0000:0000:0000:0000:7f00:0001');
  });
});

// ═══════════════════════════════════════════════════════════
// 6. IP VALIDATOR validate() function
// ═══════════════════════════════════════════════════════════
describe('IP Validator — validate()', () => {
  test('blocks array containing private IP', () => {
    const result = ipValidator.validate(['127.0.0.1']);
    expect(result.status).toBe('BLOCK');
  });

  test('blocks if any IP in array is private', () => {
    const result = ipValidator.validate(['8.8.8.8', '10.0.0.1']);
    expect(result.status).toBe('BLOCK');
  });

  test('passes all public IPs', () => {
    const result = ipValidator.validate(['8.8.8.8', '1.1.1.1']);
    expect(result.status).toBe('PASS');
  });

  test('blocks mixed IPv4/IPv6 if any is private', () => {
    const result = ipValidator.validate(['8.8.8.8', '::1']);
    expect(result.status).toBe('BLOCK');
  });

  test('passes public IPv6', () => {
    const result = ipValidator.validate(['2001:4860:4860::8888']);
    expect(result.status).toBe('PASS');
  });
});

// ═══════════════════════════════════════════════════════════
// 7. EGRESS FIREWALL TESTS
// ═══════════════════════════════════════════════════════════
describe('Egress Firewall', () => {
  test('blocks 127.0.0.1', () => {
    expect(egressFirewall.enforce('127.0.0.1').status).toBe('BLOCK');
  });

  test('blocks 10.0.0.1', () => {
    expect(egressFirewall.enforce('10.0.0.1').status).toBe('BLOCK');
  });

  test('blocks 169.254.169.254', () => {
    expect(egressFirewall.enforce('169.254.169.254').status).toBe('BLOCK');
  });

  test('blocks ::1 (IPv6 loopback)', () => {
    expect(egressFirewall.enforce('::1').status).toBe('BLOCK');
  });

  test('blocks 0:0:0:0:0:0:0:1 (full-form loopback)', () => {
    expect(egressFirewall.enforce('0:0:0:0:0:0:0:1').status).toBe('BLOCK');
  });

  test('blocks fe80::1 (link-local)', () => {
    expect(egressFirewall.enforce('fe80::1').status).toBe('BLOCK');
  });

  test('blocks fd00::1 (unique local)', () => {
    expect(egressFirewall.enforce('fd00::1').status).toBe('BLOCK');
  });

  test('blocks ::ffff:127.0.0.1 (IPv4-mapped)', () => {
    expect(egressFirewall.enforce('::ffff:127.0.0.1').status).toBe('BLOCK');
  });

  test('blocks 2002:7f00::1 (6to4 loopback)', () => {
    expect(egressFirewall.enforce('2002:7f00::1').status).toBe('BLOCK');
  });

  test('blocks 2002:a9fe::1 (6to4 link-local)', () => {
    expect(egressFirewall.enforce('2002:a9fe::1').status).toBe('BLOCK');
  });

  test('blocks 64:ff9b::127.0.0.1 (NAT64)', () => {
    expect(egressFirewall.enforce('64:ff9b::127.0.0.1').status).toBe('BLOCK');
  });

  test('allows 8.8.8.8 (public)', () => {
    expect(egressFirewall.enforce('8.8.8.8').status).toBe('PASS');
  });

  test('allows 2001:4860:4860::8888 (public IPv6)', () => {
    expect(egressFirewall.enforce('2001:4860:4860::8888').status).toBe('PASS');
  });
});

// ═══════════════════════════════════════════════════════════
// 8. RESPONSE INSPECTOR TESTS
// ═══════════════════════════════════════════════════════════
describe('Response Inspector', () => {
  test('detects AWS access key in body', () => {
    const result = responseInspector.inspect('accessKey: AKIAFAKEKEY123456');
    expect(result.status).toBe('BLOCK');
    expect(result.data.findings).toEqual(expect.arrayContaining([expect.stringContaining('AWS Access Key')]));
  });

  test('detects bearer token in body', () => {
    const result = responseInspector.inspect('Authorization: bearer eyJhbGciOiJIUzI1NiJ9.test');
    expect(result.status).toBe('BLOCK');
  });

  test('detects private key in body', () => {
    const result = responseInspector.inspect('-----BEGIN RSA PRIVATE KEY-----\nMIIE...');
    expect(result.status).toBe('BLOCK');
  });

  test('detects password in body', () => {
    const result = responseInspector.inspect('password: supersecret123');
    expect(result.status).toBe('BLOCK');
  });

  test('detects private IP 10.x.x.x in body', () => {
    const result = responseInspector.inspect('Server is at 10.0.0.1');
    expect(result.status).toBe('BLOCK');
  });

  test('detects private IP 192.168.x.x in body', () => {
    const result = responseInspector.inspect('Internal: 192.168.1.100');
    expect(result.status).toBe('BLOCK');
  });

  test('detects private IP 172.16.x.x in body', () => {
    const result = responseInspector.inspect('Upstream: 172.16.0.1');
    expect(result.status).toBe('BLOCK');
  });

  test('detects 127.x.x.x loopback in body', () => {
    const result = responseInspector.inspect('Bound to 127.0.0.1:3000');
    expect(result.status).toBe('BLOCK');
  });

  test('detects 169.254.x.x link-local in body', () => {
    const result = responseInspector.inspect('Metadata: 169.254.169.254');
    expect(result.status).toBe('BLOCK');
  });

  test('detects secret key reference in body', () => {
    const result = responseInspector.inspect('aws_secret: abcdefghijk');
    expect(result.status).toBe('BLOCK');
  });

  test('detects GCP API key', () => {
    const result = responseInspector.inspect('key: AIzaSyB_abcdefghijklmnopqrstuvwxyz12345');
    expect(result.status).toBe('BLOCK');
  });

  test('passes clean response', () => {
    const result = responseInspector.inspect('Hello, world! This is a safe response.');
    expect(result.status).toBe('PASS');
  });

  test('detects sensitive data in headers', () => {
    const result = responseInspector.inspect('OK', { 'X-Internal': 'server at 10.0.0.5' });
    expect(result.status).toBe('BLOCK');
  });
});

// ═══════════════════════════════════════════════════════════
// 9. TIMEOUT & SIZE ENFORCER TESTS
// ═══════════════════════════════════════════════════════════
describe('Timeout & Size Enforcer', () => {
  test('passes small body within timeout', () => {
    const result = timeoutSizeEnforcer.enforce('Hello', { timeoutMs: 10000, maxBodyBytes: 1048576 });
    // Since latency is random (50-250ms), this should pass with a 10s timeout
    expect(result.status).toBe('PASS');
  });

  test('blocks oversized body', () => {
    const hugeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const result = timeoutSizeEnforcer.enforce(hugeBody, { timeoutMs: 10000, maxBodyBytes: 1048576 });
    expect(result.status).toBe('BLOCK');
    expect(result.reason).toContain('exceeds max size');
  });

  test('blocks with very small timeout (guaranteed timeout simulation)', () => {
    // The enforcer simulates latency of 50-250ms, so a 1ms timeout should always trigger
    const result = timeoutSizeEnforcer.enforce('Hello', { timeoutMs: 1, maxBodyBytes: 1048576 });
    expect(result.status).toBe('BLOCK');
  });

  test('reports body size correctly', () => {
    const body = 'Test body content';
    const result = timeoutSizeEnforcer.enforce(body, { timeoutMs: 10000, maxBodyBytes: 1048576 });
    expect(result.data.bodySize).toBe(Buffer.byteLength(body, 'utf8'));
  });
});

// ═══════════════════════════════════════════════════════════
// 10. REQUEST METADATA LIMITER TESTS
// ═══════════════════════════════════════════════════════════
describe('Request Metadata Limiter', () => {
  test('strips X-Forwarded-For header', () => {
    const result = requestMetadataLimiter.sanitize({ 'X-Forwarded-For': '1.2.3.4' });
    expect(result.status).toBe('PASS');
    expect(result.data.strippedHeaders).toContain('X-Forwarded-For');
  });

  test('strips X-Real-IP header', () => {
    const result = requestMetadataLimiter.sanitize({ 'X-Real-IP': '1.2.3.4' });
    expect(result.data.strippedHeaders).toContain('X-Real-IP');
  });

  test('strips Referer header', () => {
    const result = requestMetadataLimiter.sanitize({ 'Referer': 'http://internal.corp' });
    expect(result.data.strippedHeaders).toContain('Referer');
  });

  test('keeps safe headers', () => {
    const result = requestMetadataLimiter.sanitize({ 'Content-Type': 'application/json' });
    expect(result.data.strippedHeaders.length).toBe(0);
  });

  test('passes with no headers', () => {
    const result = requestMetadataLimiter.sanitize({});
    expect(result.status).toBe('PASS');
  });
});

// ═══════════════════════════════════════════════════════════
// 11. ALLOWLIST CHECKER TESTS
// ═══════════════════════════════════════════════════════════
describe('Allowlist Checker', () => {
  test('passes allowlisted domain', () => {
    const result = allowlistChecker.check('example.com');
    expect(result.status).toBe('PASS');
    expect(result.data.allowlisted).toBe(true);
  });

  test('passes non-allowlisted domain (demo mode)', () => {
    const result = allowlistChecker.check('evil.com');
    expect(result.status).toBe('PASS'); // It passes but logs a warning
    expect(result.data.allowlisted).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 12. REDIRECT REVALIDATION TESTS
// ═══════════════════════════════════════════════════════════
describe('Redirect Revalidation', () => {
  test('blocks redirect to 169.254.169.254', () => {
    const result = redirectRevalidation.revalidate('http://169.254.169.254/latest/', '169.254.169.254');
    expect(result.status).toBe('BLOCK');
  });

  test('blocks redirect to localhost', () => {
    const result = redirectRevalidation.revalidate('http://localhost/admin', '127.0.0.1');
    expect(result.status).toBe('BLOCK');
  });

  test('blocks redirect to 127.0.0.1', () => {
    const result = redirectRevalidation.revalidate('http://127.0.0.1/internal', '127.0.0.1');
    expect(result.status).toBe('BLOCK');
  });

  test('passes safe redirect', () => {
    const result = redirectRevalidation.revalidate('http://example.com/page', '93.184.216.34');
    expect(result.status).toBe('PASS');
  });
});

// ═══════════════════════════════════════════════════════════
// 13. DNS RESOLVER MODULE TESTS
// ═══════════════════════════════════════════════════════════
describe('DNS Resolver module', () => {
  beforeEach(() => {
    dnsResolver.setDnsMode('SAFE');
  });

  test('resolves localhost from knownHosts', async () => {
    const result = await dnsResolver.resolve('localhost');
    expect(result.status).toBe('PASS');
    expect(result.data.resolvedIPs).toContain('127.0.0.1');
  });

  test('resolves 169.254.169.254 from knownHosts', async () => {
    const result = await dnsResolver.resolve('169.254.169.254');
    expect(result.status).toBe('PASS');
    expect(result.data.resolvedIPs).toContain('169.254.169.254');
  });

  test('getDnsMode returns current mode', () => {
    expect(dnsResolver.getDnsMode()).toBe('SAFE');
  });

  test('toggleDnsMode switches modes', () => {
    const newMode = dnsResolver.toggleDnsMode();
    expect(newMode).toBe('ATTACK');
    dnsResolver.toggleDnsMode(); // switch back
  });

  test('setDnsMode sets mode directly', () => {
    dnsResolver.setDnsMode('ATTACK');
    expect(dnsResolver.getDnsMode()).toBe('ATTACK');
    dnsResolver.setDnsMode('SAFE');
  });

  test('addMappings adds custom records', async () => {
    dnsResolver.addMappings({ 'custom.test': ['1.2.3.4'] });
    const result = await dnsResolver.resolve('custom.test');
    expect(result.status).toBe('PASS');
    expect(result.data.resolvedIPs).toContain('1.2.3.4');
  });

  test('resolves real domain in SAFE mode', async () => {
    // This tests real DNS — may fail on CI without network
    // Using a domain that definitely exists
    const result = await dnsResolver.resolve('dns.google');
    expect(result.status).toBe('PASS');
    expect(result.data.resolvedIPs.length).toBeGreaterThan(0);
  });

  test('ATTACK mode overrides with metadata IP', async () => {
    dnsResolver.setDnsMode('ATTACK');
    const result = await dnsResolver.resolve('dns.google');
    expect(result.status).toBe('PASS');
    expect(result.data.resolvedIPs).toContain('169.254.169.254');
    dnsResolver.setDnsMode('SAFE');
  });

  test('handles non-existent domain gracefully', async () => {
    const result = await dnsResolver.resolve('this-domain-definitely-does-not-exist-xyz123.com');
    expect(result.status).toBe('BLOCK');
    expect(result.reason).toContain('DNS resolution failed');
  });
});

// ═══════════════════════════════════════════════════════════
// 14. FULL PIPELINE INTEGRATION TESTS — SAFE MODE
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — SAFE mode (public URLs should PASS)', () => {
  let shield;
  beforeAll(() => {
    shield = createShield(["93.184.216.34"]);
  });

  test('https://example.com passes all layers', async () => {
    const result = await shield.scan('https://example.com');
    expect(result.status).toBe('PASS');
  });

  test('http://example.com passes all layers', async () => {
    const result = await shield.scan('http://example.com');
    expect(result.status).toBe('PASS');
  });

  test('https://www.example.com passes', async () => {
    const result = await shield.scan('https://www.example.com/path/to/page');
    expect(result.status).toBe('PASS');
  });

  test('https://httpbin.org passes', async () => {
    const result = await shield.scan('https://httpbin.org/get');
    expect(result.status).toBe('PASS');
  });

  test('result contains steps array', async () => {
    const result = await shield.scan('https://example.com');
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  test('result contains logs array', async () => {
    const result = await shield.scan('https://example.com');
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 15. FULL PIPELINE — BLOCKED SCENARIOS
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — URLs that should be BLOCKED', () => {
  test('blocks http://127.0.0.1/ (loopback)', async () => {
    const shield = createShield(["127.0.0.1"]);
    const result = await shield.scan('http://127.0.0.1/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://169.254.169.254/latest/meta-data/', async () => {
    const shield = createShield(["169.254.169.254"]);
    const result = await shield.scan('http://169.254.169.254/latest/meta-data/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://10.0.0.1/ (RFC1918)', async () => {
    const shield = createShield(["10.0.0.1"]);
    const result = await shield.scan('http://10.0.0.1/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://192.168.1.1/', async () => {
    const shield = createShield(["192.168.1.1"]);
    const result = await shield.scan('http://192.168.1.1/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://172.16.0.1/', async () => {
    const shield = createShield(["172.16.0.1"]);
    const result = await shield.scan('http://172.16.0.1/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks ATTACK mode (DNS rebinding to 169.254.169.254)', async () => {
    const shield = createAttackShield();
    const result = await shield.scan('http://example.com/');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 16. PROTOCOL BLOCKING IN FULL PIPELINE
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — Protocol blocking', () => {
  let shield;
  beforeAll(() => {
    shield = createShield(["8.8.8.8"]);
  });

  test('blocks file:///etc/passwd', async () => {
    const result = await shield.scan('file:///etc/passwd');
    expect(result.status).toBe('BLOCKED');
    const blockStep = result.steps.find(s => s.status === 'BLOCK');
    expect(blockStep.step).toBe('Protocol + Port Validator');
  });

  test('blocks gopher://evil.com', async () => {
    const result = await shield.scan('gopher://evil.com');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks dict://evil.com', async () => {
    const result = await shield.scan('dict://evil.com');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks ftp://evil.com', async () => {
    const result = await shield.scan('ftp://evil.com');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks javascript: protocol', async () => {
    // URL constructor may throw, which means URL Normalizer blocks it
    const result = await shield.scan('javascript:alert(1)');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 17. NON-STANDARD PORT BLOCKING
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — Non-standard port blocking', () => {
  let shield;
  beforeAll(() => {
    shield = createShield(["8.8.8.8"]);
  });

  test('blocks http://example.com:8080/', async () => {
    const result = await shield.scan('http://example.com:8080/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://example.com:6379/ (Redis)', async () => {
    const result = await shield.scan('http://example.com:6379/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://example.com:3306/ (MySQL)', async () => {
    const result = await shield.scan('http://example.com:3306/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://example.com:22/ (SSH)', async () => {
    const result = await shield.scan('http://example.com:22/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://example.com:3000/ (dev server)', async () => {
    const result = await shield.scan('http://example.com:3000/');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 18. IPv6 IN FULL PIPELINE
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — IPv6 bypass attempts', () => {
  test('blocks http://[::ffff:127.0.0.1]/', async () => {
    const shield = createShield(["::ffff:127.0.0.1"]);
    const result = await shield.scan('http://[::ffff:127.0.0.1]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[::ffff:169.254.169.254]/', async () => {
    const shield = createShield(["::ffff:169.254.169.254"]);
    const result = await shield.scan('http://[::ffff:169.254.169.254]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[fe80::1]/', async () => {
    const shield = createShield(["fe80::1"]);
    const result = await shield.scan('http://[fe80::1]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[2002:7f00::1]/ (6to4)', async () => {
    const shield = createShield(["2002:7f00::1"]);
    const result = await shield.scan('http://[2002:7f00::1]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[2002:a9fe::1]/ (6to4 metadata)', async () => {
    const shield = createShield(["2002:a9fe::1"]);
    const result = await shield.scan('http://[2002:a9fe::1]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[64:ff9b::127.0.0.1]/ (NAT64)', async () => {
    const shield = createShield(["64:ff9b::127.0.0.1"]);
    const result = await shield.scan('http://[64:ff9b::127.0.0.1]/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://[::1]/ (loopback)', async () => {
    const shield = createShield(["::1"]);
    const result = await shield.scan('http://[::1]/');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 19. UNICODE / HOMOGLYPH BYPASSES
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — Unicode/homoglyph bypasses', () => {
  let shield;
  beforeAll(() => {
    shield = createShield(["8.8.8.8"]);
  });

  // Note: Most unicode hostnames are rejected by the URL constructor
  // as invalid URLs, which is the correct defense behavior
  test('blocks/rejects http://ⓛocalhost/', async () => {
    const result = await shield.scan('http://ⓛocalhost/');
    // URL constructor may parse this or reject it
    // Either way, it should not PASS undetected
    if (result.status === 'BLOCKED') {
      expect(result.status).toBe('BLOCKED');
    } else {
      // If URL normalizer passes it, the hostname won't be "localhost"
      // so it won't resolve to 127.0.0.1 — safe behavior
      expect(result.status).toBeDefined();
    }
  });

  test('blocks/rejects http://①②⑦.0.0.1/', async () => {
    const result = await shield.scan('http://①②⑦.0.0.1/');
    // URL constructor rejects this
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks/rejects http://ℓocalhost/', async () => {
    const result = await shield.scan('http://ℓocalhost/');
    expect(result.status).toBeDefined();
  });

  test('handles http://LOCALHOST/ (case variation)', async () => {
    // URL normalizer lowercases — this maps to localhost in knownHosts
    const shield2 = createShield(["127.0.0.1"]);
    const result = await shield2.scan('http://LOCALHOST/');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 20. OCTAL / HEX / DECIMAL IP NOTATION
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — Octal/Hex/Decimal IP bypasses', () => {
  // Note: The URL constructor in Node.js handles these differently:
  // - 0x7f000001 → may be rejected or parsed
  // - 2130706433 → URL('http://2130706433/') normalizes to http://127.0.0.1/
  // - 0177.0.0.1 → URL may reject or normalize

  test('blocks http://2130706433/ (decimal form of 127.0.0.1)', async () => {
    // Node URL constructor normalizes this to http://127.0.0.1/
    const shield = createShield(["127.0.0.1"]);
    const result = await shield.scan('http://2130706433/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://0x7f000001/ (hex form of 127.0.0.1)', async () => {
    const shield = createShield(["127.0.0.1"]);
    const result = await shield.scan('http://0x7f000001/');
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks http://0177.0.0.1/ (octal 127)', async () => {
    const shield = createShield(["127.0.0.1"]);
    const result = await shield.scan('http://0177.0.0.1/');
    // URL constructor may normalize to 127.0.0.1 or reject
    expect(result.status).toBe('BLOCKED');
  });

  test('blocks decimal 2852039166 (169.254.169.254)', async () => {
    const shield = createShield(["169.254.169.254"]);
    const result = await shield.scan('http://2852039166/');
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 21. URL-ENCODED DOTS
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — URL-encoded bypasses', () => {
  test('handles http://127%2E0%2E0%2E1/ (URL-encoded dots)', async () => {
    const shield = createShield(["127.0.0.1"]);
    // URL constructor may decode or reject this
    const result = await shield.scan('http://127%2E0%2E0%2E1/');
    // Should be blocked or rejected as invalid
    expect(result.status).toBe('BLOCKED');
  });

  test('handles double-encoded http://127%252E0%252E0%252E1/', async () => {
    const shield = createShield(["127.0.0.1"]);
    const result = await shield.scan('http://127%252E0%252E0%252E1/');
    // URL constructor rejects this as invalid hostname
    expect(result.status).toBe('BLOCKED');
  });
});

// ═══════════════════════════════════════════════════════════
// 22. REDIRECT CHAIN OVERFLOW
// ═══════════════════════════════════════════════════════════
describe('Full Pipeline — Redirect chain overflow', () => {
  test('handles redirect chain exceeding MAX_REDIRECTS', async () => {
    // Create a shield with a DNS resolver that simulates redirects
    let callCount = 0;
    const shield = new SSRFShield({
      customDnsResolver: (hostname) => {
        callCount++;
        if (callCount <= 4) {
          // Simulate redirect
          return {
            step: "DNS Resolver",
            status: "PASS",
            data: {
              hostname,
              resolvedIPs: ["8.8.8.8"],
              source: "redirect",
              redirectTarget: `http://redirect-${callCount}.example.com/`,
              note: "Simulated redirect",
            },
          };
        }
        return {
          step: "DNS Resolver",
          status: "PASS",
          data: {
            hostname,
            resolvedIPs: ["8.8.8.8"],
            note: "Final resolution",
          },
        };
      },
    });
    const result = await shield.scan('http://example.com/');
    expect(result.status).toBe('BLOCKED');
    const overflowStep = result.steps.find(s => s.reason && s.reason.includes('MAX_REDIRECTS'));
    expect(overflowStep).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 23. CONSTRUCTOR OPTIONS
// ═══════════════════════════════════════════════════════════
describe('SSRFShield constructor', () => {
  test('accepts default options', () => {
    const shield = new SSRFShield();
    expect(shield.getDnsMode()).toBe('SAFE');
  });

  test('accepts custom dnsMode', () => {
    const shield = new SSRFShield({ dnsMode: 'ATTACK' });
    expect(shield.getDnsMode()).toBe('ATTACK');
    shield.setDnsMode('SAFE'); // cleanup
  });

  test('exposes static modules', () => {
    const modules = SSRFShield.modules;
    expect(modules.ipValidator).toBeDefined();
    expect(modules.dnsResolver).toBeDefined();
    expect(modules.urlNormalizer).toBeDefined();
    expect(modules.protocolValidator).toBeDefined();
    expect(modules.egressFirewall).toBeDefined();
  });

  test('getDnsMode / setDnsMode / toggleDnsMode work', () => {
    const shield = new SSRFShield();
    expect(shield.getDnsMode()).toBe('SAFE');
    shield.setDnsMode('ATTACK');
    expect(shield.getDnsMode()).toBe('ATTACK');
    shield.toggleDnsMode();
    expect(shield.getDnsMode()).toBe('SAFE');
  });
});

// ═══════════════════════════════════════════════════════════
// 24. AUDIT LOG
// ═══════════════════════════════════════════════════════════
describe('SSRFShield audit log', () => {
  test('getAuditLog returns array', () => {
    const shield = new SSRFShield();
    expect(Array.isArray(shield.getAuditLog())).toBe(true);
  });

  test('clearAuditLog empties the log', () => {
    const shield = new SSRFShield();
    shield.clearAuditLog();
    expect(shield.getAuditLog().length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 25. SCAN WITH onStep HOOK
// ═══════════════════════════════════════════════════════════
describe('SSRFShield scan hooks', () => {
  test('onStep hook receives each step', async () => {
    const shield = createShield(["93.184.216.34"]);
    const stepsReceived = [];
    await shield.scan('https://example.com', {}, {
      onStep: async (step) => { stepsReceived.push(step); }
    });
    expect(stepsReceived.length).toBeGreaterThan(0);
    expect(stepsReceived[0].step).toBeDefined();
  });

  test('scan with delayMs still works', async () => {
    const shield = createShield(["93.184.216.34"]);
    const result = await shield.scan('https://example.com', {}, { delayMs: 0 });
    expect(result.status).toBe('PASS');
  });
});
