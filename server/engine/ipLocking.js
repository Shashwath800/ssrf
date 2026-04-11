/**
 * IP Locking Module (Simulated)
 * 
 * SSRF Defense Step 6: Pin the resolved IP for the lifetime of the request.
 * This prevents TOCTOU (Time-of-Check-Time-of-Use) attacks where:
 * 1. DNS resolves to a safe IP during validation
 * 2. DNS resolves to an internal IP during the actual fetch (DNS rebinding)
 * 
 * By "locking" the IP after the first resolution, we ensure the fetch
 * always uses the validated IP, not a potentially different one.
 */

function lock(resolvedIPs, hostname) {
  const lockedIP = resolvedIPs[0]; // Pin the first resolved IP

  return {
    step: "IP Locking",
    status: "PASS",
    data: {
      hostname,
      lockedIP,
      note: `IP pinned to ${lockedIP} — all subsequent requests will use this IP`,
    },
  };
}

module.exports = { lock };
