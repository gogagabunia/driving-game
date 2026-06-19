export interface AudioSettings {
  master: number;   // 0.0 to 1.0
  engine: number;   // 0.0 to 1.0
  ambient: number;  // 0.0 to 1.0
  ui: number;       // 0.0 to 1.0
  muted: boolean;
}

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  
  // Engine nodes
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  
  // Horn nodes
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  // Ambience nodes
  private ambSource: AudioBufferSourceNode | null = null;
  private ambFilter: BiquadFilterNode | null = null;
  private ambGain: GainNode | null = null;
  private ambLFO: OscillatorNode | null = null;
  private ambLFOGain: GainNode | null = null;

  // Sound settings
  private settings: AudioSettings = {
    master: 0.7,
    engine: 0.8,
    ambient: 0.6,
    ui: 0.8,
    muted: false
  };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem('audioSettings');
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  public refreshSettings() {
    this.loadSettings();
    // Update active gains immediately
    const t = this.ctx?.currentTime || 0;
    
    // 1. Update Engine Gain
    if (this.engineGain) {
      const targetVol = this.settings.muted ? 0 : 0.08 * this.settings.engine * this.settings.master;
      this.engineGain.gain.setValueAtTime(targetVol, t);
    }

    // 2. Update Ambience Gain
    if (this.ambGain) {
      const targetVol = this.settings.muted ? 0 : 0.12 * this.settings.ambient * this.settings.master;
      this.ambGain.gain.setValueAtTime(targetVol, t);
    }
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  public setMute(muted: boolean) {
    this.settings.muted = muted;
    this.refreshSettings();
  }

  // --- Engine Channels ---
  public startEngine() {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      this.stopEngine();

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Low idle rumble

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(110, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      const targetVol = this.settings.muted ? 0 : 0.08 * this.settings.engine * this.settings.master;
      this.engineGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    } catch (e) {
      console.warn('Failed to start engine audio synthesis:', e);
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;
    if (this.settings.muted) return;

    const targetFreq = 45 + speedRatio * 160; 
    const targetFilterFreq = 110 + speedRatio * 320; 
    const targetVolume = (0.08 + speedRatio * 0.12) * this.settings.engine * this.settings.master;

    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, t, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVolume, t, 0.1);
  }

  public stopEngine() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      if (this.engineFilter) {
        this.engineFilter.disconnect();
        this.engineFilter = null;
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
        this.engineGain = null;
      }
    } catch (e) {}
  }

  // --- Ambience Channels (Waves / Wind / City Hum) ---
  public startAmbience(type: string) {
    this.initContext();
    if (!this.ctx) return;

    try {
      this.stopAmbience();

      const t = this.ctx.currentTime;
      this.ambGain = this.ctx.createGain();
      const targetVol = this.settings.muted ? 0 : 0.12 * this.settings.ambient * this.settings.master;
      this.ambGain.gain.setValueAtTime(targetVol, t);
      this.ambGain.connect(this.ctx.destination);

      if (type === 'coastal-waves' || type === 'port-harbor') {
        // Synthesize brown noise for sea waves rolls
        const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds loop
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }

        this.ambSource = this.ctx.createBufferSource();
        this.ambSource.buffer = buffer;
        this.ambSource.loop = true;

        this.ambFilter = this.ctx.createBiquadFilter();
        this.ambFilter.type = 'lowpass';
        this.ambFilter.frequency.setValueAtTime(180, t);

        // LFO to modulate wave swells (volume and filter sweeps)
        this.ambLFO = this.ctx.createOscillator();
        this.ambLFO.type = 'sine';
        this.ambLFO.frequency.setValueAtTime(0.2, t); // 5 seconds wave swell cycle

        this.ambLFOGain = this.ctx.createGain();
        this.ambLFOGain.gain.setValueAtTime(100, t);

        this.ambLFO.connect(this.ambLFOGain);
        this.ambLFOGain.connect(this.ambFilter.frequency); // sweeps filter frequency

        this.ambSource.connect(this.ambFilter);
        this.ambFilter.connect(this.ambGain);

        this.ambSource.start();
        this.ambLFO.start();
      } else if (type === 'mountain-wind' || type === 'mountain-nature' || type === 'highland-wind') {
        // Synthesize white noise for howling wind
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        this.ambSource = this.ctx.createBufferSource();
        this.ambSource.buffer = buffer;
        this.ambSource.loop = true;

        this.ambFilter = this.ctx.createBiquadFilter();
        this.ambFilter.type = 'bandpass';
        this.ambFilter.Q.setValueAtTime(10.0, t); // highly resonant wind hiss
        this.ambFilter.frequency.setValueAtTime(450, t);

        // LFO to sweep wind frequency
        this.ambLFO = this.ctx.createOscillator();
        this.ambLFO.type = 'sine';
        this.ambLFO.frequency.setValueAtTime(0.08, t); // 12 seconds howling cycle

        this.ambLFOGain = this.ctx.createGain();
        this.ambLFOGain.gain.setValueAtTime(150, t);

        this.ambLFO.connect(this.ambLFOGain);
        this.ambLFOGain.connect(this.ambFilter.frequency);

        this.ambSource.connect(this.ambFilter);
        this.ambFilter.connect(this.ambGain);

        this.ambSource.start();
        this.ambLFO.start();
      } else {
        // Default: Urban hum (urban-busy, urban-industrial, nature-park)
        // Synthesize a low frequency background rumble
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        this.ambSource = this.ctx.createBufferSource();
        this.ambSource.buffer = buffer;
        this.ambSource.loop = true;

        this.ambFilter = this.ctx.createBiquadFilter();
        this.ambFilter.type = 'lowpass';
        this.ambFilter.frequency.setValueAtTime(90, t); // very low hum

        this.ambSource.connect(this.ambFilter);
        this.ambFilter.connect(this.ambGain);

        this.ambSource.start();
      }
    } catch (e) {
      console.warn('Failed to start ambient audio synthesis:', e);
    }
  }

  public stopAmbience() {
    try {
      if (this.ambSource) {
        this.ambSource.stop();
        this.ambSource.disconnect();
        this.ambSource = null;
      }
      if (this.ambLFO) {
        this.ambLFO.stop();
        this.ambLFO.disconnect();
        this.ambLFO = null;
      }
      if (this.ambLFOGain) {
        this.ambLFOGain.disconnect();
        this.ambLFOGain = null;
      }
      if (this.ambFilter) {
        this.ambFilter.disconnect();
        this.ambFilter = null;
      }
      if (this.ambGain) {
        this.ambGain.disconnect();
        this.ambGain = null;
      }
    } catch (e) {}
  }

  // --- UI Sound Effects ---
  public playTick() {
    this.initContext();
    if (!this.ctx || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

      // Scale UI Volume
      const targetVol = 0.1 * this.settings.ui * this.settings.master;
      gain.gain.setValueAtTime(targetVol, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  public playHit() {
    this.initContext();
    if (!this.ctx || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, t);
      filter.frequency.exponentialRampToValueAtTime(30, t + 0.25);

      const gain = this.ctx.createGain();
      const targetVol = 0.4 * this.settings.ui * this.settings.master;
      gain.gain.setValueAtTime(targetVol, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.28);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.3);
    } catch (e) {}
  }

  public setHorn(active: boolean) {
    this.initContext();
    if (!this.ctx) return;

    if (!active) {
      this.stopHorn();
      return;
    }

    if (this.hornOsc1 || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();
      this.hornGain = this.ctx.createGain();

      this.hornOsc1.type = 'sawtooth';
      this.hornOsc1.frequency.setValueAtTime(370, t);

      this.hornOsc2.type = 'sawtooth';
      this.hornOsc2.frequency.setValueAtTime(415, t);

      // Scale UI/Horn Volume
      const targetVol = 0.15 * this.settings.ui * this.settings.master;
      this.hornGain.gain.setValueAtTime(targetVol, t);

      this.hornOsc1.connect(this.hornGain);
      this.hornOsc2.connect(this.hornGain);
      this.hornGain.connect(this.ctx.destination);

      this.hornOsc1.start();
      this.hornOsc2.start();
    } catch (e) {}
  }

  private stopHorn() {
    try {
      if (this.hornOsc1) {
        this.hornOsc1.stop();
        this.hornOsc1.disconnect();
        this.hornOsc1 = null;
      }
      if (this.hornOsc2) {
        this.hornOsc2.stop();
        this.hornOsc2.disconnect();
        this.hornOsc2 = null;
      }
      if (this.hornGain) {
        this.hornGain.disconnect();
        this.hornGain = null;
      }
    } catch (e) {}
  }

  public playWin() {
    this.initContext();
    if (!this.ctx || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25];
      const durations = [0.1, 0.1, 0.1, 0.4];

      let startTime = t;
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const targetVol = 0.15 * this.settings.ui * this.settings.master;
        gain.gain.setValueAtTime(targetVol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.005, startTime + durations[index]);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + durations[index]);

        startTime += 0.12;
      });
    } catch (e) {}
  }

  public playFail() {
    this.initContext();
    if (!this.ctx || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [196.00, 164.81, 130.81];
      const durations = [0.15, 0.15, 0.5];

      let startTime = t;
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const targetVol = 0.2 * this.settings.ui * this.settings.master;
        gain.gain.setValueAtTime(targetVol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.005, startTime + durations[index]);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + durations[index]);

        startTime += 0.18;
      });
    } catch (e) {}
  }

  public destroy() {
    this.stopEngine();
    this.stopHorn();
    this.stopAmbience();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
