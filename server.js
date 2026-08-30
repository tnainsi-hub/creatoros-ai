const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected successfully'))
    .catch(err => console.log('MongoDB Warning:', err.message));
}

// AI Studio API Route
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, type, language } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are Menezo Creator OS AI.
Task: ${type || 'Content Generation'}
Language: ${language || 'English'}
Prompt: ${prompt}

Format the response in clean Markdown with:
- 🎯 Hook (First 3 seconds)
- 📝 Script / Body
- 🎬 Visual & B-Roll Suggestions
- 🚀 Call to Action (CTA)
- 🏷️ Best 5 Hashtags`
    });

    res.json({ success: true, text: response.text });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ success: false, error: error.message || 'AI generation failed' });
  }
});

// Single Page Fallback (No 404 Crash)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Menezo live on port ${PORT}`));
