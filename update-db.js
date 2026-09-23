if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local update-db.js');
import pkg from 'pg';
const { Client } = pkg;

const dbUrl = process.env.DATABASE_URL;

async function update() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Adding locked_option to game_state...');
    await client.query(`ALTER TABLE game_state ADD COLUMN IF NOT EXISTS locked_option VARCHAR(1)`);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

update();
