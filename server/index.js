/**
 * SSRF Simulation Server
 * Express server entry point.
 */

const express = require("express");
const cors = require("cors");
const scanRoutes = require("./routes/scan");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", scanRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "SSRF Simulation Engine",
    version: "1.0.0",
    endpoints: [
      "POST /api/scan",
      "POST /api/toggle-dns",
      "GET  /api/dns-mode",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  SSRF Simulation Server running on http://localhost:${PORT}`);
});
