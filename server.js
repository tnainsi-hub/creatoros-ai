// CreatorOS AI — Backend Server
// Login + Profile + Real AI content generation (Gemini) + MongoDB persistence

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ---------------------------------------------
// MONGODB CONNECTION
// ---------------------------------------------
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Database connected successfully! ✅"))
  .catch((err) => console.log("Connection failed:", err));

// ---------------------------------------------
// SCHEMAS
// ---------------------------------------------
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  profileCompleted: { type: Boolean, default: false },
  profile: {
    name: String,
    channel: String,
    platform: String,
    niche: String,
    style: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const contentSchema = new mongoose.Schema({
  email: { type: String, required: true },
  topic: String,
  platform: String,
  contentType: String,
  language: String,
  output: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Content = mongoose.model("Content", contentSchema);

// ---------------------------------------------
// HEALTH CHECK — Render deploy hua ya nahi, ye URL khol ke check karo
// ---------------------------------------------
app.get("/", (req, res) => {
  res.json({ status: "CreatorOS AI backend is running ✅" });
});

// ---------------------------------------------
// LOGIN — agar email pehli baar aaya toh naya user banta hai
// ---------------------------------------------
app.post("/login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: "Email required" });

    let user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      user = await User.create({ email: email.trim().toLowerCase() });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ---------------------------------------------
// SAVE PROFILE (ONBOARDING)
// ---------------------------------------------
app.post("/save-profile", async (req, res) => {
  try {
    const { email, name, channel, platform, niche, style } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      {
        profile: { name, channel, platform, niche, style },
        profileCompleted: true,
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found, login first" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Save failed", details: err.message });
  }
});

// ---------------------------------------------
// GET PROFILE — page reload hone par profile wapas load karne ke liye
// ---------------------------------------------
app.get("/profile/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
});

// ---------------------------------------------
// GENERATE — real AI (Gemini) se, profile ke context ke saath
// ---------------------------------------------
app.post("/generate", async (req, res) => {
  try {
    const { email, topic, platform, contentType, language } = req.body;

    if (!email) return res.status(400).json({ error: "Email required" });
    if (!topic || !topic.trim()) return res.status(400).json({ error: "Topic required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.profileCompleted) {
      return res.status(400).json({ error: "Profile not completed. Please set up your profile first." });
    }

    const output = await generateWithAI({ topic, platform, contentType, language, profile: user.profile });

    try {
      await Content.create({ email: user.email, topic, platform, contentType, language, output });
    } catch (dbErr) {
      console.log("History save skipped:", dbErr.message);
    }

    res.json({ output });
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Generation failed", details: err.message });
  }
});

// ---------------------------------------------
// SCRIPT HISTORY — user ke pehle generate kiye hue content dekhne ke liye
// ---------------------------------------------
app.get("/history/:email", async (req, res) => {
  try {
    const items = await Content.find({ email: req.params.email.trim().toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
});

// ---------------------------------------------
// REAL AI CALL — Gemini API
// Free key: https://aistudio.google.com/app/apikey
// ---------------------------------------------
async function generateWithAI({ topic, platform, contentType, language, profile }) {
  const { name, channel, niche, style } = profile || {};

  const prompt = `You are CreatorOS AI, a professional content generator for creators.

Creator details:
- Name: ${name || "Creator"}
- Channel: ${channel || "Not specified"}
- Niche: ${niche || "General"}
- Style/tone: ${style || "General"}

Create content with these details:
- Platform: ${platform || "YouTube"}
- Content type: ${contentType || "YouTube Shorts"}
- Language: ${language || "English"}
- Topic: ${topic}

Write the output in ${language || "English"}, matching the creator's niche and style. Structure it clearly with these sections:
🎬 SCRIPT — Hook (first 3 seconds), Main content (3-4 short beats), CTA (call to action)
📝 CAPTION — a ready-to-post caption for this platform
#️⃣ HASHTAGS — 5-8 relevant hashtags

Keep it punchy and platform-appropriate. Use plain text with clear line breaks, no markdown symbols like ** or ##.`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackOutput(topic, platform, contentType, profile);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return text || fallbackOutput(topic, platform, contentType, profile);
}

// ---------------------------------------------
// FALLBACK — agar AI key missing/fail ho jaye, tab bhi user ko kuch mile
// ---------------------------------------------
function fallbackOutput(topic, platform, contentType, profile) {
  const { channel, niche } = profile || {};
  return `🎬 SCRIPT (offline mode)

Hook: ${topic} ke baare mein ye jaanna zaroori hai!
Main Content: ${niche || "your niche"} audience ke liye ${contentType || "content"} format mein ${platform || "your platform"} ke liye ${topic} par based content.
CTA: Follow ${channel || "this channel"} for more ${niche || ""} content!

📝 CAPTION
${topic} — ye dekhna mat bhoolna! 🔥

#️⃣ HASHTAGS
#${(topic || "content").replace(/\s+/g, "")} #CreatorOS #ContentCreator

(Note: GEMINI_API_KEY set nahi hai ya response nahi mila, isliye ye template output hai.)`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CreatorOS AI running on port ${PORT}`));
        
