/**
 * Scan Controller
 * 
 * Uses the ssrf-shield package for SSRF defense pipeline.
 * Records every scan in the SQLite database for history & analytics.
 */

const SSRFShield = require('ssrf-shield');
const dnsStore = require('../engine/dnsStore');
const { dispatchAlert } = require('../routes/webhook');
const { emitEvent } = require('../engine/eventStore');
const db = require('../db');

// Regex to detect if a hostname is already a raw IP address
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

// Create a shared shield instance
const shield = new SSRFShield({
  // Integrate the real live DNS store from the DNS Resolver page!
  customDnsResolver: (domain) => {
    // If the domain IS already a raw IP (e.g. from a redirect target like http://169.254.169.254/),
    // return that IP directly — do NOT look it up in the DNS store (it won't exist there).
    if (IP_RE.test(domain)) {
      return {
        step: "DNS Resolver",
        status: "PASS",
        data: {
          hostname: domain,
          resolvedIPs: [domain],  // The "domain" IS the IP
          source: "direct-ip",
          note: `Hostname is a raw IP address — resolved directly as ${domain}`
        }
      };
    }

    const res = dnsStore.resolveDomain(domain);
    return {
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname: domain,
        resolvedIPs: res.ips,
        source: res.source,
        redirectTarget: res.record?.redirectTarget,
        note: `Resolved via live DNS store (${res.source})`
      }
    };
  }
});

// GET /scan?url=... — Run SSRF simulation pipeline on a URL using SSE (Server-Sent Events)
async function scanUrl(req, res) {
  const url = req.query.url;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'url' query param" });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send an initial event
  res.write(`data: ${JSON.stringify({ type: 'start', url })}\n\n`);

  const clientIP = req.ip || req.connection?.remoteAddress || "unknown";
  const scanStartTime = Date.now();

  // Emit scan start event
  emitEvent({
    type: "SCAN_STARTED",
    ip: clientIP,
    url,
    severity: "info",
    reason: `Pipeline scan initiated for ${url}`,
    source: "scanner",
  });

  // Run the async scan with high delay to simulate slow pipeline (~20-30s total)
  // Each step takes 1.8s
  const result = await shield.scan(url, {}, {
    delayMs: 1800,
    onStep: async (stepResult) => {
      // Stream each step exactly as it happens
      res.write(`data: ${JSON.stringify({ type: 'step', stepResult })}\n\n`);

      // Emit event for every step
      const isBlock = stepResult.status === 'BLOCK';
      emitEvent({
        type: isBlock ? "STEP_BLOCK" : "STEP_PASS",
        ip: clientIP,
        url,
        severity: isBlock ? "high" : "low",
        reason: isBlock
          ? `Blocked at "${stepResult.step}": ${stepResult.data?.reason || stepResult.data?.note || "Policy violation"}`
          : `Passed: ${stepResult.step}`,
        source: "scanner",
        data: { step: stepResult.step, status: stepResult.status },
      });

      // 🔔 If a step blocks, fire a webhook alert
      if (isBlock) {
        dispatchAlert({
          event: "SSRF_BLOCKED",
          timestamp: new Date().toISOString(),
          attackerIP: clientIP,
          targetUrl: url,
          reason: `Blocked at "${stepResult.step}": ${stepResult.data?.reason || stepResult.data?.note || "Policy violation"}`,
          severity: "high",
          blocked: true,
          step: stepResult.step,
        });
      }
    }
  });

  const duration_ms = Date.now() - scanStartTime;

  // ── Record scan in SQLite database ──
  try {
    const blockedStep = result.steps.find(s => s.status === 'BLOCK');
    db.insertScan({
      url,
      status: result.status === 'BLOCKED' ? 'BLOCKED' : 'PASS',
      blocked_at_step: blockedStep ? blockedStep.step : null,
      timestamp: new Date().toISOString(),
      duration_ms,
    });
  } catch (dbErr) {
    console.error('Failed to record scan in database:', dbErr.message);
  }

  // Emit scan complete event
  emitEvent({
    type: result.status === "BLOCK" ? "SSRF_BLOCKED" : "SCAN_COMPLETED",
    ip: clientIP,
    url,
    severity: result.status === "BLOCK" ? "high" : "info",
    reason: `Scan finished: ${result.status}`,
    source: "scanner",
    data: { finalStatus: result.status },
  });

  // Finish
  res.write(`data: ${JSON.stringify({ type: 'done', finalStatus: result.status })}\n\n`);
  res.end();
}

// POST /toggle-dns — Deprecated (kept for backwards compatibility)
function toggleDns(req, res) {
  const newMode = shield.toggleDnsMode();
  res.json({ dnsMode: newMode, message: `DNS mode switched to ${newMode}` });
}

// GET /dns-mode — Deprecated
function getDnsMode(req, res) {
  res.json({ dnsMode: shield.getDnsMode() });
}

module.exports = { scanUrl, toggleDns, getDnsMode };
