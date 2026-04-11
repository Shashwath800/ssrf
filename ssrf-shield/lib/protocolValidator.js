/**
 * Protocol + Port Validator (ENHANCED)
 * 
 * SSRF Defense Step 2: Validate both protocol AND port.
 * - Only allow http:// and https://
 * - Enforce port allowlist: 80, 443 (and empty/default)
 * - Block non-standard ports that could target internal services
 *   (e.g. port 8080, 3000, 6379 for Redis, 3306 for MySQL)
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const ALLOWED_PORTS = ["", "80", "443"]; // empty string = default port

function validate(parsedData) {
  const { protocol, port } = parsedData;

  // Check protocol
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    return {
      step: "Protocol + Port Validator",
      status: "BLOCK",
      reason: `Protocol "${protocol}" is not allowed. Only ${ALLOWED_PROTOCOLS.join(", ")} are permitted.`,
      data: { protocol, port, allowedProtocols: ALLOWED_PROTOCOLS, allowedPorts: ALLOWED_PORTS },
    };
  }

  // Check port — normalize to string
  const portStr = String(port || "");
  if (!ALLOWED_PORTS.includes(portStr)) {
    return {
      step: "Protocol + Port Validator",
      status: "BLOCK",
      reason: `Port "${portStr}" is not allowed. Only ports ${ALLOWED_PORTS.filter(p => p).join(", ")} (and default) are permitted.`,
      data: { protocol, port: portStr, allowedProtocols: ALLOWED_PROTOCOLS, allowedPorts: ALLOWED_PORTS },
    };
  }

  return {
    step: "Protocol + Port Validator",
    status: "PASS",
    data: {
      protocol,
      port: portStr || "default",
      allowedProtocols: ALLOWED_PROTOCOLS,
      allowedPorts: ALLOWED_PORTS,
      note: "Protocol and port are within allowed ranges",
    },
  };
}

module.exports = { validate };
