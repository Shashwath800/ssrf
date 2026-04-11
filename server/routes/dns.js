/**
 * DNS Resolver Routes
 * 
 * API endpoints for DNS record management, resolution, and log viewing.
 */

const express = require("express");
const router = express.Router();
const dnsStore = require("../engine/dnsStore");

// GET /api/dns-records — List all DNS records
router.get("/dns-records", (req, res) => {
  res.json({ records: dnsStore.getAllRecords() });
});

// POST /api/dns-record — Add or update a record
router.post("/dns-record", (req, res) => {
  const { domain, type, mode, ips, ttl, redirectTarget } = req.body;
  if (!domain || !ips || !Array.isArray(ips) || ips.length === 0) {
    return res.status(400).json({ error: "domain and ips[] are required" });
  }
  const record = dnsStore.addOrUpdateRecord(domain, { type, mode, ips, ttl, redirectTarget });
  res.json({ domain, record, message: `Record ${domain} saved` });
});

// DELETE /api/dns-record/:domain — Delete a record
router.delete("/dns-record/:domain", (req, res) => {
  const domain = req.params.domain;
  const deleted = dnsStore.deleteRecord(domain);
  if (deleted) {
    res.json({ domain, message: `Record ${domain} deleted` });
  } else {
    res.status(404).json({ error: `Record ${domain} not found` });
  }
});

// GET /api/resolve?domain=example.com — Resolve a domain
router.get("/resolve", (req, res) => {
  const domain = req.query.domain;
  if (!domain) return res.status(400).json({ error: "domain query param required" });
  const result = dnsStore.resolveDomain(domain);
  res.json({ domain, ...result });
});

// GET /api/dns-logs — Get query logs
router.get("/dns-logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ logs: dnsStore.getQueryLog(limit) });
});

// POST /api/dns-logs/clear — Clear logs
router.post("/dns-logs/clear", (req, res) => {
  dnsStore.clearQueryLog();
  res.json({ message: "Logs cleared" });
});

// POST /api/update-dns-instant — Instantly change IP for a domain (attacker simulation)
router.post("/update-dns-instant", (req, res) => {
  const { domain, ip } = req.body;
  if (!domain || !ip) {
    return res.status(400).json({ error: "domain and ip are required" });
  }
  const record = dnsStore.instantUpdate(domain, ip);
  const records = dnsStore.getAllRecords();
  const logs = dnsStore.getQueryLog(20);
  res.json({
    domain,
    newIP: ip,
    record,
    records,
    recentLogs: logs,
    message: `⚡ DNS for ${domain} instantly changed to ${ip}`,
  });
});

module.exports = router;
