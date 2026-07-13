const express = require("express");
const router = express.Router();
const {
  getAdminDashboard,
  getAdminStats,
  getAdminUsers,
  toggleUserActive,
  adminPatchUser,
  adminGetProducts,
  adminGetProduct,
  adminPatchProduct,
  adminDeleteProduct,
  adminPatchOrder,
  adminGetBlogPosts,
  adminGetBlogPost,
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
router.get("/products/:id", adminOnly, adminGetProduct);
router.post("/products", adminOnly, createProduct);
router.patch("/products/:id", adminOnly, adminPatchProduct);
router.delete("/products/:id", adminOnly, adminDeleteProduct);

// Orders
router.get("/orders", adminOnly, adminGetOrders);
router.patch("/orders/:id/status", adminOnly, adminUpdateOrderStatus);
router.patch("/orders/:id", adminOnly, adminPatchOrder);

// Blog
router.get("/blog", adminOnly, adminGetBlogPosts);
router.get("/blog/:id", adminOnly, adminGetBlogPost);
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

// Email delivery test
router.post("/test-email", adminOnly, async (req, res) => {
  const { sendEmail } = require("../utils/emailService");
  const SITE_CONFIG = require("../config/siteConfig");
  const to = req.body.to || SITE_CONFIG.email.adminEmail;
  const result = await sendEmail({
    to,
    subject: `[Test] Saddles Market email delivery check — ${new Date().toISOString()}`,
    html: `<p>This is a test email sent from the Saddles Market admin panel.</p>
           <p><strong>From:</strong> ${SITE_CONFIG.email.fromEmail}</p>
           <p><strong>To:</strong> ${to}</p>
           <p><strong>ADMIN_EMAIL env:</strong> ${process.env.ADMIN_EMAIL || "(not set — using default)"}</p>
           <p>If you received this, SendGrid delivery is working correctly.</p>`,
  });
  console.log(`[TestEmail] to=${to} result=`, JSON.stringify(result));
  res.json({ to, result });
});

module.exports = router;
