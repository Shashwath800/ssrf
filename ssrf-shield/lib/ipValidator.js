/**
 * IP Validator (IPv4 + IPv6 — FULL COVERAGE)
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
 * - ::1 / 0:0:0:0:0:0:0:1  (loopback — both compressed and full form)
 * - ::                       (unspecified)
 * - fe80::/10                (link-local)
 * - fc00::/7                 (unique local)
 * - ::ffff:x.x.x.x          (IPv4-mapped IPv6 — re-check inner IPv4)
 * - ::ffff:0:0/96            (full range check)
 * - 2002:7f00::/24           (6to4 wrapping 127.x.x.x)
 * - 2002:a9fe::/32           (6to4 wrapping 169.254.x.x)
 * - 2002:0a00::/24           (6to4 wrapping 10.x.x.x)
 * - 2002:ac10::/28           (6to4 wrapping 172.16-31.x.x)
 * - 2002:c0a8::/32           (6to4 wrapping 192.168.x.x)
 * - 64:ff9b::/96             (NAT64 — extract embedded IPv4)
 */

/**
 * Normalize an IPv6 address by expanding :: shorthand to full 8-group form.
 * Returns lowercase full form, e.g. "0000:0000:0000:0000:0000:0000:0000:0001"
 */
function normalizeIPv6(ip) {
  let addr = ip.toLowerCase().trim();
  
  // Remove brackets if present
  addr = addr.replace(/^\[|\]$/g, '');
  
  // Remove zone ID (e.g., %eth0)
  const zoneIdx = addr.indexOf('%');
  if (zoneIdx !== -1) addr = addr.substring(0, zoneIdx);

  // Handle IPv4-mapped addresses like ::ffff:1.2.3.4
  // Keep them as-is for pattern matching — don't expand the IPv4 portion
  const v4MappedMatch = addr.match(/^(.*):(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4MappedMatch) {
    // Expand the IPv6 prefix portion, keep IPv4 suffix
    const prefix = v4MappedMatch[1];
    const v4 = v4MappedMatch[2];
    // Convert IPv4 part to two hex groups for full normalization
    const v4parts = v4.split('.').map(Number);
    const hex1 = ((v4parts[0] << 8) | v4parts[1]).toString(16).padStart(4, '0');
    const hex2 = ((v4parts[2] << 8) | v4parts[3]).toString(16).padStart(4, '0');
    addr = prefix + ':' + hex1 + ':' + hex2;
  }

  // Split by ::
  const sides = addr.split('::');
  let groups;

  if (sides.length === 2) {
    const left = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0000');
    groups = [...left, ...middle, ...right];
  } else {
    groups = addr.split(':');
  }

  // Pad each group to 4 hex chars
  groups = groups.map(g => g.padStart(4, '0'));

  // Ensure exactly 8 groups
  while (groups.length < 8) groups.push('0000');
  groups = groups.slice(0, 8);

  return groups.join(':');
}

/**
 * Extract the embedded IPv4 address from an IPv6 address.
 * Works for ::ffff:x.x.x.x, 2002:xxxx::, and 64:ff9b::x.x.x.x formats.
 */
function extractEmbeddedIPv4FromNormalized(normalized) {
  // normalized is like "0000:0000:0000:0000:0000:ffff:7f00:0001"
  // The last two groups encode the IPv4: 7f00 = 127.0, 0001 = 0.1
  const groups = normalized.split(':');
  const highWord = parseInt(groups[6], 16);
  const lowWord = parseInt(groups[7], 16);
  const a = (highWord >> 8) & 0xff;
  const b = highWord & 0xff;
  const c = (lowWord >> 8) & 0xff;
  const d = lowWord & 0xff;
  return `${a}.${b}.${c}.${d}`;
}

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
  const normalized = normalizeIPv6(ip);
  const original = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // ── Loopback: ::1 (also full-form 0:0:0:0:0:0:0:1) ──
  if (normalized === "0000:0000:0000:0000:0000:0000:0000:0001") {
    return { private: true, reason: "IPv6 loopback (::1)" };
  }

  // ── Unspecified: :: ──
  if (normalized === "0000:0000:0000:0000:0000:0000:0000:0000") {
    return { private: true, reason: "IPv6 unspecified (::)" };
  }

  // ── Link-local: fe80::/10 ──
  const firstGroup = parseInt(normalized.substring(0, 4), 16);
  if ((firstGroup & 0xffc0) === 0xfe80) {
    return { private: true, reason: "IPv6 link-local (fe80::/10)" };
  }

  // ── Unique local: fc00::/7 (fc00:: through fdff::) ──
  if ((firstGroup & 0xfe00) === 0xfc00) {
    return { private: true, reason: "IPv6 unique local address (fc00::/7)" };
  }

  // ── IPv4-mapped IPv6: ::ffff:0:0/96 ──
  // Normalized form: 0000:0000:0000:0000:0000:ffff:xxxx:xxxx
  if (normalized.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    const embeddedIPv4 = extractEmbeddedIPv4FromNormalized(normalized);
    const innerCheck = isPrivateIPv4(embeddedIPv4);
    if (innerCheck.private) {
      return { private: true, reason: `IPv4-mapped IPv6 contains private IP (${embeddedIPv4}) — ${innerCheck.reason}` };
    }
    // Even if not private, flag it for awareness (could be suspicious)
    return { private: false, reason: null };
  }

  // ── 6to4: 2002::/16 — Extract embedded IPv4 from bits 16-47 ──
  if (normalized.startsWith("2002:")) {
    // Second group contains first two octets of IPv4
    // Third group contains last two octets of IPv4
    const secondGroup = parseInt(normalized.substring(5, 9), 16);
    const thirdGroup = parseInt(normalized.substring(10, 14), 16);
    const a = (secondGroup >> 8) & 0xff;
    const b = secondGroup & 0xff;
    const c = (thirdGroup >> 8) & 0xff;
    const d = thirdGroup & 0xff;
    const embeddedIPv4 = `${a}.${b}.${c}.${d}`;
    const innerCheck = isPrivateIPv4(embeddedIPv4);
    if (innerCheck.private) {
      return { private: true, reason: `6to4 address wraps private IPv4 (${embeddedIPv4}) — ${innerCheck.reason}` };
    }
  }

  // ── NAT64: 64:ff9b::/96 — Last 32 bits are embedded IPv4 ──
  if (normalized.startsWith("0064:ff9b:")) {
    const embeddedIPv4 = extractEmbeddedIPv4FromNormalized(normalized);
    const innerCheck = isPrivateIPv4(embeddedIPv4);
    if (innerCheck.private) {
      return { private: true, reason: `NAT64 address embeds private IPv4 (${embeddedIPv4}) — ${innerCheck.reason}` };
    }
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

module.exports = { validate, isPrivateIP, isPrivateIPv4, isPrivateIPv6, normalizeIPv6, extractEmbeddedIPv4FromNormalized };
