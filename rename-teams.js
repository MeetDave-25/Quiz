if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local rename-teams.js');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function rename() {
  const r = await pool.query('SELECT id, name FROM teams ORDER BY id');
  for (let i = 0; i < r.rows.length; i++) {
    const newName = `Team ${i + 1}`;
    await pool.query('UPDATE teams SET name = $1 WHERE id = $2', [newName, r.rows[i].id]);
    console.log(`Updated team ${r.rows[i].id} to ${newName}`);
  }
  await pool.end();
  console.log('All 5 teams renamed successfully!');
}

rename().catch(console.error);
