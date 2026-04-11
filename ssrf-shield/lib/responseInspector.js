/**
 * Response Inspection Layer (ENHANCED)
 * 
 * Scans response body AND headers for sensitive data:
 * - AWS credentials (AKIA...)
 * - GCP service account keys
 * - Secret keys / session tokens
 * - Private/internal IPs leaked in response body or headers
 * - Private keys (RSA, EC)
 * - Passwords
 */

const SENSITIVE_PATTERNS = [
  { pattern: /AKIA[A-Z0-9]{12,}/i, label: "AWS Access Key" },
  { pattern: /secretKey|secret_key|aws_secret/i, label: "AWS Secret Key reference" },
  { pattern: /sessionToken|session_token/i, label: "Session Token reference" },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/i, label: "Private Key" },
  { pattern: /password\s*[:=]\s*\S+/i, label: "Password" },
  // GCP patterns
  { pattern: /"type"\s*:\s*"service_account"/i, label: "GCP Service Account Key" },
  { pattern: /AIza[A-Za-z0-9_-]{35}/i, label: "GCP API Key" },
  { pattern: /client_secret/i, label: "OAuth Client Secret" },
  // Azure patterns
  { pattern: /AccountKey\s*=\s*[A-Za-z0-9+/=]{20,}/i, label: "Azure Storage Key" },
  // Generic secrets
  { pattern: /api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9]{16,}/i, label: "Generic API Key" },
  { pattern: /bearer\s+[A-Za-z0-9\-._~+/]+=*/i, label: "Bearer Token" },
];

const PRIVATE_IP_PATTERNS = [
  { pattern: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, label: "Private IP (10.x.x.x)" },
  { pattern: /\b172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}\b/, label: "Private IP (172.16-31.x.x)" },
  { pattern: /\b192\.168\.\d{1,3}\.\d{1,3}\b/, label: "Private IP (192.168.x.x)" },
  { pattern: /\b127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, label: "Loopback IP (127.x.x.x)" },
  { pattern: /\b169\.254\.\d{1,3}\.\d{1,3}\b/, label: "Link-local IP (169.254.x.x)" },
];

function inspect(responseBody, responseHeaders = {}) {
  const bodyStr = typeof responseBody === "string"
    ? responseBody
    : JSON.stringify(responseBody);

  const headerStr = JSON.stringify(responseHeaders);

  const findings = [];

  // Scan for credentials / secrets in body
  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    if (pattern.test(bodyStr)) findings.push(`[BODY] ${label}`);
    if (pattern.test(headerStr)) findings.push(`[HEADER] ${label}`);
  }

  // Scan for private IPs leaked in body and headers
  for (const { pattern, label } of PRIVATE_IP_PATTERNS) {
    if (pattern.test(bodyStr)) findings.push(`[BODY] ${label} leaked in response`);
    if (pattern.test(headerStr)) findings.push(`[HEADER] ${label} leaked in headers`);
  }

  if (findings.length > 0) {
    return {
      step: "Response Inspection Layer",
      status: "BLOCK",
      reason: `Sensitive data detected: ${findings.join("; ")}`,
      data: {
        findings,
        scannedBodySize: bodyStr.length,
        scannedHeaderKeys: Object.keys(responseHeaders),
        note: "🛑 Response contains leaked credentials or internal IPs — blocking!",
      },
    };
  }

  return {
    step: "Response Inspection Layer",
    status: "PASS",
    data: {
      findings: [],
      scannedBodySize: bodyStr.length,
      note: "Response body and headers are clean — no sensitive data or private IPs detected",
    },
  };
}

module.exports = { inspect };
