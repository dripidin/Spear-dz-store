require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const connStr = process.env.DATABASE_URL.replace('postgres:', 'postgres.frntoqozeevxhntenmgz:');
  const client = new Client({ connectionString: connStr });
  await client.connect();
  const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'orders'");
  console.log('Columns in orders table:');
  console.table(res.rows);
  await client.end();
}
run().catch(e => console.error(e));
