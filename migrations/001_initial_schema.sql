-- ═══════════════════════════════════════════════════════════════════════════
-- SADDLES MARKET — COMPLETE DATABASE SCHEMA
-- PostgreSQL Schema for Railway Deployment
-- Run: node scripts/setup-db.js
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    DROP TYPE user_role CASCADE;
  END IF;
END $$;
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected', 'refund_requested', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE saddle_discipline AS ENUM ('western', 'english', 'dressage', 'jumping', 'trail', 'barrel_racing', 'cutting', 'endurance', 'all_purpose', 'other');
CREATE TYPE saddle_condition AS ENUM ('new', 'like_new', 'excellent', 'good', 'fair');

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role                user_role DEFAULT 'customer',
  phone               VARCHAR(30),
  avatar_url          VARCHAR(500),
  is_email_verified   BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  newsletter_opted_in BOOLEAN DEFAULT FALSE,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─── USER ADDRESSES ───────────────────────────────────────────────────────────

CREATE TABLE user_addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(100) DEFAULT 'Home',
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  company       VARCHAR(200),
  street_line1  VARCHAR(300) NOT NULL,
  street_line2  VARCHAR(300),
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  zip           VARCHAR(20) NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'United States',
  phone         VARCHAR(30),
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON user_addresses(user_id);

-- ─── EMAIL VERIFICATIONS (OTP) ────────────────────────────────────────────────

CREATE TABLE email_verifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_code     VARCHAR(6) NOT NULL,
  token        VARCHAR(255) UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  is_used      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);

-- ─── PASSWORD RESET TOKENS ────────────────────────────────────────────────────

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  image_url   VARCHAR(500),
  meta_title  VARCHAR(200),
  meta_desc   VARCHAR(400),
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCTS (SADDLES) ───────────────────────────────────────────────────────

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(300) NOT NULL,
  slug                VARCHAR(300) UNIQUE NOT NULL,
  sku                 VARCHAR(100) UNIQUE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  discipline          saddle_discipline,
  short_description   TEXT,
  description         TEXT NOT NULL,
  price               NUMERIC(10, 2) NOT NULL,
  compare_price       NUMERIC(10, 2),
  cost_price          NUMERIC(10, 2),
  stock_quantity      INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight_lbs          NUMERIC(6, 2),
  -- Saddle-specific fields
  seat_size           VARCHAR(20),           -- e.g., "15", "15.5", "16", "17", "18"
  gullet_width        VARCHAR(50),           -- e.g., "Regular / Medium", "Wide", "Extra Wide"
  tree_type           VARCHAR(100),
  leather_type        VARCHAR(200),
  leather_origin      VARCHAR(200),
  horn_height         VARCHAR(50),
  cantle_height       VARCHAR(50),
  rigging             VARCHAR(100),          -- e.g., "Full", "3/4", "7/8"
  fender_type         VARCHAR(100),
  stirrup_type        VARCHAR(100),
  color               VARCHAR(100),
  warranty            VARCHAR(200),
  brand               VARCHAR(200),
  country_of_origin   VARCHAR(100),
  condition           saddle_condition DEFAULT 'new',
  is_featured         BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  is_trial_eligible   BOOLEAN DEFAULT TRUE,
  meta_title          VARCHAR(300),
  meta_description    VARCHAR(500),
  meta_keywords       TEXT,
  tags                TEXT[],
  average_rating      NUMERIC(3, 2) DEFAULT 0,
  review_count        INTEGER DEFAULT 0,
  sold_count          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_discipline ON products(discipline);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ─── PRODUCT IMAGES ───────────────────────────────────────────────────────────

CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_id   VARCHAR(300) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  alt_text        VARCHAR(300),
  is_primary      BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ─── PRODUCT REVIEWS ──────────────────────────────────────────────────────────

CREATE TABLE product_reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id     UUID,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        VARCHAR(200),
  body         TEXT NOT NULL,
  is_verified  BOOLEAN DEFAULT FALSE,
  is_approved  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_user ON product_reviews(user_id);

-- ─── COUPONS ──────────────────────────────────────────────────────────────────

CREATE TABLE coupons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  description         VARCHAR(300),
  discount_type       VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value      NUMERIC(10, 2) NOT NULL,
  minimum_order       NUMERIC(10, 2) DEFAULT 0,
  maximum_discount    NUMERIC(10, 2),
  usage_limit         INTEGER,
  times_used          INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  valid_from          TIMESTAMPTZ DEFAULT NOW(),
  valid_until         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_coupons_code ON coupons(UPPER(code));

-- ─── CART ITEMS ───────────────────────────────────────────────────────────────

CREATE TABLE cart_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id      VARCHAR(255),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_session ON cart_items(session_id);

-- ─── CART ABANDONMENT TRACKING ────────────────────────────────────────────────

CREATE TABLE cart_abandonment_emails (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_number  INTEGER NOT NULL CHECK (email_number BETWEEN 1 AND 3),
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_number)
);

-- ─── FAVORITES / WISHLIST ─────────────────────────────────────────────────────

CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          VARCHAR(20) UNIQUE NOT NULL,
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email           VARCHAR(255),
  guest_first_name      VARCHAR(100),
  guest_last_name       VARCHAR(100),
  guest_phone           VARCHAR(30),
  status                order_status DEFAULT 'pending',
  payment_status        payment_status DEFAULT 'pending',
  -- Shipping address snapshot
  ship_first_name       VARCHAR(100) NOT NULL,
  ship_last_name        VARCHAR(100) NOT NULL,
  ship_company          VARCHAR(200),
  ship_street_line1     VARCHAR(300) NOT NULL,
  ship_street_line2     VARCHAR(300),
  ship_city             VARCHAR(100) NOT NULL,
  ship_state            VARCHAR(100) NOT NULL,
  ship_zip              VARCHAR(20) NOT NULL,
  ship_country          VARCHAR(100) NOT NULL DEFAULT 'United States',
  ship_phone            VARCHAR(30),
  -- Billing address snapshot
  bill_same_as_ship     BOOLEAN DEFAULT TRUE,
  bill_first_name       VARCHAR(100),
  bill_last_name        VARCHAR(100),
  bill_street_line1     VARCHAR(300),
  bill_street_line2     VARCHAR(300),
  bill_city             VARCHAR(100),
  bill_state            VARCHAR(100),
  bill_zip              VARCHAR(20),
  bill_country          VARCHAR(100),
  -- Pricing
  subtotal              NUMERIC(10, 2) NOT NULL,
  shipping_cost         NUMERIC(10, 2) DEFAULT 0,
  discount_amount       NUMERIC(10, 2) DEFAULT 0,
  tax_amount            NUMERIC(10, 2) DEFAULT 0,
  total                 NUMERIC(10, 2) NOT NULL,
  coupon_code           VARCHAR(50),
  -- Shipping
  shipping_method       VARCHAR(50) DEFAULT 'standard',
  tracking_number       VARCHAR(200),
  carrier               VARCHAR(100),
  estimated_delivery    DATE,
  shipped_at            TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  -- Notes
  customer_notes        TEXT,
  admin_notes           TEXT,
  cancellation_reason   TEXT,
  rejection_reason      TEXT,
  -- Trial
  trial_end_date        DATE,
  refund_requested_at   TIMESTAMPTZ,
  refund_reason         TEXT,
  -- Meta
  ip_address            INET,
  user_agent            VARCHAR(500),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    VARCHAR(300) NOT NULL,
  product_sku     VARCHAR(100),
  product_image   VARCHAR(500),
  seat_size       VARCHAR(20),
  price           NUMERIC(10, 2) NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  total           NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ─── NEWSLETTER SUBSCRIBERS ───────────────────────────────────────────────────

CREATE TABLE newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  first_name      VARCHAR(100),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  source          VARCHAR(100) DEFAULT 'website',
  token           VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at   TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_active ON newsletter_subscribers(is_active) WHERE is_active = TRUE;

-- ─── NEWSLETTER CAMPAIGNS ─────────────────────────────────────────────────────

CREATE TABLE newsletter_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject         VARCHAR(300) NOT NULL,
  preview_text    VARCHAR(200),
  html_content    TEXT NOT NULL,
  sent_to_count   INTEGER DEFAULT 0,
  open_count      INTEGER DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BLOG POSTS ───────────────────────────────────────────────────────────────

CREATE TABLE blog_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(300) NOT NULL,
  slug            VARCHAR(300) UNIQUE NOT NULL,
  excerpt         TEXT NOT NULL,
  content         TEXT NOT NULL,
  cover_image     VARCHAR(500),
  cover_image_alt VARCHAR(300),
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name     VARCHAR(200) DEFAULT 'Saddles Market Team',
  category        VARCHAR(100),
  tags            TEXT[],
  meta_title      VARCHAR(300),
  meta_description VARCHAR(500),
  reading_time    INTEGER DEFAULT 5,
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_blog_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_search ON blog_posts USING GIN(to_tsvector('english', title || ' ' || content));

-- ─── CONTACT MESSAGES ─────────────────────────────────────────────────────────

CREATE TABLE contact_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(200) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(30),
  subject      VARCHAR(300) NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  replied_at   TIMESTAMPTZ,
  admin_notes  TEXT,
  ip_address   INET,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_unread ON contact_messages(is_read) WHERE is_read = FALSE;

-- ─── FUNCTION: Update updated_at timestamp ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── FUNCTION: Generate order number ──────────────────────────────────────────

CREATE SEQUENCE order_number_seq START 10000;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'SM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── SEED CATEGORIES ──────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Western Saddles', 'western-saddles', 'Authentic Western saddles built for work, performance, and pleasure riding. Crafted with premium leather for lasting comfort and durability.', 1),
  ('English Saddles', 'english-saddles', 'Classic English saddles for riders who demand precision, elegance, and performance across all English disciplines.', 2),
  ('Dressage Saddles', 'dressage-saddles', 'Precision-engineered dressage saddles that position the rider in perfect balance for optimal communication with the horse.', 3),
  ('Jumping Saddles', 'jumping-saddles', 'Forward-cut jumping saddles designed for close contact and freedom of movement over fences.', 4),
  ('Trail Saddles', 'trail-saddles', 'Comfortable, lightweight trail saddles built for long-distance rides across varied terrain.', 5),
  ('Barrel Racing Saddles', 'barrel-racing-saddles', 'High-performance barrel racing saddles that keep you secure during explosive turns and sprints.', 6),
  ('Youth & Youth Saddles', 'youth-saddles', 'Properly fitted saddles for young riders designed with safety and comfort as top priorities.', 7),
  ('Saddle Accessories', 'saddle-accessories', 'Premium saddle pads, girths, stirrups, leathers, and care products to complement your saddle setup.', 8);

-- ─── SEED ADMIN USER ──────────────────────────────────────────────────────────
-- Password: Boyalinco$10 (will be hashed by setup-db.js after creation)
-- This is a placeholder — the setup script will create the real admin

-- ─── SEED BLOG POSTS ──────────────────────────────────────────────────────────
-- Blog posts are seeded via scripts/seed-blog.js

COMMIT;
