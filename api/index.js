
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Apna AI" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel settings."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const conversation = history
      .filter(item => item && item.role && item.content)
      .map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.content) }]
      }));

    conversation.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
      contents: conversation,
      config: {
        systemInstruction:
          "You are Apna AI, a friendly and helpful assistant. Reply in the language the user uses, including Urdu, Roman Urdu, and English. Give clear and useful answers."
      }
    });

    res.json({
      reply: response.text || "Bhai, mujhe koi text response nahi mila."
    });
  } catch (error) {
    console.error("Apna AI error:", error.message);
    res.status(500).json({
      error: "AI response nahi mila. API key, model aur quota check karo."
    });
  }
});

export default app;
