/**
 * Scan Controller
 * 
 * Uses the ssrf-shield package for SSRF defense pipeline.
 */

const SSRFShield = require('ssrf-shield');

// Create a shared shield instance
const shield = new SSRFShield();

// POST /scan — Run SSRF simulation pipeline on a URL
function scanUrl(req, res) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'url' in request body" });
  }

  const result = shield.scan(url);

  res.json({
    url,
    status: result.status,
    steps: result.steps,
    logs: result.logs,
    dnsMode: shield.getDnsMode(),
  });
}

// POST /toggle-dns — Toggle DNS rebinding mode
function toggleDns(req, res) {
  const newMode = shield.toggleDnsMode();
  res.json({ dnsMode: newMode, message: `DNS mode switched to ${newMode}` });
}

// GET /dns-mode — Get current DNS mode
function getDnsMode(req, res) {
  res.json({ dnsMode: shield.getDnsMode() });
}

module.exports = { scanUrl, toggleDns, getDnsMode };
