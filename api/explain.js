const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];

async function tryModel(model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800 }
      })
    }
  );
  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || "";
  const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || data?.error?.message || "unknown";
  return { text, reason };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { notes } = req.body || {};
  if (!notes || notes.trim().length < 15) return res.status(400).json({ error: "Notes too short" });

  const prompt = `You are a patient, encouraging tutor helping a student who is studying late at night and confused. Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact format:\n{"topic": "a short 3-6 word title naming the specific topic", "explanation": "the explanation text"}\n\nFor the explanation: explain the following notes/text in plain, simple language, as if to someone hearing it for the first time. Use short sentences, everyday words, and a concrete example if it helps. Keep it under 180 words. Do not use markdown headers.\n\nNOTES:\n"""${notes}"""`;

  let lastReason = "unknown";
  try {
    for (const model of MODELS) {
      const { text: raw, reason } = await tryModel(model, prompt);
      if (raw) {
        try {
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.explanation) {
            return res.status(200).json({ text: parsed.explanation, topic: parsed.topic || "Untitled topic" });
          }
        } catch (parseErr) {
          lastReason = `${model}: got text but couldn't parse JSON`;
          continue;
        }
      }
      lastReason = `${model}: ${reason}`;
    }
    return res.status(200).json({ text: "", debug: `All models failed. Last: ${lastReason}` });
  } catch (e) {
    res.status(500).json({ error: "AI request failed", debug: String(e) });
  }
};
