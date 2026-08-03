import express, { text } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Menambahkan middleware CORS
app.use(cors());

// Middleware untuk membaca JSON body
app.use(express.json());

// Inisialisasi Gemini SDK
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Endpoint POST /api/chat
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: 'messages harus berupa array.',
            });
        }

        const contents = messages.map((msg) => ({
            role: msg.role,
            parts: [
                {
                    text: msg.text,
                },
            ],
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config: {
                temperature: 0.9,
                systemInstruction:
                    'Kamu adalah asisten AI yang ramah dan membantu.',
            },
        });

        res.json({
            status: 'success',
            reply: response.text,
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