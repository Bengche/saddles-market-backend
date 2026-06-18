-- ═══════════════════════════════════════════════════════════════════════════
-- SADDLES MARKET — MIGRATION 002: Product Variant Selections
-- Adds optional multi-value variant fields to products, and selection
-- snapshot columns to cart_items and order_items.
-- Run manually via psql or include in setup script.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── products: admin-configurable variant option arrays ───────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_seat_sizes  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_colors      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_tree_sizes  TEXT[] DEFAULT '{}';

-- ─── cart_items: capture the buyer's chosen variants at add-to-cart time ──────
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS selected_seat_size  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS selected_color      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS selected_tree_size  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS selected_width      VARCHAR(100);

-- ─── order_items: snapshot chosen variants at order-placement time ────────────
-- seat_size column already exists; adding the remaining three.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS selected_color      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS selected_tree_size  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS selected_width      VARCHAR(100);
