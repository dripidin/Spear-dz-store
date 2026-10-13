require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
  const connStr = process.env.DATABASE_URL.replace('postgres:', 'postgres.frntoqozeevxhntenmgz:');
  const client = new Client({ connectionString: connStr });
  await client.connect();
  const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')");
  console.log('Tables:');
  console.table(res.rows);

  for (const row of res.rows) {
    if (row.table_schema === 'public') {
      const countRes = await client.query(`SELECT count(*) FROM "${row.table_name}"`);
      console.log(`Table ${row.table_name} count:`, countRes.rows[0].count);
      const sample = await client.query(`SELECT * FROM "${row.table_name}" LIMIT 2`);
      if (sample.rows.length > 0) {
        console.log(`Sample from ${row.table_name}:`, sample.rows[0]);
      }
    }
  }

  await client.end();
}
run().catch(e => console.error(e));
