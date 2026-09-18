module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { notes, explanation } = req.body || {};
  if (!notes) return res.status(400).json({ error: "Missing notes" });
 
  const prompt = `Based on this material, write exactly 4 multiple-choice quiz questions to test understanding, from easy to harder. Respond ONLY with valid JSON, no markdown fences, no preamble. Format:\n[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"why":"one short sentence on why this is correct"}]\n\nMATERIAL:\n"""${notes}\n\n${explanation || ""}"""`;
 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );
    const data = await response.json();
    const candidate = data?.candidates?.[0];
    let raw = candidate?.content?.parts?.[0]?.text || "";
 
    if (!raw) {
      const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || data?.error?.message || "unknown";
      return res.status(200).json({ quiz: [], debug: `No text returned. Reason: ${reason}` });
    }
 
    raw = raw.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(raw);
    res.status(200).json({ quiz });
  } catch (e) {
    res.status(500).json({ error: "AI request failed", debug: String(e) });
  }
};
 
