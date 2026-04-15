/**
 * SSRF Simulation Server
 * Express server entry point.
 */

require('dotenv').config();

const express = require("express");
const cors = require("cors");
const scanRoutes = require("./routes/scan");
const dnsRoutes = require("./routes/dns");
const groqRoutes = require("./routes/groq");
const fakeAwsMetadata = require("./routes/fakeAwsMetadata");
const attackDemo = require("./routes/attackDemo");
const riskAnalyzer = require("./routes/riskAnalyzer");
const mlAnalyzer = require("./routes/mlAnalyzer");
const webhookRoutes = require("./routes/webhook");
const eventsRoutes = require("./routes/events");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", scanRoutes);
app.use("/api", dnsRoutes);
app.use("/api", groqRoutes);
app.use("/api", attackDemo);
app.use("/api", riskAnalyzer);
app.use("/api", mlAnalyzer);
app.use("/api", webhookRoutes);
app.use("/api", eventsRoutes);

// Fake internal services (mounted at root — simulates 169.254.169.254)
app.use("/", fakeAwsMetadata);

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "SSRF Simulation Engine",
    version: "3.0.0",
    endpoints: [
      "POST /api/scan",
      "POST /api/attack-demo",
      "POST /api/toggle-dns",
      "GET  /api/dns-mode",
      "GET  /api/dns-records",
      "POST /api/dns-record",
      "DELETE /api/dns-record/:domain",
      "GET  /api/resolve?domain=",
      "GET  /api/dns-logs",
      "GET  /latest/meta-data/ (fake AWS)",
      "GET  /internal/db (fake DB)",
      "GET  /api/webhook-config",
      "POST /api/webhook-config",
      "GET  /api/alerts",
      "POST /api/webhook-test",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  SSRF Simulation Server running on http://localhost:${PORT}`);
});
