const sgMail = require('@sendgrid/mail');
const SITE_CONFIG = require('../config/siteConfig');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const msg = {
    to,
    from: {
      name: SITE_CONFIG.email.fromName,
      email: SITE_CONFIG.email.fromEmail,
    },
    replyTo: replyTo || SITE_CONFIG.email.replyTo,
    subject,
    html,
    text: text || subject,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent: "${subject}" to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('SendGrid error:', err.response?.body?.errors || err.message);
    // Don't throw — email failures should not crash the main operation
    return { success: false, error: err.message };
  }
};

const sendBulkEmail = async (recipients, subject, html, text) => {
  if (!recipients || recipients.length === 0) return;

  // SendGrid allows up to 1000 personalizations per request
  const batchSize = 1000;
  const results = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const personalizations = batch.map((r) => ({
      to: [{ email: r.email, name: r.name || r.email }],
      substitutions: {
        '{{unsubscribe_token}}': r.unsubscribe_token || '',
        '{{first_name}}': r.first_name || 'Valued Customer',
      },
    }));

    const msg = {
      from: {
        name: SITE_CONFIG.email.fromName,
        email: SITE_CONFIG.email.fromEmail,
      },
      subject,
      html,
      text: text || subject,
      personalizations,
    };

    try {
      await sgMail.send(msg);
      results.push({ success: true, count: batch.length });
    } catch (err) {
      console.error('Bulk email error:', err.message);
      results.push({ success: false, error: err.message });
    }
  }

  return results;
};

module.exports = { sendEmail, sendBulkEmail };
