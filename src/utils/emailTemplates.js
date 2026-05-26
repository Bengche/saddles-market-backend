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
    .order-item { padding: 16px 20px; border-bottom: 1px solid #E8E0D0; display: block; }
    .order-item:last-child { border-bottom: none; }
    .order-item-name { font-size: 15px; color: #1C3557; font-weight: 400; }
    .order-item-detail { font-size: 13px; color: #6A6A6A; margin-top: 3px; }
    .order-item-price { font-size: 15px; color: #1C3557; float: right; font-weight: 400; }
    .order-totals { padding: 16px 20px; background-color: #FAFAF7; }
    .order-total-row { display: flex; justify-content: space-between; font-size: 14px; color: #3A3A3A; margin-bottom: 8px; }
    .order-total-row.grand-total { font-size: 17px; color: #1C3557; border-top: 1px solid #E8E0D0; padding-top: 12px; margin-top: 8px; font-weight: bold; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 2px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .status-pending { background-color: #FFF3CD; color: #856404; }
    .status-paid { background-color: #D4EDDA; color: #155724; }
    .status-shipped { background-color: #CCE5FF; color: #004085; }
    .status-cancelled { background-color: #F8D7DA; color: #721C24; }
    .email-footer { background-color: #1C3557; padding: 32px 40px; text-align: center; }
    .email-footer p { color: #8BA8CC; font-size: 12px; line-height: 1.7; margin-bottom: 6px; }
    .email-footer a { color: #C4A862; text-decoration: none; }
    .email-footer .social-links { margin: 16px 0; }
    .email-footer .social-links a { display: inline-block; margin: 0 8px; color: #C4A862; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    @media only screen and (max-width: 620px) {
      .email-body { padding: 32px 24px !important; }
      .email-header { padding: 28px 24px !important; }
      .email-footer { padding: 24px !important; }
      .email-otp-code { font-size: 32px !important; letter-spacing: 8px !important; }
      .email-cta { padding: 14px 28px !important; font-size: 13px !important; }
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
  subject: `Welcome to ${name} — Your Equestrian Journey Begins`,
  html: baseTemplate(
    `
    <p class="email-greeting">Welcome to ${name}, ${firstName}.</p>
    <p class="email-text">Your email has been verified and your account is now fully active. We are delighted to have you as part of our community of discerning equestrians.</p>

    <p class="email-text">Here is what you can do with your ${name} account:</p>

    <div class="email-info-box">
      <p><strong>Browse Our Collection</strong><br/>Explore our curated selection of premium Western, English, dressage, jumping, and trail saddles — each hand-selected for quality and performance.</p>
    </div>

    <div class="email-info-box">
      <p><strong>30-Day Free Trial</strong><br/>Every saddle comes with our industry-leading 30-day free trial. Ride in it, feel it, assess the fit — then decide. Full refund or exchange within 30 days, no questions asked.</p>
    </div>

    <div class="email-info-box">
      <p><strong>Save Your Favorites</strong><br/>Add saddles to your wishlist to revisit later or share with your trainer for a second opinion.</p>
    </div>

    <div class="email-info-box">
      <p><strong>Track Your Orders</strong><br/>Follow every stage of your order from placement through delivery in your account dashboard.</p>
    </div>

    <div class="email-cta-wrapper">
      <a href="${url}/products" class="email-cta">Explore Our Saddles</a>
    </div>

    <hr class="email-divider" />

    <p class="email-text">Our team of expert equestrians is always available to help you find the perfect saddle. Do not hesitate to reach out:</p>
    <p class="email-text">
      <strong>Email:</strong> <a href="mailto:${contact.supportEmail}" style="color:#1C3557;">${contact.supportEmail}</a><br/>
      <strong>Phone:</strong> <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a><br/>
      <strong>WhatsApp:</strong> <a href="${contact.whatsappLink}" style="color:#1C3557;">${contact.whatsappDisplay || contact.whatsapp}</a>
    </p>
    `,
    `Welcome to ${name}! Your account is ready.`,
  ),
});

// ─── Order Confirmation (Customer) ────────────────────────────────────────────
const orderConfirmationTemplate = ({ firstName, order, items }) => {
  const itemsHtml = items
    .map(
      (item) => `
    <div class="order-item" style="overflow:hidden;">
      <span class="order-item-price">$${parseFloat(item.total).toFixed(2)}</span>
      <div class="order-item-name">${item.product_name}</div>
      <div class="order-item-detail">Qty: ${item.quantity}${item.seat_size ? ` &bull; Size: ${item.seat_size}"` : ""} &bull; $${parseFloat(item.price).toFixed(2)} each</div>
    </div>`,
    )
    .join("");

  return {
    subject: `Order Confirmed — ${order.order_number} | ${name}`,
    html: baseTemplate(
      `
    <p class="email-greeting">Thank you, ${firstName}.</p>
    <p class="email-text">Your order has been received and is now being reviewed by our team. We will be in touch shortly to confirm details and discuss payment.</p>

    <div class="email-info-box">
      <p><strong>Order Number:</strong> ${order.order_number}<br/>
      <strong>Status:</strong> <span class="status-badge status-pending">Pending Review</span><br/>
      <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>

    <div class="order-summary">
      <div class="order-summary-header">Order Summary</div>
      ${itemsHtml}
      <div class="order-totals">
        <div class="order-total-row"><span>Subtotal</span><span>$${parseFloat(order.subtotal).toFixed(2)}</span></div>
        <div class="order-total-row"><span>Shipping</span><span>${parseFloat(order.shipping_cost) === 0 ? "Free" : "$" + parseFloat(order.shipping_cost).toFixed(2)}</span></div>
        ${order.discount_amount > 0 ? `<div class="order-total-row"><span>Discount</span><span>-$${parseFloat(order.discount_amount).toFixed(2)}</span></div>` : ""}
        <div class="order-total-row grand-total"><span>Total</span><span>$${parseFloat(order.total).toFixed(2)}</span></div>
      </div>
    </div>

    <p class="email-text"><strong>Shipping to:</strong><br/>
    ${order.ship_first_name} ${order.ship_last_name}<br/>
    ${order.ship_street_line1}${order.ship_street_line2 ? ", " + order.ship_street_line2 : ""}<br/>
    ${order.ship_city}, ${order.ship_state} ${order.ship_zip}<br/>
    ${order.ship_country}</p>

    <hr class="email-divider" />

    <div class="email-info-box">
      <p><strong>30-Day Free Trial</strong><br/>
      Your saddle comes with our 30-day free trial. If it does not meet your expectations for any reason, contact us within 30 days for a full refund or exchange.</p>
    </div>

    <p class="email-text">A member of our sales team will contact you at <strong>${order.guest_email || ""}</strong> within 24 hours to discuss payment and confirm shipping details. You can also reach us directly:</p>

    <p class="email-text">
      <strong>Sales:</strong> <a href="mailto:${contact.salesEmail}" style="color:#1C3557;">${contact.salesEmail}</a><br/>
      <strong>Phone:</strong> <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a>
    </p>

    <div class="email-cta-wrapper">
      <a href="${url}/account/orders" class="email-cta">View My Orders</a>
    </div>
    `,
      `Your order ${order.order_number} has been received.`,
    ),
  };
};

// ─── Order Notification (Sales Team) ─────────────────────────────────────────
const orderNotificationSalesTemplate = ({ order, items, customerEmail }) => {
  const itemsHtml = items
    .map(
      (item) => `<tr>
      <td style="padding:10px;border-bottom:1px solid #E8E0D0;">${item.product_name}${item.seat_size ? ` (${item.seat_size}")` : ""}</td>
      <td style="padding:10px;border-bottom:1px solid #E8E0D0;text-align:center;">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #E8E0D0;text-align:right;">$${parseFloat(item.total).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return {
    subject: `New Order — ${order.order_number} — $${parseFloat(order.total).toFixed(2)}`,
    html: baseTemplate(
      `
    <p class="email-greeting">New Order Received</p>
    <p class="email-text">A new order has been placed and requires your attention.</p>

    <div class="email-info-box">
      <p><strong>Order:</strong> ${order.order_number}<br/>
      <strong>Customer:</strong> ${order.ship_first_name} ${order.ship_last_name}<br/>
      <strong>Email:</strong> <a href="mailto:${customerEmail}" style="color:#1C3557;">${customerEmail}</a><br/>
      ${order.guest_phone ? `<strong>Phone:</strong> ${order.guest_phone}<br/>` : ""}
      <strong>Total:</strong> $${parseFloat(order.total).toFixed(2)}<br/>
      <strong>Payment Status:</strong> Pending</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr style="background:#1C3557;color:#fff;">
          <th style="padding:10px;text-align:left;">Product</th>
          <th style="padding:10px;text-align:center;">Qty</th>
          <th style="padding:10px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <p class="email-text"><strong>Ship to:</strong><br/>
    ${order.ship_first_name} ${order.ship_last_name}<br/>
    ${order.ship_street_line1}<br/>
    ${order.ship_city}, ${order.ship_state} ${order.ship_zip}, ${order.ship_country}</p>

    ${order.customer_notes ? `<div class="email-info-box"><p><strong>Customer Notes:</strong><br/>${order.customer_notes}</p></div>` : ""}

    <div class="email-cta-wrapper">
      <a href="${url}/admin/orders/${order.id}" class="email-cta">View in Admin Panel</a>
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
      heading: "Order Confirmed",
      body: "Your order has been confirmed and payment has been received. We are now preparing your saddle for shipment.",
      badge: "status-paid",
    },
    processing: {
      heading: "Order in Processing",
      body: "Your saddle is being carefully prepared for shipment. Our team is ensuring everything is perfect before it leaves our facility.",
      badge: "status-pending",
    },
    shipped: {
      heading: "Your Order Has Shipped!",
      body: "Excellent news — your saddle is now on its way to you.",
      badge: "status-shipped",
    },
    delivered: {
      heading: "Order Delivered",
      body: "Your order has been delivered. We hope you are delighted with your new saddle. Your 30-day trial period begins today.",
      badge: "status-paid",
    },
    cancelled: {
      heading: "Order Cancelled",
      body: message || "Your order has been cancelled as requested.",
      badge: "status-cancelled",
    },
    rejected: {
      heading: "Order Update",
      body:
        message ||
        "We were unable to process your order. Please contact our team for assistance.",
      badge: "status-cancelled",
    },
    refunded: {
      heading: "Refund Processed",
      body: "Your refund has been processed. Please allow 5-10 business days for it to appear in your account.",
      badge: "status-paid",
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    heading: "Order Update",
    body: message || "",
    badge: "status-pending",
  };

  return {
    subject: `${statusInfo.heading} — ${order.order_number} | ${name}`,
    html: baseTemplate(
      `
    <p class="email-greeting">${statusInfo.heading}, ${firstName}.</p>
    <p class="email-text">${statusInfo.body}</p>

    <div class="email-info-box">
      <p><strong>Order:</strong> ${order.order_number}<br/>
      <strong>Status:</strong> <span class="status-badge ${statusInfo.badge}">${newStatus.replace(/_/g, " ")}</span></p>
    </div>

    ${
      trackingNumber
        ? `
    <div class="email-info-box">
      <p><strong>Tracking Number:</strong> ${trackingNumber}<br/>
      ${carrierName ? `<strong>Carrier:</strong> ${carrierName}<br/>` : ""}
      Please allow up to 24 hours for tracking information to become active.</p>
    </div>`
        : ""
    }

    <div class="email-cta-wrapper">
      <a href="${url}/account/orders" class="email-cta">View My Orders</a>
    </div>

    <hr class="email-divider" />
    <p class="email-text">Questions? Contact us at <a href="mailto:${contact.supportEmail}" style="color:#1C3557;">${contact.supportEmail}</a> or call <a href="tel:${contact.phone}" style="color:#1C3557;">${contact.phoneDisplay || contact.phone}</a>.</p>
    `,
      `Order ${order.order_number} update: ${statusInfo.heading}`,
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
      subject: `Your Saddle is Still Waiting — ${name}`,
      heading: "You Left Something Behind",
      body: `You recently added a saddle to your cart but did not complete your order. We have saved it for you.`,
      cta: "Complete My Order",
    },
    2: {
      subject: `A Reminder About Your ${name} Cart`,
      heading: "Your Cart is Saved",
      body: `Your selected saddle is still in your cart. Thousands of equestrians have trusted ${name} for their saddle needs — and our 30-day free trial means there is absolutely no risk to you.`,
      cta: "Return to My Cart",
    },
    3: {
      subject: `Last Reminder — Your ${name} Cart`,
      heading: "Your Cart Awaits",
      body: `This is your final reminder that you have items saved in your ${name} cart. Every saddle we carry is backed by our 30-day trial guarantee. If it does not fit perfectly, we will make it right.`,
      cta: "Complete My Purchase",
    },
  };

  const msg = messages[emailNumber] || messages[1];
  const itemsHtml = (cartItems || [])
    .slice(0, 3)
    .map(
      (item) => `<div style="padding:12px;border-bottom:1px solid #E8E0D0;">
      <strong style="color:#1C3557;">${item.name}</strong><br/>
      <span style="color:#6A6A6A;font-size:13px;">$${parseFloat(item.price).toFixed(2)}</span>
    </div>`,
    )
    .join("");

  return {
    subject: msg.subject,
    html: baseTemplate(
      `
    <p class="email-greeting">${msg.heading}, ${firstName}.</p>
    <p class="email-text">${msg.body}</p>

    ${itemsHtml ? `<div class="order-summary"><div class="order-summary-header">Items in Your Cart</div>${itemsHtml}</div>` : ""}
    ${totalValue ? `<p class="email-text" style="text-align:right;"><strong>Cart Total: $${parseFloat(totalValue).toFixed(2)}</strong></p>` : ""}

    <div class="email-cta-wrapper">
      <a href="${cartUrl || url + "/cart"}" class="email-cta">${msg.cta}</a>
    </div>

    <hr class="email-divider" />

    <div class="email-info-box">
      <p><strong>30-Day Free Trial</strong><br/>Every saddle comes with our 30-day trial guarantee. Try it, ride it, and if it is not right for you and your horse, we will refund or exchange it — no questions asked.</p>
    </div>
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
