/**
 * Ollama AI Route
 * Proxies requests to a local Ollama instance to generate
 * human-readable explanations of SSRF pipeline step results.
 */

const express = require("express");
const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

// POST /api/explain-step — Generate AI explanation for a pipeline step
router.post("/explain-step", async (req, res) => {
  const { step, status, reason, data } = req.body;

  if (!step) {
    return res.status(400).json({ error: "step is required" });
  }

  const prompt = `You are an SSRF (Server-Side Request Forgery) cybersecurity expert explaining a defense pipeline layer result to a student.

Layer: "${step}"
Result: ${status}
${reason ? `Block Reason: ${reason}` : ""}
Technical Data: ${JSON.stringify(data, null, 2)}

In 2-3 concise sentences, explain:
1. What this defense layer does
2. Why it ${status === "BLOCK" ? "blocked the request" : "allowed the request to pass"}
3. What this means for the security of the system

Be specific about the actual values shown in the data. Use simple language. Do not use markdown formatting.`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Ollama request failed", details: errText });
    }

    const result = await response.json();
    res.json({ explanation: result.response.trim() });
  } catch (err) {
    console.error("Ollama error:", err.message);
    res.status(502).json({ error: "Could not reach Ollama", details: err.message });
  }
});

module.exports = router;
