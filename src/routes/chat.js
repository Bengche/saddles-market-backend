// src/routes/chat.js
const express = require("express");
const chatController = require("../controllers/chatController");

const router = express.Router();

if (typeof chatController.chat !== "function") {
  console.error(
    "CRITICAL ERROR: chatController.chat is not a function!",
    chatController,
  );
}

router.post("/", chatController.chat);

module.exports = router;
