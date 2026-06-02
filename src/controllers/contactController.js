const pool = require("../config/database");
const { sendEmail } = require("../utils/emailService");
const { contactAckTemplate } = require("../utils/emailTemplates");
const SITE_CONFIG = require("../config/siteConfig");

const sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, phone || null, subject, message, req.ip || null],
    );

    // Send acknowledgement to customer
    const ackEmail = contactAckTemplate({ name, subject, message });
    await sendEmail({ to: email, ...ackEmail });

    // Notify support team
    const escHtml = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    await sendEmail({
      to: SITE_CONFIG.contact.supportEmail,
      subject: `New Contact Message: ${subject}`,
      html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1C3557;">New Contact Message</h2>
        <p><strong>From:</strong> ${escHtml(name)} (${escHtml(email)})</p>
        ${phone ? `<p><strong>Phone:</strong> ${escHtml(phone)}</p>` : ""}
        <p><strong>Subject:</strong> ${escHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <div style="background:#F5EFE6;padding:16px;border-left:3px solid #C4A862;">${escHtml(message).replace(/\n/g, "<br/>")}</div>
        <p style="margin-top:16px;"><a href="mailto:${escHtml(email)}" style="background:#1C3557;color:#fff;padding:10px 20px;text-decoration:none;">Reply to ${escHtml(name)}</a></p>
      </div>`,
    });

    res.json({
      success: true,
      message: "Thank you for your message. We will respond within 24 hours.",
    });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "";
    if (unread === "true") whereClause = "WHERE is_read = FALSE";

    const count = await pool.query(
      `SELECT COUNT(*) FROM contact_messages ${whereClause}`,
    );
    const result = await pool.query(
      `SELECT * FROM contact_messages ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset],
    );

    res.json({
      success: true,
      data: {
        messages: result.rows,
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

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE contact_messages SET is_read = TRUE WHERE id = $1",
      [id],
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendContactMessage, getMessages, markRead };
