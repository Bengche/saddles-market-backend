/**
 * SADDLES MARKET — SINGLE SOURCE OF TRUTH
 * All site-wide contact info, branding, and constants live here.
 * Update here and it propagates everywhere across the application.
 */

const SITE_CONFIG = {
  name: "Saddles Market",
  tagline: "Premium Horse Saddles for the Discerning Equestrian",
  description:
    "Saddles Market offers the finest selection of premium horse saddles, expertly crafted for Western, English, dressage, jumping, and trail riding disciplines. Free 30-day trial on all saddles.",
  url: "https://saddlesmarket.com",
  logo: "/logo.svg",
  faviconUrl: "/favicon.ico",

  contact: {
    supportEmail: "support@saddlesmarket.com",
    salesEmail: "sales@saddlesmarket.com",
    phone: "+1 (914) 432-9936",
    whatsapp: "+1 (669) 247-2718",
    whatsappLink: "https://wa.me/16692472718",
  },

  address: {
    street: "4001 Wing Commander Way",
    city: "Lexington",
    state: "KY",
    zip: "40511",
    country: "USA",
    countryFull: "United States",
    full: "4001 Wing Commander Way, Lexington, KY 40511, USA",
  },

  email: {
    fromName: process.env.FROM_NAME || "Saddles Market",
    fromEmail: process.env.FROM_EMAIL || "support@saddlesmarket.com",
    // Admin order notifications go here. Override via ADMIN_EMAIL env var
    // so you can point to any inbox (e.g. a Gmail) without redeploying.
    adminEmail: process.env.ADMIN_EMAIL || "sales@saddlesmarket.com",
    salesEmail: "sales@saddlesmarket.com",
    replyTo: process.env.FROM_EMAIL || "support@saddlesmarket.com",
  },

  social: {
    facebook: "https://facebook.com/saddlesmarket",
    instagram: "https://instagram.com/saddlesmarket",
    twitter: "https://twitter.com/saddlesmarket",
    pinterest: "https://pinterest.com/saddlesmarket",
    youtube: "https://youtube.com/@saddlesmarket",
  },

  trial: {
    days: 30,
    description: "30-Day Free Trial — Try your saddle risk-free.",
  },

  currency: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
  },

  seo: {
    defaultTitle: "Saddles Market — Premium Horse Saddles",
    titleTemplate: "%s | Saddles Market",
    defaultDescription:
      "Shop premium horse saddles at Saddles Market. Western, English, dressage, jumping & trail saddles. Expert quality, 30-day free trial, free shipping on orders over $500.",
    keywords: [
      "horse saddles",
      "buy horse saddles",
      "western saddles",
      "english saddles",
      "dressage saddles",
      "jumping saddles",
      "trail saddles",
      "horse saddles for sale",
      "premium horse saddles",
      "saddles market",
      "horse riding saddles",
      "custom horse saddles",
      "leather horse saddles",
    ],
    ogImage: "/og-image.jpg",
    twitterCard: "summary_large_image",
    twitterSite: "@saddlesmarket",
  },

  shipping: {
    freeShippingThreshold: 500,
    standardShippingCost: 49,
    expressShippingCost: 99,
    standardDays: "5-7",
    expressDays: "2-3",
    internationalDays: "10-21",
  },

  policies: {
    returnDays: 30,
    trialDays: 30,
  },

  cart: {
    abandonmentEmails: 3,
    abandonmentIntervals: [1, 3, 7], // days after abandonment
  },

  admin: {
    email: "support@saddlesmarket.com",
  },

  pwa: {
    name: "Saddles Market",
    shortName: "Saddles Market",
    themeColor: "#1C3557",
    backgroundColor: "#FAFAF7",
  },
};

module.exports = SITE_CONFIG;
