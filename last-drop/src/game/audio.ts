import { GameSettings } from './types';

let audioCtx: AudioContext | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;
let cachedSaturationCurve: Float32Array<ArrayBuffer> | null = null;
let musicInterval: number | null = null;
let musicStep = 0;
let currentTrackId: string | null = null;
let activeMusicVol = 0.55;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const len = ctx.sampleRate; // 1.0s reusable white noise
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buf;
  return buf;
}

function getSaturationCurve(): Float32Array<ArrayBuffer> {
  if (cachedSaturationCurve) return cachedSaturationCurve;
  const samples = 256;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * 2.8);
  }
  cachedSaturationCurve = curve;
  return curve;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq + slide), t + dur);
    }
    gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // Ignore audio context errors
  }
}

function noiseBurst(
  dur: number,
  vol: number,
  filterType: BiquadFilterType,
  freqStart: number,
  freqEnd: number,
  q = 1,
  delay = 0,
  saturate = false
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, freqStart), t);
    if (freqEnd !== freqStart) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    if (saturate) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = getSaturationCurve();
      filter.connect(shaper);
      shaper.connect(gain);
    } else {
      filter.connect(gain);
    }
    gain.connect(ctx.destination);

    const offset = Math.random() * 0.6;
    src.start(t, offset, dur + 0.02);
  } catch {
    // Ignore audio context errors
  }
}

function chamberThump(
  freqStart: number,
  freqEnd: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'triangle',
  delay = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, freqEnd), t + dur);

    gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  } catch {
    // Ignore audio context errors
  }
}

function playGunshot(
  profile: 'pistol' | 'smg' | 'shotgun' | 'ar' | 'bolt' | 'rail',
  vol: number
) {
  const pitchJitter = 0.96 + Math.random() * 0.08;

  if (profile === 'pistol') {
    // 9mm handgun: sharp supersonic crack + tight chamber pop + crisp slide clack + short echo
    chamberThump(210 * pitchJitter, 52, 0.055, vol * 0.24, 'triangle');
    noiseBurst(0.032, vol * 0.34, 'highpass', 1800 * pitchJitter, 900, 0.8, 0, true);
    noiseBurst(0.095, vol * 0.24, 'bandpass', 1350 * pitchJitter, 420, 1.1, 0, true);
    noiseBurst(0.14, vol * 0.08, 'lowpass', 950, 260, 0.7, 0.02);
  } else if (profile === 'smg') {
    // Submachine gun: tight crisp automatic bark + rapid bolt tick + compact decay
    chamberThump(185 * pitchJitter, 62, 0.038, vol * 0.16, 'triangle');
    noiseBurst(0.022, vol * 0.28, 'highpass', 2300 * pitchJitter, 1100, 0.9, 0, true);
    noiseBurst(0.068, vol * 0.2, 'bandpass', 1600 * pitchJitter, 550, 1.25, 0, true);
    noiseBurst(0.09, vol * 0.055, 'lowpass', 1100, 320, 0.7, 0.014);
  } else if (profile === 'shotgun') {
    // 12-gauge pump shotgun: deep chest thump + wide saturated blast + long echo + pump clack
    chamberThump(155 * pitchJitter, 34, 0.11, vol * 0.42, 'sine');
    chamberThump(95 * pitchJitter, 28, 0.14, vol * 0.25, 'triangle');
    noiseBurst(0.045, vol * 0.44, 'highpass', 1200 * pitchJitter, 500, 0.7, 0, true);
    noiseBurst(0.24, vol * 0.38, 'bandpass', 780 * pitchJitter, 210, 0.85, 0, true);
    noiseBurst(0.36, vol * 0.16, 'lowpass', 720, 160, 0.7, 0.025);
    // Subtle pump-action clack right after firing
    noiseBurst(0.035, vol * 0.09, 'bandpass', 2600, 1600, 2.2, 0.21);
  } else if (profile === 'ar') {
    // 5.56mm assault rifle: crisp ballistic crack + punchy mid bark + mechanical buffer + echo
    chamberThump(195 * pitchJitter, 46, 0.065, vol * 0.26, 'triangle');
    noiseBurst(0.028, vol * 0.38, 'highpass', 2100 * pitchJitter, 950, 0.85, 0, true);
    noiseBurst(0.12, vol * 0.28, 'bandpass', 1100 * pitchJitter, 340, 1.0, 0, true);
    noiseBurst(0.22, vol * 0.11, 'lowpass', 880, 220, 0.7, 0.02);
  } else if (profile === 'bolt') {
    // Heavy .338 / .50 bolt sniper: massive crack + sub boom + long canyon echo + bolt cycle
    chamberThump(135 * pitchJitter, 28, 0.14, vol * 0.48, 'sine');
    chamberThump(260 * pitchJitter, 55, 0.075, vol * 0.28, 'triangle');
    noiseBurst(0.04, vol * 0.5, 'highpass', 2200 * pitchJitter, 700, 0.8, 0, true);
    noiseBurst(0.26, vol * 0.4, 'bandpass', 920 * pitchJitter, 190, 0.9, 0, true);
    noiseBurst(0.52, vol * 0.19, 'lowpass', 760, 130, 0.7, 0.03);
    // Mechanical bolt-action metallic cycle
    noiseBurst(0.03, vol * 0.09, 'bandpass', 3200, 2200, 3.0, 0.34);
    noiseBurst(0.035, vol * 0.1, 'bandpass', 2400, 1700, 2.8, 0.44);
  } else {
    // Heavy anti-materiel rail sniper: hyper-sonic whip crack + heavy capacitor punch + deep echo
    chamberThump(165 * pitchJitter, 30, 0.13, vol * 0.42, 'sine');
    chamberThump(720 * pitchJitter, 110, 0.09, vol * 0.14, 'sawtooth');
    noiseBurst(0.038, vol * 0.52, 'highpass', 2800 * pitchJitter, 850, 0.8, 0, true);
    noiseBurst(0.24, vol * 0.36, 'bandpass', 1150 * pitchJitter, 240, 1.0, 0, true);
    noiseBurst(0.48, vol * 0.17, 'lowpass', 820, 140, 0.7, 0.025);
  }
}

