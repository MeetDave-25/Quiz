if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local server/index.js');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const dbUrl = process.env.DATABASE_URL;
const dbClient = new Pool({ connectionString: dbUrl });

let cachedState = null;
let fetchedAtMs = 0;

const fetchStateFromDB = async () => {
  try {
    const result = await dbClient.query(`
      SELECT 
        g.*,
        t.name as current_team_name,
        t.score as current_team_score,
        q.text as question_text,
        q.option_a, q.option_b, q.option_c, q.option_d,
        q.correct_answer,
        q.media_url,
        EXTRACT(EPOCH FROM (NOW() - g.timer_started_at)) AS timer_elapsed_seconds,
        (SELECT json_agg(t2.* ORDER BY t2.id) FROM teams t2) as all_teams,
        (SELECT json_agg(q2.* ORDER BY q2.id) FROM questions q2) as all_questions
      FROM game_state g
      LEFT JOIN teams t ON g.current_team_id = t.id
      LEFT JOIN questions q ON g.current_question_id = q.id
      LIMIT 1
    `);
    // Elapsed time is computed in SQL (timer_started_at has no timezone), then advanced locally.
    cachedState = result.rows[0];
    cachedState.timer_elapsed_seconds =
      cachedState.timer_elapsed_seconds == null ? null : Number(cachedState.timer_elapsed_seconds);
    fetchedAtMs = Date.now();

    io.emit('gameStateUpdate', cachedState);
  } catch (err) {
    console.error('DB fetch error in socket server', err);
  }
};

// Endpoint for Next.js actions to trigger a sync
app.get('/sync', async (req, res) => {
  await fetchStateFromDB();
  res.send('ok');
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  if (cachedState) {
    socket.emit('gameStateUpdate', cachedState);
  } else {
    fetchStateFromDB();
  }
  
  socket.on('admin:startBuzzer', async () => {
    try {
      await dbClient.query(`UPDATE game_state SET phase = 'buzzer_mode', buzzer_active = true, buzzed_team_id = NULL`);
      await fetchStateFromDB();
    } catch (e) { console.error(e); }
  });

  socket.on('team:buzz', async (teamId) => {
    try {
      const res = await dbClient.query(`
        UPDATE game_state 
        SET phase = 'buzzer_locked', buzzer_active = false, buzzed_team_id = $1 
        WHERE phase = 'buzzer_mode' AND buzzer_active = true
        RETURNING id
      `, [teamId]);
      
      if (res.rowCount > 0) {
        await fetchStateFromDB();
      }
    } catch (e) { console.error(e); }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
  fetchStateFromDB();
  
  // Fast loop just for timer updates (every 200ms) without hitting DB if timer is running
  setInterval(() => {
    if (cachedState && cachedState.phase === 'timer' && cachedState.timer_elapsed_seconds != null) {
      const elapsed = cachedState.timer_elapsed_seconds + (Date.now() - fetchedAtMs) / 1000;
      io.emit('timerUpdate', { elapsed, duration: cachedState.timer_duration });
    }
  }, 200);
});
