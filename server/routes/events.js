/**
 * Events API Routes
 * 
 * Exposes the centralized event store via REST endpoints.
 */

const express = require("express");
const router = express.Router();
const { getEvents, getMetrics, clearEvents } = require("../engine/eventStore");

// GET /api/events — List events with optional filters
router.get("/events", (req, res) => {
  const { limit, type, severity, source, since } = req.query;
  const events = getEvents({
    limit: parseInt(limit) || 100,
    type,
    severity,
    source,
    since,
  });
  res.json({ events, count: events.length });
});

// GET /api/events/metrics — Aggregated event metrics
router.get("/events/metrics", (req, res) => {
  res.json(getMetrics());
});

// DELETE /api/events — Clear all events
router.delete("/events", (req, res) => {
  clearEvents();
  res.json({ message: "All events cleared" });
});

module.exports = router;
