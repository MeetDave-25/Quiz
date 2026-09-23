if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run with: node --env-file=.env.local seed-gk.js');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Clearing old questions...');
    await client.query('UPDATE game_state SET current_question_id = NULL');
    await client.query('DELETE FROM questions');

    const teamsRes = await client.query('SELECT id, name FROM teams ORDER BY id');
    const teams = teamsRes.rows;
    console.log('Teams:', teams.map(t => t.name).join(', '));

    // ============================================================
    // ROUND 1 — MCQ (Hindi GK, directly from PPT)
    // 5 questions per team
    // ============================================================
    const round1 = [
      // TEAM 1 (slides 4-8)
      { q: "देश भर के 1000 सरकारी ITI के आधुनिकीकरण के लिए अक्टूबर 2025 में कौन सी योजना शुरू की गई है?", a: "पीएम श्री योजना", b: "पीएम गति शक्ति योजना", c: "डिजिटल इंडिया मिशन", d: "पीएम सेतु योजना", correct: "D" },
      { q: "कक्षा 1 से 12 तक AI को मुख्य विषय के तौर पर शामिल करने वाला भारत का पहला राज्य कौन बना?", a: "हरियाणा", b: "पंजाब", c: "केरल", d: "दिल्ली", correct: "B" },
      { q: "2026 में किस राज्य ने SC/ST छात्रों के लिए 'विदेश शिक्षावृति' योजना शुरू की है?", a: "ओडिशा", b: "गुजरात", c: "बिहार", d: "झारखंड", correct: "A" },
      { q: "किस देश ने 15 अगस्त को 'भारत दिवस' मनाने की घोषणा की है?", a: "फ्रांस", b: "इंग्लैंड", c: "जापान", d: "अमेरिका", correct: "D" },
      { q: "हिंदू पौराणिक कथाओं के अनुसार सूर्य देव के सारथी का नाम क्या है?", a: "मातलि", b: "अरुण", c: "संजय", d: "सुमंत", correct: "B" },

      // TEAM 2 (slide 9 + slides 10-12 area)
      { q: "RTGS प्रणाली में न्यूनतम कितनी राशि ट्रांसफर की जा सकती है?", a: "₹1 लाख", b: "₹2 लाख", c: "₹50,000", d: "कोई न्यूनतम सीमा नहीं है", correct: "B" },
      { q: "2026 में आयोजित 98वें ऑस्कर पुरस्कारों में सर्वश्रेष्ठ फिल्म का पुरस्कार किसने जीता?", a: "Sinners", b: "Hamnet", c: "One Battle After Another", d: "Frankenstein", correct: "C" },
      { q: "टी20 विश्व कप 2026 के फाइनल मैच में प्लेयर ऑफ द मैच किसे चुना गया?", a: "संजू सैमसन", b: "सूर्यकुमार यादव", c: "हार्दिक पंड्या", d: "जसप्रीत बुमराह", correct: "D" },
      { q: "संघ लोक सेवा आयोग (UPSC) के अध्यक्ष कौन हैं?", a: "डॉ. अजय कुमार", b: "मनोज सोनी", c: "राजीव कुमार", d: "अरविंद सक्सेना", correct: "A" },
      { q: "भगवान शिव के गले में लिपटे रहने वाले नागराज का नाम क्या है?", a: "तक्षक", b: "कालिया", c: "शेषनाग", d: "वासुकी", correct: "D" },

      // TEAM 3 (slides 16-20)
      { q: "भारत में रुपये का प्रतीक (₹) किसने डिज़ाइन किया है?", a: "उदय कुमार धर्मलिंगम", b: "सत्यजीत रे", c: "आर.के. लक्ष्मण", d: "दिनकर कुमार", correct: "A" },
      { q: "31 अक्टूबर 2026 से शुरू होने वाला सिंहस्थ कुंभ मेला किस शहर में आयोजित होगा?", a: "नासिक", b: "वाराणसी", c: "हरिद्वार", d: "प्रयागराज", correct: "A" },
      { q: "प्रसिद्ध पुस्तक 'Exam Warriors' के लेखक कौन हैं?", a: "मधु पूर्णिमा किश्वर", b: "नरेन्द्र मोदी", c: "चेतन भगत", d: "डॉ. ए.पी.जे. अब्दुल कलाम", correct: "B" },
      { q: "निम्नलिखित में से किस भारतीय राजनेता की मृत्यु हेलीकॉप्टर या विमान दुर्घटना में नहीं हुई थी?", a: "माधवराव सिंधिया", b: "बलवंतराय मेहता", c: "राजेश पायलट", d: "वाई.एस. राजशेखर रेड्डी", correct: "C" },
      { q: "जनगणना 2027 के लिए किसे ब्रांड एंबेसडर नियुक्त किया गया है?", a: "पंकज त्रिपाठी", b: "सुदर्शन पटनायक", c: "आयुष्मान खुराना", d: "नीरज चोपड़ा", correct: "B" },

      // TEAM 4 (slides 22-26)
      { q: "विश्व प्रेस स्वतंत्रता सूचकांक 2026 में भारत का स्थान क्या है?", a: "151", b: "154", c: "157", d: "159", correct: "C" },
      { q: "कौन सी संस्था भारत की खुफिया संस्था नहीं है?", a: "CIA (Central Intelligence Agency)", b: "IB (Intelligence Bureau)", c: "RAW (Research & Analysis Wing)", d: "NTRO (National Technical Research Organisation)", correct: "A" },
      { q: "राष्ट्रीय महिला आयोग की अध्यक्ष कौन हैं?", a: "स्मृति ईरानी", b: "रेखा शर्मा", c: "विजया के. रहाटकर", d: "निर्मला सीतारमण", correct: "C" },
      { q: "26 अगस्त 2026 को नेपाल के किस क्षेत्र में फ्लैश फ्लड की घटना हुई?", a: "ललितपुर", b: "काठमांडू", c: "पोखरा", d: "रसुवा", correct: "D" },
      { q: "कौरवों का वह कौन सा भाई था जिसने कुरुक्षेत्र में पांडवों की ओर से युद्ध लड़ा था?", a: "शेषनाग", b: "युयुत्सु", c: "सुबाहु", d: "विकर्ण", correct: "B" },

      // TEAM 5 (slides 28-32)
      { q: "ग्लासगो राष्ट्रमंडल खेलों के उद्घाटन समारोह में भारतीय दल का ध्वजवाहक कौन था?", a: "पी.वी. सिंधु", b: "नीरज चोपड़ा", c: "मीराबाई चानू", d: "मनु भाकर", correct: "C" },
      { q: "1 रुपये के नोट पर किसके हस्ताक्षर होते हैं?", a: "वित्त सचिव", b: "वित्त मंत्री", c: "RBI गवर्नर", d: "प्रधानमंत्री", correct: "A" },
      { q: "वर्ष 2026 में घोषित 60वें ज्ञानपीठ पुरस्कार से किसे सम्मानित किया गया है?", a: "आर. वैरामुथु", b: "विनोद कुमार शुक्ल", c: "दामोदर मौजो", d: "ममता कालिया", correct: "A" },
      { q: "इंदिरा गांधी शांति पुरस्कार 2026 किसे मिला?", a: "कैलाश सत्यार्थी", b: "ग्रासा माशेल", c: "एंजेला मर्केल", d: "मिखाइल गोर्बाचेव", correct: "B" },
      { q: "महाभारत के युद्ध में अंगराज कर्ण का वध युद्ध के किस दिन हुआ था?", a: "10वें दिन", b: "15वें दिन", c: "13वें दिन", d: "17वें दिन", correct: "D" },
    ];

    // ROUND 2 & 3 — transcribed from the PPT slides, with slide images
    const { round2, round3 } = require('./lib/ppt-questions');

    // ============================================================
    // ROUND 4 — RAPID FIRE (Final Round — 5 fast questions per team)
    // Admin scores manually. Short, snappy answers.
    // ============================================================
    const round4 = [
      // Team 1
      { q: "भारत के पहले प्रधानमंत्री कौन थे?", correct: "जवाहरलाल नेहरू" },
      { q: "2 × 12 = ?", correct: "24" },
      { q: "सबसे बड़ा महाद्वीप कौन सा है?", correct: "एशिया" },
      { q: "AI का पूरा नाम क्या है?", correct: "Artificial Intelligence" },
      { q: "भारत का राष्ट्रीय फूल कौन सा है?", correct: "कमल" },
      // Team 2
      { q: "जर्मनी की राजधानी क्या है?", correct: "बर्लिन" },
      { q: "√144 = ?", correct: "12" },
      { q: "गुरुत्वाकर्षण का सिद्धांत किसने दिया?", correct: "आइज़क न्यूटन" },
      { q: "लीप वर्ष में कितने दिन होते हैं?", correct: "366" },
      { q: "सूर्य के सबसे निकट का ग्रह कौन सा है?", correct: "बुध (Mercury)" },
      // Team 3
      { q: "अमेरिका की राजधानी क्या है?", correct: "वाशिंगटन डी.सी." },
      { q: "5 × 9 = ?", correct: "45" },
      { q: "'रोमियो एंड जूलियट' के लेखक कौन हैं?", correct: "विलियम शेक्सपियर" },
      { q: "सबसे गहरा महासागर कौन सा है?", correct: "प्रशांत महासागर (Pacific)" },
      { q: "इंद्रधनुष में कितने रंग होते हैं?", correct: "7" },
      // Team 4
      { q: "रूस की राजधानी क्या है?", correct: "मॉस्को" },
      { q: "7 × 8 = ?", correct: "56" },
      { q: "चाँद पर पहला कदम किसने रखा?", correct: "नील आर्मस्ट्रांग" },
      { q: "सौरमंडल का सबसे छोटा ग्रह कौन सा है?", correct: "बुध (Mercury)" },
      { q: "एक मिलियन में कितने शून्य होते हैं?", correct: "6" },
      // Team 5
      { q: "चीन की राजधानी क्या है?", correct: "बीजिंग" },
      { q: "3 × 11 = ?", correct: "33" },
      { q: "शांति का प्रतीक कौन सा पक्षी है?", correct: "कबूतर (Dove)" },
      { q: "एक वयस्क मनुष्य में कितने दाँत होते हैं?", correct: "32" },
      { q: "पानी किस तापमान पर उबलता है?", correct: "100°C" },
    ];

    // INSERT ROUND 1 (MCQ)
    console.log('Inserting Round 1 (MCQ — Hindi GK from PPT)...');
    for (const q of round1) {
      await client.query(
        `INSERT INTO questions (round_number, text, option_a, option_b, option_c, option_d, correct_answer)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [1, q.q, q.a, q.b, q.c, q.d, q.correct]
      );
    }

    // INSERT ROUND 2 (Direct Answer — Hindi)
    console.log('Inserting Round 2 (Direct Answer — Hindi from PPT)...');
    for (const q of round2) {
      await client.query(
        `INSERT INTO questions (round_number, text, correct_answer, media_url) VALUES ($1, $2, $3, $4)`,
        [2, q.q, q.correct, q.media]
      );
    }

    // INSERT ROUND 3 (Visual/Photo — Hindi)
    console.log('Inserting Round 3 (Visual/Photo — from PPT)...');
    for (const q of round3) {
      await client.query(
        `INSERT INTO questions (round_number, text, correct_answer, media_url) VALUES ($1, $2, $3, $4)`,
        [3, q.q, q.correct, q.media]
      );
    }

    // INSERT ROUND 4 (Rapid Fire)
    console.log('Inserting Round 4 (Rapid Fire)...');
    for (const q of round4) {
      await client.query(
        `INSERT INTO questions (round_number, text, correct_answer) VALUES ($1, $2, $3)`,
        [4, q.q, q.correct]
      );
    }

    // Reset game
    await client.query(`
      UPDATE game_state SET
        current_round = 1, current_team_id = $1, current_question_id = NULL,
        phase = 'idle', show_answer = false, locked_option = NULL,
        timer_started_at = NULL, buzzer_active = false, buzzed_team_id = NULL
    `, [teams[0].id]);
    await client.query('UPDATE teams SET score = 0');

    // Verify
    const counts = await client.query(
      'SELECT round_number, COUNT(*) as count FROM questions GROUP BY round_number ORDER BY round_number'
    );
    const roundNames = { 1: 'MCQ (Hindi)', 2: 'Direct Answer (Hindi)', 3: 'Visual/Photo (Hindi)', 4: 'Rapid Fire' };
    console.log('\n✅ All rounds seeded from PPT:');
    for (const row of counts.rows) {
      console.log(`  Round ${row.round_number} (${roundNames[row.round_number]}): ${row.count} questions`);
    }
    console.log('\n🎯 Game reset to Round 1 — Ready to play!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
