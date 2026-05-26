// list-all-custom-types.js
// Run: node list-all-custom-types.js

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:QNGCBRXheeOavAgpxbhVrKRGMyhyZQrV@yamanote.proxy.rlwy.net:29948/railway';

const listTypesSQL = `
SELECT n.nspname as schema, t.typname as type
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e' OR t.typtype = 'c' OR t.typtype = 'd'
ORDER BY n.nspname, t.typname;
`;

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const res = await client.query(listTypesSQL);
    if (res.rows.length === 0) {
      console.log('No custom types found in any schema.');
    } else {
      console.log('Custom types found:');
      res.rows.forEach(row => {
        console.log(`Schema: ${row.schema}, Type: ${row.type}`);
      });
    }
  } catch (err) {
    console.error('Error listing custom types:', err.message);
  } finally {
    await client.end();
  }
})();
