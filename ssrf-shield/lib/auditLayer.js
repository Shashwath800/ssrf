/**
 * Audit & Alert Layer
 * 
 * First layer in the defense pipeline. Logs every incoming request,
 * detects anomaly patterns (e.g. repeated failures from same origin),
 * and triggers alerts on suspicious activity.
 * 
 * In production this would integrate with SIEM/logging systems.
 * Here we simulate audit logging and pattern detection.
 */

// In-memory audit log for simulation
const auditLog = [];
const ALERT_THRESHOLD = 5; // Alert after N blocked requests in a window

function audit(url, requestMeta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    url,
    sourceIP: requestMeta.sourceIP || '10.0.0.1',
    userAgent: requestMeta.userAgent || 'ssrf-scanner/1.0',
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  auditLog.push(entry);

  // Detect anomaly: check for repeated requests to suspicious patterns
  const recentWindow = auditLog.filter(
    e => Date.now() - new Date(e.timestamp).getTime() < 60000 // last 60s
  );

  const suspiciousCount = recentWindow.filter(e => {
    const u = e.url.toLowerCase();
    return u.includes('169.254') || u.includes('127.0.0.1') || u.includes('localhost') || u.includes('metadata');
  }).length;

  const anomalyDetected = suspiciousCount >= ALERT_THRESHOLD;

  return {
    step: "Audit & Alert Layer",
    status: "PASS", // Audit layer never blocks — it observes and alerts
    data: {
      requestId: entry.requestId,
      totalRequests: auditLog.length,
      recentRequests: recentWindow.length,
      anomalyDetected,
      alert: anomalyDetected
        ? `⚠ ALERT: ${suspiciousCount} suspicious requests in last 60s — possible SSRF probe!`
        : null,
      note: anomalyDetected
        ? "Anomaly pattern detected — alerting security team"
        : "Request logged — no anomalies detected",
    },
  };
}

function getAuditLog() {
  return [...auditLog];
}

function clearAuditLog() {
  auditLog.length = 0;
}

module.exports = { audit, getAuditLog, clearAuditLog };
