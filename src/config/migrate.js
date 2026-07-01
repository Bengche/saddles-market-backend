/**
 * Auto-migration runner.
 * Runs on every server startup. Applies any SQL files in /migrations/ that
 * have not yet been recorded in the schema_migrations table.
 * Safe to re-run — already-applied migrations are skipped.
 */

const fs = require("fs");
const path = require("path");
const pool = require("./database");

const MIGRATIONS_DIR = path.join(__dirname, "../../migrations");

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255) UNIQUE NOT NULL,
        applied_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // If the products table already exists but 001 hasn't been recorded,
    // mark it as applied so we don't try to re-run CREATE TABLE statements
    // against an existing live database.
    const productsExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'products'
    `);
    if (productsExists.rows.length > 0) {
      await client.query(`
        INSERT INTO schema_migrations (filename)
        VALUES ('001_initial_schema.sql')
        ON CONFLICT (filename) DO NOTHING
      `);
    }

    // Read all .sql files in order
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const already = await client.query(
        "SELECT id FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      if (already.rows.length > 0) {
        console.log(`  [migrations] skip  ${filename} (already applied)`);
        continue;
      }

      console.log(`  [migrations] apply ${filename} ...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
        console.log(`  [migrations] done  ${filename}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${filename} failed: ${err.message}`);
      }
    }
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
