/**
 * SSRF Risk Analyzer Route
 * 
 * Multi-agent system that safely analyzes URLs for SSRF vulnerabilities.
 * Does NOT exploit or send malicious payloads — analysis only.
 */

const express = require("express");
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// ── SSRF-prone parameter patterns ──
const SSRF_PARAMS = [
  "url", "uri", "link", "href", "src", "source", "target", "dest",
  "redirect", "redirect_uri", "redirect_url", "return", "return_url",
  "next", "next_url", "callback", "callback_url", "go", "goto",
  "fetch", "load", "path", "file", "page", "feed", "host",
  "site", "html", "data", "reference", "ref", "continue",
  "window", "domain", "endpoint", "proxy", "request",
];

// ── Agent 1: InputAnalyzerAgent ──
function inputAnalyzerAgent(url) {
  const results = { agent: "InputAnalyzer", findings: [], risk: 0 };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    results.findings.push({ type: "error", text: "Invalid URL format" });
    return results;
  }

  // Check query parameters for SSRF-prone names
  const detectedParams = [];
  for (const [key, value] of parsed.searchParams) {
    const lower = key.toLowerCase();
    if (SSRF_PARAMS.includes(lower)) {
      detectedParams.push({ param: key, value: value || "(empty)", severity: "high" });
      results.risk += 25;
    } else if (lower.includes("url") || lower.includes("uri") || lower.includes("link")) {
      detectedParams.push({ param: key, value: value || "(empty)", severity: "medium" });
      results.risk += 15;
    }
  }

  if (detectedParams.length > 0) {
    results.findings.push({
      type: "warning",
      text: `Detected ${detectedParams.length} SSRF-prone parameter(s): ${detectedParams.map(p => p.param).join(", ")}`,
      params: detectedParams,
    });
  } else {
    results.findings.push({ type: "info", text: "No obvious SSRF-prone parameters detected in URL query string" });
  }

  // Check for path-based injection patterns
  const path = parsed.pathname;
  if (path.includes("http://") || path.includes("https://") || path.includes("//")) {
    results.findings.push({ type: "warning", text: "URL contains embedded URL in path — possible path-based SSRF vector" });
    results.risk += 20;
  }

  // Check for fragment/hash-based bypass attempts
  if (parsed.hash && (parsed.hash.includes("http") || parsed.hash.includes("//"))) {
    results.findings.push({ type: "info", text: "Fragment contains URL-like content — low risk but notable" });
    results.risk += 5;
  }

  // Check protocol
  if (!["http:", "https:"].includes(parsed.protocol)) {
    results.findings.push({ type: "warning", text: `Non-standard protocol detected: ${parsed.protocol}` });
    results.risk += 15;
  }

  results.risk = Math.min(results.risk, 100);
  return results;
}

