module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { notes } = req.body || {};
  if (!notes || notes.trim().length < 15) return res.status(400).json({ error: "Notes too short" });
 
  const prompt = `You are a patient, encouraging tutor helping a student who is studying late at night and confused. Explain the following notes/text in plain, simple language, as if to someone hearing it for the first time. Use short sentences, everyday words, and a concrete example if it helps. Keep it under 180 words. Do not use markdown headers.\n\nNOTES:\n"""${notes}"""`;
 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "AI request failed" });
  }
};
 
