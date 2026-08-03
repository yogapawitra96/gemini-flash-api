import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const conversations = new Map();

function normalizeMessage(msg) {
  return {
    role:
      msg.role === "assistant" || msg.role === "model" ? "assistant" : "user",
    text: String(msg.text ?? "").trim(),
  };
}

function normalizeMessages(messages = []) {
  return messages
    .filter(Boolean)
    .map(normalizeMessage)
    .filter((msg) => msg.text);
}

function mergeHistory(existingMessages = [], incomingMessages = []) {
  const existing = normalizeMessages(existingMessages);
  const incoming = normalizeMessages(incomingMessages);

  if (incoming.length === 0) return existing;
  if (existing.length === 0) return incoming;

  // Keep existing history and append only new user messages.
  const lastExisting = existing[existing.length - 1];
  const appended = incoming.filter(
    (msg, idx) => idx >= existing.length || msg.text !== existing[idx]?.text,
  );
  return [...existing, ...appended];
}

// Menambahkan middleware CORS
app.use(cors());

// Middleware untuk membaca JSON body
app.use(express.json());

// Inisialisasi Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Endpoint POST /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message harus berupa string.",
      });
    }

    const activeSessionId = sessionId || `session-${Date.now()}`;
    const rememberedMessages = conversations.get(activeSessionId) || [];
    const newMessage = normalizeMessage({ role: "user", text: message });
    const historyMessages = [...rememberedMessages, newMessage];

    const contents = historyMessages.map((msg) => ({
      role: msg.role,
      parts: [
        {
          text: msg.text,
        },
      ],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        temperature: 0.95,
        topP: 0.9,
        maxOutputTokens: 1024,
        systemInstruction:
          "Kamu adalah customer service travel agent yang ramah, profesional, dan membantu. Fokus pada kebutuhan pelanggan perjalanan seperti tiket, hotel, itinerary, kebijakan perjalanan, dan rekomendasi destinasi. Gunakan gaya bahasa yang santai, friendly, jelas, dan tidak kaku, namun tetap informatif dan terpercaya.",
      },
    });

    const rawText = response.text;
    const candidateText =
      response.candidates?.[0]?.content?.parts
        ?.filter((part) => part?.text)
        .map((part) => String(part.text))
        .join("") || "";
    const replyText =
      rawText || candidateText || "Maaf, saya tidak mendapatkan jawaban.";

    const updatedHistory = [
      ...historyMessages,
      { role: "model", text: replyText },
    ];
    conversations.set(activeSessionId, updatedHistory);

    res.json({
      status: "success",
      reply: replyText,
      sessionId: activeSessionId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
