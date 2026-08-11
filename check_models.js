require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Fetch models directly from Google's endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
    );
    const data = await response.json();

    if (data.error) {
      console.error("API Key / Project Error:", data.error);
      return;
    }

    console.log("=== YOUR AVAILABLE MODELS ===");
    data.models
      .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
      .forEach((m) => console.log(m.name.replace("models/", "")));
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
