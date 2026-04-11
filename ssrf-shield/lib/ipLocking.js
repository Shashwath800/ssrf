/**
 * IP Locking (Simulated)
 * SSRF Defense Step 6: Pin resolved IP to prevent TOCTOU/DNS rebinding.
 */
function lock(resolvedIPs, hostname) {
  const lockedIP = resolvedIPs[0];
  return {
    step: "IP Locking", status: "PASS",
    data: { hostname, lockedIP, note: `IP pinned to ${lockedIP} — all subsequent requests will use this IP` },
  };
}
module.exports = { lock };