function synthPadChord(
  ctx: AudioContext,
  freqs: number[],
  dur: number,
  vol: number,
  cutoff = 950,
  wave: OscillatorType = 'triangle'
) {
  try {
    const t = ctx.currentTime + 0.01;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff * 0.7, t);
    filter.frequency.linearRampToValueAtTime(cutoff * 1.15, t + dur * 0.35);
    filter.frequency.linearRampToValueAtTime(cutoff * 0.65, t + dur);
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.28, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    filter.connect(gain);
    gain.connect(ctx.destination);

    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i];
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = wave;
      oscB.type = 'sine';
      oscA.frequency.setValueAtTime(f, t);
      oscB.frequency.setValueAtTime(f * 1.003, t); // gentle lush chorus detune
      oscA.connect(filter);
      oscB.connect(filter);
      oscA.start(t);
      oscB.start(t);
      oscA.stop(t + dur + 0.03);
      oscB.stop(t + dur + 0.03);
    }
  } catch {
    // Ignore audio context errors
  }
}

function synthBassNote(
  ctx: AudioContext,
  freq: number,
  dur: number,
  vol: number,
  wave: OscillatorType = 'sawtooth'
) {
  try {
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq * 0.5, t);

    filter.type = 'lowpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(Math.max(160, freq * 4.2), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(110, freq * 1.5), t + dur * 0.75);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.02);
    sub.stop(t + dur + 0.02);
  } catch {
    // Ignore audio context errors
  }
}

