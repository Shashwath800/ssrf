/**
 * Groq AI Route
 * Uses Groq's cloud LLM API to generate real-time explanations
 * of SSRF pipeline step results.
 */

const express = require("express");
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// POST /api/explain-step — Generate AI explanation for a pipeline step
router.post("/explain-step", async (req, res) => {
  const { step, status, reason, data, targetUrl, stepLogs } = req.body;

  if (!step) {
    return res.status(400).json({ error: "step is required" });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set in environment variables." });
  }

  const prompt = `You are an SSRF defense pipeline analyzer. A user scanned a URL through a 13-layer SSRF defense system. You must explain SPECIFICALLY what happened at this ONE layer for THIS specific scan. Do NOT give generic descriptions.

Scanned URL: "${targetUrl || 'unknown'}"
Defense Layer: "${step}"
Verdict: ${status}
${reason ? `Reason: ${reason}` : ""}
Raw Data: ${JSON.stringify(data, null, 2)}
${stepLogs?.length ? `Logs:\n${stepLogs.join("\n")}` : ""}

Rules:
- Reference the ACTUAL URL "${targetUrl}" and any specific IPs, ports, domains, or headers from the data above.
- If status is BLOCK, explain exactly WHY this specific URL was blocked at this layer (e.g. "The IP 169.254.169.254 is an AWS metadata endpoint which is blacklisted").
- If status is PASS, explain what was checked and why this specific URL passed (e.g. "The resolved IP 142.250.190.4 is a public Google IP, not in any private range").
- Do NOT describe what the layer does in general. ONLY explain what happened to THIS request.
- Keep it to 2-3 sentences. No markdown. Be direct.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Groq API request failed", details: errText });
    }

    const result = await response.json();
    const explanation = result.choices?.[0]?.message?.content?.trim();
    res.json({ explanation });
  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(502).json({ error: "Could not reach Groq API", details: err.message });
  }
});

module.exports = router;
