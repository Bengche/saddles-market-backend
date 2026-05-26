// drop-schema.js
// Run: node drop-schema.js

const { Client } = require("pg");

const connectionString =
  "postgresql://postgres:QNGCBRXheeOavAgpxbhVrKRGMyhyZQrV@yamanote.proxy.rlwy.net:29948/railway";

const dropSchemaSQL = `
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
`;

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(dropSchemaSQL);
    console.log("Schema dropped and recreated successfully.");
  } catch (err) {
    console.error("Error dropping schema:", err.message);
  } finally {
    await client.end();
  }
})();
