const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files direct root se serve honge
app.use(express.static(__dirname));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// In-memory creator session (Neutral default)
let currentCreatorSession = {
  name: "Creator",
  channelId: "@creator",
  platform: "YouTube",
  niche: "General",
  followers: "0",
  score: 50
};

// 1. DYNAMIC LOGIN API
app.post('/api/login', (req, res) => {
  const { name, channelId, platform, niche, followers } = req.body;
  if (name) currentCreatorSession.name = name;
  if (channelId) currentCreatorSession.channelId = channelId;
  if (platform) currentCreatorSession.platform = platform;
  if (niche) currentCreatorSession.niche = niche;
  if (followers) currentCreatorSession.followers = followers;

  console.log(`[Login] User Connected: ${currentCreatorSession.name} (${currentCreatorSession.channelId})`);
  res.json({ success: true, user: currentCreatorSession });
});

// 2. 24/7 AI TALENT MANAGER CHAT API
app.post('/api/ai-manager-chat', async (req, res) => {
  const { message, creatorContext } = req.body;
  const channel = creatorContext?.handle || currentCreatorSession.channelId || "@creator";
  const name = creatorContext?.name || currentCreatorSession.name || "Creator";
  const niche = creatorContext?.niche || currentCreatorSession.niche || "General";

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        reply: `[AI Manager for ${name}]: Tactical advice for ${channel}: Focus on high-retention 3s hooks and schedule your upload at 7:30 PM.`,
        suggestions: ["Write 3 viral hooks", "Draft brand deal pitch", "Repurpose for Instagram & X"]
      });
    }

    const prompt = `You are the 24/7 AI Talent Manager on CreatorOS AI managing ${name} (${channel}, Niche: ${niche}). Provide sharp, actionable creator advice for: "${message}"`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    res.json({ reply: response.text });
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    res.json({
      reply: `[AI Manager for ${name}]: Tactical advice for ${channel}: Focus on high-retention 3s hooks and schedule your upload at 7:30 PM.`
    });
  }
});

// Routes
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CreatorOS Server running on port ${PORT}`);
});
