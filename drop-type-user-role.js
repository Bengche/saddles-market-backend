// drop-type-user-role.js
// Run: node drop-type-user-role.js

const { Client } = require("pg");

const connectionString =
  "postgresql://postgres:QNGCBRXheeOavAgpxbhVrKRGMyhyZQrV@yamanote.proxy.rlwy.net:29948/railway";

const dropTypeSQL = `
DROP TYPE IF EXISTS user_role CASCADE;
`;

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(dropTypeSQL);
    console.log("user_role type dropped successfully.");
  } catch (err) {
    console.error("Error dropping user_role type:", err.message);
  } finally {
    await client.end();
  }
})();
