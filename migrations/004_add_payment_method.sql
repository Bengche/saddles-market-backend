-- ═══════════════════════════════════════════════════════════════════════════
-- SADDLES MARKET — MIGRATION 004: Add payment_method to orders
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer';

COMMIT;
