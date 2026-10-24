/**
 * Web Audio API procedural sound synthesizer & background music engine for Archery Clash.
 * Works 100% offline with zero external audio assets.
 * Includes:
 * - Background Music & Ambient Valley Wind ('menu' & 'combat' dynamic soundtrack)
 * - Realistic Bow Draw Creak ('playBowPull')
 * - Multi-layered Bow & Energy Shooting SFX ('playDisparo')
 * - Dynamic Doppler Arrow Flight Whistle & Wind Rush ('startFlechaVolando' / 'updateFlechaVolando')
 * - Terrain & Hill Spark Impact ('playImpactoEnTierra')
 * - Character Body & Critical Headshot Impact ('playImpactoEnEnemigo')
 * - Victory & Defeat Fanfares ('playVictoria' / 'playDerrota')
 */

export type MusicMode = 'menu' | 'combat';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true;

  // Arrow in-flight nodes
  private flightNoiseNode: AudioBufferSourceNode | null = null;
  private flightGainNode: GainNode | null = null;
  private flightOscNode: OscillatorNode | null = null;
  private flightFilterNode: BiquadFilterNode | null = null;
  private isFlyingSoundPlaying: boolean = false;

  // Bow pull throttle timestamp
  private lastBowPullTime: number = 0;

  // Background ambient wind & music sequencer nodes
  private bgMusicInterval: number | null = null;
  private bgMusicStep: number = 0;
  private musicMode: MusicMode = 'menu';
  private isBgRunning: boolean = false;

  private ambientNoiseNode: AudioBufferSourceNode | null = null;
  private ambientFilterNode: BiquadFilterNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private ambientLfoNode: OscillatorNode | null = null;
  private windIntensity: number = 1.0;

  constructor() {
    const savedMute = localStorage.getItem('bowmaster_muted');
    this.isMuted = savedMute === 'true';

    const savedMusic = localStorage.getItem('bowmaster_music');
    this.isMusicEnabled = savedMusic !== 'false';

    this.setupAutoUnlock();
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initCtx();
      if (!this.isMuted && this.isMusicEnabled && !this.isBgRunning) {
        this.startBackgroundMusic(this.musicMode);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bowmaster_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopFlechaVolando();
      this.stopBackgroundMusic();
    } else {
      this.initCtx();
      if (this.isMusicEnabled) {
        this.startBackgroundMusic(this.musicMode);
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.isMusicEnabled = !this.isMusicEnabled;
    localStorage.setItem('bowmaster_music', String(this.isMusicEnabled));
    if (!this.isMusicEnabled || this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.initCtx();
      this.startBackgroundMusic(this.musicMode);
    }
    return this.isMusicEnabled;
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  // =========================================================================
  // 0. BACKGROUND SOUND & AMBIENT MUSIC ENGINE ('menu' | 'combat')
  // =========================================================================
  public startBackgroundMusic(mode: MusicMode = 'menu') {
    this.musicMode = mode;
    if (this.isMuted || !this.isMusicEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    // Start continuous valley wind ambience if not already running
    if (!this.ambientNoiseNode) {
      this.startAmbientWindLayer();
    } else {
      this.updateAmbientWindGain();
    }

    // Start melodic & percussive background loop if not already running
    if (this.bgMusicInterval !== null) {
      this.isBgRunning = true;
      return;
    }

    this.isBgRunning = true;
    this.bgMusicStep = 0;

    // 250ms per 16th-like step (~120 BPM medieval tactical pulse)
    this.bgMusicInterval = window.setInterval(() => {
      if (this.isMuted || !this.isMusicEnabled || !this.ctx || this.ctx.state !== 'running') {
        return;
      }
      this.playBackgroundStep(this.bgMusicStep);
      this.bgMusicStep = (this.bgMusicStep + 1) % 32;
    }, 250);
  }

  public setMusicMode(mode: MusicMode) {
    this.musicMode = mode;
    if (!this.isMuted && this.isMusicEnabled) {
      if (!this.isBgRunning) {
        this.startBackgroundMusic(mode);
      } else {
        this.updateAmbientWindGain();
      }
    }
  }

  public setAmbientWindIntensity(windSpeed: number) {
    this.windIntensity = Math.min(2.2, Math.max(0.4, Math.abs(windSpeed) * 0.55 + 0.5));
    if (this.ctx && this.ambientFilterNode && this.ambientGainNode && !this.isMuted && this.isMusicEnabled) {
      const t = this.ctx.currentTime;
      const targetFreq = 220 + this.windIntensity * 160;
      try {
        this.ambientFilterNode.frequency.setTargetAtTime(targetFreq, t, 0.35);
        this.updateAmbientWindGain();
      } catch {
        // ignore
      }
    }
  }

  private updateAmbientWindGain() {
    if (!this.ctx || !this.ambientGainNode) return;
    const t = this.ctx.currentTime;
    const baseGain = this.musicMode === 'combat' ? 0.042 : 0.026;
    const targetGain =
      this.isMuted || !this.isMusicEnabled
        ? 0.0001
        : Math.min(0.085, baseGain * this.windIntensity);
    try {
      this.ambientGainNode.gain.setTargetAtTime(targetGain, t, 0.3);
    } catch {
      // ignore
    }
  }

  private startAmbientWindLayer() {
    if (!this.ctx) return;
    this.stopAmbientWindLayer();

    const sampleRate = this.ctx.sampleRate;
    const durationSeconds = 4;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate smooth pink-like wind noise
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // Slow LFO to make the valley wind breathe naturally
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.16, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(110, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    const initialGain = this.musicMode === 'combat' ? 0.042 : 0.026;
    gain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    lfo.start();

    this.ambientNoiseNode = noise;
    this.ambientFilterNode = filter;
    this.ambientGainNode = gain;
    this.ambientLfoNode = lfo;
  }

  private stopAmbientWindLayer() {
    if (this.ambientNoiseNode) {
      try {
        this.ambientNoiseNode.stop();
      } catch {
        // ignore
      }
      this.ambientNoiseNode = null;
    }
    if (this.ambientLfoNode) {
      try {
        this.ambientLfoNode.stop();
      } catch {
        // ignore
      }
      this.ambientLfoNode = null;
    }
    this.ambientFilterNode = null;
    this.ambientGainNode = null;
  }

  private playBackgroundStep(step: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const isCombat = this.musicMode === 'combat';

    // 1. Warm Bass Drone Pad on bar boundaries (steps 0, 8, 16, 24)
    if (step % 8 === 0) {
      // D2 (73.42), Bb1 (58.27), F2 (87.31), A1 (55.00)
      const bassRoots = [73.42, 58.27, 87.31, 65.41];
      const rootFreq = bassRoots[Math.floor(step / 8) % bassRoots.length];

      const padOsc = this.ctx.createOscillator();
      const padFifth = this.ctx.createOscillator();
      const padFilter = this.ctx.createBiquadFilter();
      const padGain = this.ctx.createGain();

      padOsc.type = 'triangle';
      padFifth.type = 'sine';
      padOsc.frequency.setValueAtTime(rootFreq, t);
      padFifth.frequency.setValueAtTime(rootFreq * 1.5, t); // Perfect 5th

      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(340, t);

      const maxPadVol = isCombat ? 0.055 : 0.045;
      padGain.gain.setValueAtTime(0.001, t);
      padGain.gain.linearRampToValueAtTime(maxPadVol, t + 0.35);
      padGain.gain.exponentialRampToValueAtTime(0.0008, t + 1.95);

      padOsc.connect(padFilter);
      padFifth.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.ctx.destination);

      padOsc.start(t);
      padFifth.start(t);
      padOsc.stop(t + 2.0);
      padFifth.stop(t + 2.0);
    }

    // 2. Plucked Medieval Harp / Lute Arpeggio (D Dorian heroic melody)
    // Frequencies in Hz: D4=293.66, F4=349.23, G4=392.00, A4=440.00, Bb4=466.16, C5=523.25, D5=587.33
    const melodyPattern: (number | null)[] = [
      293.66, null, 349.23, 440.00, 587.33, null, 523.25, 440.00,
      466.16, null, 392.00, 349.23, 440.00, null, 293.66, null,
      349.23, null, 440.00, 523.25, 587.33, 659.25, 587.33, 440.00,
      392.00, null, 349.23, 329.63, 293.66, null, 220.00, null,
    ];

    const noteFreq = melodyPattern[step % melodyPattern.length];
    if (noteFreq) {
      const pluckOsc = this.ctx.createOscillator();
      const pluckGain = this.ctx.createGain();

      pluckOsc.type = 'triangle';
      pluckOsc.frequency.setValueAtTime(noteFreq, t);

      const noteVol = isCombat ? 0.036 : 0.03;
      pluckGain.gain.setValueAtTime(0.001, t);
      pluckGain.gain.linearRampToValueAtTime(noteVol, t + 0.015);
      pluckGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.42);

      pluckOsc.connect(pluckGain);
      pluckGain.connect(this.ctx.destination);

      pluckOsc.start(t);
      pluckOsc.stop(t + 0.44);
    }

    // 3. Tactical Combat Percussion (Taiko War Drum + Rim Click in 'combat' mode)
    if (isCombat) {
      // Deep Taiko Drum on beats 0, 3, 4, 6 of each 8-step bar
      const barStep = step % 8;
      if (barStep === 0 || barStep === 3 || barStep === 6) {
        const drumOsc = this.ctx.createOscillator();
        const drumGain = this.ctx.createGain();
        const isDownbeat = barStep === 0;

        drumOsc.type = 'sine';
        drumOsc.frequency.setValueAtTime(isDownbeat ? 105 : 82, t);
        drumOsc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

        drumGain.gain.setValueAtTime(isDownbeat ? 0.075 : 0.048, t);
        drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

        drumOsc.connect(drumGain);
        drumGain.connect(this.ctx.destination);

        drumOsc.start(t);
        drumOsc.stop(t + 0.2);
      } else if (barStep === 2 || barStep === 5 || barStep === 7) {
        // Subtle wooden shaker / rim tick
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'triangle';
        tickOsc.frequency.setValueAtTime(880, t);
        tickOsc.frequency.exponentialRampToValueAtTime(290, t + 0.03);

        tickGain.gain.setValueAtTime(0.015, t);
        tickGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);

        tickOsc.connect(tickGain);
        tickGain.connect(this.ctx.destination);
        tickOsc.start(t);
        tickOsc.stop(t + 0.04);
      }
    }
  }

  public stopBackgroundMusic() {
    if (this.bgMusicInterval !== null) {
      clearInterval(this.bgMusicInterval);
      this.bgMusicInterval = null;
    }
    this.isBgRunning = false;
    this.stopAmbientWindLayer();
  }

  // =========================================================================
  // 1. CONTEXTUAL SOUND: 'disparo' (Tiro de arco / Lanzamiento de proyectil)
  // =========================================================================
  public playDisparo(isEnergy: boolean = false, powerPercent: number = 85) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const powerScale = Math.min(1.2, Math.max(0.65, powerPercent / 85));

    if (isEnergy) {
      // 1A. High-tech laser / plasma blaster zap sweep
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const subGain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600 * powerScale, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.24);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);

      // Sub-bass plasma punch
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(220, t);
      subOsc.frequency.exponentialRampToValueAtTime(38, t + 0.2);

      subGain.gain.setValueAtTime(0.26, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.21);
    } else {
      // 1B. Traditional Bow Shot:
      // Layer 1: Resonant Bowstring Twang (vibrating string fundamental)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(285 * powerScale, t);
      osc.frequency.exponentialRampToValueAtTime(76, t + 0.19);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);

      // Layer 2: Bow Wood Limb Thump
      const woodOsc = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();
      woodOsc.type = 'sine';
      woodOsc.frequency.setValueAtTime(150, t);
      woodOsc.frequency.exponentialRampToValueAtTime(48, t + 0.11);

      woodGain.gain.setValueAtTime(0.25, t);
      woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      woodOsc.connect(woodGain);
      woodGain.connect(this.ctx.destination);
      woodOsc.start(t);
      woodOsc.stop(t + 0.12);

      // Layer 3: Supersonic Arrow Air-Slash Whoosh (Bandpass filtered noise burst)
      const burstSamples = Math.floor(this.ctx.sampleRate * 0.18);
      const noiseBuf = this.ctx.createBuffer(1, burstSamples, this.ctx.sampleRate);
      const channel = noiseBuf.getChannelData(0);
      for (let i = 0; i < burstSamples; i++) {
        const env = Math.sin((i / burstSamples) * Math.PI);
        channel[i] = (Math.random() * 2 - 1) * env;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuf;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1350 * powerScale, t);
      bandpass.frequency.exponentialRampToValueAtTime(340, t + 0.18);
      bandpass.Q.setValueAtTime(2.2, t);

      const whooshGain = this.ctx.createGain();
      whooshGain.gain.setValueAtTime(0.28, t);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noiseNode.connect(bandpass);
      bandpass.connect(whooshGain);
      whooshGain.connect(this.ctx.destination);
      noiseNode.start(t);

      // Layer 4: Feather Fletching Snap
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(1450, t);
      snapOsc.frequency.exponentialRampToValueAtTime(260, t + 0.055);

      snapGain.gain.setValueAtTime(0.14, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapOsc.start(t);
      snapOsc.stop(t + 0.06);
    }
  }

  // Alias for backward compatibility
  public playArrowShoot() {
    this.playDisparo(false);
  }

  public playLaserShoot() {
    this.playDisparo(true);
  }

  // =========================================================================
  // 2. CONTEXTUAL SOUND: 'flecha volando' (Whistle & wind whoosh in air)
  // =========================================================================
  public startFlechaVolando(isEnergy: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.stopFlechaVolando();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (isEnergy) {
      // Energetic pulsing hum for plasma / laser shots
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.linearRampToValueAtTime(720, t + 0.7);
      osc.frequency.linearRampToValueAtTime(460, t + 1.9);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(0.085, t);
    } else {
      // Aerodynamic arrow whistling through wind + soft air rush
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(760, t);
      osc.frequency.linearRampToValueAtTime(860, t + 0.65);
      osc.frequency.linearRampToValueAtTime(580, t + 1.9);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(780, t);
      filter.Q.setValueAtTime(4.5, t);

      gain.gain.setValueAtTime(0.075, t);

      // Continuous air-cutting noise while arrow flies
      const noiseDuration = 3.0;
      const noiseSamples = Math.floor(this.ctx.sampleRate * noiseDuration);
      const noiseBuffer = this.ctx.createBuffer(1, noiseSamples, this.ctx.sampleRate);
      const chan = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSamples; i++) {
        chan[i] = (Math.random() * 2 - 1) * 0.25;
      }

      const flightNoise = this.ctx.createBufferSource();
      flightNoise.buffer = noiseBuffer;
      flightNoise.connect(filter);
      flightNoise.start(t);
      this.flightNoiseNode = flightNoise;
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);

    this.flightOscNode = osc;
    this.flightFilterNode = filter;
    this.flightGainNode = gain;
    this.isFlyingSoundPlaying = true;
  }

  public stopFlechaVolando() {
    if (!this.ctx || !this.isFlyingSoundPlaying) return;

    const t = this.ctx.currentTime;
    if (this.flightGainNode) {
      try {
        this.flightGainNode.gain.cancelScheduledValues(t);
        this.flightGainNode.gain.setValueAtTime(this.flightGainNode.gain.value, t);
        this.flightGainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      } catch {
        // ignore
      }
    }

    if (this.flightOscNode) {
      try {
        this.flightOscNode.stop(t + 0.055);
      } catch {
        // ignore
      }
      this.flightOscNode = null;
    }

    if (this.flightNoiseNode) {
      try {
        this.flightNoiseNode.stop(t + 0.055);
      } catch {
        // ignore
      }
      this.flightNoiseNode = null;
    }

    this.flightFilterNode = null;
    this.flightGainNode = null;
    this.isFlyingSoundPlaying = false;
  }

  // =========================================================================
  // 3. CONTEXTUAL SOUND: 'impacto en tierra' (Impacto en colina / terreno)
  // =========================================================================
  public playImpactoEnTierra() {
    this.stopFlechaVolando();
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Deep low-frequency earth & hill thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

    gain.gain.setValueAtTime(0.34, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);

    // 2. Flint/Rock Spark Ping (matches visual hill sparks)
    const sparkOsc = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    sparkOsc.type = 'triangle';
    sparkOsc.frequency.setValueAtTime(1680, t);
    sparkOsc.frequency.exponentialRampToValueAtTime(520, t + 0.075);

    sparkGain.gain.setValueAtTime(0.15, t);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

    sparkOsc.connect(sparkGain);
    sparkGain.connect(this.ctx.destination);
    sparkOsc.start(t);
    sparkOsc.stop(t + 0.08);

    // 3. Dirt & gravel scatter crunch (filtered noise)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, t);
    filter.frequency.linearRampToValueAtTime(240, t + 0.16);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseSource.start(t);
  }

  // Alias for backward compatibility
  public playMiss() {
    this.playImpactoEnTierra();
  }

  // =========================================================================
  // 4. CONTEXTUAL SOUND: 'impacto en enemigo' (Cuerpo -25 HP / Headshot -50 HP)
  // =========================================================================
  public playImpactoEnEnemigo(isHeadshot: boolean = false) {
    this.stopFlechaVolando();
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // CRITICAL HEADSHOT: Heavy bass impact + armor/helmet crunch + resonant victory chime
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(320, t);
      punchOsc.frequency.exponentialRampToValueAtTime(48, t + 0.28);

      punchGain.gain.setValueAtTime(0.48, t);
      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      punchOsc.connect(punchGain);
      punchGain.connect(this.ctx.destination);
      punchOsc.start(t);
      punchOsc.stop(t + 0.29);

      // High resonant critical bell chime (B5 -> E6 -> G6)
      const bell1 = this.ctx.createOscillator();
      const bellGain1 = this.ctx.createGain();
      bell1.type = 'sine';
      bell1.frequency.setValueAtTime(987.77, t); // B5
      bell1.frequency.setValueAtTime(1318.51, t + 0.07); // E6
      bell1.frequency.setValueAtTime(1567.98, t + 0.15); // G6

      bellGain1.gain.setValueAtTime(0.34, t);
      bellGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

      bell1.connect(bellGain1);
      bellGain1.connect(this.ctx.destination);
      bell1.start(t);
      bell1.stop(t + 0.5);
    } else {
      // BODY HIT: Satisfying thud & armor penetration snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(225, t);
      osc.frequency.exponentialRampToValueAtTime(44, t + 0.19);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);

      // Short snap for arrow penetration
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sine';
      snap.frequency.setValueAtTime(460, t);
      snap.frequency.exponentialRampToValueAtTime(130, t + 0.085);

      snapGain.gain.setValueAtTime(0.24, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(t);
      snap.stop(t + 0.09);
    }
  }

  // Aliases for backward compatibility
  public playHitBody() {
    this.playImpactoEnEnemigo(false);
  }

  public playHeadshot() {
    this.playImpactoEnEnemigo(true);
  }

  // =========================================================================
  // 5. CONTEXTUAL SOUND: 'victoria/derrota' (Fanfarria triunfal / Melancolía)
  // =========================================================================
  public playVictoria() {
    this.stopFlechaVolando();
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Triumphant 5-note brass fanfare: C5, E5, G5, B5, C6
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.11;
      const isLast = idx === notes.length - 1;
      const duration = isLast ? 0.55 : 0.28;

      osc.type = isLast ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(isLast ? 0.35 : 0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  public playDerrota() {
    this.stopFlechaVolando();
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Dramatic descending sad cadence: A4, F#4, F4, D4
    const notes = [440, 369.99, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.22;
      const isLast = idx === notes.length - 1;
      const duration = isLast ? 0.65 : 0.32;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  // Aliases for backward compatibility
  public playVictory() {
    this.playVictoria();
  }

  public playDefeat() {
    this.playDerrota();
  }

  // =========================================================================
  // ADDITIONAL INTERFACE & BOW DRAW HELPERS
  // =========================================================================
  public playBowPull(tension: number) {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastBowPullTime < 75) return;
    this.lastBowPullTime = now;

    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const clampedTension = Math.min(1, Math.max(0, tension));
    const freq = 115 + clampedTension * 195;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq + 36, t + 0.075);

    gain.gain.setValueAtTime(0.095, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playRouletteTick(pitch: number = 600) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
}

// Global singleton instance
export const audioManager = new AudioManager();
export const sound = audioManager;
