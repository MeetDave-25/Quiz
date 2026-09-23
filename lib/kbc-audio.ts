// KBC Web Audio Sound Synthesis Engine
// 100% Client-side synthetic sound design - Zero external dependencies, 0ms latency

class KBCAudioEngine {
  private ctx: AudioContext | null = null;
  private clockInterval: any = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public init() {
    this.getContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stopClock();
  }

  public getMuted() {
    return this.isMuted;
  }

  // 1. Question Intro / Dramatic Boom
  public playQuestion() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass hit
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);

    // Suspense pad shimmer
    [220, 277.18, 329.63].forEach((freq) => {
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.type = 'triangle';
      pOsc.frequency.setValueAtTime(freq, now);
      pGain.gain.setValueAtTime(0.08, now);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      pOsc.connect(pGain);
      pGain.connect(ctx.destination);
      pOsc.start(now);
      pOsc.stop(now + 2.1);
    });
  }

  // 2. Option Appear Chime
  public playOption() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 3. Tension Clock (30s Ticking Heartbeat)
  public startClock() {
    if (this.isMuted) return;
    this.stopClock();
    const ctx = this.getContext();
    if (!ctx) return;

    let beat = 0;
    const tick = () => {
      if (this.isMuted) return;
      const now = ctx.currentTime;
      const isDownbeat = beat % 2 === 0;

      // Click sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isDownbeat ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isDownbeat ? 300 : 450, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);

      // Low tension throb
      if (isDownbeat) {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(65, now);
        subGain.gain.setValueAtTime(0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.4);
      }

      beat++;
    };

    tick();
    this.clockInterval = setInterval(tick, 1000);
  }

  public stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  // 4. Lock Option ("Lock Kiya Jaye!")
  public playLock() {
    this.stopClock();
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dramatic metallic stinger
    const freqs = [180, 270, 360, 540];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  // 5. Correct Answer Victory Fanfare!
  public playCorrect() {
    this.stopClock();
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Arpeggiated triumphant fanfare: C4 -> E4 -> G4 -> C5 -> E5 -> G5 chord burst
    const notes = [
      { f: 261.63, delay: 0.0, dur: 0.8 },
      { f: 329.63, delay: 0.08, dur: 0.8 },
      { f: 392.00, delay: 0.16, dur: 0.8 },
      { f: 523.25, delay: 0.24, dur: 1.6 },
      { f: 659.25, delay: 0.32, dur: 1.6 },
      { f: 783.99, delay: 0.40, dur: 2.2 },
      { f: 1046.50, delay: 0.45, dur: 2.5 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.delay);

      const start = now + note.delay;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.dur + 0.05);
    });

    // Sparkle bells
    for (let i = 0; i < 6; i++) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(1200 + i * 200, now + 0.3 + i * 0.08);
      bGain.gain.setValueAtTime(0.12, now + 0.3 + i * 0.08);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.08);
      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(now + 0.3 + i * 0.08);
      bOsc.stop(now + 0.8 + i * 0.08);
    }
  }

  // 6. Wrong Answer Dramatic Loss Gong
  public playWrong() {
    this.stopClock();
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Discordant heavy hit: low diminished chord + pitch dive
    const freqs = [110, 116.54, 155.56, 220]; // A2 + discordant intervals
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 1.2); // Sliding down

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  // 7. Time's Up Alarm
  public playTimeUp() {
    this.stopClock();
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const tStart = now + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, tStart);
      gain.gain.setValueAtTime(0.3, tStart);
      gain.gain.exponentialRampToValueAtTime(0.001, tStart + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(tStart);
      osc.stop(tStart + 0.2);
    }
  }

  // 8. Opening / Round Theme Fanfare
  public playIntro() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Royal chord sequence
    const chords = [
      { notes: [196, 293.66, 392], time: 0.0, dur: 0.6 },    // G
      { notes: [220, 277.18, 329.63], time: 0.5, dur: 0.6 }, // A
      { notes: [261.63, 329.63, 392], time: 1.0, dur: 1.8 }, // C
    ];

    chords.forEach((c) => {
      c.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + c.time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + c.time);

        gain.gain.setValueAtTime(0.001, now + c.time);
        gain.gain.linearRampToValueAtTime(0.2, now + c.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + c.time);
        osc.stop(now + c.time + c.dur + 0.1);
      });
    });
  }
}

export const kbcAudio = new KBCAudioEngine();
