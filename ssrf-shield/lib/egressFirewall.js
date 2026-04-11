/**
 * Egress Firewall (Network Layer)
 * 
 * NEW — Last line of defense.
 * Hard blocks RFC1918 addresses at the OS/infrastructure level.
 * Even if all other layers somehow pass, this catches the request
 * before it leaves the network boundary.
 * 
 * In production this would be an iptables/nftables rule or
 * cloud security group / VPC endpoint policy.
 * Here we simulate the final network-level check.
 */

const BLOCKED_CIDR_DESCRIPTIONS = [
  { check: (ip) => /^10\./.test(ip), cidr: "10.0.0.0/8", label: "RFC1918 Class A" },
  { check: (ip) => /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip), cidr: "172.16.0.0/12", label: "RFC1918 Class B" },
  { check: (ip) => /^192\.168\./.test(ip), cidr: "192.168.0.0/16", label: "RFC1918 Class C" },
  { check: (ip) => /^127\./.test(ip), cidr: "127.0.0.0/8", label: "Loopback" },
  { check: (ip) => /^169\.254\./.test(ip), cidr: "169.254.0.0/16", label: "Link-local" },
  { check: (ip) => /^0\./.test(ip), cidr: "0.0.0.0/8", label: "Unspecified" },
  { check: (ip) => ip === "::1", cidr: "::1/128", label: "IPv6 Loopback" },
  { check: (ip) => ip === "::", cidr: "::/128", label: "IPv6 Unspecified" },
  { check: (ip) => /^fe80/i.test(ip), cidr: "fe80::/10", label: "IPv6 Link-local" },
  { check: (ip) => /^f[cd]/i.test(ip), cidr: "fc00::/7", label: "IPv6 Unique Local" },
  { check: (ip) => /^::ffff:/i.test(ip), cidr: "::ffff:0:0/96", label: "IPv4-mapped IPv6" },
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
