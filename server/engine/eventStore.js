/**
 * Centralized Event Store
 * 
 * All security events flow through emitEvent().
 * Events are stored in memory and exposed via API.
 */

const events = [];
const MAX_EVENTS = 500;

// Event type constants
const EVENT_TYPES = {
  SSRF_BLOCKED: "SSRF_BLOCKED",
  EXPLOIT_SUCCESS: "EXPLOIT_SUCCESS",
  ANALYSIS_COMPLETED: "ANALYSIS_COMPLETED",
  DNS_REBINDING: "DNS_REBINDING",
  DNS_REDIRECT: "DNS_REDIRECT",
  DNS_ATTACK: "DNS_ATTACK",
  SCAN_STARTED: "SCAN_STARTED",
  SCAN_COMPLETED: "SCAN_COMPLETED",
  STEP_PASS: "STEP_PASS",
  STEP_BLOCK: "STEP_BLOCK",
  WEBHOOK_FIRED: "WEBHOOK_FIRED",
  RISK_ANALYSIS: "RISK_ANALYSIS",
};

/**
 * Emit a structured security event.
 * @param {object} event
 * @param {string} event.type - One of EVENT_TYPES
 * @param {string} event.ip - Attacker / requester IP
 * @param {string} event.url - Target URL
 * @param {string} event.severity - "info" | "low" | "medium" | "high" | "critical"
 * @param {string} event.reason - Human-readable reason
 * @param {string} event.source - "scanner" | "simulator" | "analyzer" | "dns" | "webhook"
 * @param {object} [event.data] - Optional extra data
 */
function emitEvent({ type, ip, url, severity, reason, source, data }) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: type || "UNKNOWN",
    timestamp: new Date().toISOString(),
    ip: ip || "unknown",
    url: url || "",
    severity: severity || "info",
    reason: reason || "",
    source: source || "system",
    data: data || null,
  };

  events.unshift(event); // most recent first
  if (events.length > MAX_EVENTS) events.pop();

  return event;
}

/**
 * Get events with optional filtering.
 */
function getEvents({ limit = 100, type, severity, source, since } = {}) {
  let filtered = events;

  if (type) filtered = filtered.filter(e => e.type === type);
  if (severity) filtered = filtered.filter(e => e.severity === severity);
  if (source) filtered = filtered.filter(e => e.source === source);
  if (since) {
    const sinceDate = new Date(since).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceDate);
  }

  return filtered.slice(0, Math.min(limit, MAX_EVENTS));
}

/**
 * Get event metrics/counts grouped by type.
 */
function getMetrics() {
  const byType = {};
  const bySeverity = {};
  const bySource = {};
  const byIP = {};

  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    if (e.ip && e.ip !== "unknown") {
      byIP[e.ip] = (byIP[e.ip] || 0) + 1;
    }
  }

  // Top IPs sorted by count
  const topIPs = Object.entries(byIP)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  return {
    total: events.length,
    byType,
    bySeverity,
    bySource,
    topIPs,
  };
}

/**
 * Clear all events
 */
function clearEvents() {
  events.length = 0;
}

module.exports = {
  emitEvent,
  getEvents,
  getMetrics,
  clearEvents,
  EVENT_TYPES,
};
