/**
 * DNS Resolver (REAL ASYNC — A + AAAA records, IPv6)
 * 
 * SSRF Defense Step 3: Resolve hostname to IP addresses.
 * - Uses real dns.promises.resolve4() and dns.promises.resolve6()
 * - Falls back to knownHosts static map as fast-path override (checked first)
 * - Supports DNS rebinding simulation via dnsMode toggle
 * - Custom hostname→IP mappings via addMappings()
 * - Handles DNS failures gracefully (NXDOMAIN, timeout) — returns BLOCK
 */

const dns = require('dns');

let dnsMode = "SAFE";

const knownHosts = {
  "localhost": { A: ["127.0.0.1"], AAAA: ["::1"] },
  "127.0.0.1": { A: ["127.0.0.1"], AAAA: [] },
  "0.0.0.0": { A: ["0.0.0.0"], AAAA: ["::"] },
  "169.254.169.254": { A: ["169.254.169.254"], AAAA: [] },
  "metadata.google.internal": { A: ["169.254.169.254"], AAAA: [] },
  "[::1]": { A: [], AAAA: ["::1"] },
  "[::]": { A: [], AAAA: ["::"] },
};

function getDnsMode() { return dnsMode; }
function toggleDnsMode() { dnsMode = dnsMode === "SAFE" ? "ATTACK" : "SAFE"; return dnsMode; }
function setDnsMode(mode) { dnsMode = mode; return dnsMode; }

function addMappings(mappings) {
  for (const [host, ips] of Object.entries(mappings)) {
    if (Array.isArray(ips)) {
      knownHosts[host] = { A: ips, AAAA: [] };
    } else {
      knownHosts[host] = { A: ips.A || [], AAAA: ips.AAAA || [] };
    }
  }
}

/**
 * Resolve a hostname to IP addresses.
 * 1. Check knownHosts (fast-path override)
 * 2. If not found, do real DNS resolution via dns.promises
 * 3. In ATTACK mode, override result with 169.254.169.254
 * 4. Handle DNS failures gracefully
 * 
 * @param {string} hostname
 * @returns {Promise<Object>} - Step result object
 */
async function resolve(hostname) {
  // Strip brackets for IPv6 literals
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // ── Fast-path: check knownHosts static map first ──
  if (knownHosts[hostname] || knownHosts[cleanHost]) {
    const records = knownHosts[hostname] || knownHosts[cleanHost];
    const allIPs = [...records.A, ...records.AAAA];
    return {
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname,
        resolvedIPs: allIPs,
        aRecords: records.A,
        aaaaRecords: records.AAAA,
        dnsMode,
        resolver: "static-known-hosts",
        note: "Known host — resolved from static mapping (A + AAAA)",
      },
    };
  }

  // ── Real DNS resolution ──
  try {
    // Resolve A (IPv4) and AAAA (IPv6) records in parallel
    const [v4Result, v6Result] = await Promise.allSettled([
      dns.promises.resolve4(cleanHost),
      dns.promises.resolve6(cleanHost),
    ]);

    const aRecords = v4Result.status === "fulfilled" ? v4Result.value : [];
    const aaaaRecords = v6Result.status === "fulfilled" ? v6Result.value : [];

    // If both failed, no records at all
    if (aRecords.length === 0 && aaaaRecords.length === 0) {
      // Check if both rejected (true NXDOMAIN)
      if (v4Result.status === "rejected" && v6Result.status === "rejected") {
        const errCode = v4Result.reason?.code || v6Result.reason?.code || "UNKNOWN";
        const errMsg = v4Result.reason?.message || v6Result.reason?.message || "DNS resolution failed";
        return {
          step: "DNS Resolver",
          status: "BLOCK",
          reason: `DNS resolution failed for "${cleanHost}": ${errCode} — ${errMsg}`,
          data: {
            hostname,
            resolvedIPs: [],
            dnsMode,
            errorCode: errCode,
            resolver: "dns.promises",
            note: "No A or AAAA records found — domain may not exist",
          },
        };
      }
    }

    // In ATTACK mode, simulate DNS rebinding by overriding resolved IPs
    if (dnsMode === "ATTACK") {
      const attackA = ["169.254.169.254"];
      const attackAAAA = ["::ffff:169.254.169.254"];
      return {
        step: "DNS Resolver",
        status: "PASS",
        data: {
          hostname,
          resolvedIPs: [...attackA, ...attackAAAA],
          aRecords: attackA,
          aaaaRecords: attackAAAA,
          realARecords: aRecords,
          realAAAARecords: aaaaRecords,
          dnsMode,
          resolver: "dns.promises (ATTACK override)",
          note: "⚠ DNS REBINDING: Real DNS resolved, but ATTACK mode overrides to AWS metadata IP!",
        },
      };
    }

    // SAFE mode — return real results
    const allIPs = [...aRecords, ...aaaaRecords];
    return {
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname,
        resolvedIPs: allIPs,
        aRecords,
        aaaaRecords,
        dnsMode,
        resolver: "dns.promises",
        note: `Domain resolved via real DNS — ${aRecords.length} A record(s), ${aaaaRecords.length} AAAA record(s)`,
      },
    };

  } catch (err) {
    // Catch any unexpected errors (network issues, etc.)
    return {
      step: "DNS Resolver",
      status: "BLOCK",
      reason: `DNS resolution error for "${cleanHost}": ${err.message || err}`,
      data: {
        hostname,
        resolvedIPs: [],
        dnsMode,
        errorCode: err.code || "UNKNOWN",
        resolver: "dns.promises",
        note: "Unexpected DNS error — blocking request for safety",
      },
    };
  }
}

module.exports = { resolve, getDnsMode, toggleDnsMode, setDnsMode, addMappings };
