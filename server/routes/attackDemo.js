/**
 * Attack Demo Route
 *
 * POST /api/attack-demo
 * Runs an SSRF attack simulation in either "vulnerable" or "protected" mode.
 *
 * Vulnerable mode: bypasses all defenses, rewrites 169.254.169.254 → localhost,
 *                  directly fetches from fake metadata/internal services.
 * Protected mode:  runs URL through the full SSRFShield pipeline which blocks
 *                  private/link-local IPs.
 */

const express = require("express");
const router = express.Router();
const SSRFShield = require("ssrf-shield");
const dnsStore = require("../engine/dnsStore");
const { emitEvent } = require("../engine/eventStore");

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const PORT = process.env.PORT || 4000;

// Shared shield instance for protected mode
const shield = new SSRFShield({
  customDnsResolver: (domain) => {
    if (IP_RE.test(domain)) {
      return {
        step: "DNS Resolver",
        status: "PASS",
        data: {
          hostname: domain,
          resolvedIPs: [domain],
          source: "direct-ip",
          note: `Hostname is a raw IP address — resolved directly as ${domain}`,
        },
      };
    }
    const res = dnsStore.resolveDomain(domain);
    return {
      step: "DNS Resolver",
      status: "PASS",
      data: {
        hostname: domain,
        resolvedIPs: res.ips,
        source: res.source,
        redirectTarget: res.record?.redirectTarget,
        note: `Resolved via live DNS store (${res.source})`,
      },
    };
  },
});

// ── Helper: Vulnerable fetch (no defenses) ──
async function vulnerableFetch(targetUrl) {
  const logs = [];
  const startTime = Date.now();

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return {
      blocked: false,
      error: "Invalid URL",
      logs: [{ time: 0, event: "URL_PARSE", detail: "Failed to parse URL" }],
    };
  }

  logs.push({
    time: Date.now() - startTime,
    event: "INPUT_RECEIVED",
    detail: `Target URL: ${targetUrl}`,
  });

  // DNS resolution (simulated — no validation)
  const hostname = parsedUrl.hostname;
  let resolvedIP = hostname;

  // Map known hostnames
  if (hostname === "169.254.169.254") {
    resolvedIP = "169.254.169.254";
  } else if (hostname === "evil.com" || hostname === "attacker.com") {
    // DNS rebinding simulation: first call public, but we simulate it mapping to metadata
    resolvedIP = "169.254.169.254";
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    resolvedIP = "127.0.0.1";
  } else {
    // Try DNS store
    const dnsResult = dnsStore.resolveDomain(hostname);
    resolvedIP = dnsResult.ips?.[0] || hostname;
  }

  logs.push({
    time: Date.now() - startTime,
    event: "DNS_RESOLVED",
    detail: `${hostname} → ${resolvedIP}`,
  });

  logs.push({
    time: Date.now() - startTime,
    event: "IP_CHECK_SKIPPED",
    detail: "⚠️ Vulnerable mode — NO IP validation performed!",
  });

  // Rewrite 169.254.169.254 and 127.0.0.1 → localhost:PORT to hit our fake services
  let fetchUrl = targetUrl;
  if (
    hostname === "169.254.169.254" ||
    resolvedIP === "169.254.169.254" ||
    hostname === "evil.com" ||
    hostname === "attacker.com"
  ) {
    fetchUrl = targetUrl.replace(
      /https?:\/\/[^/]+/,
      `http://localhost:${PORT}`
    );
    logs.push({
      time: Date.now() - startTime,
      event: "URL_REWRITE",
      detail: `Rewrote to internal: ${fetchUrl}`,
    });
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Already points to localhost
    if (!parsedUrl.port) {
      fetchUrl = targetUrl.replace(
        /https?:\/\/[^/]+/,
        `http://localhost:${PORT}`
      );
    }
  }

  // Actually fetch from our local fake services
  logs.push({
    time: Date.now() - startTime,
    event: "FETCH_START",
    detail: `Fetching: ${fetchUrl}`,
  });

  try {
    const resp = await fetch(fetchUrl);
    const contentType = resp.headers.get("content-type") || "";
    let body;
    if (contentType.includes("json")) {
      body = await resp.json();
    } else {
      body = await resp.text();
    }

    logs.push({
      time: Date.now() - startTime,
      event: "FETCH_COMPLETE",
      detail: `Status: ${resp.status} | Content-Type: ${contentType}`,
    });

    // Check if we leaked sensitive data
    const leaked =
      typeof body === "object"
        ? JSON.stringify(body).includes("FAKE") ||
          JSON.stringify(body).includes("password") ||
          JSON.stringify(body).includes("secret") ||
          JSON.stringify(body).includes("AccessKey")
        : (body || "").includes("iam/") || (body || "").includes("security-credentials");

    logs.push({
      time: Date.now() - startTime,
      event: leaked ? "EXPLOIT_SUCCESS" : "FETCH_OK",
      detail: leaked
        ? "⚠️ SENSITIVE DATA EXPOSED — Exploit successful!"
        : "Response received (no sensitive data detected)",
    });

    return {
      blocked: false,
      inputUrl: targetUrl,
      resolvedDomain: hostname,
      resolvedIP,
      finalURL: fetchUrl,
      redirects: [],
      response: {
        status: resp.status,
        contentType,
        body,
      },
      leaked,
      logs,
    };
  } catch (err) {
    logs.push({
      time: Date.now() - startTime,
      event: "FETCH_ERROR",
      detail: `Error: ${err.message}`,
    });
    return {
      blocked: false,
      error: err.message,
      inputUrl: targetUrl,
      resolvedDomain: hostname,
      resolvedIP,
      finalURL: fetchUrl,
      logs,
    };
  }
}

