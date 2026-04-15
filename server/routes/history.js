/**
 * Scan History Routes
 * 
 * API endpoints for viewing scan history, stats, and clearing history.
 * Backed by SQLite via sql.js.
 */

const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/scans/history?limit=50&offset=0 — Paginated scan history
router.get("/scans/history", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = parseInt(req.query.offset) || 0;
  
  try {
    const result = db.getHistory(limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scan history", detail: err.message });
  }
});

// GET /api/scans/stats — Aggregated statistics
router.get("/scans/stats", (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats", detail: err.message });
  }
});

// DELETE /api/scans/history — Clear all scan history
router.delete("/scans/history", (req, res) => {
  try {
    db.clearHistory();
    res.json({ message: "Scan history cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history", detail: err.message });
  }
});

module.exports = router;
