// KBC-style host voice.
// 1) If a recorded clip exists in public/voice/<key>.mp3, it is played (a real human voice).
// 2) Otherwise the best male Hindi browser voice speaks the line, with dramatic pauses at "…".

export const VOICE_CLIPS = [
  'welcome', 'question', 'timer-start', 'time-up', 'wrong',
  'lock-a', 'lock-b', 'lock-c', 'lock-d',
  'correct-1', 'correct-2', 'correct-3',
  'round-1', 'round-2', 'round-3', 'round-4',
  'team-1', 'team-2', 'team-3', 'team-4', 'team-5',
] as const;
type ClipKey = (typeof VOICE_CLIPS)[number];

const FEMALE = /swara|kalpana|heera|lekha|google हिन्दी|female|zira|aria|jenny|neerja/i;

function scoreVoice(v: SpeechSynthesisVoice) {
  const hindi = v.lang.toLowerCase().startsWith('hi');
  const natural = /natural|online|neural/i.test(v.name);
  if (FEMALE.test(v.name)) return hindi ? 5 : 0;
  if (hindi && /madhur/i.test(v.name)) return natural ? 100 : 90;
  if (hindi && /hemant/i.test(v.name)) return 80;
  if (hindi && /male/i.test(v.name)) return 70;
  if (hindi) return natural ? 50 : 40;
  if (/en-in/i.test(v.lang) && /prabhat|ravi|male/i.test(v.name)) return 30;
  return 0;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

class HostVoice {
  private enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  private clips = new Set<ClipKey>();
  private clipsChecked = false;
  private current: HTMLAudioElement | null = null;
  private token = 0;

  constructor() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.pickVoice();
    window.speechSynthesis.onvoiceschanged = () => this.pickVoice();
  }

  private pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    const best = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
    this.voice = scoreVoice(best) > 0 ? best : voices.find((v) => v.lang.startsWith('hi')) || null;
  }

  /** Looks for recorded clips once; safe to call repeatedly. */
  async loadClips() {
    if (this.clipsChecked || typeof window === 'undefined') return this.clips.size;
    this.clipsChecked = true;
    await Promise.all(VOICE_CLIPS.map(async (k) => {
      try {
        const res = await fetch(`/voice/${k}.mp3`, { method: 'HEAD' });
        if (res.ok && (res.headers.get('content-type') || '').includes('audio')) this.clips.add(k);
      } catch { /* clip missing */ }
    }));
    return this.clips.size;
  }

  info() {
    return {
      voiceName: this.voice?.name || 'Browser default',
      natural: !!this.voice && /natural|online|neural/i.test(this.voice.name),
      male: !!this.voice && scoreVoice(this.voice) >= 30,
      clips: this.clips.size,
      totalClips: VOICE_CLIPS.length,
    };
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
  }

  stop() {
    this.token++;
    this.current?.pause();
    this.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  private playClip(key: ClipKey, token: number) {
    return new Promise<void>((resolve) => {
      if (token !== this.token) return resolve();
      const a = new Audio(`/voice/${key}.mp3`);
      this.current = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }

  private sayChunk(text: string, token: number) {
    return new Promise<void>((resolve) => {
      if (token !== this.token || !('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      if (!this.voice) this.pickVoice();
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang || 'hi-IN';
      // Neural voices sound natural at near-normal pitch; heavy pitch-shifting makes them robotic.
      const natural = !!this.voice && /natural|online|neural/i.test(this.voice.name);
      u.pitch = natural ? 0.92 : 0.8;
      u.rate = natural ? 0.9 : 0.85;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  /** Speaks a line; "…" marks a dramatic pause. `clip` is used instead when a recording exists. */
  async say(text: string, clip?: ClipKey, suffix?: string) {
    if (!this.enabled || typeof window === 'undefined') return;
    this.stop();
    const token = this.token;
    await this.loadClips();

    if (clip && this.clips.has(clip)) {
      await this.playClip(clip, token);
    } else {
      const parts = text.split('…').map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        await this.sayChunk(parts[i], token);
        if (i < parts.length - 1) await pause(450);
      }
    }
    if (suffix) {
      await pause(300);
      await this.sayChunk(suffix, token);
    }
  }

  // ----- KBC lines -----
  speak(text: string) { return this.say(text); }
  welcome() { return this.say('नमस्कार… देवियों और सज्जनों… स्वागत है आपका… युवा महोत्सव 2026 की ज्ञान प्रतियोगिता में!', 'welcome'); }
  speakRound(n: number) {
    return this.say(`तो आइए… शुरू करते हैं… राउंड ${n}!`, `round-${Math.min(Math.max(n, 1), 4)}` as ClipKey);
  }
  speakTeamTurn(teamName: string, index: number) {
    return this.say(`अब मंच पर… आ रही है… ${teamName}!`, `team-${(index % 5) + 1}` as ClipKey);
  }
  speakQuestion() { return this.say('आपका अगला सवाल… ये रहा… आपकी स्क्रीन पर!', 'question'); }
  speakTimerStart() { return this.say('आपका समय… शुरू होता है… अब!', 'timer-start'); }
  speakTimeUp() { return this.say('और… आपका समय… समाप्त होता है!', 'time-up'); }
  speakLock(option: string) {
    const letter: Record<string, string> = { A: 'ए', B: 'बी', C: 'सी', D: 'डी' };
    const key = option.toUpperCase();
    return this.say(`कंप्यूटर जी… विकल्प ${letter[key] || key}… लॉक किया जाए!`, `lock-${key.toLowerCase()}` as ClipKey);
  }
  speakCorrect() {
    const lines = ['बिल्कुल सही जवाब!… शाबाश!', 'अद्भुत!… एकदम सही जवाब!', 'क्या बात है!… बिल्कुल सही उत्तर… पूरे दस अंक!'];
    const i = Math.floor(Math.random() * lines.length);
    return this.say(lines[i], `correct-${i + 1}` as ClipKey);
  }
  speakWrong(correctAnswer?: string) {
    return this.say('ओह… माफ़ कीजिए… यह गलत जवाब है।', 'wrong', correctAnswer ? `सही उत्तर था… ${correctAnswer}` : undefined);
  }
}

export const hostVoice = new HostVoice();
