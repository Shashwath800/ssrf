/**
 * IP Validator (IPv4 + IPv6)
 * 
 * SSRF Defense Step 4: Block private/reserved IPs for BOTH IPv4 and IPv6.
 * 
 * IPv4 blocked ranges:
 * - 127.0.0.0/8     (loopback)
 * - 10.0.0.0/8      (RFC1918 private)
 * - 172.16.0.0/12   (RFC1918 private)
 * - 192.168.0.0/16  (RFC1918 private)
 * - 169.254.0.0/16  (link-local / AWS metadata)
 * - 0.0.0.0         (unspecified)
 * 
 * IPv6 blocked:
 * - ::1             (loopback)
 * - ::              (unspecified)
 * - fe80::/10       (link-local)
 * - fc00::/7        (unique local)
 * - ::ffff:x.x.x.x (IPv4-mapped IPv6 — re-check inner IPv4)
 */

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return { private: true, reason: "Invalid IPv4 format" };
  const [a, b] = parts;
  if (a === 127) return { private: true, reason: "Loopback address (127.x.x.x)" };
  if (a === 10) return { private: true, reason: "RFC1918 private network (10.x.x.x)" };
  if (a === 172 && b >= 16 && b <= 31) return { private: true, reason: "RFC1918 private network (172.16-31.x.x)" };
  if (a === 192 && b === 168) return { private: true, reason: "RFC1918 private network (192.168.x.x)" };
  if (a === 169 && b === 254) return { private: true, reason: "Link-local / AWS metadata (169.254.x.x)" };
  if (a === 0) return { private: true, reason: "Unspecified address (0.x.x.x)" };
  return { private: false, reason: null };
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // Loopback
  if (normalized === "::1") return { private: true, reason: "IPv6 loopback (::1)" };

  // Unspecified
  if (normalized === "::") return { private: true, reason: "IPv6 unspecified (::)" };

  // Link-local: fe80::/10
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe80::"))
    return { private: true, reason: "IPv6 link-local (fe80::/10)" };

  // Unique local: fc00::/7 (fc00:: through fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd"))
    return { private: true, reason: "IPv6 unique local address (fc00::/7)" };

  // IPv4-mapped IPv6: ::ffff:x.x.x.x — extract inner IPv4 and re-check
  const v4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) {
    const innerCheck = isPrivateIPv4(v4MappedMatch[1]);
    if (innerCheck.private) {
      return { private: true, reason: `IPv4-mapped IPv6 contains private IP — ${innerCheck.reason}` };
    }
  }

  // Another form: ::ffff:hex
  if (normalized.startsWith("::ffff:") && !v4MappedMatch) {
    return { private: true, reason: "IPv4-mapped IPv6 address detected — requires further validation" };
  }

  return { private: false, reason: null };
}

function isPrivateIP(ip) {
  // Determine if IPv4 or IPv6
  if (ip.includes(":")) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
}

function validate(resolvedIPs) {
  for (const ip of resolvedIPs) {
    const check = isPrivateIP(ip);
    if (check.private) {
      return {
        step: "IP Validator (IPv4+IPv6)",
        status: "BLOCK",
        reason: `Private IP detected: ${ip} — ${check.reason}`,
        data: { ip, resolvedIPs, ...check },
      };
    }
  }
  return {
    step: "IP Validator (IPv4+IPv6)",
    status: "PASS",
    data: { resolvedIPs, note: "All IPs (IPv4 + IPv6) are public" },
  };
}

module.exports = { validate, isPrivateIP, isPrivateIPv4, isPrivateIPv6 };
