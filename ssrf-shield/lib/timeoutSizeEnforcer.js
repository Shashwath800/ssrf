/**
 * Timeout & Size Enforcer
 * 
 * NEW defense layer in the Secure Fetch Engine.
 * Enforces hard limits on:
 * - Request timeout (prevent slow-loris / hanging connections)
 * - Maximum response body size (prevent memory exhaustion)
 * - Aborts on breach of either limit
 * 
 * In production this wraps the HTTP client with AbortController + stream limits.
 * Here we simulate enforcement against the fetched response.
 */

const DEFAULT_TIMEOUT_MS = 5000;      // 5 seconds
const DEFAULT_MAX_BODY_BYTES = 1048576; // 1 MB

function enforce(responseData, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBodyBytes = options.maxBodyBytes || DEFAULT_MAX_BODY_BYTES;

  // Simulate response timing
  const simulatedLatencyMs = Math.floor(Math.random() * 200) + 50;
  const timedOut = simulatedLatencyMs > timeoutMs;

  // Simulate body size check
  const bodyStr = typeof responseData === "string"
    ? responseData
    : JSON.stringify(responseData);
  const bodySize = Buffer.byteLength(bodyStr, 'utf8');
  const oversized = bodySize > maxBodyBytes;

  if (timedOut) {
    return {
      step: "Timeout & Size Enforcer",
      status: "BLOCK",
      reason: `Request timed out after ${timeoutMs}ms (simulated: ${simulatedLatencyMs}ms)`,
      data: { timeoutMs, simulatedLatencyMs, maxBodyBytes, bodySize },
    };
  }

  if (oversized) {
    return {
      step: "Timeout & Size Enforcer",
      status: "BLOCK",
      reason: `Response body exceeds max size: ${bodySize} bytes > ${maxBodyBytes} bytes limit`,
      data: { timeoutMs, simulatedLatencyMs, maxBodyBytes, bodySize },
    };
  }

  return {
    step: "Timeout & Size Enforcer",
    status: "PASS",
    data: {
      timeoutMs,
      simulatedLatencyMs: `${simulatedLatencyMs}ms`,
      maxBodyBytes,
      bodySize,
      note: `Response within limits — ${simulatedLatencyMs}ms latency, ${bodySize} bytes body`,
    },
  };
}

module.exports = { enforce };
