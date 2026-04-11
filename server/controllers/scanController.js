/**
 * Scan Controller
 * 
 * Uses the ssrf-shield package for SSRF defense pipeline.
 */

const SSRFShield = require('ssrf-shield');
const dnsStore = require('../engine/dnsStore');

// Create a shared shield instance
const shield = new SSRFShield({
  // Integrate the real live DNS store from the DNS Resolver page!
  customDnsResolver: (domain) => {
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

  // Run the async scan with high delay to simulate slow pipeline (~20-30s total)
  // Each step takes 1.8s
  const result = await shield.scan(url, {}, {
    delayMs: 1800,
    onStep: async (stepResult) => {
      // Stream each step exactly as it happens
      res.write(`data: ${JSON.stringify({ type: 'step', stepResult })}\n\n`);
    }
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
