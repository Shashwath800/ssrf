/**
 * Protocol Validator Module
 * 
 * SSRF Defense Step 2: Only allow http:// and https:// protocols.
 * Attackers often try protocols like:
 * - file:///etc/passwd
 * - gopher://internal-service
 * - dict://localhost
 * - ftp://internal-ftp
 * 
 * We whitelist only safe protocols.
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"];

function validate(parsedData) {
  const { protocol } = parsedData;

  if (ALLOWED_PROTOCOLS.includes(protocol)) {
    return {
      step: "Protocol Validator",
      status: "PASS",
      data: { protocol, allowed: ALLOWED_PROTOCOLS },
    };
  }

  return {
    step: "Protocol Validator",
    status: "BLOCK",
    reason: `Protocol "${protocol}" is not allowed. Only ${ALLOWED_PROTOCOLS.join(", ")} are permitted.`,
    data: { protocol, allowed: ALLOWED_PROTOCOLS },
  };
}

module.exports = { validate };
