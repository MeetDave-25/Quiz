'use server'

import pool from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Per-round points history, so a single round can be undone. Created on first use.
let scoreLogReady: Promise<unknown> | null = null;
function ensureScoreLog() {
  scoreLogReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS score_events (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch((e: unknown) => { scoreLogReady = null; throw e; });
  return scoreLogReady;
}

export async function getGameState() {
  try {
    await ensureScoreLog();
    const result = await pool.query(`
      SELECT 
        g.*,
        t.name as current_team_name, 
        t.score as current_team_score,
        q.text as question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.media_url,
        q.round_number as question_round,
        EXTRACT(EPOCH FROM (NOW() - g.timer_started_at)) as timer_elapsed_seconds,
        (SELECT json_agg(row_to_json(team)) FROM (SELECT * FROM teams ORDER BY id) team) as all_teams,
        (SELECT json_object_agg(round, total) FROM (SELECT round, SUM(delta) AS total FROM score_events GROUP BY round) rp) as round_points,
        (SELECT json_agg(row_to_json(qrow)) FROM (SELECT id, round_number, text, option_a, option_b, option_c, option_d, correct_answer, media_url FROM questions ORDER BY id) qrow) as all_questions
      FROM game_state g
      LEFT JOIN teams t ON g.current_team_id = t.id
      LEFT JOIN questions q ON g.current_question_id = q.id
      LIMIT 1;
    `);
    
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (err) {
    console.error('getGameState error:', err);
    return null;
  }
}

export async function updateGameState(updates: Record<string, unknown>) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  
  const setString = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(updates);
  
  await pool.query(`UPDATE game_state SET ${setString}`, values);
  await notifyServer();
}

async function notifyServer() {
  try {
    await fetch('http://localhost:3001/sync');
  } catch (e) {
    // Socket server sync failure is non-blocking
  }
}

export async function setQuestion(questionId: number) {
  await pool.query(
    `UPDATE game_state SET current_question_id = $1, phase = 'question', show_answer = false, timer_started_at = NULL, locked_option = NULL`,
    [questionId]
  );
  await notifyServer();
}

export async function lockOption(option: string) {
  await pool.query(`UPDATE game_state SET locked_option = $1`, [option]);
  await notifyServer();
}

export async function showOptions() {
  await pool.query(`UPDATE game_state SET phase = 'options'`);
  await notifyServer();
}

export async function startTimer() {
  await pool.query(`UPDATE game_state SET phase = 'timer', timer_started_at = NOW()`);
  await notifyServer();
}

export async function stopTimer() {
  await pool.query(`UPDATE game_state SET phase = 'answered', timer_started_at = NULL`);
  await notifyServer();
}

// The host's verdict is stored in `phase` so the stage knows which overlay to play.
export async function revealAnswer(isCorrect: boolean) {
  await pool.query(`UPDATE game_state SET show_answer = true, phase = $1, timer_started_at = NULL`, [
    isCorrect ? 'answered_correct' : 'answered_wrong',
  ]);
  await notifyServer();
}

export async function updateTeamScore(teamId: number, scoreChange: number) {
  await ensureScoreLog();
  await pool.query('UPDATE teams SET score = score + $1 WHERE id = $2', [scoreChange, teamId]);
  await pool.query(
    'INSERT INTO score_events (team_id, round, delta) SELECT $1, COALESCE(current_round, 1), $2 FROM game_state LIMIT 1',
    [teamId, scoreChange]
  );
  await notifyServer();
}

// Takes back every point given in `round` and restarts that round from the first team.
export async function resetRound(round: number) {
  await ensureScoreLog();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE teams t SET score = t.score - e.total
      FROM (SELECT team_id, SUM(delta) AS total FROM score_events WHERE round = $1 GROUP BY team_id) e
      WHERE t.id = e.team_id
    `, [round]);
    await client.query('DELETE FROM score_events WHERE round = $1', [round]);
    const firstTeam = await client.query('SELECT id FROM teams ORDER BY id LIMIT 1');
    await client.query(`
      UPDATE game_state
      SET current_round = $1, current_team_id = $2, current_question_id = NULL,
          phase = 'idle', show_answer = false, timer_started_at = NULL, buzzer_active = false, locked_option = NULL
    `, [round, firstTeam.rows[0].id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  await notifyServer();
}

export async function startRound(round: number) {
  const firstTeam = await pool.query('SELECT id FROM teams ORDER BY id LIMIT 1');
  await pool.query(`
    UPDATE game_state 
    SET current_round = $1, current_team_id = $2, current_question_id = NULL, 
        phase = 'idle', buzzer_active = false, show_answer = false, timer_started_at = NULL, locked_option = NULL
  `, [round, firstTeam.rows[0].id]);
  await notifyServer();
}

export async function selectTeam(teamId: number) {
  await pool.query(`
    UPDATE game_state 
    SET current_team_id = $1, phase = 'idle', show_answer = false, 
        current_question_id = NULL, timer_started_at = NULL, buzzer_active = false, locked_option = NULL
  `, [teamId]);
  await notifyServer();
}

export async function nextTeam() {
  const stateResult = await pool.query('SELECT current_team_id FROM game_state LIMIT 1');
  const currentTeamId = stateResult.rows[0].current_team_id;
  const totalTeams = await pool.query('SELECT COUNT(*) FROM teams');
  const total = parseInt(totalTeams.rows[0].count);
  
  let nextTeamId = currentTeamId + 1;
  if (nextTeamId > total) {
    await pool.query(`UPDATE game_state SET phase = 'leaderboard'`);
  } else {
    await pool.query(
      `UPDATE game_state SET current_team_id = $1, phase = 'idle', show_answer = false, 
       current_question_id = NULL, timer_started_at = NULL, buzzer_active = false, locked_option = NULL`,
      [nextTeamId]
    );
  }
  await notifyServer();
}

export async function resetGame() {
  await ensureScoreLog();
  await pool.query(`UPDATE teams SET score = 0`);
  await pool.query(`DELETE FROM score_events`);
  const firstTeam = await pool.query('SELECT id FROM teams ORDER BY id LIMIT 1');
  await pool.query(`
    UPDATE game_state 
    SET current_round = 1, current_team_id = $1, current_question_id = NULL, 
        phase = 'idle', show_answer = false, timer_started_at = NULL, buzzer_active = false, locked_option = NULL
  `, [firstTeam.rows[0].id]);
  await notifyServer();
}

export async function setPhase(phase: string) {
  await pool.query(`UPDATE game_state SET phase = $1`, [phase]);
  await notifyServer();
}