// ── Agent 2: NetworkAgent (safe GET only) ──
async function networkAgent(url) {
  const results = { agent: "NetworkAgent", findings: [], risk: 0, responseData: {} };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      redirect: "manual", // Don't follow redirects automatically
      signal: controller.signal,
      headers: {
        "User-Agent": "SSRF-Risk-Analyzer/1.0 (Safe-Analysis-Only)",
      },
    });
    clearTimeout(timeout);

    results.responseData = {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type") || "unknown",
      server: response.headers.get("server") || "unknown",
      xFrameOptions: response.headers.get("x-frame-options") || "not set",
      csp: response.headers.get("content-security-policy") ? "present" : "not set",
      cors: response.headers.get("access-control-allow-origin") || "not set",
      location: response.headers.get("location") || null,
    };

    // Check for redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      results.findings.push({
        type: "warning",
        text: `Redirect detected (${response.status}) → ${location || "unknown"}`,
      });
      results.risk += 15;

      // Check if redirect goes to internal IP
      if (location) {
        try {
          const redirectUrl = new URL(location, url);
          const host = redirectUrl.hostname;
          if (host === "localhost" || host.startsWith("127.") || host.startsWith("10.") ||
              host.startsWith("192.168.") || host.startsWith("169.254.") || host === "0.0.0.0") {
            results.findings.push({ type: "critical", text: `Redirect points to internal IP: ${host}` });
            results.risk += 30;
          }
        } catch {}
      }
    }

    // Check content type for proxy behavior
    const ct = (results.responseData.contentType || "").toLowerCase();
    if (ct.includes("text/html")) {
      results.findings.push({ type: "info", text: "Response is HTML — could be a proxy page" });
    } else if (ct.includes("application/json")) {
      results.findings.push({ type: "info", text: "Response is JSON — possible API endpoint" });
      results.risk += 5;
    }

    // Check for open CORS
    if (results.responseData.cors === "*") {
      results.findings.push({ type: "warning", text: "Wide-open CORS (Access-Control-Allow-Origin: *) detected" });
      results.risk += 10;
    }

    // Check for missing security headers
    if (results.responseData.csp === "not set") {
      results.findings.push({ type: "info", text: "No Content-Security-Policy header" });
      results.risk += 5;
    }

    results.findings.push({
      type: "info",
      text: `Response: ${response.status} ${response.statusText} | Server: ${results.responseData.server}`,
    });

  } catch (err) {
    if (err.name === "AbortError") {
      results.findings.push({ type: "warning", text: "Request timed out (8s) — may indicate slow or blocking behavior" });
      results.risk += 10;
    } else {
      results.findings.push({ type: "error", text: `Network error: ${err.message}` });
    }
  }

  results.risk = Math.min(results.risk, 100);
  return results;
}

// ── Agent 3: SecurityAgent ──
function securityAgent(inputResults, networkResults) {
  const results = { agent: "SecurityAgent", findings: [], risk: 0 };
  const rd = networkResults.responseData || {};

  // Check for validation indicators
  if (rd.status === 400 || rd.status === 403 || rd.status === 422) {
    results.findings.push({ type: "good", text: `Server returned ${rd.status} — may indicate input validation is present` });
    results.risk -= 10;
  }

  // Check for security headers
  if (rd.xFrameOptions && rd.xFrameOptions !== "not set") {
    results.findings.push({ type: "good", text: `X-Frame-Options header present: ${rd.xFrameOptions}` });
    results.risk -= 5;
  }

  if (rd.csp === "present") {
    results.findings.push({ type: "good", text: "Content-Security-Policy header is present" });
    results.risk -= 5;
  }

  // Check for lack of protections
  if (rd.cors === "*" && inputResults.findings.some(f => f.params?.length > 0)) {
    results.findings.push({ type: "warning", text: "Open CORS combined with URL parameters — elevated risk" });
    results.risk += 15;
  }

  // Infer server-side fetching behavior
  const hasUrlParam = inputResults.findings.some(f => f.params?.length > 0);
  if (hasUrlParam && rd.status === 200) {
    results.findings.push({ type: "warning", text: "Server accepts URL parameters and returns 200 — may perform server-side requests" });
    results.risk += 20;
  }

  if (results.findings.length === 0) {
    results.findings.push({ type: "info", text: "Insufficient signals to determine protection level" });
  }

  results.risk = Math.max(0, Math.min(results.risk, 100));
  return results;
}

