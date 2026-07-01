/**
 * One-off migration: applies 002_product_variants.sql to the live database.
 * Safe to re-run — all statements use ADD COLUMN IF NOT EXISTS.
 *
 * Usage:
 *   node scripts/migrate-002.js
 */

require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function run() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/002_product_variants.sql"),
      "utf8",
    );
    console.log("Applying migration 002_product_variants.sql ...");
    await client.query(sql);
    console.log("Done. Columns added:");
    console.log(
      "  products: available_seat_sizes, available_colors, available_tree_sizes",
    );
    console.log(
      "  cart_items: selected_seat_size, selected_color, selected_tree_size, selected_width",
    );
    console.log(
      "  order_items: selected_color, selected_tree_size, selected_width",
    );
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
