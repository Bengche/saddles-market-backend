const SITE_CONFIG = require("../config/siteConfig");

const { name, url, contact, address } = SITE_CONFIG;

// ─── Base email wrapper ────────────────────────────────────────────────────────
const baseTemplate = (content, previewText = "") => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${name}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #F5EFE6; font-family: Georgia, 'Times New Roman', serif; color: #1A1A1A; -webkit-text-size-adjust: 100%; }
    .email-wrapper { width: 100%; background-color: #F5EFE6; padding: 32px 16px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 16px rgba(28,53,87,0.08); }
    .email-header { background-color: #1C3557; padding: 36px 40px; text-align: center; }
    .email-header-logo { color: #C4A862; font-size: 26px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; font-weight: 400; }
    .email-header-tagline { color: #8BA8CC; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
    .email-body { padding: 48px 40px; }
    .email-greeting { font-size: 22px; color: #1C3557; margin-bottom: 16px; font-weight: 400; }
    .email-text { font-size: 15px; line-height: 1.8; color: #3A3A3A; margin-bottom: 20px; font-family: Georgia, serif; }
    .email-cta-wrapper { text-align: center; margin: 36px 0; }
    .email-cta { display: inline-block; background-color: #1C3557; color: #FFFFFF !important; text-decoration: none; padding: 16px 40px; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif; border-radius: 2px; }
    .email-cta:hover { background-color: #2A4A72; }
    .email-divider { border: none; border-top: 1px solid #E8E0D0; margin: 32px 0; }
    .email-info-box { background-color: #F5EFE6; border-left: 3px solid #C4A862; padding: 20px 24px; margin: 24px 0; border-radius: 0 2px 2px 0; }
    .email-info-box p { font-size: 14px; color: #3A3A3A; line-height: 1.7; }
    .email-info-box strong { color: #1C3557; }
    .email-otp { text-align: center; margin: 32px 0; padding: 28px; background-color: #1C3557; border-radius: 4px; }
    .email-otp-code { font-size: 42px; letter-spacing: 12px; color: #C4A862; font-family: 'Courier New', monospace; font-weight: 700; }
    .email-otp-label { color: #8BA8CC; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
    .order-summary { border: 1px solid #E8E0D0; border-radius: 2px; overflow: hidden; margin: 24px 0; }
    .order-summary-header { background-color: #1C3557; color: #FFFFFF; padding: 12px 20px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    .order-totals { padding: 4px 20px 16px; background-color: #FAFAF7; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 2px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .status-pending { background-color: #FFF3CD; color: #856404; }
    .status-paid { background-color: #D4EDDA; color: #155724; }
    .status-shipped { background-color: #CCE5FF; color: #004085; }
    .status-cancelled { background-color: #F8D7DA; color: #721C24; }
    .next-steps { margin: 24px 0; }
    .next-step { padding: 14px 20px; border-bottom: 1px solid #E8E0D0; display: flex; align-items: flex-start; gap: 16px; }
    .next-step:last-child { border-bottom: none; }
    .next-step-num { background: #C4A862; color: #fff; width: 26px; height: 26px; border-radius: 50%; font-size: 13px; text-align: center; line-height: 26px; flex-shrink: 0; }
    .next-step-text { font-size: 14px; color: #3A3A3A; line-height: 1.6; }
    .email-footer { background-color: #1C3557; padding: 32px 40px; text-align: center; }
    .email-footer p { color: #8BA8CC; font-size: 12px; line-height: 1.7; margin-bottom: 6px; }
    .email-footer a { color: #C4A862; text-decoration: none; }
    .email-footer .social-links { margin: 16px 0; }
    .email-footer .social-links a { display: inline-block; margin: 0 8px; color: #C4A862; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    @media only screen and (max-width: 620px) {
      .email-body { padding: 32px 20px !important; }
      .email-header { padding: 28px 20px !important; }
      .email-footer { padding: 24px 20px !important; }
      .email-otp-code { font-size: 32px !important; letter-spacing: 8px !important; }
      .email-cta { padding: 14px 24px !important; font-size: 13px !important; display: block !important; }
      .next-step { flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ""}
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <div class="email-header-logo">${name}</div>
        <div class="email-header-tagline">Premium Horse Saddles</div>
      </div>
      <div class="email-body">
        ${content}
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</p>
        <p>${address.full}</p>
        <p>
          <a href="tel:${contact.phone}">${contact.phoneDisplay || contact.phone}</a> &nbsp;|&nbsp;
          <a href="mailto:${contact.supportEmail}">${contact.supportEmail}</a>
        </p>
        <div class="social-links">
          <a href="${url}/privacy-policy">Privacy Policy</a> &nbsp;|&nbsp;
          <a href="${url}/terms-conditions">Terms</a> &nbsp;|&nbsp;
          <a href="${url}/contact">Contact Us</a>
        </div>
        <p style="margin-top:12px;color:#5A7A9A;font-size:11px;">
          You received this email because you have an account or placed an order with ${name}.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ─── Email Verification (OTP) ─────────────────────────────────────────────────
const emailVerificationTemplate = ({
  firstName,
  otpCode,
  verifyLink,
  expiresMinutes = 15,
}) => ({
  subject: `Verify Your Email — ${name}`,
  html: baseTemplate(
    `
    <p class="email-greeting">Welcome to ${name}, ${firstName}.</p>
    <p class="email-text">Thank you for creating your account. To complete your registration, please verify your email address using the 6-digit code below or by clicking the verification link.</p>

    <div class="email-otp">
      <div class="email-otp-code">${otpCode}</div>
      <div class="email-otp-label">Email Verification Code</div>
    </div>

    <p class="email-text" style="text-align:center;font-size:13px;color:#6A6A6A;">This code expires in ${expiresMinutes} minutes.</p>

    <div class="email-cta-wrapper">
      <a href="${verifyLink}" class="email-cta">Verify My Email</a>
    </div>

    <hr class="email-divider" />

    <div class="email-info-box">
      <p>If you did not create an account with ${name}, you can safely ignore this email. No account will be created without email verification.</p>
    </div>

    <p class="email-text" style="font-size:13px;color:#6A6A6A;">Or copy and paste this link into your browser:<br/><a href="${verifyLink}" style="color:#1C3557;word-break:break-all;">${verifyLink}</a></p>
    `,
    `Your ${name} verification code is: ${otpCode}`,
  ),
});

// ─── Welcome Email ────────────────────────────────────────────────────────────
const welcomeEmailTemplate = ({ firstName }) => ({
  subject: `Welcome to ${name}, ${firstName} — Your Account is Ready`,
  html: baseTemplate(
    `
    <p class="email-greeting">Welcome, ${firstName}.</p>
    <p class="email-text">Your email is verified and your account is fully active. You now have access to our complete collection of premium Western, English, dressage, and trail saddles — each hand-selected for quality, fit, and performance.</p>

    <div class="email-info-box" style="border-left-color:#1C3557;background:#EEF3F9;">
      <p style="font-size:15px;color:#1C3557;"><strong>30-Day Free Trial on Every Saddle</strong><br/>
      <span style="font-size:14px;color:#3A3A3A;line-height:1.7;">Every saddle we carry comes with a 30-day trial guarantee. Ride in it, assess the fit, and if it is not right — for any reason — we will refund or exchange it completely. No risk, no questions.</span></p>
    </div>

    <div class="email-cta-wrapper">
      <a href="${url}/products" class="email-cta">Browse Our Collection</a>
    </div>

    <hr class="email-divider" />

    <p class="email-text" style="font-weight:bold;color:#1C3557;margin-bottom:12px;">What Your Account Includes</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E8E0D0;border-radius:2px;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E8E0D0;font-size:14px;color:#3A3A3A;line-height:1.6;">
          <strong style="color:#1C3557;">Wishlist</strong> — Save saddles to revisit later or share with your trainer for a second opinion.
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E8E0D0;font-size:14px;color:#3A3A3A;line-height:1.6;">
          <strong style="color:#1C3557;">Order Tracking</strong> — Follow every stage from placement through delivery in your account dashboard.
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;font-size:14px;color:#3A3A3A;line-height:1.6;">
          <strong style="color:#1C3557;">Expert Advice</strong> — Our team of equestrians is available to help you find the right saddle for your horse and discipline.
        </td>
      </tr>
    </table>

    <hr class="email-divider" />

    <p class="email-text">Reach us any time:</p>
    <p class="email-text">
      <strong>Email:</strong> <a href="mailto:${contact.supportEmail}" style="color:#1C3557;">${contact.supportEmail}</a><br/>
      <strong>Phone:</strong> <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a><br/>
      <strong>WhatsApp:</strong> <a href="${contact.whatsappLink}" style="color:#1C3557;">${contact.whatsappDisplay || contact.whatsapp}</a>
    </p>
    `,
    `Welcome to ${name} — your account is ready.`,
  ),
});

// ─── Order Confirmation (Customer) ────────────────────────────────────────────
const orderConfirmationTemplate = ({ firstName, order, items, customerEmail }) => {
  const itemsHtml = items
    .map(
      (item) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #E8E0D0;">
      <tr>
        <td style="padding:14px 20px;">
          <div style="font-size:15px;color:#1C3557;">${item.product_name}</div>
          <div style="font-size:13px;color:#6A6A6A;margin-top:3px;">
            Qty: ${item.quantity}${item.seat_size ? ` &bull; Seat: ${item.seat_size}"` : ""}${item.selected_color ? ` &bull; ${item.selected_color}` : ""}${item.selected_tree_size ? ` &bull; Tree: ${item.selected_tree_size}` : ""} &bull; $${parseFloat(item.price).toFixed(2)} each
          </div>
        </td>
        <td style="padding:14px 20px;text-align:right;white-space:nowrap;font-size:15px;color:#1C3557;vertical-align:top;">
          $${parseFloat(item.total).toFixed(2)}
        </td>
      </tr>
    </table>`,
    )
    .join("");

  const displayEmail = customerEmail || order.guest_email || "";

  return {
    subject: `Order Confirmed \u2014 ${order.order_number} | ${name}`,
    html: baseTemplate(
      `
    <p class="email-greeting">Thank you, ${firstName}.</p>
    <p class="email-text">Your order has been received and is now in review. You will hear from our team within <strong>24 hours</strong> to confirm payment details and shipping.</p>

    <div class="email-info-box">
      <p>
        <strong>Order Number:</strong> ${order.order_number}<br/>
        <strong>Status:</strong> <span class="status-badge status-pending">Pending Review</span><br/>
        <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <div class="order-summary">
      <div class="order-summary-header">Order Summary</div>
      ${itemsHtml}
      <div class="order-totals">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:10px 0 4px;font-size:14px;color:#3A3A3A;">Subtotal</td><td style="padding:10px 0 4px;text-align:right;font-size:14px;color:#3A3A3A;">$${parseFloat(order.subtotal).toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#3A3A3A;">Shipping</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#3A3A3A;">${parseFloat(order.shipping_cost) === 0 ? "Free" : "$" + parseFloat(order.shipping_cost).toFixed(2)}</td></tr>
          ${order.discount_amount > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:#3A3A3A;">Discount</td><td style="padding:4px 0;text-align:right;font-size:14px;color:#2D7A4F;">-$${parseFloat(order.discount_amount).toFixed(2)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:10px 0 4px;border-top:1px solid #E8E0D0;"></td></tr>
          <tr><td style="padding:4px 0;font-size:17px;color:#1C3557;font-weight:bold;">Total</td><td style="padding:4px 0;text-align:right;font-size:17px;color:#1C3557;font-weight:bold;">$${parseFloat(order.total).toFixed(2)}</td></tr>
        </table>
      </div>
    </div>

    <p class="email-text" style="margin-bottom:8px;"><strong>Shipping to:</strong></p>
    <p class="email-text" style="margin-top:0;">
      ${order.ship_first_name} ${order.ship_last_name}<br/>
      ${order.ship_street_line1}${order.ship_street_line2 ? ", " + order.ship_street_line2 : ""}<br/>
      ${order.ship_city}, ${order.ship_state} ${order.ship_zip}<br/>
      ${order.ship_country}
    </p>

    <hr class="email-divider" />

    <p class="email-text" style="font-weight:bold;color:#1C3557;margin-bottom:12px;">What Happens Next</p>
    <div class="order-summary">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #E8E0D0;vertical-align:top;width:36px;">
            <div style="background:#C4A862;color:#fff;width:26px;height:26px;border-radius:50%;font-size:13px;text-align:center;line-height:26px;font-family:Georgia,serif;">1</div>
          </td>
          <td style="padding:14px 16px 14px 8px;border-bottom:1px solid #E8E0D0;font-size:14px;color:#3A3A3A;line-height:1.6;">
            <strong style="color:#1C3557;">Our team reviews your order</strong><br/>
            We will contact you at <strong>${displayEmail}</strong> within 24 hours to confirm payment and answer any questions.
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #E8E0D0;vertical-align:top;width:36px;">
            <div style="background:#C4A862;color:#fff;width:26px;height:26px;border-radius:50%;font-size:13px;text-align:center;line-height:26px;font-family:Georgia,serif;">2</div>
          </td>
          <td style="padding:14px 16px 14px 8px;border-bottom:1px solid #E8E0D0;font-size:14px;color:#3A3A3A;line-height:1.6;">
            <strong style="color:#1C3557;">Payment &amp; dispatch</strong><br/>
            Once payment is confirmed, your saddle is carefully inspected, prepared, and dispatched. We'll send you tracking details immediately.
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;vertical-align:top;width:36px;">
            <div style="background:#C4A862;color:#fff;width:26px;height:26px;border-radius:50%;font-size:13px;text-align:center;line-height:26px;font-family:Georgia,serif;">3</div>
          </td>
          <td style="padding:14px 16px 14px 8px;font-size:14px;color:#3A3A3A;line-height:1.6;">
            <strong style="color:#1C3557;">30-Day Free Trial begins on delivery</strong><br/>
            Ride in it, assess the fit, and put it through its paces. If it is not perfect for you and your horse, we will refund or exchange it — no questions asked.
          </td>
        </tr>
      </table>
    </div>

    <div class="email-cta-wrapper">
      <a href="${url}/account/orders" class="email-cta">View My Order</a>
    </div>

    <hr class="email-divider" />

    <p class="email-text">Have a question? Our team is ready to help:</p>
    <p class="email-text">
      <strong>Sales:</strong> <a href="mailto:${contact.salesEmail}" style="color:#1C3557;">${contact.salesEmail}</a><br/>
      <strong>Phone:</strong> <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a>
    </p>
    `,
      `Your order ${order.order_number} is confirmed — we will be in touch within 24 hours.`,
    ),
  };
};

// ─── Order Notification (Sales Team) ─────────────────────────────────────────
const orderNotificationSalesTemplate = ({ order, items, customerEmail }) => {
  const itemsHtml = items
    .map(
      (item) => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E8E0D0;font-size:14px;color:#1C3557;">${item.product_name}${item.seat_size ? ` (${item.seat_size}")` : ""}${item.selected_color ? ` — ${item.selected_color}` : ""}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8E0D0;text-align:center;font-size:14px;color:#3A3A3A;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8E0D0;text-align:right;font-size:14px;color:#1C3557;font-weight:bold;">$${parseFloat(item.total).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return {
    subject: `New Order \u2014 ${order.order_number} \u2014 $${parseFloat(order.total).toFixed(2)}`,
    html: baseTemplate(
      `
    <p class="email-greeting">New Order Received</p>
    <p class="email-text">A new order has been placed and requires your attention. Please contact the customer within 24 hours to confirm payment.</p>

    <div class="email-info-box">
      <p>
        <strong>Order:</strong> ${order.order_number}<br/>
        <strong>Customer:</strong> ${order.ship_first_name} ${order.ship_last_name}<br/>
        <strong>Email:</strong> <a href="mailto:${customerEmail}" style="color:#1C3557;">${customerEmail}</a><br/>
        ${order.guest_phone ? `<strong>Phone:</strong> ${order.guest_phone}<br/>` : ""}
        <strong>Order Total:</strong> $${parseFloat(order.total).toFixed(2)}<br/>
        <strong>Payment Status:</strong> Pending
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #E8E0D0;margin:24px 0;">
      <thead>
        <tr style="background:#1C3557;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;letter-spacing:1px;font-weight:400;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;letter-spacing:1px;font-weight:400;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;letter-spacing:1px;font-weight:400;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:10px 12px;border-top:2px solid #1C3557;text-align:right;font-size:16px;color:#1C3557;font-weight:bold;">Total: $${parseFloat(order.total).toFixed(2)}</td></tr>
      </tfoot>
    </table>

    <p class="email-text" style="margin-bottom:6px;"><strong>Ship to:</strong></p>
    <p class="email-text" style="margin-top:0;">
      ${order.ship_first_name} ${order.ship_last_name}<br/>
      ${order.ship_street_line1}${order.ship_street_line2 ? ", " + order.ship_street_line2 : ""}<br/>
      ${order.ship_city}, ${order.ship_state} ${order.ship_zip}, ${order.ship_country}
    </p>

    ${order.customer_notes ? `<div class="email-info-box"><p><strong>Customer Notes:</strong><br/>${order.customer_notes}</p></div>` : ""}

    <div class="email-cta-wrapper">
      <a href="${url}/admin/orders/${order.id}" class="email-cta">Open in Admin Panel</a>
    </div>
    `,
    ),
  };
};

// ─── Order Status Update Email ────────────────────────────────────────────────
const orderStatusUpdateTemplate = ({
  firstName,
  order,
  newStatus,
  message,
  trackingNumber,
  carrierName,
}) => {
  const statusMessages = {
    confirmed: {
      heading: "Payment Confirmed",
      body: "Excellent news — your payment has been received and confirmed. We are now preparing your saddle for dispatch.",
      badge: "status-paid",
      previewText: `Your payment for order ${order.order_number} has been confirmed.`,
    },
    processing: {
      heading: "Your Order is Being Prepared",
      body: "Your saddle is being carefully inspected and prepared for shipment. Our team ensures every piece meets our standards before it leaves our facility.",
      badge: "status-pending",
      previewText: `Order ${order.order_number} is being prepared for dispatch.`,
    },
    shipped: {
      heading: "Your Saddle is On Its Way",
      body: "Your saddle has been dispatched and is on its way to you. You can track your shipment using the details below. Your 30-day trial begins the moment it arrives.",
      badge: "status-shipped",
      previewText: `Great news — order ${order.order_number} has shipped!`,
    },
    delivered: {
      heading: "Your Order Has Been Delivered",
      body: "Your saddle has arrived. We hope the first impression is everything you expected. Your 30-day free trial begins today — ride in it, assess the fit, and make sure it is right for you and your horse.",
      badge: "status-paid",
      previewText: `Your order ${order.order_number} has been delivered. Your 30-day trial starts now.`,
    },
    cancelled: {
      heading: "Order Cancelled",
      body: message || "Your order has been cancelled. If you have any questions or would like to place a new order, please do not hesitate to contact us.",
      badge: "status-cancelled",
      previewText: `Your order ${order.order_number} has been cancelled.`,
    },
    rejected: {
      heading: "Order Update",
      body: message || "We were unable to process your order. Our team will be in touch to assist you. We apologise for the inconvenience.",
      badge: "status-cancelled",
      previewText: `An update on your order ${order.order_number}.`,
    },
    refunded: {
      heading: "Refund Processed",
      body: "Your refund has been processed. Please allow 5–10 business days for it to appear in your account, depending on your bank. We hope to welcome you back to Saddles Market in the future.",
      badge: "status-paid",
      previewText: `Your refund for order ${order.order_number} has been processed.`,
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    heading: "Order Update",
    body: message || "There has been an update to your order.",
    badge: "status-pending",
    previewText: `An update on order ${order.order_number}.`,
  };

  return {
    subject: `${statusInfo.heading} \u2014 Order ${order.order_number} | ${name}`,
    html: baseTemplate(
      `
    <p class="email-greeting">${statusInfo.heading}</p>
    <p class="email-text">${statusInfo.body}</p>

    <div class="email-info-box">
      <p>
        <strong>Order:</strong> ${order.order_number}<br/>
        <strong>Status:</strong> <span class="status-badge ${statusInfo.badge}">${newStatus.replace(/_/g, " ")}</span>
      </p>
    </div>

    ${
      trackingNumber
        ? `
    <div class="email-info-box">
      <p>
        <strong>Tracking Number:</strong> ${trackingNumber}<br/>
        ${carrierName ? `<strong>Carrier:</strong> ${carrierName}<br/>` : ""}
        <span style="font-size:13px;color:#6A6A6A;">Tracking information may take up to 24 hours to activate.</span>
      </p>
    </div>`
        : ""
    }

    ${
      newStatus === "delivered"
        ? `<div class="email-info-box" style="border-left-color:#1C3557;">
      <p><strong>Your 30-Day Trial is Active</strong><br/>
      If for any reason the saddle is not right for you or your horse — fit, feel, or performance — contact us within 30 days for a full refund or exchange. No questions asked.<br/>
      <a href="mailto:${contact.supportEmail}" style="color:#1C3557;font-size:13px;">${contact.supportEmail}</a></p>
    </div>`
        : ""
    }

    <div class="email-cta-wrapper">
      <a href="${url}/account/orders" class="email-cta">View My Orders</a>
    </div>

    <hr class="email-divider" />
    <p class="email-text" style="font-size:13px;color:#6A6A6A;">Questions? Contact us at <a href="mailto:${contact.supportEmail}" style="color:#1C3557;">${contact.supportEmail}</a> or call <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a>.</p>
    `,
      statusInfo.previewText,
    ),
  };
};

// ─── Password Reset ───────────────────────────────────────────────────────────
const passwordResetTemplate = ({ firstName, resetLink, expiresHours = 1 }) => ({
  subject: `Reset Your Password — ${name}`,
  html: baseTemplate(
    `
    <p class="email-greeting">Password Reset Request</p>
    <p class="email-text">Hello ${firstName}, we received a request to reset the password for your ${name} account.</p>

    <div class="email-cta-wrapper">
      <a href="${resetLink}" class="email-cta">Reset My Password</a>
    </div>

    <p class="email-text" style="text-align:center;font-size:13px;color:#6A6A6A;">This link expires in ${expiresHours} hour${expiresHours > 1 ? "s" : ""}.</p>

    <hr class="email-divider" />

    <div class="email-info-box">
      <p>If you did not request a password reset, you can safely ignore this email. Your password will not change unless you click the link above.</p>
    </div>

    <p class="email-text" style="font-size:13px;color:#6A6A6A;">Or copy this link into your browser:<br/>
    <a href="${resetLink}" style="color:#1C3557;word-break:break-all;">${resetLink}</a></p>
    `,
    `Reset your ${name} account password`,
  ),
});

// ─── Cart Abandonment Emails ──────────────────────────────────────────────────
const cartAbandonmentTemplate = ({
  firstName,
  emailNumber,
  cartItems,
  cartUrl,
  totalValue,
}) => {
  const messages = {
    1: {
      subject: `${firstName}, your saddle is still waiting`,
      heading: "You Left Something Behind",
      body: `You were browsing our collection and added a saddle to your cart. We saved it for you — it is still there, ready when you are.`,
      urgencyNote: "",
      cta: "Return to My Cart",
    },
    2: {
      subject: `Still considering it? Your cart is saved, ${firstName}`,
      heading: "Your Saddle is Waiting",
      body: `Many of our customers take time to consider a saddle purchase — it is an important decision. We understand. That is why we offer a <strong>30-day free trial on every saddle</strong>: ride in it, put it to work, assess the fit. If it is not right, we will refund or exchange it, no questions asked.`,
      urgencyNote: "There is genuinely no risk to trying it.",
      cta: "Complete My Order",
    },
    3: {
      subject: `Final reminder — your ${name} cart`,
      heading: "One Last Reminder",
      body: `This is your last reminder about the saddle saved in your cart. Our inventory changes regularly, and we cannot guarantee availability indefinitely. If you have any questions about fit, size, or the saddle itself, our team is ready to help — just reply to this email.`,
      urgencyNote: "Every saddle includes our 30-day trial guarantee.",
      cta: "Secure My Saddle",
    },
  };

  const msg = messages[emailNumber] || messages[1];

  const itemsHtml = (cartItems || [])
    .slice(0, 3)
    .map(
      (item) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #E8E0D0;">
      <tr>
        <td style="padding:14px 20px;font-size:15px;color:#1C3557;">${item.name}</td>
        <td style="padding:14px 20px;text-align:right;white-space:nowrap;font-size:15px;color:#1C3557;font-weight:bold;">$${parseFloat(item.price).toFixed(2)}</td>
      </tr>
    </table>`,
    )
    .join("");

  return {
    subject: msg.subject,
    html: baseTemplate(
      `
    <p class="email-greeting">${msg.heading}, ${firstName}.</p>
    <p class="email-text">${msg.body}</p>
    ${msg.urgencyNote ? `<p class="email-text" style="color:#1C3557;font-weight:bold;">${msg.urgencyNote}</p>` : ""}

    ${
      itemsHtml
        ? `<div class="order-summary">
      <div class="order-summary-header">Saved in Your Cart</div>
      ${itemsHtml}
      ${
        totalValue
          ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF7;">
          <tr><td style="padding:14px 20px;font-size:15px;color:#1C3557;font-weight:bold;">Estimated Total</td><td style="padding:14px 20px;text-align:right;font-size:15px;color:#1C3557;font-weight:bold;">$${parseFloat(totalValue).toFixed(2)}</td></tr>
        </table>`
          : ""
      }
    </div>`
        : ""
    }

    <div class="email-cta-wrapper">
      <a href="${cartUrl || url + "/cart"}" class="email-cta">${msg.cta}</a>
    </div>

    <hr class="email-divider" />

    <div class="email-info-box" style="border-left-color:#1C3557;background:#EEF3F9;">
      <p style="color:#1C3557;"><strong>30-Day Free Trial — Zero Risk</strong><br/>
      <span style="color:#3A3A3A;">Every saddle at ${name} comes with a full 30-day trial. Ride in it, assess the fit, involve your trainer. If it is not right for you and your horse, contact us for a complete refund or exchange. No forms, no hassle.</span></p>
    </div>

    <p class="email-text" style="font-size:13px;color:#6A6A6A;text-align:center;">Questions before you buy? Reply to this email or call us at <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a>.</p>
    `,
      msg.subject,
    ),
  };
};

// ─── Newsletter Confirmation ──────────────────────────────────────────────────
const newsletterConfirmTemplate = ({
  firstName,
  confirmLink,
  unsubscribeLink,
}) => ({
  subject: `Confirm Your Subscription — ${name}`,
  html: baseTemplate(
    `
    <p class="email-greeting">Thank You for Subscribing, ${firstName || "Equestrian"}.</p>
    <p class="email-text">Please confirm your subscription to receive exclusive offers, expert saddle care tips, and updates from ${name}.</p>

    <div class="email-cta-wrapper">
      <a href="${confirmLink}" class="email-cta">Confirm My Subscription</a>
    </div>

    <hr class="email-divider" />
    <p class="email-text" style="font-size:13px;color:#6A6A6A;text-align:center;">
      If you did not subscribe, you can <a href="${unsubscribeLink}" style="color:#1C3557;">unsubscribe here</a> or simply ignore this email.
    </p>
    `,
    `Confirm your ${name} newsletter subscription`,
  ),
});

// ─── Contact Message Acknowledgement ─────────────────────────────────────────
const contactAckTemplate = ({ name: customerName, subject, message }) => ({
  subject: `Message Received — ${name}`,
  html: baseTemplate(
    `
    <p class="email-greeting">We Have Received Your Message, ${customerName}.</p>
    <p class="email-text">Thank you for reaching out to ${name}. Our team will review your message and respond within 24 hours during business hours.</p>

    <div class="email-info-box">
      <p><strong>Subject:</strong> ${subject}<br/>
      <strong>Your message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
    </div>

    <p class="email-text">For urgent inquiries, you may also reach us by:</p>
    <p class="email-text">
      <strong>Phone:</strong> <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a><br/>
      <strong>WhatsApp:</strong> <a href="${contact.whatsappLink}" style="color:#1C3557;">${contact.whatsappDisplay || contact.whatsapp}</a>
    </p>
    `,
    `Your message to ${name} has been received`,
  ),
});

// ─── Newsletter Broadcast ─────────────────────────────────────────────────────
const newsletterBroadcastTemplate = ({
  subject,
  htmlContent,
  previewText,
  unsubscribeLink,
}) => ({
  subject,
  html: baseTemplate(
    `${htmlContent}
    <hr class="email-divider" />
    <p style="font-size:12px;color:#9A9A9A;text-align:center;">
      You are receiving this because you subscribed to ${name} updates.
      <a href="${unsubscribeLink}" style="color:#6A6A6A;">Unsubscribe</a>
    </p>`,
    previewText || subject,
  ),
});

module.exports = {
  baseTemplate,
  emailVerificationTemplate,
  welcomeEmailTemplate,
  orderConfirmationTemplate,
  orderNotificationSalesTemplate,
  orderStatusUpdateTemplate,
  passwordResetTemplate,
  cartAbandonmentTemplate,
  newsletterConfirmTemplate,
  contactAckTemplate,
  newsletterBroadcastTemplate,
};
