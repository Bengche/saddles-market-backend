// drop-types.js
// Run: node drop-types.js

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:QNGCBRXheeOavAgpxbhVrKRGMyhyZQrV@yamanote.proxy.rlwy.net:29948/railway';

const dropTypesSQL = `
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS saddle_discipline CASCADE;
DROP TYPE IF EXISTS saddle_condition CASCADE;
`;

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query(dropTypesSQL);
    console.log('Custom types dropped successfully.');
  } catch (err) {
    console.error('Error dropping types:', err.message);
  } finally {
    await client.end();
  }
})();
