module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { notes } = req.body || {};
  if (!notes || notes.trim().length < 15) return res.status(400).json({ error: "Notes too short" });

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
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a patient, encouraging tutor helping a student who is studying late at night and confused. Explain the following notes/text in plain, simple language, as if to someone hearing it for the first time. Use short sentences, everyday words, and a concrete example if it helps. Keep it under 180 words. Do not use markdown headers.\n\nNOTES:\n"""${notes}"""`
        }]
      })
    });
    const data = await response.json();
    const text = (data.content || []).find(c => c.type === "text")?.text || "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "AI request failed" });
  }
};
