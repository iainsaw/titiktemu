const apiKey = "AQ.Ab8RN6J7kwoDYXWcQAxSfcdNiVWJ-hivBafkEg-1xi4dWEJH0A";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
const promptText = "Test rekomendasi 2 kalimat.";

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
