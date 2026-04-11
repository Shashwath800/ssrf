/**
 * IP Validator Module
 * 
 * SSRF Defense Step 4: Check if resolved IPs are private/reserved.
 * This is a critical defense layer — even if DNS resolves successfully,
 * we must verify the IP is not internal.
 * 
 * Blocked IP ranges:
 * - 127.0.0.0/8   (loopback)
 * - 10.0.0.0/8    (private)
 * - 172.16.0.0/12 (private)
 * - 192.168.0.0/16 (private)
 * - 169.254.0.0/16 (link-local / AWS metadata)
 * - 0.0.0.0        (unspecified)
 */

function isPrivateIP(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return { private: true, reason: "Invalid IP format" };

  const [a, b] = parts;

  // Loopback: 127.x.x.x
  if (a === 127) return { private: true, reason: "Loopback address (127.x.x.x)" };

  // Private: 10.x.x.x
  if (a === 10) return { private: true, reason: "Private network (10.x.x.x)" };

  // Private: 172.16.0.0 - 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) return { private: true, reason: "Private network (172.16-31.x.x)" };

  // Private: 192.168.x.x
  if (a === 192 && b === 168) return { private: true, reason: "Private network (192.168.x.x)" };

  // Link-local: 169.254.x.x (AWS metadata endpoint)
  if (a === 169 && b === 254) return { private: true, reason: "Link-local / AWS metadata (169.254.x.x)" };

  // Unspecified
  if (a === 0) return { private: true, reason: "Unspecified address (0.x.x.x)" };

  return { private: false, reason: null };
}

function validate(resolvedIPs) {
  for (const ip of resolvedIPs) {
    const check = isPrivateIP(ip);
    if (check.private) {
      return {
        step: "IP Validator",
        status: "BLOCK",
        reason: `Private IP detected: ${ip} — ${check.reason}`,
        data: { ip, resolvedIPs, ...check },
      };
    }
  }

  return {
    step: "IP Validator",
    status: "PASS",
    data: { resolvedIPs, note: "All IPs are public" },
  };
}

module.exports = { validate, isPrivateIP };
