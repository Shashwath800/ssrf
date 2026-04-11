/**
 * DNS Resolver Module (SIMULATED)
 * 
 * SSRF Defense Step 3: Resolve hostname to IP address.
 * In a real system this would call DNS. Here we simulate it
 * to demonstrate DNS rebinding attacks.
 * 
 * DNS Rebinding Attack:
 * An attacker controls a domain whose DNS alternates between
 * a safe public IP and an internal/private IP (like 169.254.169.254).
 * The first resolution passes validation, but a second resolution
 * (during the actual fetch) returns the malicious internal IP.
 * 
 * We use a global dnsMode to simulate this:
 * - SAFE mode: all domains resolve to 8.8.8.8 (safe public IP)
 * - ATTACK mode: all domains resolve to 169.254.169.254 (AWS metadata IP)
 */

// Global DNS mode state — shared across requests
let dnsMode = "SAFE";

function getDnsMode() {
  return dnsMode;
}

function toggleDnsMode() {
  dnsMode = dnsMode === "SAFE" ? "ATTACK" : "SAFE";
  return dnsMode;
}

function setDnsMode(mode) {
  dnsMode = mode;
  return dnsMode;
}

// Known hostname → IP mappings for simulation
const KNOWN_HOSTS = {
  "localhost": ["127.0.0.1"],
  "127.0.0.1": ["127.0.0.1"],
  "0.0.0.0": ["0.0.0.0"],
  "169.254.169.254": ["169.254.169.254"],
  "metadata.google.internal": ["169.254.169.254"],
};

function resolve(hostname) {
  // Check for direct IP/known hosts first
  if (KNOWN_HOSTS[hostname]) {
    return {
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname,
        resolvedIPs: KNOWN_HOSTS[hostname],
        dnsMode,
        note: "Known host — resolved from static mapping",
      },
    };
  }

  // Simulate DNS resolution based on mode
  const resolvedIPs = dnsMode === "SAFE" ? ["8.8.8.8"] : ["169.254.169.254"];

  return {
    step: "DNS Resolver",
    status: "PASS",
    data: {
      hostname,
      resolvedIPs,
      dnsMode,
      note: dnsMode === "ATTACK"
        ? "⚠ DNS REBINDING: Domain resolved to AWS metadata IP!"
        : "Domain resolved to safe public IP",
    },
  };
}

module.exports = { resolve, getDnsMode, toggleDnsMode, setDnsMode };
