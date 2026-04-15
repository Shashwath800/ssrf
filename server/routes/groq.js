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
  const { step, status, reason, data } = req.body;

  if (!step) {
    return res.status(400).json({ error: "step is required" });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set in environment variables." });
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
