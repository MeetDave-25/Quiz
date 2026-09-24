// One-time migration for the new Round 4 "Dekh Bhai Dekh" movie-clip round.
// - Shifts the old Round 4 (Rapid Fire) questions to round_number = 5
// - Adds media_type ('image' | 'video') and team_slot columns to `questions`
// Safe to run more than once. Run: npm run migrate:movie-round
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Run with: npm run migrate:movie-round');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image'`);
  await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS team_slot INTEGER`);

  // Only move Rapid Fire to round 5 if round 4 is still the old rapid-fire content
  // (i.e. nothing has been assigned team_slot yet, which only the movie round uses).
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM questions WHERE round_number = 4 AND team_slot IS NOT NULL`
  );
  if (Number(rows[0].count) === 0) {
    const moved = await pool.query(`UPDATE questions SET round_number = 5 WHERE round_number = 4`);
    console.log(`Moved ${moved.rowCount} Round 4 (Rapid Fire) questions to Round 5.`);
  } else {
    console.log('Round 4 already has movie-clip questions — skipping the Rapid Fire move.');
  }

  console.log('Migration complete. Round 4 is now free for movie-clip questions (add them from the Control Room).');
  await pool.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
