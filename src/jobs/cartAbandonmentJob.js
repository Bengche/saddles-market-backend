const cron = require("node-cron");
const pool = require("../config/database");
const { sendEmail } = require("../utils/emailService");
const { cartAbandonmentTemplate } = require("../utils/emailTemplates");

const TRIGGERS = [
  { emailNumber: 1, hoursAfter: 24, subject: "You left something behind..." },
  {
    emailNumber: 2,
    hoursAfter: 72,
    subject: "Still thinking it over? Your saddle is waiting",
  },
  {
    emailNumber: 3,
    hoursAfter: 168,
    subject: "Last chance — your cart is about to expire",
  },
];

async function runCartAbandonmentJob() {
  try {
    for (const trigger of TRIGGERS) {
      const cutoff = new Date(
        Date.now() - trigger.hoursAfter * 60 * 60 * 1000,
      ).toISOString();
      const recent = new Date(
        Date.now() - (trigger.hoursAfter + 24) * 60 * 60 * 1000,
      ).toISOString();

      // Find users with cart items abandoned in the relevant time window
      // who haven't yet received this specific abandonment email
      const result = await pool.query(
        `SELECT DISTINCT u.id AS user_id, u.email, u.first_name,
                ci.updated_at AS cart_updated
         FROM cart_items ci
         JOIN users u ON u.id = ci.user_id
         WHERE ci.updated_at <= $1
           AND ci.updated_at >= $2
           AND u.email_verified = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM cart_abandonment_emails cae
             WHERE cae.user_id = u.id AND cae.email_number = $3
           )
           AND NOT EXISTS (
             SELECT 1 FROM orders o
             WHERE o.user_id = u.id AND o.created_at >= ci.updated_at
           )`,
        [cutoff, recent, trigger.emailNumber],
      );

      for (const row of result.rows) {
        // Grab the user's cart items for the email
        const cartItems = await pool.query(
          `SELECT ci.quantity, p.name, p.price, pi.url AS image_url
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
           WHERE ci.user_id = $1`,
          [row.user_id],
        );

        if (!cartItems.rows.length) continue;

        const htmlContent = cartAbandonmentTemplate({
          firstName: row.first_name,
          items: cartItems.rows,
          emailNumber: trigger.emailNumber,
        });

        const sent = await sendEmail({
          to: row.email,
          subject: trigger.subject,
          html: htmlContent,
        });

        if (sent) {
          await pool.query(
            `INSERT INTO cart_abandonment_emails (user_id, email_number)
             VALUES ($1, $2)
             ON CONFLICT (user_id, email_number) DO NOTHING`,
            [row.user_id, trigger.emailNumber],
          );
        }
      }
    }
  } catch (err) {
    console.error("[CartAbandonmentJob] Error:", err.message);
  }
}

function startCartAbandonmentJob() {
  // Run every day at 10:00 AM UTC
  cron.schedule("0 10 * * *", () => {
    console.log("[CartAbandonmentJob] Running...");
    runCartAbandonmentJob();
  });
  console.log("[CartAbandonmentJob] Scheduled (daily 10:00 UTC)");
}

module.exports = { startCartAbandonmentJob, runCartAbandonmentJob };