function synthPluck(
  ctx: AudioContext,
  freq: number,
  dur: number,
  vol: number,
  wave: OscillatorType = 'triangle',
  delayEcho = 0.19
) {
  const trigger = (startOffset: number, amp: number, detune = 0) => {
    try {
      const t = ctx.currentTime + 0.01 + startOffset;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = wave;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(detune, t);

      filter.type = 'lowpass';
      filter.Q.value = 1.1;
      filter.frequency.setValueAtTime(Math.min(4800, freq * 5), t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.6), t + dur * 0.8);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, amp), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Ignore audio context errors
    }
  };

  trigger(0, vol, 0);
  if (delayEcho > 0) {
    trigger(delayEcho, vol * 0.34, 4);
  }
}

function synthLobbyDrum(
  ctx: AudioContext,
  kind: 'kick' | 'hat' | 'snare',
  vol: number
) {
  try {
    const t = ctx.currentTime + 0.01;
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(118, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    } else if (kind === 'hat') {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(6800, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.connect(hp);
      hp.connect(gain);
      gain.connect(ctx.destination);
      src.start(t, Math.random() * 0.5, 0.06);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1850, t);
      bp.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0002, vol), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(t, Math.random() * 0.5, 0.13);
    }
  } catch {
    // Ignore audio context errors
  }
}

export function stopLobbyMusic() {
  if (musicInterval !== null) {
    window.clearInterval(musicInterval);
    musicInterval = null;
  }
  currentTrackId = null;
}

