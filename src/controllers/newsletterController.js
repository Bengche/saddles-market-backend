const pool = require("../config/database");
const { generateToken } = require("../utils/generateOTP");
const { sendEmail, sendBulkEmail } = require("../utils/emailService");
const {
  newsletterConfirmTemplate,
  newsletterBroadcastTemplate,
} = require("../utils/emailTemplates");
const SITE_CONFIG = require("../config/siteConfig");

const subscribe = async (req, res, next) => {
  try {
    const { email, firstName } = req.body;

    const existing = await pool.query(
      "SELECT id, is_active FROM newsletter_subscribers WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existing.rows.length > 0 && existing.rows[0].is_active) {
      return res.json({
        success: true,
        message: "You are already subscribed!",
      });
    }

    const token = generateToken();

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE newsletter_subscribers SET is_active = TRUE, unsubscribed_at = NULL WHERE email = $1",
        [email.toLowerCase()],
      );
    } else {
      await pool.query(
        "INSERT INTO newsletter_subscribers (email, first_name, token) VALUES ($1, $2, $3)",
        [email.toLowerCase(), firstName || null, token],
      );
    }

    const confirmLink = `${process.env.FRONTEND_URL}/newsletter/confirm?token=${token}`;
    const unsubscribeLink = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${token}`;

    const emailData = newsletterConfirmTemplate({
      firstName: firstName || "Equestrian",
      confirmLink,
      unsubscribeLink,
    });
    await sendEmail({ to: email, ...emailData });

    res.json({
      success: true,
      message:
        "Thank you for subscribing! Please check your email to confirm your subscription.",
    });
  } catch (err) {
    next(err);
  }
};

const unsubscribe = async (req, res, next) => {
  try {
    const { token } = req.params;

    await pool.query(
      "UPDATE newsletter_subscribers SET is_active = FALSE, unsubscribed_at = NOW() WHERE token = $1",
      [token],
    );

    res.json({
      success: true,
      message: "You have been unsubscribed successfully.",
    });
  } catch (err) {
    next(err);
  }
};

const confirmSubscription = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE token = $1",
      [token],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found." });
    }

    await pool.query(
      "UPDATE newsletter_subscribers SET is_active = TRUE WHERE token = $1",
      [token],
    );

    res.json({
      success: true,
      message:
        "Subscription confirmed! Welcome to the Saddles Market newsletter.",
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Send newsletter campaign
const sendCampaign = async (req, res, next) => {
  try {
    const { subject, previewText, htmlContent } = req.body;

    // Get all active subscribers
    const subscribers = await pool.query(
      "SELECT ns.email, ns.first_name, ns.token FROM newsletter_subscribers ns WHERE ns.is_active = TRUE",
    );

    if (subscribers.rows.length === 0) {
      return res.json({
        success: true,
        message: "No active subscribers found.",
        sentTo: 0,
      });
    }

    // Save campaign record
    const campaign = await pool.query(
      `INSERT INTO newsletter_campaigns (subject, preview_text, html_content, sent_to_count, sent_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [subject, previewText, htmlContent, subscribers.rows.length],
    );

    // Send to each with personalized unsubscribe link
    const recipientsData = subscribers.rows.map((s) => ({
      email: s.email,
      first_name: s.first_name || "Valued Customer",
      unsubscribe_token: s.token,
    }));

    // Build personalized HTML for each recipient (simplified bulk send)
    for (const recipient of recipientsData) {
      const unsubscribeLink = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${recipient.unsubscribe_token}`;
      const personalizedHtml = htmlContent.replace(
        "{{first_name}}",
        recipient.first_name,
      );

      const emailData = newsletterBroadcastTemplate({
        subject,
        htmlContent: personalizedHtml,
        previewText,
        unsubscribeLink,
      });

      await sendEmail({ to: recipient.email, ...emailData });
    }

    res.json({
      success: true,
      message: `Campaign sent to ${subscribers.rows.length} subscribers.`,
      data: {
        campaignId: campaign.rows[0].id,
        sentTo: subscribers.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Get subscriber list
const getSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "";
    if (active === "true") whereClause = "WHERE is_active = TRUE";
    if (active === "false") whereClause = "WHERE is_active = FALSE";

    const count = await pool.query(
      `SELECT COUNT(*) FROM newsletter_subscribers ${whereClause}`,
    );
    const result = await pool.query(
      `SELECT * FROM newsletter_subscribers ${whereClause} ORDER BY subscribed_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset],
    );

    res.json({
      success: true,
      data: {
        subscribers: result.rows,
        pagination: {
          total: parseInt(count.rows[0].count),
          page: parseInt(page),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  confirmSubscription,
  sendCampaign,
  getSubscribers,
};
