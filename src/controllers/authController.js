const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const pool = require("../config/database");
const {
  generateOTP,
  generateToken,
  getOTPExpiry,
  getTokenExpiry,
} = require("../utils/generateOTP");
const { sendEmail } = require("../utils/emailService");
const {
  emailVerificationTemplate,
  welcomeEmailTemplate,
  passwordResetTemplate,
} = require("../utils/emailTemplates");
const SITE_CONFIG = require("../config/siteConfig");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      newsletterOptIn = false,
    } = req.body;

    // Check for existing user
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, newsletter_opted_in)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email`,
      [firstName, lastName, email.toLowerCase(), passwordHash, newsletterOptIn],
    );

    const user = result.rows[0];

    // Create OTP and verification token
    const otp = generateOTP();
    const token = generateToken();
    const expiresAt = getOTPExpiry(15);

    await pool.query(
      `INSERT INTO email_verifications (user_id, otp_code, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, otp, token, expiresAt],
    );

    // Subscribe to newsletter if opted in
    if (newsletterOptIn) {
      const subToken = generateToken();
      await pool.query(
        `INSERT INTO newsletter_subscribers (email, first_name, user_id, token)
         VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        [email.toLowerCase(), firstName, user.id, subToken],
      );
    }

    // Send verification email
    const verifyLink = `${process.env.FRONTEND_URL}/account/verify-email?token=${token}`;
    const emailData = emailVerificationTemplate({
      firstName,
      otpCode: otp,
      verifyLink,
      expiresMinutes: 15,
    });
    await sendEmail({ to: email, ...emailData });

    res.status(201).json({
      success: true,
      message:
        "Account created! Please check your email for a verification code.",
      data: { userId: user.id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Email via OTP ──────────────────────────────────────────────────────
const verifyEmailOTP = async (req, res, next) => {
  try {
    const { userId, otpCode } = req.body;

    const result = await pool.query(
      `SELECT * FROM email_verifications
       WHERE user_id = $1 AND otp_code = $2 AND is_used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otpCode],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    const verification = result.rows[0];

    await pool.query(
      "UPDATE email_verifications SET is_used = TRUE WHERE id = $1",
      [verification.id],
    );
    await pool.query(
      "UPDATE users SET is_email_verified = TRUE WHERE id = $1",
      [userId],
    );

    // Get user info for welcome email
    const userResult = await pool.query(
      "SELECT first_name, email FROM users WHERE id = $1",
      [userId],
    );
    const user = userResult.rows[0];

    if (user) {
      const welcomeData = welcomeEmailTemplate({ firstName: user.first_name });
      await sendEmail({ to: user.email, ...welcomeData });
    }

    const token = signToken(userId);

    res.json({
      success: true,
      message: "Email verified successfully! Welcome to Saddles Market.",
      data: { token },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Email via Token Link ──────────────────────────────────────────────
const verifyEmailToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT ev.*, u.first_name, u.email FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.is_used = FALSE AND ev.expires_at > NOW()`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    const verification = result.rows[0];

    await pool.query(
      "UPDATE email_verifications SET is_used = TRUE WHERE id = $1",
      [verification.id],
    );
    await pool.query(
      "UPDATE users SET is_email_verified = TRUE WHERE id = $1",
      [verification.user_id],
    );

    const welcomeData = welcomeEmailTemplate({
      firstName: verification.first_name,
    });
    await sendEmail({ to: verification.email, ...welcomeData });

    const jwtToken = signToken(verification.user_id);

    res.json({
      success: true,
      message: "Email verified! Welcome to Saddles Market.",
      data: { token: jwtToken },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Resend OTP ────────────────────────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const userResult = await pool.query(
      "SELECT id, first_name, email, is_email_verified FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const user = userResult.rows[0];

    if (user.is_email_verified) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already verified." });
    }

    // Invalidate existing OTPs
    await pool.query(
      "UPDATE email_verifications SET is_used = TRUE WHERE user_id = $1 AND is_used = FALSE",
      [userId],
    );

    const otp = generateOTP();
    const token = generateToken();
    const expiresAt = getOTPExpiry(15);

    await pool.query(
      `INSERT INTO email_verifications (user_id, otp_code, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, otp, token, expiresAt],
    );

    const verifyLink = `${process.env.FRONTEND_URL}/account/verify-email?token=${token}`;
    const emailData = emailVerificationTemplate({
      firstName: user.first_name,
      otpCode: otp,
      verifyLink,
    });
    await sendEmail({ to: user.email, ...emailData });

    res.json({
      success: true,
      message: "Verification code resent successfully.",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, role,
              is_email_verified, is_active, avatar_url
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        data: { userId: user.id },
      });
    }

    // Update last login
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    const token = signToken(user.id);

    res.json({
      success: true,
      message: "Welcome back!",
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Current User ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, phone, avatar_url,
              is_email_verified, newsletter_opted_in, created_at
       FROM users WHERE id = $1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const user = result.rows[0];

    // Get addresses
    const addresses = await pool.query(
      "SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
      [user.id],
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          isEmailVerified: user.is_email_verified,
          newsletterOptedIn: user.newsletter_opted_in,
          createdAt: user.created_at,
          addresses: addresses.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    await pool.query(
      "UPDATE users SET first_name = $1, last_name = $2, phone = $3 WHERE id = $4",
      [firstName, lastName, phone || null, req.user.id],
    );

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    next(err);
  }
};

// ─── Change Password ───────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id],
    );

    const isMatch = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash,
    );
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newHash,
      req.user.id,
    ]);

    res.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
};

// ─── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id, first_name FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message:
          "If that email is registered, you will receive a password reset link shortly.",
      });
    }

    const user = result.rows[0];
    const token = generateToken();
    const expiresAt = getTokenExpiry(1);

    // Invalidate existing tokens
    await pool.query(
      "UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = $1",
      [user.id],
    );

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt],
    );

    const resetLink = `${process.env.FRONTEND_URL}/account/reset-password?token=${token}`;
    const emailData = passwordResetTemplate({
      firstName: user.first_name,
      resetLink,
      expiresHours: 1,
    });
    await sendEmail({ to: email, ...emailData });

    res.json({
      success: true,
      message:
        "If that email is registered, you will receive a password reset link shortly.",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const result = await pool.query(
      `SELECT prt.*, u.email FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1 AND prt.is_used = FALSE AND prt.expires_at > NOW()`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
      });
    }

    const reset = result.rows[0];
    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newHash,
      reset.user_id,
    ]);
    await pool.query(
      "UPDATE password_reset_tokens SET is_used = TRUE WHERE id = $1",
      [reset.id],
    );

    res.json({
      success: true,
      message: "Password reset successfully. You may now log in.",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Address Management ────────────────────────────────────────────────────────
const addAddress = async (req, res, next) => {
  try {
    const {
      label,
      firstName,
      lastName,
      company,
      streetLine1,
      streetLine2,
      city,
      state,
      zip,
      country,
      phone,
      isDefault,
    } = req.body;

    if (isDefault) {
      await pool.query(
        "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
        [req.user.id],
      );
    }

    const result = await pool.query(
      `INSERT INTO user_addresses (user_id, label, first_name, last_name, company, street_line1, street_line2, city, state, zip, country, phone, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        req.user.id,
        label || "Home",
        firstName,
        lastName,
        company,
        streetLine1,
        streetLine2,
        city,
        state,
        zip,
        country || "United States",
        phone,
        isDefault || false,
      ],
    );

    res.status(201).json({ success: true, data: { address: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2",
      [id, req.user.id],
    );
    res.json({ success: true, message: "Address removed." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
  deleteAddress,
};