export function syncLobbyMusic(
  activeInLobby: boolean,
  trackId: string,
  settings: GameSettings
) {
  const shouldPlay =
    activeInLobby &&
    Boolean(settings.snd) &&
    Boolean(settings.lobbyMusic) &&
    settings.vol > 0 &&
    trackId !== 'mus_off';

  if (!shouldPlay) {
    stopLobbyMusic();
    return;
  }

  activeMusicVol = settings.vol;

  if (currentTrackId === trackId && musicInterval !== null) {
    return;
  }

  stopLobbyMusic();
  currentTrackId = trackId;
  musicStep = 0;

  interface LobbyTrack {
    stepMs: number;
    chords: number[][]; // 4 bars x 8 steps per bar = 32 steps
    bass: number[];
    lead: number[];
    drums: ('K' | 'S' | 'H' | 'KH' | '')[];
    padWave: OscillatorType;
    padCutoff: number;
    bassWave: OscillatorType;
    leadWave: OscillatorType;
  }

  // Note frequency helpers
  const C3 = 130.81, D3 = 146.83, Eb3 = 155.56, E3 = 164.81, F3 = 174.61, G3 = 196.0, Ab3 = 207.65, A3 = 220.0, Bb3 = 233.08, B3 = 246.94;
  const C4 = 261.63, Db4 = 277.18, D4 = 293.66, Eb4 = 311.13, E4 = 329.63, F4 = 349.23, Fs4 = 369.99, G4 = 392.0, Ab4 = 415.30, A4 = 440.0, Bb4 = 466.16, B4 = 493.88;
  const C5 = 523.25, D5 = 587.33, Eb5 = 622.25, E5 = 659.25, Fs5 = 739.99, G5 = 783.99, A5 = 880.0;

  const tracks: Record<string, LobbyTrack> = {
    // 118 BPM uplifting modern Battle Royale lobby anthem (Cm -> Ab -> Eb -> Bb)
    mus_skydrop: {
      stepMs: 132,
      chords: [
        [C4, Eb4, G4],
        [Ab3, C4, Eb4],
        [Eb4, G4, Bb4],
        [Bb3, D4, F4],
      ],
      bass: [
        C3, 0, C3, 0, C3, 0, G3 * 0.5, C3,
        Ab3 * 0.5, 0, Ab3 * 0.5, 0, Ab3 * 0.5, 0, Eb3, Ab3 * 0.5,
        Eb3, 0, Eb3, 0, Eb3, 0, Bb3 * 0.5, Eb3,
        Bb3 * 0.5, 0, Bb3 * 0.5, 0, Bb3 * 0.5, 0, F3 * 0.5, G3 * 0.5,
      ],
      lead: [
        G4, 0, Eb5, 0, D5, C5, 0, Bb4,
        C5, 0, Ab4, 0, Eb4, 0, G4, 0,
        Bb4, 0, G5, 0, F5(), Eb5, 0, D5,
        F4, 0, Bb4, 0, D5, 0, C5, Bb4,
      ],
      drums: [
        'K', 'H', 'H', 'H', 'S', 'H', 'K', 'H',
        'K', 'H', 'K', 'H', 'S', 'H', 'H', 'H',
      ],
      padWave: 'triangle',
      padCutoff: 1100,
      bassWave: 'sawtooth',
      leadWave: 'triangle',
    },

    // 126 BPM driving Arena synthwave (Am -> F -> C -> G)
    mus_stormfront: {
      stepMs: 120,
      chords: [
        [A3, C4, E4],
        [F3, A3, C4],
        [C4, E4, G4],
        [G3, B3, D4],
      ],
      bass: [
        A3 * 0.5, A3 * 0.5, A3, A3 * 0.5, A3 * 0.5, A3, A3 * 0.5, G3 * 0.5,
        F3 * 0.5, F3 * 0.5, F3, F3 * 0.5, F3 * 0.5, F3, F3 * 0.5, E3 * 0.5,
        C3, C3, C4 * 0.5, C3, C3, C4 * 0.5, C3, B3 * 0.5,
        G3 * 0.5, G3 * 0.5, G3, G3 * 0.5, G3 * 0.5, G3, G3 * 0.5, E3 * 0.5,
      ],
      lead: [
        E4, A4, C5, 0, E5, 0, C5, B4,
        C5, 0, A4, F4, 0, C5, A4, 0,
        G4, C5, E5, 0, G5, 0, E5, D5,
        B4, 0, G4, D4, 0, G4, B4, 0,
      ],
      drums: [
        'K', 'H', 'K', 'H', 'S', 'H', 'K', 'H',
        'K', 'H', 'K', 'H', 'S', 'H', 'S', 'H',
      ],
      padWave: 'sawtooth',
      padCutoff: 880,
      bassWave: 'sawtooth',
      leadWave: 'triangle',
    },

    // 96 BPM warm Sunset Island lounge (Dmaj7 -> Gmaj7 -> Bm7 -> A6)
    mus_victory: {
      stepMs: 165,
      chords: [
        [D4, Fs4, A4, Db4 * 2],
        [G3, B3, D4, Fs4],
        [B3, D4, Fs4, A4],
        [A3, Db4, E4, Fs4],
      ],
      bass: [
        D3, 0, 0, A3 * 0.5, D3, 0, A3 * 0.5, 0,
        G3 * 0.5, 0, 0, D3, G3 * 0.5, 0, D3, 0,
        B3 * 0.5, 0, 0, Fs4 * 0.25, B3 * 0.5, 0, Fs4 * 0.25, 0,
        A3 * 0.5, 0, 0, E3, A3 * 0.5, 0, E3, 0,
      ],
      lead: [
        A4, 0, Fs5, 0, E5, D5, 0, A4,
        B4, 0, D5, 0, Fs5, 0, D5, 0,
        D5, 0, Fs5, 0, A5, 0, Fs5, D5,
        E5, 0, Db4 * 2, 0, A4, 0, Fs4, 0,
      ],
      drums: [
        'K', '', 'H', '', 'S', '', 'H', 'K',
        'K', '', 'H', '', 'S', '', 'H', '',
      ],
      padWave: 'sine',
      padCutoff: 1250,
      bassWave: 'triangle',
      leadWave: 'sine',
    },
  };

  function F5() {
    return 698.46;
  }

  const track = tracks[trackId] || tracks.mus_skydrop;

  musicInterval = window.setInterval(() => {
    const ctx = getCtx();
    if (!ctx || ctx.state === 'suspended') return;
    const step = musicStep % 32;
    const barIdx = Math.floor(step / 8);
    const stepInBar = step % 8;
    const master = activeMusicVol;

    // Warm polyphonic chord pad triggered cleanly at the start of each bar
    if (stepInBar === 0) {
      const chord = track.chords[barIdx];
      synthPadChord(
        ctx,
        chord,
        (track.stepMs * 8) / 1000 * 0.96,
        master * 0.036,
        track.padCutoff,
        track.padWave
      );
    }

    // Deep filtered synth bassline
    const bFreq = track.bass[step];
    if (bFreq > 0) {
      synthBassNote(
        ctx,
        bFreq,
        (track.stepMs * 1.4) / 1000,
        master * 0.055,
        track.bassWave
      );
    }

    // Plucked lead melody with soft echo
    const lFreq = track.lead[step];
    if (lFreq > 0) {
      synthPluck(
        ctx,
        lFreq,
        (track.stepMs * 1.8) / 1000,
        master * 0.042,
        track.leadWave,
        (track.stepMs * 1.5) / 1000
      );
    }

    // Subtle electronic drum pulse
    const drum = track.drums[step % track.drums.length];
    if (drum === 'K' || drum === 'KH') {
      synthLobbyDrum(ctx, 'kick', master * 0.065);
    }
    if (drum === 'S') {
      synthLobbyDrum(ctx, 'snare', master * 0.022);
    }
    if (drum === 'H' || drum === 'KH') {
      synthLobbyDrum(ctx, 'hat', master * 0.012);
    }

    musicStep++;
  }, track.stepMs);
}

