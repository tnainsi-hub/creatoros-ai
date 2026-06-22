const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ---- TEMPORARY IN-MEMORY DB ----
// Phase 2 me ye MongoDB se replace hoga. Abhi server restart hone par data delete ho jayega — yeh normal hai is phase ke liye.
let users = [];

/**
 * HEALTH CHECK — Render deploy hua ya nahi, yeh URL khol ke check kar sakti ho
 */
app.get("/", (req, res) => {
  res.json({ status: "CreatorOS AI v2 backend is running ✅" });
});

/**
 * LOGIN — agar email pehli baar aaya toh naya user banta hai
 */
app.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  let user = users.find(u => u.email === email);

  if (!user) {
    user = { email, profileCompleted: false, profile: null };
    users.push(user);
  }

  res.json(user);
});

/**
 * SAVE PROFILE (ONBOARDING)
 */
app.post("/save-profile", (req, res) => {
  const { email, name, channel, platform, niche, style, contact } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  let user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found, login first" });

  user.profile = { name, channel, platform, niche, style, contact };
  user.profileCompleted = true;

  res.json({ success: true, user });
});

/**
 * GET PROFILE — dashboard load hote hi profile dikhane ke liye
 */
app.get("/profile/:email", (req, res) => {
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

/**
 * GENERATE SCRIPT — Phase 1 me simple template-based, Phase 3 me real AI se replace hoga
 */
app.post("/generate", (req, res) => {
  const { email, topic } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !user.profile) {
    return res.status(400).json({ error: "Profile not completed" });
  }
  if (!topic) {
    return res.status(400).json({ error: "Topic required" });
  }

  const script = generateScript(topic, user.profile);
  res.json({ script });
});

function generateScript(topic, profile) {
  const { niche, style, channel, name } = profile;

  return `🔥 CreatorOS AI — Personalized Script

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
Follow ${channel || "this channel"} for more daily ${niche} content 💜`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CreatorOS v2 running on port ${PORT}`));
