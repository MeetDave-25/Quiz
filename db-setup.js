if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local db-setup.js');
import pkg from 'pg';
const { Client } = pkg;

const dbUrl = process.env.DATABASE_URL;

const questions = [
  // Round 1: Easy GK (MCQ with 4 options, no penalty)
  { round: 1, text: 'What is the capital of India?', a: 'Mumbai', b: 'New Delhi', c: 'Kolkata', d: 'Chennai', correct: 'B' },
  { round: 1, text: 'Who wrote the national anthem of India?', a: 'Bankim Chandra', b: 'Sarojini Naidu', c: 'Rabindranath Tagore', d: 'Mahatma Gandhi', correct: 'C' },
  { round: 1, text: 'How many planets are in our Solar System?', a: '7', b: '8', c: '9', d: '10', correct: 'B' },
  { round: 1, text: 'What is the largest ocean on Earth?', a: 'Atlantic Ocean', b: 'Indian Ocean', c: 'Arctic Ocean', d: 'Pacific Ocean', correct: 'D' },
  { round: 1, text: 'Which is the longest river in the world?', a: 'Amazon', b: 'Nile', c: 'Yangtze', d: 'Mississippi', correct: 'B' },

  // Round 2: Medium GK (MCQ, -5 penalty for wrong)
  { round: 2, text: 'Who was the first President of India?', a: 'Jawaharlal Nehru', b: 'Sardar Patel', c: 'Dr. Rajendra Prasad', d: 'S. Radhakrishnan', correct: 'C' },
  { round: 2, text: 'In which year did India gain independence?', a: '1945', b: '1947', c: '1950', d: '1952', correct: 'B' },
  { round: 2, text: 'What is the chemical symbol for Gold?', a: 'Go', b: 'Gd', c: 'Au', d: 'Ag', correct: 'C' },
  { round: 2, text: 'Which planet is known as the Red Planet?', a: 'Venus', b: 'Jupiter', c: 'Saturn', d: 'Mars', correct: 'D' },
  { round: 2, text: 'Who painted the Mona Lisa?', a: 'Vincent van Gogh', b: 'Pablo Picasso', c: 'Leonardo da Vinci', d: 'Michelangelo', correct: 'C' },

  // Round 3: Hard GK 
  { round: 3, text: 'What is the smallest country in the world by area?', a: 'Monaco', b: 'San Marino', c: 'Vatican City', d: 'Liechtenstein', correct: 'C' },
  { round: 3, text: 'Which element has the highest melting point?', a: 'Iron', b: 'Tungsten', c: 'Platinum', d: 'Titanium', correct: 'B' },
  { round: 3, text: 'Who discovered penicillin?', a: 'Louis Pasteur', b: 'Alexander Fleming', c: 'Marie Curie', d: 'Robert Koch', correct: 'B' },
  { round: 3, text: 'What is the speed of light in vacuum (approx)?', a: '2 × 10⁸ m/s', b: '3 × 10⁶ m/s', c: '3 × 10⁸ m/s', d: '1 × 10⁹ m/s', correct: 'C' },
  { round: 3, text: 'Which country has the most natural lakes?', a: 'Russia', b: 'USA', c: 'Brazil', d: 'Canada', correct: 'D' },

  // Round 4: Sports & Entertainment
  { round: 4, text: 'How many players are there in a cricket team?', a: '9', b: '10', c: '11', d: '12', correct: 'C' },
  { round: 4, text: 'Which country won the FIFA World Cup 2022?', a: 'Brazil', b: 'France', c: 'Argentina', d: 'Germany', correct: 'C' },
  { round: 4, text: 'Who holds the record for most international cricket centuries?', a: 'Ricky Ponting', b: 'Kumar Sangakkara', c: 'Sachin Tendulkar', d: 'Virat Kohli', correct: 'C' },
  { round: 4, text: 'Which actor played Iron Man in the MCU?', a: 'Chris Evans', b: 'Robert Downey Jr.', c: 'Chris Hemsworth', d: 'Mark Ruffalo', correct: 'B' },
  { round: 4, text: 'How many gold medals did India win at the 2020 Tokyo Olympics?', a: '0', b: '1', c: '2', d: '3', correct: 'B' },

  // Round 5: Rapid Fire / Bonus
  { round: 5, text: 'What is the national animal of India?', a: 'Lion', b: 'Elephant', c: 'Bengal Tiger', d: 'Peacock', correct: 'C' },
  { round: 5, text: 'Which gas do plants absorb during photosynthesis?', a: 'Oxygen', b: 'Nitrogen', c: 'Carbon Dioxide', d: 'Hydrogen', correct: 'C' },
  { round: 5, text: 'What does "www" stand for in a website browser?', a: 'World Wide Web', b: 'World Web Wide', c: 'Wide World Web', d: 'Web World Wide', correct: 'A' },
  { round: 5, text: 'Who invented the telephone?', a: 'Thomas Edison', b: 'Nikola Tesla', c: 'Alexander Graham Bell', d: 'James Watt', correct: 'C' },
  { round: 5, text: 'What is the hardest natural substance on Earth?', a: 'Gold', b: 'Iron', c: 'Diamond', d: 'Quartz', correct: 'C' },
];

