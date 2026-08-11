const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { chat } = require("../controllers/chatController");

const router = express.Router();

// Stricter rate limit for AI endpoint to control Gemini API costs
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many messages. Please wait a moment before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", chatLimiter, chat);

module.exports = router;
