// Web Audio API Sound Effects & Procedural Motocross Background Music

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  public muted = false;
  public musicEnabled = true;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.24 : 0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.24 : 0, this.ctx.currentTime, 0.05);
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    endFreq?: number,
    target: 'sfx' | 'music' = 'sfx'
  ) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    if (target === 'music' && !this.musicEnabled) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    const dest = target === 'music' ? this.musicGain : this.sfxGain;
    if (dest) {
      gain.connect(dest);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoiseBurst(duration: number, filterFreq: number, volume = 0.12, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    if (this.sfxGain) {
      gain.connect(this.sfxGain);
    }

    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  // ==================== BACKGROUND MUSIC SEQUENCER ====================
  public startBackgroundMusic() {
    if (this.isMusicPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // Energetic 132 BPM arcade motocross groove (16th note = ~113ms)
    const bassPattern = [110, 0, 110, 110, 130.81, 0, 146.83, 0, 110, 0, 110, 110, 164.81, 0, 146.83, 130.81];
    const leadPattern = [440, 0, 523.25, 0, 587.33, 659.25, 587.33, 0, 523.25, 0, 440, 523.25, 659.25, 0, 783.99, 659.25];

    const stepLoop = () => {
      if (!this.isMusicPlaying) return;
      if (!this.muted && this.musicEnabled) {
        const s = this.musicStep % 16;

        // Kick drum on beats 0, 4, 8, 12
        if (s % 4 === 0) {
          this.playTone(135, 0.11, 'sine', 0.34, 0, 42, 'music');
        }
        // Snare / hi-hat accent on off-beats
        if (s % 4 === 2) {
          this.playTone(240, 0.05, 'triangle', 0.1, 0, 90, 'music');
        }

        // Driving bassline
        const bassFreq = bassPattern[s];
        if (bassFreq > 0) {
          this.playTone(bassFreq, 0.11, 'sawtooth', 0.13, 0, bassFreq * 0.96, 'music');
        }

        // Uplifting synth lead every second bar
        if (Math.floor(this.musicStep / 16) % 2 === 1) {
          const leadFreq = leadPattern[s];
          if (leadFreq > 0) {
            this.playTone(leadFreq, 0.12, 'triangle', 0.11, 0, undefined, 'music');
          }
        }
      }

      this.musicStep += 1;
      this.musicTimer = window.setTimeout(stepLoop, 115);
    };

    stepLoop();
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ==================== TRACK & FIELD + QUIZ SFX ====================
  public playEngineRev(intense = false) {
    // Sprint turbo wind burst & energetic stride boost
    this.playNoiseBurst(intense ? 0.24 : 0.14, intense ? 1100 : 750, intense ? 0.12 : 0.08, 0);
    this.playTone(intense ? 260 : 180, 0.16, 'triangle', 0.09, 0, intense ? 520 : 320);
  }

  public playCorrect() {
    this.playTone(523.25, 0.1, 'triangle', 0.16, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.16, 0.06);
    this.playTone(783.99, 0.2, 'sine', 0.15, 0.12);
    this.playEngineRev(true);
  }

  public playWrong() {
    // Hurdle clatter + stumble thud + descending buzzer
    this.playTone(140, 0.24, 'sine', 0.22, 0, 42);
    this.playNoiseBurst(0.26, 780, 0.18, 0);
    this.playTone(210, 0.18, 'sawtooth', 0.11, 0.05, 105);
  }

  public playJump() {
    this.playTone(190, 0.22, 'sine', 0.12, 0, 540);
    this.playNoiseBurst(0.12, 1300, 0.06, 0.01);
  }

  public playBonus() {
    this.playTone(587.33, 0.09, 'sine', 0.14, 0);
    this.playTone(880, 0.11, 'sine', 0.14, 0.06);
    this.playTone(1174.66, 0.18, 'triangle', 0.13, 0.12);
  }

  public playShieldSave() {
    this.playTone(440, 0.12, 'sine', 0.14, 0, 680);
    this.playTone(680, 0.18, 'triangle', 0.14, 0.07, 920);
  }

  public playCountdown(isGo: boolean) {
    if (isGo) {
      // Starting pistol crack + high go tone
      this.playNoiseBurst(0.18, 1600, 0.24, 0);
      this.playTone(880, 0.35, 'triangle', 0.2, 0, 1046.5);
    } else {
      this.playTone(440, 0.15, 'sine', 0.15, 0);
    }
  }

  private createNoiseBuffer(ctx: AudioContext, duration: number, warm = false): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (warm) {
        // Gentle pink/brown-leaning smoothing for fuller stadium roar
        lastOut = (lastOut + 0.08 * white) / 1.08;
        data[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  public playFinishWhistle(delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const dest = this.sfxGain ?? ctx.destination;

    // Distinct two-blast track referee pea-whistle ("PRIT — PRIIIIIT!")
    // Completely distinct from the starting pistol crack at race start
    const blasts = [
      { offset: 0, duration: 0.13, baseFreq: 2880, vol: 0.16 },
      { offset: 0.17, duration: 0.44, baseFreq: 2960, vol: 0.19 },
    ];

    for (const blast of blasts) {
      const start = ctx.currentTime + delay + blast.offset;
      const end = start + blast.duration;

      // Primary whistle tone
      const oscMain = ctx.createOscillator();
      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(blast.baseFreq, start);
      oscMain.frequency.exponentialRampToValueAtTime(blast.baseFreq * 1.03, start + blast.duration * 0.4);
      oscMain.frequency.exponentialRampToValueAtTime(blast.baseFreq * 0.97, end);

      // Overtone harmonic for metallic pea-whistle brightness
      const oscHarm = ctx.createOscillator();
      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(blast.baseFreq * 1.18, start);

      // Fast LFO simulating the rattling pea inside the referee whistle
      const peaLfo = ctx.createOscillator();
      peaLfo.type = 'sine';
      peaLfo.frequency.setValueAtTime(42, start);

      const peaFreqGain = ctx.createGain();
      peaFreqGain.gain.setValueAtTime(145, start);
      peaLfo.connect(peaFreqGain);
      peaFreqGain.connect(oscMain.frequency);

      const tremoloGain = ctx.createGain();
      tremoloGain.gain.setValueAtTime(0.86, start);

      const peaAmpGain = ctx.createGain();
      peaAmpGain.gain.setValueAtTime(0.14, start);
      peaLfo.connect(peaAmpGain);
      peaAmpGain.connect(tremoloGain.gain);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, start);
      env.gain.linearRampToValueAtTime(blast.vol, start + 0.015);
      env.gain.setValueAtTime(blast.vol * 0.92, end - 0.045);
      env.gain.exponentialRampToValueAtTime(0.001, end);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.22, start);

      oscMain.connect(tremoloGain);
      oscHarm.connect(harmGain);
      harmGain.connect(tremoloGain);
      tremoloGain.connect(env);
      env.connect(dest);

      oscMain.start(start);
      oscHarm.start(start);
      peaLfo.start(start);

      oscMain.stop(end + 0.02);
      oscHarm.stop(end + 0.02);
      peaLfo.stop(end + 0.02);

      // Breathy air puff through whistle mouthpiece
      this.playNoiseBurst(blast.duration * 0.85, 3200, 0.05, delay + blast.offset);
    }
  }

  public playCrowdCheer(delay = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const dest = this.sfxGain ?? ctx.destination;
    const start = ctx.currentTime + delay;
    const totalDur = 2.15;

    // 1. Warm stadium roar swell (crowd voices low-mid formant)
    const roarNoise = ctx.createBufferSource();
    roarNoise.buffer = this.createNoiseBuffer(ctx, totalDur, true);

    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'bandpass';
    roarFilter.Q.value = 0.85;
    roarFilter.frequency.setValueAtTime(520, start);
    roarFilter.frequency.exponentialRampToValueAtTime(1080, start + 0.35);
    roarFilter.frequency.exponentialRampToValueAtTime(760, start + totalDur);

    const roarGain = ctx.createGain();
    roarGain.gain.setValueAtTime(0.001, start);
    roarGain.gain.linearRampToValueAtTime(0.32, start + 0.2);
    roarGain.gain.setValueAtTime(0.28, start + 0.75);
    roarGain.gain.exponentialRampToValueAtTime(0.001, start + totalDur);

    roarNoise.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(dest);
    roarNoise.start(start);
    roarNoise.stop(start + totalDur + 0.03);

    // 2. Excited upper-formant cheering shimmer ("Hoooooray!") with vocal flutter
    const cheerNoise = ctx.createBufferSource();
    cheerNoise.buffer = this.createNoiseBuffer(ctx, totalDur * 0.9, false);

    const cheerFilter = ctx.createBiquadFilter();
    cheerFilter.type = 'bandpass';
    cheerFilter.Q.value = 1.65;
    cheerFilter.frequency.setValueAtTime(1650, start);
    cheerFilter.frequency.exponentialRampToValueAtTime(2250, start + 0.42);
    cheerFilter.frequency.exponentialRampToValueAtTime(1500, start + totalDur * 0.88);

    const flutterGain = ctx.createGain();
    flutterGain.gain.setValueAtTime(0.82, start);

    const flutterLfo = ctx.createOscillator();
    flutterLfo.type = 'sine';
    flutterLfo.frequency.setValueAtTime(8.5, start);
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.setValueAtTime(0.18, start);

    const cheerGain = ctx.createGain();
    cheerGain.gain.setValueAtTime(0.001, start);
    cheerGain.gain.linearRampToValueAtTime(0.18, start + 0.24);
    cheerGain.gain.exponentialRampToValueAtTime(0.001, start + totalDur * 0.88);

    flutterLfo.connect(flutterDepth);
    flutterDepth.connect(flutterGain.gain);
    cheerNoise.connect(cheerFilter);
    cheerFilter.connect(flutterGain);
    flutterGain.connect(cheerGain);
    cheerGain.connect(dest);

    cheerNoise.start(start);
    flutterLfo.start(start);
    cheerNoise.stop(start + totalDur * 0.9 + 0.02);
    flutterLfo.stop(start + totalDur * 0.9 + 0.02);

    // 3. Rapid stadium applause / clapping bursts across the stands
    const clapCount = 16;
    for (let i = 0; i < clapCount; i++) {
      const clapDelay = delay + 0.14 + i * 0.088 + (i % 3) * 0.015;
      const clapFreq = 1850 + ((i * 271) % 950);
      const clapVol = i < 10 ? 0.075 : 0.075 * (1 - (i - 10) / 8);
      this.playNoiseBurst(0.045, clapFreq, Math.max(0.015, clapVol), clapDelay);
    }
  }

  public playFinishFanfare() {
    // 1. Distinct finish referee pea-whistle right as the winner crosses the line
    this.playFinishWhistle(0);

    // 2. Stadium crowd cheer & applause erupting immediately after the whistle
    this.playCrowdCheer(0.12);

    // 3. Triumphant brass-like victory arpeggio & chord
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.26, 'triangle', 0.14, 0.22 + idx * 0.11);
    });
    this.playTone(523.25, 0.52, 'sine', 0.1, 0.66);
    this.playTone(783.99, 0.52, 'triangle', 0.1, 0.66);
    this.playTone(1046.5, 0.56, 'triangle', 0.12, 0.66);
  }
}

export const soundEngine = new SoundEngine();
