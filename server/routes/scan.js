/**
 * Scan Routes
 * Defines API endpoints for the SSRF simulation.
 */

const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scanController");

// Run SSRF scan pipeline on a URL
router.post("/scan", scanController.scanUrl);

// Toggle DNS rebinding mode (SAFE ↔ ATTACK)
router.post("/toggle-dns", scanController.toggleDns);

// Get current DNS mode
router.get("/dns-mode", scanController.getDnsMode);

module.exports = router;
