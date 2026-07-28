// CreatorOS AI — Backend Server
// Real AI script generation (Gemini) + MongoDB persistence

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
// SCHEMAS — data ab permanently save hoga, server restart pe delete nahi hoga
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
    contact: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const scriptSchema = new mongoose.Schema({
  email: { type: String, required: true },
  topic: String,
  script: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Script = mongoose.model("Script", scriptSchema);

// ---------------------------------------------
// HEALTH CHECK — Render deploy hua ya nahi, yeh URL khol ke check karo
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
    if (!email) return res.status(400).json({ error: "Email required" });

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ email });
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
    const { email, name, channel, platform, niche, style, contact } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOneAndUpdate(
      { email },
      {
        profile: { name, channel, platform, niche, style, contact },
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
// GET PROFILE — dashboard load hote hi profile dikhane ke liye
// ---------------------------------------------
app.get("/profile/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
});

// ---------------------------------------------
// GENERATE SCRIPT — real AI (Gemini) se, aur history DB me save hoti hai
// ---------------------------------------------
app.post("/generate", async (req, res) => {
  try {
    const { email, topic } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const user = await User.findOne({ email });
    if (!user || !user.profileCompleted) {
      return res.status(400).json({ error: "Profile not completed" });
    }

    const script = await generateScriptWithAI(topic, user.profile);

    await Script.create({ email, topic, script });

    res.json({ script });
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Script generation failed", details: err.message });
  }
});

// ---------------------------------------------
// GET SCRIPT HISTORY — user ke pehle generate kiye hue scripts dikhane ke liye
// ---------------------------------------------
app.get("/scripts/:email", async (req, res) => {
  try {
    const scripts = await Script.find({ email: req.params.email }).sort({ createdAt: -1 });
    res.json(scripts);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
});

// ---------------------------------------------
// REAL AI CALL — Gemini API
// Free API key yahan se milti hai: https://aistudio.google.com/app/apikey
// Render/Railway pe environment variable GEMINI_API_KEY set karna hoga
// ---------------------------------------------
async function generateScriptWithAI(topic, profile) {
  const { niche, style, channel, name, platform } = profile;

  const prompt = `You are CreatorOS AI, a professional content script writer.
Write a short-form video script (30-40 seconds) for a content creator with these details:
- Creator name: ${name || "Creator"}
- Channel: ${channel || "Not specified"}
- Platform: ${platform || "Not specified"}
- Niche: ${niche || "General"}
- Style/tone: ${style || "General"}
- Video topic: ${topic}

Structure the script clearly with these labeled sections:
[0-3s] HOOK — a strong attention-grabbing opening line
[3-25s] BODY — the main content, 3-4 short beats
[25-35s] CTA — a call to action matching the creator's channel

Keep it punchy, platform-appropriate, and written in the creator's style. Do not add any extra explanation outside the script.`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Fallback agar API key set nahi hai — taaki app crash na ho, testing ke liye
    return fallbackScript(topic, profile);
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

  if (!text) {
    return fallbackScript(topic, profile);
  }

  return text;
}

// ---------------------------------------------
// FALLBACK — agar AI key missing/fail ho jaye, tab bhi user ko kuch mile
// ---------------------------------------------
function fallbackScript(topic, profile) {
  const { niche, style, channel, name } = profile;
  return `🔥 CreatorOS AI — Script (offline mode)

CHANNEL: ${channel || "Your Channel"}
CREATOR: ${name || "Creator"}
NICHE: ${niche || "General"}
STYLE: ${style || "General"}

TOPIC: ${topic}

[0-3s] HOOK
${niche} fans, ${topic} ab trending hai — yeh dekhna zaroori hai!

[3-25s] BODY
Yeh content khaas ${niche} audience ke liye ${style} style me banaya gaya hai.
- Context dikhao: ${topic}
- Strongest visual/clip beech me daalo
- Reaction ya emotion ke saath connect karo

[25-35s] CTA
Follow ${channel || "this channel"} for more daily ${niche} content 💜

(Note: GEMINI_API_KEY set nahi hai abhi, isliye ye template script hai. Real AI ke liye .env me key add karo.)`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CreatorOS AI running on port ${PORT}`));
      
