const express = require("express");
const router = express.Router();
const {
  getAdminDashboard,
  getAdminStats,
  getAdminUsers,
  toggleUserActive,
  adminPatchUser,
  adminGetProducts,
  adminPatchProduct,
  adminDeleteProduct,
  adminPatchOrder,
  adminGetBlogPosts,
  adminCreateBlogPost,
  adminUpdateBlogPost,
  adminDeleteBlogPost,
  manageReviews,
  approveReview,
  manageCoupons,
  createCoupon,
  deleteCoupon,
  patchCoupon,
  getNewsletterSubscribers,
  broadcastNewsletter,
  getContactMessages,
  patchContactMessage,
  deleteContactMessage,
} = require("../controllers/adminController");
const { createProduct } = require("../controllers/productController");
const {
  adminGetOrders,
  adminUpdateOrderStatus,
} = require("../controllers/orderController");
const { adminOnly } = require("../middleware/admin");

// Dashboard
router.get("/dashboard", adminOnly, getAdminDashboard);
router.get("/stats", adminOnly, getAdminStats);

// Users
router.get("/users", adminOnly, getAdminUsers);
router.patch("/users/:id/toggle", adminOnly, toggleUserActive);
router.patch("/users/:id", adminOnly, adminPatchUser);

// Products
router.get("/products", adminOnly, adminGetProducts);
router.post("/products", adminOnly, createProduct);
router.patch("/products/:id", adminOnly, adminPatchProduct);
router.delete("/products/:id", adminOnly, adminDeleteProduct);

// Orders
router.get("/orders", adminOnly, adminGetOrders);
router.patch("/orders/:id/status", adminOnly, adminUpdateOrderStatus);
router.patch("/orders/:id", adminOnly, adminPatchOrder);

// Blog
router.get("/blog", adminOnly, adminGetBlogPosts);
router.post("/blog", adminOnly, adminCreateBlogPost);
router.put("/blog/:id", adminOnly, adminUpdateBlogPost);
router.patch("/blog/:id", adminOnly, adminUpdateBlogPost);
router.delete("/blog/:id", adminOnly, adminDeleteBlogPost);

// Reviews
router.get("/reviews", adminOnly, manageReviews);
router.patch("/reviews/:id", adminOnly, approveReview);

// Coupons
router.get("/coupons", adminOnly, manageCoupons);
router.post("/coupons", adminOnly, createCoupon);
router.patch("/coupons/:id", adminOnly, patchCoupon);
router.delete("/coupons/:id", adminOnly, deleteCoupon);

// Newsletter
router.get("/newsletter", adminOnly, getNewsletterSubscribers);
router.post("/newsletter/broadcast", adminOnly, broadcastNewsletter);

// Contact messages
router.get("/messages", adminOnly, getContactMessages);
router.patch("/messages/:id", adminOnly, patchContactMessage);
router.delete("/messages/:id", adminOnly, deleteContactMessage);

module.exports = router;
