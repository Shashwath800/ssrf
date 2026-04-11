/**
 * URL Normalizer Module
 * 
 * SSRF Defense Step 1: Parse and normalize the input URL.
 * This prevents attackers from using URL tricks like:
 * - Unusual encodings (%2e%2e for ..)
 * - Redundant slashes
 * - Missing protocols
 * 
 * We use the built-in URL constructor to canonicalize the input.
 */

function normalize(url) {
  try {
    // Trim whitespace and normalize
    const trimmed = url.trim();

    // Attempt to parse with URL constructor — this handles encoding normalization
    const parsed = new URL(trimmed);

    return {
      step: "URL Normalizer",
      status: "PASS",
      data: {
        original: url,
        normalized: parsed.href,
        hostname: parsed.hostname,
        protocol: parsed.protocol,
        pathname: parsed.pathname,
        port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
      },
    };
  } catch (err) {
    return {
      step: "URL Normalizer",
      status: "BLOCK",
      reason: `Invalid URL format: ${err.message}`,
      data: { original: url },
    };
  }
}

module.exports = { normalize };
