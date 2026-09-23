CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  round_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  option_a VARCHAR(500),
  option_b VARCHAR(500),
  option_c VARCHAR(500),
  option_d VARCHAR(500),
  correct_answer CHAR(1) NOT NULL, -- 'A', 'B', 'C', or 'D'
  media_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS game_state (
  id SERIAL PRIMARY KEY,
  current_round INTEGER DEFAULT 1,
  current_team_id INTEGER REFERENCES teams(id),
  current_question_id INTEGER REFERENCES questions(id),
  phase VARCHAR(50) DEFAULT 'idle',
  timer_started_at TIMESTAMP,
  timer_duration INTEGER DEFAULT 30,
  show_answer BOOLEAN DEFAULT false,
  buzzer_active BOOLEAN DEFAULT false,
  locked_option VARCHAR(1)
);
