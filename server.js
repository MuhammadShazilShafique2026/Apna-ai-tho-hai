
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    app: "Apna AI 2.0",
    status: "running",
    apiKeyConfigured: Boolean(apiKey)
  });
});

// AI text messaging
app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY .env file mein set karo."
      });
    }

    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message likho aur dobara try karo."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "model"].includes(item.role) &&
              typeof item.text === "string"
          )
          .slice(-20)
      : [];

    const contents = [
      ...safeHistory.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }]
      })),
      {
        role: "user",
        parts: [{ text: message.trim() }]
      }
    ];

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction:
          "You are Apna AI, a friendly and helpful assistant. Reply in the language the user uses, including Urdu, Roman Urdu, and English. Give clear and useful answers."
      }
    });

    res.json({
      reply: result.text || "Bhai, mujhe dobara pooch kar dekho."
    });
  } catch (error) {
    console.error("Chat error:", error.message);

    res.status(500).json({
      error: "AI response nahi mila. API key, model aur quota check karo."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Apna AI 2.0 running on port ${PORT}`);
});
