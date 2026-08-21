import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'reme',
});

try {
  await client.connect();
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log(JSON.stringify(result.rows, null, 2));
} catch (error) {
  console.error('ERROR:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
