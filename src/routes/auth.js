const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  register,
  verifyEmailOTP,
  verifyEmailToken,
  resendOTP,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const passwordValidation = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage("Password must include uppercase, lowercase, and a number");

router.post(
  "/register",
  [
    body("firstName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name required"),
    body("lastName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Last name required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    passwordValidation,
  ],
  register,
);

router.post("/verify-otp", verifyEmailOTP);
router.post("/verify-email-otp", verifyEmailOTP); // alias used by the frontend
router.get("/verify-email/:token", verifyEmailToken);
router.post("/resend-otp", resendOTP);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  login,
);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  forgotPassword,
);
router.post(
  "/reset-password",
  [body("token").notEmpty(), passwordValidation.optional()],
  resetPassword,
);

router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.put("/addresses/:id", protect, updateAddress);
router.delete("/addresses/:id", protect, deleteAddress);

module.exports = router;
