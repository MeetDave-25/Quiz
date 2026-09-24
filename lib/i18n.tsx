'use client';

// Language switcher for the audience-facing screens (landing, team, stage chrome).
// The quiz QUESTIONS/ANSWERS themselves are not translated here — they come verbatim
// from the event's question bank, and machine-translating factual GK content risks
// changing what counts as a correct answer. Add the question bank in another
// language separately if you need that.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'hi' | 'gu';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'gu', label: 'ગુજ' },
];

const STRINGS = {
  'landing.subBadge': {
    en: (u: string, f: string) => `${u} · ${f}`,
    hi: (u: string, f: string) => `${u} · ${f}`,
    gu: (u: string, f: string) => `${u} · ${f}`,
  },
  'landing.title': { en: 'GK Quiz Competition', hi: 'जीके क्विज़ प्रतियोगिता', gu: 'જીકે ક્વિઝ સ્પર્ધા' },
  'landing.subtitle': {
    en: (c: string) => `5 teams · 5 rounds · live scoring on the big screen. Coordinated by ${c}.`,
    hi: (c: string) => `5 टीमें · 5 राउंड · बड़ी स्क्रीन पर लाइव स्कोरिंग। समन्वयक: ${c}।`,
    gu: (c: string) => `5 ટીમો · 5 રાઉન્ડ · મોટી સ્ક્રીન પર લાઇવ સ્કોરિંગ. સંયોજક: ${c}.`,
  },
  'landing.stageBadge': { en: 'For the projector', hi: 'प्रोजेक्टर के लिए', gu: 'પ્રોજેક્ટર માટે' },
  'landing.stageLabel': { en: 'Stage Display', hi: 'स्टेज डिस्प्ले', gu: 'સ્ટેજ ડિસ્પ્લે' },
  'landing.stageDesc': {
    en: 'Full-screen KBC-style show for the hall: questions, picture and movie rounds, the 30-second timer, and live scores.',
    hi: 'हॉल के लिए फुल-स्क्रीन KBC-शैली शो: सवाल, फोटो और मूवी राउंड, 30 सेकंड टाइमर, और लाइव स्कोर।',
    gu: 'હોલ માટે ફુલ-સ્ક્રીન KBC-શૈલી શો: પ્રશ્નો, ફોટો અને મૂવી રાઉન્ડ, 30 સેકન્ડ ટાઈમર, અને લાઇવ સ્કોર.',
  },
  'landing.stageBtn': { en: 'Open Stage Display', hi: 'स्टेज डिस्प्ले खोलें', gu: 'સ્ટેજ ડિસ્પ્લે ખોલો' },
  'landing.adminBadge': { en: 'For the quiz master · password', hi: 'क्विज़ मास्टर के लिए · पासवर्ड', gu: 'ક્વિઝ માસ્તર માટે · પાસવર્ડ' },
  'landing.adminLabel': { en: 'Control Room', hi: 'कंट्रोल रूम', gu: 'કંટ્રોલ રૂમ' },
  'landing.adminDesc': {
    en: 'Run the quiz step by step — pick the team and question, reveal options, start the timer, award points.',
    hi: 'क्विज़ को चरणबद्ध तरीके से चलाएँ — टीम और सवाल चुनें, विकल्प दिखाएँ, टाइमर शुरू करें, अंक दें।',
    gu: 'ક્વિઝને પગલાં-દર-પગલાં ચલાવો — ટીમ અને પ્રશ્ન પસંદ કરો, વિકલ્પો બતાવો, ટાઈમર શરૂ કરો, પોઈન્ટ આપો.',
  },
  'landing.adminBtn': { en: 'Enter Control Room', hi: 'कंट्रोल रूम में जाएँ', gu: 'કંટ્રોલ રૂમમાં જાઓ' },
  'landing.roundsHeading': { en: 'Competition rounds', hi: 'प्रतियोगिता के राउंड', gu: 'સ્પર્ધાના રાઉન્ડ' },
  'landing.perTeam': {
    en: (n: number) => `${n} question${n === 1 ? '' : 's'} per team`,
    hi: (n: number) => `प्रति टीम ${n} सवाल`,
    gu: (n: number) => `પ્રતિ ટીમ ${n} પ્રશ્નો`,
  },
  'landing.teamsHeading': { en: 'Teams on stage', hi: 'मंच पर टीमें', gu: 'મંચ પર ટીમો' },
  'landing.team': { en: 'Team', hi: 'टीम', gu: 'ટીમ' },
  'landing.footerJoin': {
    en: 'Team members can join from their phones at',
    hi: 'टीम के सदस्य अपने फ़ोन से यहाँ जुड़ सकते हैं:',
    gu: 'ટીમના સભ્યો તેમના ફોનથી અહીં જોડાઈ શકે છે:',
  },

  'team.join': { en: 'Join as your team', hi: 'अपनी टीम से जुड़ें', gu: 'તમારી ટીમ તરીકે જોડાઓ' },
  'team.connecting': { en: 'Connecting…', hi: 'कनेक्ट हो रहा है…', gu: 'કનેક્ટ થઈ રહ્યું છે…' },
  'team.leave': { en: 'Leave', hi: 'बाहर जाएँ', gu: 'બહાર જાઓ' },
  'team.pts': { en: 'pts', hi: 'अंक', gu: 'પોઈન્ટ' },
  'team.yourTurn': { en: "It's your turn — get ready", hi: 'आपकी बारी है — तैयार हो जाइए', gu: 'તમારો વારો છે — તૈયાર થાઓ' },
  'team.answerNow': {
    en: (s: number) => `Answer now — ${s}s left`,
    hi: (s: number) => `अभी जवाब दें — ${s} सेकंड बचे`,
    gu: (s: number) => `હમણાં જવાબ આપો — ${s} સેકન્ડ બાકી`,
  },
  'team.waiting': { en: 'Waiting for your turn…', hi: 'आपकी बारी का इंतज़ार करें…', gu: 'તમારા વારાની રાહ જુઓ…' },
  'team.buzzerActive': { en: 'Buzzer active — press now', hi: 'बज़र सक्रिय है — अभी दबाएँ', gu: 'બઝર સક્રિય છે — હમણાં દબાવો' },
  'team.buzzedFirst': { en: 'You buzzed first!', hi: 'आपने पहले बज़र दबाया!', gu: 'તમે પહેલા બઝર દબાવ્યું!' },
  'team.tooLate': { en: 'Too late — another team buzzed', hi: 'देर हो गई — दूसरी टीम ने बज़र दबाया', gu: 'મોડું થયું — બીજી ટીમે બઝર દબાવ્યું' },
  'team.currentQuestion': { en: 'Current question', hi: 'वर्तमान सवाल', gu: 'હાલનો પ્રશ્ન' },
  'team.buzz': { en: 'Buzz', hi: 'बज़र', gu: 'બઝર' },

  'stage.enableSound': { en: 'Enable sound', hi: 'ध्वनि चालू करें', gu: 'સાઉન્ડ ચાલુ કરો' },
  'stage.soundOn': { en: 'Sound on', hi: 'ध्वनि चालू', gu: 'સાઉન્ડ ચાલુ' },
  'stage.voice': { en: 'Voice', hi: 'आवाज़', gu: 'અવાજ' },
  'stage.on': { en: 'On', hi: 'चालू', gu: 'ચાલુ' },
  'stage.off': { en: 'Off', hi: 'बंद', gu: 'બંધ' },
  'stage.fullscreen': { en: 'Fullscreen', hi: 'फुल स्क्रीन', gu: 'ફુલસ્ક્રીન' },
  'stage.exitFull': { en: 'Exit full', hi: 'फुल स्क्रीन से बाहर', gu: 'ફુલસ્ક્રીનમાંથી બહાર' },
  'stage.onStage': { en: 'ON STAGE', hi: 'मंच पर', gu: 'મંચ પર' },
  'stage.question': { en: 'QUESTION', hi: 'सवाल', gu: 'પ્રશ્ન' },
  'stage.seconds': { en: 'SECONDS', hi: 'सेकंड', gu: 'સેકન્ડ' },
  'stage.leaderboard': { en: 'Leaderboard', hi: 'लीडरबोर्ड', gu: 'લીડરબોર્ડ' },
  'stage.rank1': { en: '1st place', hi: 'पहला स्थान', gu: 'પ્રથમ સ્થાન' },
  'stage.rank2': { en: '2nd place', hi: 'दूसरा स्थान', gu: 'બીજું સ્થાન' },
  'stage.rank3': { en: '3rd place', hi: 'तीसरा स्थान', gu: 'ત્રીજું સ્થાન' },
  'stage.rankN': { en: (n: number) => `Rank ${n}`, hi: (n: number) => `रैंक ${n}`, gu: (n: number) => `ક્રમ ${n}` },
  'stage.pts': { en: 'pts', hi: 'अंक', gu: 'પોઈન્ટ' },
  'stage.nowOnStage': { en: 'Now on stage', hi: 'अब मंच पर', gu: 'હવે મંચ પર' },
  'stage.waitingAnswer': {
    en: 'The team answers — the quiz master will reveal the correct answer',
    hi: 'टीम जवाब दे — क्विज़ मास्टर सही उत्तर दिखाएँगे',
    gu: 'ટીમ જવાબ આપે — ક્વિઝ માસ્તર સાચો જવાબ બતાવશે',
  },
  'stage.answer': { en: 'ANSWER', hi: 'उत्तर', gu: 'જવાબ' },
  'stage.correctBanner': { en: 'Correct!', hi: 'सही जवाब!', gu: 'સાચો જવાબ!' },
  'stage.wrongBanner': { en: 'Not quite', hi: 'गलत जवाब', gu: 'ખોટો જવાબ' },
  'stage.correctAnswerLabel': { en: 'Correct answer', hi: 'सही उत्तर', gu: 'સાચો જવાબ' },
  'stage.points': { en: 'points', hi: 'अंक', gu: 'પોઈન્ટ' },
} as const;

type Key = keyof typeof STRINGS;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('quiz_lang') : null;
    if (saved === 'en' || saved === 'hi' || saved === 'gu') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('quiz_lang', l);
  };

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  // `t` accepts a key and, for parameterised strings, the arguments that string needs.
  function t<K extends Key>(key: K, ...args: (typeof STRINGS)[K]['en'] extends (...a: infer A) => string ? A : []): string {
    const entry = STRINGS[key][lang] ?? STRINGS[key].en;
    return typeof entry === 'function' ? (entry as (...a: unknown[]) => string)(...args) : entry;
  }
  return { lang, setLang, t };
}

export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switcher ${className || ''}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`lang-switcher-btn ${lang === l.code ? 'lang-switcher-active' : ''}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
