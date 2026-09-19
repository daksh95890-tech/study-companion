const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];

async function tryModel(model, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1500 }
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
  const { notes, explanation } = req.body || {};
  if (!notes) return res.status(400).json({ error: "Missing notes" });

  const prompt = `Based on this material, write exactly 4 multiple-choice quiz questions to test understanding, from easy to harder. Respond ONLY with valid JSON, no markdown fences, no preamble. Format:\n[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"why":"one short sentence on why this is correct"}]\n\nMATERIAL:\n"""${notes}\n\n${explanation || ""}"""`;

  let lastReason = "unknown";
  try {
    for (const model of MODELS) {
      const { text: raw, reason } = await tryModel(model, prompt);
      if (raw) {
        try {
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const quiz = JSON.parse(cleaned);
          return res.status(200).json({ quiz });
        } catch (parseErr) {
          lastReason = `${model}: got text but couldn't parse JSON`;
          continue;
        }
      }
      lastReason = `${model}: ${reason}`;
    }
    return res.status(200).json({ quiz: [], debug: `All models failed. Last: ${lastReason}` });
  } catch (e) {
    res.status(500).json({ error: "AI request failed", debug: String(e) });
  }
};