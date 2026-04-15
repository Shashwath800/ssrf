/**
 * Webhook Alert System
 * 
 * Manages webhook configuration, stores security alerts,
 * and dispatches notifications when SSRF attempts are blocked.
 */

const express = require("express");
const router = express.Router();

// ── In-memory stores ──
let webhookConfig = {
  url: "http://localhost:4000/api/webhook-receiver", // default: internal test endpoint
  enabled: true,
  secret: "",
};

const alerts = []; // most recent first
const MAX_ALERTS = 100;

// ── Dispatch alert to webhook ──
async function dispatchAlert(alert) {
  // Always store the alert
  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts.pop();

  // Send to webhook if enabled
  if (!webhookConfig.enabled || !webhookConfig.url) return;

  try {
    const payload = {
      ...alert,
      webhook_secret: webhookConfig.secret || undefined,
    };

    await fetch(webhookConfig.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    console.log(`🔔 Webhook dispatched: ${alert.event} → ${webhookConfig.url}`);
  } catch (err) {
    console.error(`⚠️  Webhook delivery failed: ${err.message}`);
  }
}

// ── GET /api/webhook-config — Get current webhook settings ──
router.get("/webhook-config", (req, res) => {
  res.json({
    url: webhookConfig.url,
    enabled: webhookConfig.enabled,
    secret: webhookConfig.secret ? "••••••••" : "",
  });
});

// ── POST /api/webhook-config — Update webhook settings ──
router.post("/webhook-config", (req, res) => {
  const { url, enabled, secret } = req.body;

  if (url !== undefined) webhookConfig.url = url;
  if (enabled !== undefined) webhookConfig.enabled = !!enabled;
  if (secret !== undefined) webhookConfig.secret = secret;

  console.log(`⚙️  Webhook config updated: ${webhookConfig.enabled ? "ON" : "OFF"} → ${webhookConfig.url}`);

  res.json({
    message: "Webhook configuration updated",
    url: webhookConfig.url,
    enabled: webhookConfig.enabled,
  });
});

// ── GET /api/alerts — Get recent alerts ──
router.get("/alerts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, MAX_ALERTS);
  res.json({ alerts: alerts.slice(0, limit), total: alerts.length });
});

// ── DELETE /api/alerts — Clear all alerts ──
router.delete("/alerts", (req, res) => {
  alerts.length = 0;
  res.json({ message: "All alerts cleared" });
});

// ── POST /api/webhook-receiver — Built-in test receiver ──
const receivedWebhooks = [];
router.post("/webhook-receiver", (req, res) => {
  const received = {
    ...req.body,
    _receivedAt: new Date().toISOString(),
  };
  receivedWebhooks.unshift(received);
  if (receivedWebhooks.length > 50) receivedWebhooks.pop();

  console.log(`📨 Webhook received: ${req.body.event} | ${req.body.targetUrl}`);
  res.json({ status: "received", id: receivedWebhooks.length });
});

// ── GET /api/webhook-receiver — View received test webhooks ──
router.get("/webhook-receiver", (req, res) => {
  res.json({ received: receivedWebhooks });
});

// ── POST /api/webhook-test — Send a test alert ──
router.post("/webhook-test", async (req, res) => {
  const testAlert = {
    event: "SSRF_TEST_ALERT",
    timestamp: new Date().toISOString(),
    attackerIP: "127.0.0.1",
    targetUrl: "http://169.254.169.254/latest/meta-data/",
    reason: "Test alert — verifying webhook delivery",
    severity: "info",
    blocked: true,
  };

  await dispatchAlert(testAlert);
  res.json({ message: "Test alert dispatched", alert: testAlert });
});

module.exports = router;
module.exports.dispatchAlert = dispatchAlert;
