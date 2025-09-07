// backend/index.js (OpenRouter with answers)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use(cors());
app.use(express.json());

// Function to extract JSON array safely
function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found");
  const jsonStr = text.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

app.post("/api/generate", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Missing 'topic'" });

  // Updated prompt to include answers
  const systemPrompt = `Generate exactly 10 multiple-choice questions in JSON format with the correct answer index:
[
  {
    "question": "string",
    "options": ["opt1","opt2","opt3","opt4"],
    "answer": 0  // index of correct option
  }
]
Topic: ${topic}
Do not add explanations or extra text. Only return a JSON array of 10 questions with the correct answer for each.`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates quizzes with correct answers." },
          { role: "user", content: systemPrompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        timeout: 180000,
      }
    );

    const content = response.data.choices[0].message.content;

    let questions;
    try {
      questions = extractJsonArray(content);
    } catch {
      questions = JSON.parse(content);
    }

    // Validate
    if (!Array.isArray(questions) || questions.length !== 10) {
      return res.status(500).json({
        error: "Invalid quiz format from model",
        raw: content,
      });
    }

    res.json({ questions });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "OpenRouter request failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
