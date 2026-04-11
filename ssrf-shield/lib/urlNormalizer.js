/**
 * URL Normalizer
 * 
 * SSRF Defense Step 1: Parse and normalize the input URL.
 * Prevents URL tricks like unusual encodings, redundant slashes, missing protocols.
 */

function normalize(url) {
  try {
    const trimmed = url.trim();
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
