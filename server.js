require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cron = require("node-cron");

const SITE_CONFIG = require("./src/config/siteConfig");
const runMigrations = require("./src/config/migrate");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");
const { generalLimiter, authLimiter } = require("./src/middleware/rateLimiter");

// Routes
const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/products");
const orderRoutes = require("./src/routes/orders");
const cartRoutes = require("./src/routes/cart");
const favoritesRoutes = require("./src/routes/favorites");
const newsletterRoutes = require("./src/routes/newsletter");
const adminRoutes = require("./src/routes/admin");
const contactRoutes = require("./src/routes/contact");
const uploadRoutes = require("./src/routes/upload");
const reviewRoutes = require("./src/routes/reviews");
const blogRoutes = require("./src/routes/blog");
const chatRoutes = require("./src/routes/chat");

// Jobs
const { startCartAbandonmentJob } = require("./src/jobs/cartAbandonmentJob");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust proxy (Railway / Heroku) ──────────────────────────────────────────
app.set("trust proxy", 1);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  SITE_CONFIG.url,
  "https://www.saddlesmarket.com",
  "https://saddlesmarket.com",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-session-id"],
  }),
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request logging (development & production error debugging) ───────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: SITE_CONFIG.name,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/", (req, res) => {
  res.json({ message: `${SITE_CONFIG.name} API`, version: "1.0.0" });
});

// ─── API Routes (With Rate Limiters Attached Specifically) ────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/chat", chatRoutes); // Dedicated limiter already inside chat.js
app.use("/api/products", generalLimiter, productRoutes);
app.use("/api/orders", generalLimiter, orderRoutes);
app.use("/api/cart", generalLimiter, cartRoutes);
app.use("/api/favorites", generalLimiter, favoritesRoutes);
app.use("/api/newsletter", generalLimiter, newsletterRoutes);
app.use("/api/admin", generalLimiter, adminRoutes);
app.use("/api/contact", generalLimiter, contactRoutes);
app.use("/api/upload", generalLimiter, uploadRoutes);
app.use("/api/reviews", generalLimiter, reviewRoutes);
app.use("/api/blog", generalLimiter, blogRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
runMigrations()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n────────────────────────────────────────────────────`);
      console.log(`  ${SITE_CONFIG.name} API`);
      console.log(`  Running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`────────────────────────────────────────────────────\n`);

      // Start background jobs
      if (process.env.NODE_ENV === "production") {
        startCartAbandonmentJob();
        console.log("Cart abandonment job started.");
      }
    });
  })
  .catch((err) => {
    console.error(
      "Failed to run migrations — server will not start:",
      err.message,
    );
    process.exit(1);
  });

module.exports = app;