export type SfxKey =
  | 'g0' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8' | 'g9' | 'g10' | 'g11' | 'g12'
  | 'hit' | 'hurt' | 'kill' | 'die' | 'boom' | 'impulse' | 'reverse' | 'pick' | 'reload' | 'empty' | 'bounce'
  | 'healStart' | 'healDone'
  | 'doorOpen' | 'doorClose' | 'chest' | 'jump' | 'air' | 'tick' | 'go' | 'ui' | 'win' | 'lose';

export function playSfx(
  key: SfxKey,
  settings: GameSettings,
  distFromCamera?: number
) {
  if (!settings.snd || settings.vol <= 0) return;

  let att = 1;
  if (distFromCamera !== undefined) {
    const maxRange = key === 'g5' || key === 'g9' || key === 'boom' ? 1450 : 1100;
    att = Math.max(0, 1 - distFromCamera / maxRange);
    att = att * att; // realistic inverse-distance falloff
  }
  if (att < 0.03) return;

  const v = settings.vol * att;

  switch (key) {
    case 'g0':
      noiseBurst(0.065, 0.14 * v, 'bandpass', 950, 380, 1.1);
      break;
    case 'g1':
      playGunshot('pistol', v);
      break;
    case 'g2':
      playGunshot('smg', v);
      break;
    case 'g3':
      playGunshot('shotgun', v);
      break;
    case 'g4':
      playGunshot('ar', v);
      break;
    case 'g5':
      playGunshot('bolt', v);
      break;
    case 'g9':
      playGunshot('rail', v);
      break;
    case 'g6':
    case 'g10':
    case 'g11':
      noiseBurst(0.08, 0.12 * v, 'bandpass', 1400, 600, 1.2);
      tone(340, 0.08, 'sine', 0.06 * v, 160);
      break;
    case 'hit':
      noiseBurst(0.04, 0.14 * v, 'bandpass', 1900, 900, 1.8);
      tone(240, 0.05, 'triangle', 0.05 * v, -100);
      break;
    case 'hurt':
      chamberThump(130, 48, 0.11, 0.22 * settings.vol, 'triangle');
      noiseBurst(0.09, 0.16 * settings.vol, 'lowpass', 750, 220, 0.8);
      break;
    case 'kill':
      tone(660, 0.12, 'triangle', 0.1 * settings.vol, 0);
      setTimeout(() => tone(990, 0.18, 'triangle', 0.1 * settings.vol, 0), 90);
      break;
    case 'die':
      noiseBurst(0.14, 0.12 * v, 'lowpass', 680, 180);
      break;
    case 'boom':
      chamberThump(110, 24, 0.36, 0.52 * v, 'sine');
      noiseBurst(0.55, 0.45 * v, 'lowpass', 900, 110, 0.7, 0, true);
      noiseBurst(0.08, 0.35 * v, 'highpass', 1400, 400, 0.8, 0, true);
      break;
    case 'impulse':
      tone(420, 0.28, 'sine', 0.14 * v, 520);
      noiseBurst(0.18, 0.16 * v, 'bandpass', 1400, 3200, 1.2);
      break;
    case 'reverse':
      tone(760, 0.32, 'sine', 0.14 * v, -520);
      noiseBurst(0.18, 0.16 * v, 'bandpass', 2400, 600, 1.2);
      break;
    case 'pick':
      tone(800, 0.07, 'triangle', 0.07 * settings.vol, 0);
      setTimeout(() => tone(1100, 0.08, 'triangle', 0.07 * settings.vol, 0), 60);
      break;
    case 'chest':
      tone(540, 0.09, 'triangle', 0.09 * settings.vol, 240);
      setTimeout(() => tone(880, 0.14, 'triangle', 0.09 * settings.vol, 320), 80);
      break;
    case 'doorOpen':
      noiseBurst(0.035, 0.16 * v, 'bandpass', 1800, 900, 2.2);
      tone(220, 0.11, 'triangle', 0.07 * v, 110);
      break;
    case 'doorClose':
      chamberThump(130, 46, 0.08, 0.2 * v, 'triangle');
      noiseBurst(0.055, 0.22 * v, 'lowpass', 620, 180, 1.0);
      break;
    case 'jump':
      noiseBurst(0.24, 0.14 * settings.vol, 'bandpass', 600, 260);
      tone(340, 0.22, 'sine', 0.08 * settings.vol, -160);
      break;
    case 'reload':
      noiseBurst(0.03, 0.12 * settings.vol, 'bandpass', 2600, 1800, 2.6);
      noiseBurst(0.035, 0.14 * settings.vol, 'bandpass', 2100, 1400, 2.4, 0.11);
      break;
    case 'empty':
      noiseBurst(0.018, 0.1 * settings.vol, 'bandpass', 3200, 2400, 3.0);
      break;
    case 'bounce':
      chamberThump(165, 80, 0.045, 0.14 * v, 'triangle');
      break;
    case 'g7':
    case 'g8':
    case 'g12':
    case 'healStart':
      tone(440, 0.08, 'sine', 0.06 * settings.vol, 140);
      noiseBurst(0.05, 0.08 * settings.vol, 'bandpass', 1800, 1200, 1.5);
      break;
    case 'healDone':
      tone(620, 0.1, 'triangle', 0.08 * settings.vol, 180);
      setTimeout(() => tone(880, 0.14, 'sine', 0.09 * settings.vol, 140), 75);
      break;
    case 'air':
      tone(500, 0.5, 'sine', 0.1 * settings.vol, 400);
      break;
    case 'tick':
      tone(600, 0.08, 'sine', 0.08 * settings.vol, 0);
      break;
    case 'go':
      tone(900, 0.3, 'triangle', 0.1 * settings.vol, 300);
      break;
    case 'ui':
      tone(700, 0.04, 'square', 0.03 * settings.vol, 0);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.2, 'triangle', 0.1 * settings.vol, 0), i * 120);
      });
      break;
    case 'lose':
      tone(300, 0.6, 'sawtooth', 0.08 * settings.vol, -200);
      break;
  }
}
