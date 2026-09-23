if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local sync-ppt.js');
// Updates Round 2 & 3 question text/answers/images in place (by id order).
// Does NOT touch scores, teams, or game state. Run: node sync-ppt.js
const { Pool } = require('pg');
const { round2, round3 } = require('./lib/ppt-questions');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncRound(round, data) {
  const { rows } = await pool.query('SELECT id FROM questions WHERE round_number = $1 ORDER BY id', [round]);
  if (rows.length !== data.length) {
    throw new Error(`Round ${round}: DB has ${rows.length} questions, PPT has ${data.length}. Run seed-gk.js instead.`);
  }
  for (let i = 0; i < rows.length; i++) {
    await pool.query(
      'UPDATE questions SET text = $1, correct_answer = $2, media_url = $3 WHERE id = $4',
      [data[i].q, data[i].correct, data[i].media, rows[i].id]
    );
  }
  console.log(`Round ${round}: updated ${rows.length} questions`);
}

(async () => {
  try {
    await syncRound(2, round2);
    await syncRound(3, round3);
    await fetch('http://localhost:3001/sync').catch(() => {});
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
