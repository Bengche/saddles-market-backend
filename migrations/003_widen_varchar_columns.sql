-- ═══════════════════════════════════════════════════════════════════════════
-- SADDLES MARKET — MIGRATION 003: Widen narrow VARCHAR(20) columns
--
-- Fixes "value too long for type character varying(20)" errors that occur
-- when seat sizes, postal codes, or other user/admin-supplied strings
-- exceed the original 20-character limit.
-- ═══════════════════════════════════════════════════════════════════════════

-- order_items.seat_size: product variant strings can easily exceed 20 chars
ALTER TABLE order_items
  ALTER COLUMN seat_size TYPE VARCHAR(100);

-- products.seat_size: widen source column to match
ALTER TABLE products
  ALTER COLUMN seat_size TYPE VARCHAR(100);

-- orders: zip / postal codes for international addresses (e.g. Canada, UK)
ALTER TABLE orders
  ALTER COLUMN ship_zip TYPE VARCHAR(50),
  ALTER COLUMN bill_zip TYPE VARCHAR(50);

-- user_addresses: same reason
ALTER TABLE user_addresses
  ALTER COLUMN zip TYPE VARCHAR(50);
