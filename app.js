// CreatorOS Global JavaScript
// Profile setup + AI Studio generate — dono ko real backend se jodta hai

document.addEventListener("DOMContentLoaded", () => {
  const profileCard = document.getElementById("profileCard");
  const generateCard = document.getElementById("generateCard");
  const outputCard = document.getElementById("outputCard");
  const profileBadge = document.getElementById("profileBadge");
  const profileBadgeText = document.getElementById("profileBadgeText");

  // Agar ye elements page pe nahi hain, matlab ye AI Studio page nahi hai — skip karo
  if (!profileCard) return;

  const emailInput = document.getElementById("emailInput");
  const nameInput = document.getElementById("nameInput");
  const channelInput = document.getElementById("channelInput");
  const profilePlatformSelect = document.getElementById("profilePlatformSelect");
  const nicheInput = document.getElementById("nicheInput");
  const styleInput = document.getElementById("styleInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileError = document.getElementById("profileError");
  const editProfileBtn = document.getElementById("editProfileBtn");

  const generateBtn = document.getElementById("generateBtn");
  const topicInput = document.getElementById("topicInput");
  const platformSelect = document.getElementById("platformSelect");
  const contentTypeSelect = document.getElementById("contentTypeSelect");
  const languageSelect = document.getElementById("languageSelect");
  const outputBox = document.getElementById("outputBox");

  // ---------------------------------------------
  // PAGE LOAD — agar email save hai to seedha profile check karo
  // ---------------------------------------------
  const savedEmail = localStorage.getItem("creatoros_email");
  if (savedEmail) {
    checkExistingProfile(savedEmail);
  }

  async function checkExistingProfile(email) {
    try {
      const res = await fetch(`/profile/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("not found");
      const user = await res.json();

      if (user.profileCompleted) {
        showGenerateView(user);
      }
    } catch (err) {
      // User nahi mila — profile form dikhta rahega, koi error nahi dikhana
      console.log("No existing profile found, showing setup form.");
    }
  }

  function showGenerateView(user) {
    profileCard.classList.add("hidden");
    generateCard.classList.remove("hidden");
    outputCard.classList.remove("hidden");
    profileBadge.classList.remove("hidden");
    profileBadgeText.textContent = `👋 ${user.profile?.name || user.email} • ${user.profile?.niche || "Creator"}`;
  }

  // ---------------------------------------------
  // SAVE PROFILE
  // ---------------------------------------------
  saveProfileBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const channel = channelInput.value.trim();
    const platform = profilePlatformSelect.value;
    const niche = nicheInput.value.trim();
    const style = styleInput.value.trim();

    profileError.textContent = "";

    if (!email || !email.includes("@")) {
      profileError.textContent = "⚠️ Please enter a valid email.";
      return;
    }
    if (!name || !niche) {
      profileError.textContent = "⚠️ Name aur Niche zaroori hai.";
      return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";

    try {
      // Step 1: login (naya user banega agar pehli baar hai)
      await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Step 2: profile save
      const res = await fetch("/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, channel, platform, niche, style }),
      });

      const data = await res.json();

      if (!res.ok) {
        profileError.textContent = `❌ ${data.error || "Kuch galat ho gaya."}`;
        return;
      }

      localStorage.setItem("creatoros_email", email);
      showGenerateView(data.user);
    } catch (err) {
      profileError.textContent = "❌ Server se connect nahi ho pa raha.";
      console.error("Profile save failed:", err);
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = "Save Profile & Continue";
    }
  });

  // ---------------------------------------------
  // EDIT PROFILE — wapas form dikhane ke liye
  // ---------------------------------------------
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      generateCard.classList.add("hidden");
      outputCard.classList.add("hidden");
      profileBadge.classList.add("hidden");
      profileCard.classList.remove("hidden");
    });
  }

  // ---------------------------------------------
  // GENERATE CONTENT
  // ---------------------------------------------
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const email = localStorage.getItem("creatoros_email");
      const topic = topicInput.value.trim();

      if (!email) {
        outputBox.innerHTML = "⚠️ Pehle profile set up karo.";
        return;
      }
      if (!topic) {
        outputBox.innerHTML = "⚠️ Pehle ek topic likho.";
        return;
      }

      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
      outputBox.innerHTML = "⏳ AI content generate kar rahi hai...";

      try {
        const response = await fetch("/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            topic,
            platform: platformSelect.value,
            contentType: contentTypeSelect.value,
            language: languageSelect.value,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          outputBox.innerHTML = `❌ ${data.error || "Kuch galat ho gaya, dobara try karo."}`;
          return;
        }

        outputBox.innerHTML = data.output.replace(/\n/g, "<br>");
      } catch (err) {
        outputBox.innerHTML = "❌ Server se connect nahi ho pa raha. Thodi der baad try karo.";
        console.error("Generate request failed:", err);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Content";
      }
    });
  }
});
// CreatorOS Global JavaScript
