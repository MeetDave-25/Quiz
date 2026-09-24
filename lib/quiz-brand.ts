// Event branding taken from "G K Quiz PPT.pptx" (images in public/quiz/).

export const EVENT = {
  university: 'LJ University',
  city: 'Ahmedabad',
  festival: 'Youth Festival 2026',
  title: 'Quiz Competition',
  coordinator: 'Dr. R. J. Pujari',
  credit: 'Made by Meet Dave · under the guidance of Parth D. Joshi',
  opening: '/quiz/opening.webp',
  thanks: '/quiz/thanks.webp',
};

// Team banners are matched to teams by seating order (1st team in the DB → Team 1 banner).
export const TEAM_BRANDS = [
  { name: 'Mind Masters', hi: 'माइंड मास्टर्स', banner: '/quiz/team-1.webp' },
  { name: 'Quiz Wizards', hi: 'क्वीज विजार्ड्स', banner: '/quiz/team-2.webp' },
  { name: 'The Brainiacs', hi: 'द ब्रेनिएक्स', banner: '/quiz/team-3.webp' },
  { name: 'Gyan Warriors', hi: 'ज्ञान वारियर्स', banner: '/quiz/team-4.webp' },
  { name: 'Alpha Minds', hi: 'अल्फा माइंड्स', banner: '/quiz/team-5.webp' },
];

export const ROUND_BRANDS: Record<number, { label: string; name: string; hi: string; banner: string }> = {
  1: { label: 'Round 1', name: 'General MCQ', hi: 'किसमें कितना है दम', banner: '/quiz/round-1.webp' },
  2: { label: 'Round 2', name: 'Direct Answer', hi: 'सोच समझ के', banner: '/quiz/round-2.webp' },
  3: { label: 'Round 3', name: 'Visual / Photo', hi: 'देश - परदेश', banner: '/quiz/round-3.webp' },
  4: { label: 'Round 4', name: 'Movie Clip', hi: 'देख भाई देख', banner: '/quiz/round-4.webp' },
  5: { label: 'Round 5', name: 'Rapid Fire', hi: 'रैपिड फायर', banner: '/quiz/round-5.webp' },
};

// How many questions each team gets in a round. Rounds not listed default to 5.
export const ROUND_TEAM_QUESTIONS: Record<number, number> = { 4: 2 };
export function questionsPerTeam(round: number) {
  return ROUND_TEAM_QUESTIONS[round] || 5;
}

export function teamBrand(teams: { id: number }[], teamId: number | null | undefined) {
  const idx = teams.findIndex((t) => t.id === teamId);
  return TEAM_BRANDS[idx >= 0 ? idx % TEAM_BRANDS.length : 0];
}

export function roundBrand(round: number | null | undefined) {
  return ROUND_BRANDS[round || 1] || ROUND_BRANDS[1];
}
