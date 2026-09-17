module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { notes, explanation } = req.body || {};
  if (!notes) return res.status(400).json({ error: "Missing notes" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Based on this material, write exactly 4 multiple-choice quiz questions to test understanding, from easy to harder. Respond ONLY with valid JSON, no markdown fences, no preamble. Format:\n[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"why":"one short sentence on why this is correct"}]\n\nMATERIAL:\n"""${notes}\n\n${explanation || ""}"""`
        }]
      })
    });
    const data = await response.json();
    let raw = (data.content || []).find(c => c.type === "text")?.text || "[]";
    raw = raw.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(raw);
    res.status(200).json({ quiz });
  } catch (e) {
    res.status(500).json({ error: "AI request failed" });
  }
};
