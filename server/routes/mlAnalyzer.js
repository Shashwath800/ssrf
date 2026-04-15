/**
 * Pure JavaScript ML SSRF Risk Analyzer
 * 
 * Uses feature extraction and logistic regression (sigmoid) 
 * to calculate SSRF risk probability without external libraries.
 */

const express = require("express");
const router = express.Router();
const { emitEvent } = require("../engine/eventStore");

// ── ML Feature Engineering ──

// Vulnerable parameters that often lead to SSRF
const SSRF_PARAMS = [
  "url", "uri", "link", "href", "src", "source", "target", "dest",
  "redirect", "return", "next", "callback", "go", "fetch", "load",
  "path", "file", "page", "proxy"
];

// Helper to check if a string is a raw IP address
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

// Helper to check if an IP is in a private/internal range
const isInternalIP = (ip) => {
  return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.)/.test(ip);
};

/**
 * Extract numerical features from the URL for the ML model.
 */
function extractFeatures(targetUrl) {
  let urlObj;
  try {
    urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
  } catch (e) {
    // Basic fallback if unparseable
    urlObj = { hostname: targetUrl, searchParams: new URLSearchParams(), pathname: targetUrl };
  }

  const hostname = urlObj.hostname;
  const isIP = IP_RE.test(hostname) ? 1 : 0;
  const isInternal = isIP && isInternalIP(hostname) ? 1 : (hostname === 'localhost' ? 1 : 0);
  
  // Count suspicious params
  let suspiciousParamCount = 0;
  for (const [key] of urlObj.searchParams) {
    if (SSRF_PARAMS.includes(key.toLowerCase())) {
      suspiciousParamCount += 1;
    }
  }

  // Typical SSRF payloads often involve an IP or weird chars like @ (auth bypass), # (fragment), etc.
  const specialChars = (targetUrl.match(/[@#?&%=:]/g) || []).length;
  
  // Normalize length (longer URLs are slightly more suspicious due to embedded payloads)
  // Max cap at 200 chars for normalization
  const normLength = Math.min(targetUrl.length, 200) / 200.0;

  return {
    isIp: isIP,
    isInternal: isInternal,
    suspiciousParams: Math.min(suspiciousParamCount, 3) / 3.0, // normalized 0-1
    specialChars: Math.min(specialChars, 10) / 10.0, // normalized 0-1
    lengthNorm: normLength,
    rawValues: {
      length: targetUrl.length,
      suspiciousParamCount,
      specialChars
    }
  };
}

// ── Logistic Regression Model ──

const fs = require('fs');
const path = require('path');

let WEIGHTS = {
  isIp: 3.5,
  isInternal: 7.0,
  suspiciousParams: 2.0,
  specialChars: 1.5,
  lengthNorm: 0.5
};
let BIAS = -3.0;

// Try to load dynamically trained weights
try {
  const modelPath = path.join(__dirname, '../data', 'ml_weights.json');
  if (fs.existsSync(modelPath)) {
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    WEIGHTS = model.weights;
    BIAS = model.bias;
    console.log("✅ ML Analyzer: Loaded dynamically trained weights.");
  }
} catch (e) {
  console.warn("⚠️ ML Analyzer: Could not load trained weights, falling back to heuristics.", e.message);
}

// Standard Sigmoid function: 1 / (1 + e^-x) -> maps to (0, 1)
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// Predict probability of SSRF risk
function predictRisk(features) {
  const z = 
    (features.isIp * WEIGHTS.isIp) +
    (features.isInternal * WEIGHTS.isInternal) +
    (features.suspiciousParams * WEIGHTS.suspiciousParams) +
    (features.specialChars * WEIGHTS.specialChars) +
    (features.lengthNorm * WEIGHTS.lengthNorm) +
    BIAS;

  const probability = sigmoid(z);
  return {
    score: Math.round(probability * 100),
    probability,
    z
  };
}

// Calculate an "Anomaly Score" representing out-of-distribution traits 
// (e.g. extremely long URLs, weird char densities)
function calculateAnomaly(features) {
  let anomaly = 0;
  if (features.rawValues.length > 150) anomaly += 0.4;
  if (features.rawValues.specialChars > 8) anomaly += 0.3;
  if (features.suspiciousParams === 1) anomaly += 0.2; // 1 means 3+ suspicious params
  if (features.isIp && !features.isInternal) anomaly += 0.1;

  return Math.min(anomaly, 1.0);
}

// ── Explanation Generator ──
function generateExplanation(features, riskScore, anomalyScore) {
  const exps = [];
  
  if (features.isInternal) {
    exps.push({ type: 'critical', text: 'Target points to a known internal/private network address.' });
  } else if (features.isIp) {
    exps.push({ type: 'medium', text: 'Target uses a raw IP address instead of a domain name.' });
  }

  if (features.rawValues.suspiciousParamCount > 0) {
    exps.push({ type: 'high', text: `Found ${features.rawValues.suspiciousParamCount} parameters commonly used in SSRF attacks (e.g. url, target).` });
  }

  if (features.rawValues.specialChars > 5) {
    exps.push({ type: 'info', text: 'High density of special characters detected, possible payload obfucation.' });
  }

  if (anomalyScore > 0.5) {
    exps.push({ type: 'medium', text: `URL exhibits anomalous structural traits (Score: ${anomalyScore.toFixed(2)}).` });
  }

  if (exps.length === 0) {
    exps.push({ type: 'success', text: 'No risky features detected in the payload structure.' });
  }

  return exps;
}

// ── API Route ──
router.post("/ml-analyze", (req, res) => {
  const { targetUrl } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: "targetUrl is required" });
  }

  try {
    const features = extractFeatures(targetUrl);
    const risk = predictRisk(features);
    const anomalyScore = calculateAnomaly(features);
    const explanations = generateExplanation(features, risk.score, anomalyScore);

    // Calculate confidence based on proximity to 50/50 boundary
    // High confidence if score is near 0 or 100. Lower if it's borderline ~50
    const confidence = Math.abs(risk.probability - 0.5) * 2; 

    // Convert to categorical risk
    let riskLevel = "low";
    if (risk.score > 75) riskLevel = "high";
    else if (risk.score > 35) riskLevel = "medium";

    const result = {
      targetUrl,
      riskLevel,
      riskScore: risk.score,
      anomalyScore: parseFloat(anomalyScore.toFixed(2)),
      confidence: Math.round(confidence * 100),
      features: features.rawValues,
      explanations
    };

    // Emit event for monitoring
    emitEvent({
      type: "RISK_ANALYSIS",
      ip: req.ip || "unknown",
      url: targetUrl,
      severity: riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'medium' : 'info',
      reason: `ML Analysis: Score ${risk.score}/100, Anomaly ${anomalyScore}`,
      source: "analyzer",
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
