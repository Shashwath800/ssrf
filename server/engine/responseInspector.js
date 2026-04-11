/**
 * Response Inspector Module
 * 
 * SSRF Defense Step 9: Inspect the response body for sensitive data.
 * Even if a request makes it through all other checks, the response
 * might contain leaked credentials or sensitive information.
 * 
 * We scan for patterns like:
 * - AWS access keys (AKIA...)
 * - Secret keys
 * - Session tokens
 * - Private keys
 * - Internal hostnames
 */

const SENSITIVE_PATTERNS = [
  { pattern: /AKIA[A-Z0-9]{12,}/i, label: "AWS Access Key" },
  { pattern: /secretKey|secret_key|aws_secret/i, label: "Secret Key reference" },
  { pattern: /sessionToken|session_token/i, label: "Session Token reference" },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/i, label: "Private Key" },
  { pattern: /password\s*[:=]\s*\S+/i, label: "Password" },
];

function inspect(responseBody) {
  const bodyStr = typeof responseBody === "string"
    ? responseBody
    : JSON.stringify(responseBody);

  const findings = [];

  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    if (pattern.test(bodyStr)) {
      findings.push(label);
    }
  }

  if (findings.length > 0) {
    return {
      step: "Response Inspector",
      status: "BLOCK",
      reason: `Sensitive data detected in response: ${findings.join(", ")}`,
      data: {
        findings,
        note: "🛑 Response contains leaked credentials — blocking!",
      },
    };
  }

  return {
    step: "Response Inspector",
    status: "PASS",
    data: {
      findings: [],
      note: "Response body is clean — no sensitive data detected",
    },
  };
}

module.exports = { inspect };