async function setup() {
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected to Neon DB');

    // Create tables
    console.log('Creating tables...');
    await client.query(`DROP TABLE IF EXISTS game_state CASCADE`);
    await client.query(`DROP TABLE IF EXISTS questions CASCADE`);
    await client.query(`DROP TABLE IF EXISTS teams CASCADE`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        score INTEGER DEFAULT 0
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        round_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        option_a VARCHAR(500),
        option_b VARCHAR(500),
        option_c VARCHAR(500),
        option_d VARCHAR(500),
        correct_answer CHAR(1) NOT NULL,
        media_url VARCHAR(500)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_state (
        id SERIAL PRIMARY KEY,
        current_round INTEGER DEFAULT 1,
        current_team_id INTEGER REFERENCES teams(id),
        current_question_id INTEGER REFERENCES questions(id),
        phase VARCHAR(50) DEFAULT 'idle',
        timer_started_at TIMESTAMP,
        timer_duration INTEGER DEFAULT 30,
        show_answer BOOLEAN DEFAULT false,
        buzzer_active BOOLEAN DEFAULT false
      )
    `);

    console.log('Tables created.');

    // Seed Teams
    const teamsCount = await client.query('SELECT COUNT(*) FROM teams');
    if (parseInt(teamsCount.rows[0].count) === 0) {
      console.log('Seeding teams...');
      await client.query(`
        INSERT INTO teams (name, score) VALUES 
        ('Team Alpha', 0),
        ('Team Beta', 0),
        ('Team Gamma', 0),
        ('Team Delta', 0),
        ('Team Omega', 0)
      `);
    }

    // Seed Questions (drop and re-seed for fresh start)
    const questionsCount = await client.query('SELECT COUNT(*) FROM questions');
    if (parseInt(questionsCount.rows[0].count) === 0) {
      console.log('Seeding questions...');
      for (const q of questions) {
        await client.query(
          `INSERT INTO questions (round_number, text, option_a, option_b, option_c, option_d, correct_answer)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [q.round, q.text, q.a, q.b, q.c, q.d, q.correct]
        );
      }
      console.log(`Seeded ${questions.length} questions.`);
    }

    // Seed Initial Game State
    const gameStateCount = await client.query('SELECT COUNT(*) FROM game_state');
    if (parseInt(gameStateCount.rows[0].count) === 0) {
      const firstTeam = await client.query('SELECT id FROM teams ORDER BY id LIMIT 1');
      console.log('Seeding initial game state...');
      await client.query(
        `INSERT INTO game_state (current_round, current_team_id, current_question_id, phase, show_answer)
         VALUES (1, $1, NULL, 'idle', false)`,
        [firstTeam.rows[0].id]
      );
    }

    console.log('Database setup complete!');
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await client.end();
  }
}

setup();
