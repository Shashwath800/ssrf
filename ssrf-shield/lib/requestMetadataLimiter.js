/**
 * Request Metadata Limiter
 * 
 * NEW defense layer between validation engine and fetch engine.
 * Strips or sanitizes HTTP headers that could leak internal topology:
 * - X-Forwarded-For → stripped (prevents IP chain leaking)
 * - X-Real-IP → stripped
 * - Referer → stripped (prevents internal URL leaking)
 * - Via → stripped
 * - X-Forwarded-Host → stripped
 * - Caps total header count and size
 * 
 * This prevents the outbound request from carrying metadata
 * that reveals internal infrastructure to the target.
 */

const STRIPPED_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "x-forwarded-host",
  "x-forwarded-proto",
  "referer",
  "via",
  "x-cluster-client-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "forwarded",
];

const MAX_HEADERS = 20;
const MAX_HEADER_SIZE_BYTES = 8192;

function sanitize(requestHeaders = {}) {
  const stripped = [];
  const sanitized = {};
  let totalSize = 0;

  for (const [key, value] of Object.entries(requestHeaders)) {
    const keyLower = key.toLowerCase();

    // Strip dangerous headers
    if (STRIPPED_HEADERS.includes(keyLower)) {
      stripped.push(key);
      continue;
    }

    // Enforce header count limit
    if (Object.keys(sanitized).length >= MAX_HEADERS) {
      stripped.push(key);
      continue;
    }

    // Enforce header size limit
    totalSize += key.length + String(value).length;
    if (totalSize > MAX_HEADER_SIZE_BYTES) {
      stripped.push(key);
      continue;
    }

    sanitized[key] = value;
  }

  return {
    step: "Request Metadata Limiter",
    status: "PASS",
    data: {
      strippedHeaders: stripped,
      remainingHeaders: Object.keys(sanitized).length,
      totalSizeBytes: totalSize,
      note: stripped.length > 0
        ? `Stripped ${stripped.length} header(s) that could leak internal topology: ${stripped.join(", ")}`
        : "No sensitive headers found — request metadata is clean",
    },
  };
}

module.exports = { sanitize, STRIPPED_HEADERS };