// ── Helper: Protected fetch (full pipeline) ──
async function protectedFetch(targetUrl) {
  const logs = [];
  const startTime = Date.now();

  logs.push({
    time: Date.now() - startTime,
    event: "INPUT_RECEIVED",
    detail: `Target URL: ${targetUrl}`,
  });

  logs.push({
    time: Date.now() - startTime,
    event: "PIPELINE_START",
    detail: "Running full 13-layer SSRF defense pipeline...",
  });

  // Run through the real shield pipeline (no delay for attack demo)
  const result = await shield.scan(targetUrl, {}, { delayMs: 0 });

  // Convert pipeline steps to our log format
  for (const step of result.steps) {
    logs.push({
      time: Date.now() - startTime,
      event: step.status === "BLOCK" ? "BLOCKED" : "STEP_PASS",
      detail: `[${step.step}] ${step.status}${step.reason ? ": " + step.reason : ""}`,
    });
  }

  const blocked = result.status === "BLOCKED";

  if (blocked) {
    const blockStep = result.steps.find((s) => s.status === "BLOCK");
    logs.push({
      time: Date.now() - startTime,
      event: "ATTACK_BLOCKED",
      detail: `✅ Attack blocked at: ${blockStep?.step || "Unknown"} — ${blockStep?.reason || "N/A"}`,
    });

    return {
      blocked: true,
      inputUrl: targetUrl,
      resolvedDomain: new URL(targetUrl).hostname,
      resolvedIP: blockStep?.data?.ip || blockStep?.data?.resolvedIPs?.[0] || "N/A",
      finalURL: targetUrl,
      redirects: [],
      reason: blockStep?.reason || "Blocked by defense pipeline",
      blockStep: blockStep?.step || "Unknown",
      steps: result.steps,
      logs,
    };
  }

  // If somehow it passes (shouldn't for internal IPs)
  logs.push({
    time: Date.now() - startTime,
    event: "PIPELINE_PASS",
    detail: "Request passed all defense layers",
  });

  return {
    blocked: false,
    inputUrl: targetUrl,
    resolvedDomain: new URL(targetUrl).hostname,
    resolvedIP: "N/A",
    finalURL: targetUrl,
    redirects: [],
    steps: result.steps,
    logs,
  };
}

// ── Main Route ──
router.post("/attack-demo", async (req, res) => {
  const { targetUrl, mode } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: "targetUrl is required" });
  }
  if (!mode || !["vulnerable", "protected"].includes(mode)) {
    return res
      .status(400)
      .json({ error: 'mode must be "vulnerable" or "protected"' });
  }

  try {
    let result;
    if (mode === "vulnerable") {
      result = await vulnerableFetch(targetUrl);
    } else {
      result = await protectedFetch(targetUrl);
    }
    result.mode = mode;

    // Emit structured event
    if (result.leaked) {
      emitEvent({
        type: "EXPLOIT_SUCCESS",
        ip: req.ip || "unknown",
        url: targetUrl,
        severity: "critical",
        reason: `SSRF exploit succeeded in ${mode} mode — sensitive data exposed`,
        source: "simulator",
        data: { mode },
      });
    } else if (result.blocked) {
      emitEvent({
        type: "SSRF_BLOCKED",
        ip: req.ip || "unknown",
        url: targetUrl,
        severity: "high",
        reason: `Attack blocked at ${result.blockStep} in ${mode} mode`,
        source: "simulator",
        data: { mode, step: result.blockStep },
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Attack demo error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
