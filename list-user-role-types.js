// list-user-role-types.js
// Run: node list-user-role-types.js

const { Client } = require("pg");

const connectionString =
  "postgresql://postgres:QNGCBRXheeOavAgpxbhVrKRGMyhyZQrV@yamanote.proxy.rlwy.net:29948/railway";

const listTypesSQL = `
SELECT n.nspname as schema, t.typname as type
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'user_role';
`;

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const res = await client.query(listTypesSQL);
    if (res.rows.length === 0) {
      console.log("No user_role type found in any schema.");
    } else {
      console.log("user_role type found in:");
      res.rows.forEach((row) => {
        console.log(`Schema: ${row.schema}, Type: ${row.type}`);
      });
    }
  } catch (err) {
    console.error("Error listing user_role types:", err.message);
  } finally {
    await client.end();
  }
})();
