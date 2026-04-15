/**
 * SSRF Simulation Server
 * Express server entry point.
 */

const express = require("express");
const cors = require("cors");
const scanRoutes = require("./routes/scan");
const dnsRoutes = require("./routes/dns");
const ollamaRoutes = require("./routes/ollama");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", scanRoutes);
app.use("/api", dnsRoutes);
app.use("/api", ollamaRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "SSRF Simulation Engine",
    version: "2.0.0",
    endpoints: [
      "POST /api/scan",
      "POST /api/toggle-dns",
      "GET  /api/dns-mode",
      "GET  /api/dns-records",
      "POST /api/dns-record",
      "DELETE /api/dns-record/:domain",
      "GET  /api/resolve?domain=",
      "GET  /api/dns-logs",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  SSRF Simulation Server running on http://localhost:${PORT}`);
});
