/**
 * DNS Resolver (ENHANCED — A + AAAA records, IPv6)
 * 
 * SSRF Defense Step 3: Resolve hostname to IP addresses.
 * - Simulates fetching ALL A (IPv4) + AAAA (IPv6) records
 * - Uses hardcoded trusted resolver (not system default)
 * - Supports DNS rebinding simulation via dnsMode toggle
 * - Custom hostname→IP mappings via addMappings()
 */

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

function resolve(hostname) {
  // Strip brackets for IPv6 literals
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

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
        resolver: "hardcoded-trusted-resolver",
        note: "Known host — resolved from static mapping (A + AAAA)",
      },
    };
  }

  // Simulate DNS resolution based on mode
  const aRecords = dnsMode === "SAFE" ? ["8.8.8.8"] : ["169.254.169.254"];
  const aaaaRecords = dnsMode === "SAFE" ? ["2001:4860:4860::8888"] : ["::ffff:169.254.169.254"];
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
      resolver: "hardcoded-trusted-resolver",
      note: dnsMode === "ATTACK"
        ? "⚠ DNS REBINDING: Domain resolved to AWS metadata IP (A + AAAA)!"
        : "Domain resolved to safe public IP (A + AAAA records fetched)",
    },
  };
}

module.exports = { resolve, getDnsMode, toggleDnsMode, setDnsMode, addMappings };
