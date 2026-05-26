const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} = require("../controllers/cartController");
const { optionalAuth, protect } = require("../middleware/auth");

router.get("/", optionalAuth, getCart);
router.post("/add", optionalAuth, addToCart);
router.put("/item/:id", optionalAuth, updateCartItem);
router.delete("/item/:id", optionalAuth, removeFromCart);
router.delete("/clear", optionalAuth, clearCart);
router.post("/merge", protect, mergeCart);

module.exports = router;
