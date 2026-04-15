/**
 * Egress Firewall (Network Layer)
 * 
 * Last line of defense.
 * Hard blocks RFC1918 addresses at the OS/infrastructure level.
 * Even if all other layers somehow pass, this catches the request
 * before it leaves the network boundary.
 * 
 * In production this would be an iptables/nftables rule or
 * cloud security group / VPC endpoint policy.
 * Here we simulate the final network-level check.
 */

const { normalizeIPv6, extractEmbeddedIPv4FromNormalized, isPrivateIPv4 } = require('./ipValidator');

const BLOCKED_CIDR_DESCRIPTIONS = [
  { check: (ip) => /^10\./.test(ip), cidr: "10.0.0.0/8", label: "RFC1918 Class A" },
  { check: (ip) => /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip), cidr: "172.16.0.0/12", label: "RFC1918 Class B" },
  { check: (ip) => /^192\.168\./.test(ip), cidr: "192.168.0.0/16", label: "RFC1918 Class C" },
  { check: (ip) => /^127\./.test(ip), cidr: "127.0.0.0/8", label: "Loopback" },
  { check: (ip) => /^169\.254\./.test(ip), cidr: "169.254.0.0/16", label: "Link-local" },
  { check: (ip) => /^0\./.test(ip), cidr: "0.0.0.0/8", label: "Unspecified" },
  // IPv6 checks using normalized form
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      return norm === "0000:0000:0000:0000:0000:0000:0000:0001";
    },
    cidr: "::1/128", label: "IPv6 Loopback"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      return norm === "0000:0000:0000:0000:0000:0000:0000:0000";
    },
    cidr: "::/128", label: "IPv6 Unspecified"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      const fg = parseInt(norm.substring(0, 4), 16);
      return (fg & 0xffc0) === 0xfe80;
    },
    cidr: "fe80::/10", label: "IPv6 Link-local"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      const fg = parseInt(norm.substring(0, 4), 16);
      return (fg & 0xfe00) === 0xfc00;
    },
    cidr: "fc00::/7", label: "IPv6 Unique Local"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      if (!norm.startsWith("0000:0000:0000:0000:0000:ffff:")) return false;
      const embedded = extractEmbeddedIPv4FromNormalized(norm);
      return isPrivateIPv4(embedded).private;
    },
    cidr: "::ffff:0:0/96", label: "IPv4-mapped IPv6 (private)"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      if (!norm.startsWith("2002:")) return false;
      const sg = parseInt(norm.substring(5, 9), 16);
      const tg = parseInt(norm.substring(10, 14), 16);
      const a = (sg >> 8) & 0xff;
      const b = sg & 0xff;
      const c = (tg >> 8) & 0xff;
      const d = tg & 0xff;
      return isPrivateIPv4(`${a}.${b}.${c}.${d}`).private;
    },
    cidr: "2002::/16", label: "6to4 wrapping private IPv4"
  },
  {
    check: (ip) => {
      if (!ip.includes(':')) return false;
      const norm = normalizeIPv6(ip);
      if (!norm.startsWith("0064:ff9b:")) return false;
      const embedded = extractEmbeddedIPv4FromNormalized(norm);
      return isPrivateIPv4(embedded).private;
    },
    cidr: "64:ff9b::/96", label: "NAT64 wrapping private IPv4"
  },
];

function enforce(lockedIP) {
  for (const rule of BLOCKED_CIDR_DESCRIPTIONS) {
    if (rule.check(lockedIP)) {
      return {
        step: "Egress Firewall (Network Layer)",
        status: "BLOCK",
        reason: `FIREWALL: Outbound connection to ${lockedIP} blocked — matches ${rule.cidr} (${rule.label})`,
        data: {
          ip: lockedIP,
          matchedCIDR: rule.cidr,
          ruleLabel: rule.label,
          note: "🧱 Hard block at network/infrastructure level — last line of defense",
        },
      };
    }
  }

  return {
    step: "Egress Firewall (Network Layer)",
    status: "PASS",
    data: {
      ip: lockedIP,
      note: "Egress firewall check passed — IP is not in any blocked CIDR range",
    },
  };
}

module.exports = { enforce, BLOCKED_CIDR_DESCRIPTIONS };