// ── Agent 4: AttackSimulatorAgent (SAFE — no real requests) ──
function attackSimulatorAgent(url, inputResults) {
  const results = { agent: "AttackSimulator", findings: [], risk: 0, simulatedPayloads: [] };

  let parsed;
  try { parsed = new URL(url); } catch { return results; }

  const hasUrlParam = inputResults.findings.some(f => f.params?.length > 0);
  const urlParams = inputResults.findings
    .filter(f => f.params)
    .flatMap(f => f.params)
    .map(p => p.param);

  if (urlParams.length === 0) {
    results.findings.push({ type: "info", text: "No injectable parameters found — simulation limited" });
    return results;
  }

  // Generate simulated payloads (NEVER sent)
  const payloads = [
    { payload: "http://127.0.0.1/admin", target: "Loopback", severity: "high" },
    { payload: "http://169.254.169.254/latest/meta-data/", target: "AWS Metadata", severity: "critical" },
    { payload: "http://localhost:8080/", target: "Local Services", severity: "high" },
    { payload: "http://10.0.0.1/", target: "Internal Network", severity: "high" },
    { payload: "http://[::1]/", target: "IPv6 Loopback", severity: "medium" },
    { payload: `http://evil.com@${parsed.hostname}/`, target: "URL Parser Bypass", severity: "medium" },
  ];

  for (const p of payloads) {
    const simulated = {
      ...p,
      injectedParam: urlParams[0],
      fullUrl: `${parsed.origin}${parsed.pathname}?${urlParams[0]}=${encodeURIComponent(p.payload)}`,
      estimatedOutcome: hasUrlParam ? "Potentially exploitable if no server-side validation" : "Likely blocked",
    };
    results.simulatedPayloads.push(simulated);
  }

  results.findings.push({
    type: "warning",
    text: `Generated ${payloads.length} SSRF test payloads for parameter "${urlParams[0]}" (NOT sent to server)`,
  });

  results.risk = hasUrlParam ? 30 : 10;
  return results;
}

// ── Agent 5: StrategistAgent ──
async function strategistAgent(url, agents, groqApiKey) {
  const totalRisk = Math.min(100, Math.max(0,
    Math.round(agents.reduce((sum, a) => sum + a.risk, 0) / agents.length * 1.5)
  ));

  let attackability = "Low";
  if (totalRisk >= 60) attackability = "High";
  else if (totalRisk >= 30) attackability = "Medium";

  const confidence = Math.min(95, Math.max(20,
    40 + agents.filter(a => a.findings.length > 1).length * 12
  ));

  const result = {
    agent: "Strategist",
    riskScore: totalRisk,
    attackability,
    confidence,
    reasoning: null,
    recommendations: [
      "Validate and sanitize all user-supplied URLs server-side",
      "Block requests to internal/private IP ranges (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x)",
      "Restrict outbound protocols to http and https only",
      "Disable automatic redirect following in server-side HTTP clients",
      "Implement domain allowlists for outbound requests",
      "Use IMDSv2 (token-required) for cloud metadata endpoints",
    ],
  };

  // Get AI reasoning from Groq
  if (groqApiKey) {
    const agentSummaries = agents.map(a =>
      `[${a.agent}] Risk: ${a.risk}/100\n` +
      a.findings.map(f => `  ${f.type}: ${f.text}`).join("\n")
    ).join("\n\n");

    const prompt = `You are a cybersecurity strategist analyzing SSRF (Server-Side Request Forgery) risk for a URL.

TARGET URL: "${url}"
RISK SCORE: ${totalRisk}/100
ATTACKABILITY: ${attackability}

AGENT REPORTS:
${agentSummaries}

Provide a concise security analysis in exactly 5 lines:
1. What SSRF-prone patterns were detected in this URL
2. Whether the endpoint appears to perform server-side requests
3. What conditions would make it exploitable
4. The key risk signals observed
5. Your final verdict (safe, risky, or dangerous)

Rules:
- Be specific to THIS URL
- Reference actual parameters, headers, and behaviors observed
- Do not give generic SSRF descriptions
- Keep each line to 1-2 sentences
- Start each line with "• "`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 400,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        result.reasoning = data.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (err) {
      console.error("Groq strategist error:", err.message);
    }
  }

  return result;
}

// ── Main Route ──
router.post("/analyze-risk", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    // Run agents in sequence
    const inputResults = inputAnalyzerAgent(url);
    const networkResults = await networkAgent(url);
    const securityResults = securityAgent(inputResults, networkResults);
    const attackResults = attackSimulatorAgent(url, inputResults);
    const strategist = await strategistAgent(
      url,
      [inputResults, networkResults, securityResults, attackResults],
      GROQ_API_KEY
    );

    res.json({
      url,
      agents: [inputResults, networkResults, securityResults, attackResults],
      strategist,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Risk analyzer error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
