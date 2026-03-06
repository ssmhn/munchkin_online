/**
 * Procedural sound engine using Web Audio API.
 * All sounds are generated from oscillators/noise -- no audio files needed.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/** Master gain that the sound store controls. */
let masterGain: GainNode | null = null;

export function getMasterGain(): GainNode {
  const c = getCtx();
  if (!masterGain) {
    masterGain = c.createGain();
    masterGain.connect(c.destination);
  }
  return masterGain;
}

export function setMasterVolume(v: number) {
  getMasterGain().gain.setValueAtTime(Math.max(0, Math.min(1, v)), getCtx().currentTime);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function osc(
  type: OscillatorType,
  freq: number,
  duration: number,
  gainVal: number,
  dest: AudioNode,
  startOffset = 0,
): { oscillator: OscillatorNode; gain: GainNode } {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + startOffset);
  g.gain.setValueAtTime(0, c.currentTime + startOffset);
  g.gain.linearRampToValueAtTime(gainVal, c.currentTime + startOffset + 0.01);
  g.gain.linearRampToValueAtTime(0, c.currentTime + startOffset + duration);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime + startOffset);
  o.stop(c.currentTime + startOffset + duration + 0.05);
  return { oscillator: o, gain: g };
}

function noise(duration: number, gainVal: number, dest: AudioNode, startOffset = 0): GainNode {
  const c = getCtx();
  const bufferSize = c.sampleRate * (duration + 0.1);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime + startOffset);
  g.gain.linearRampToValueAtTime(gainVal, c.currentTime + startOffset + 0.005);
  g.gain.linearRampToValueAtTime(0, c.currentTime + startOffset + duration);
  src.connect(g);
  g.connect(dest);
  src.start(c.currentTime + startOffset);
  src.stop(c.currentTime + startOffset + duration + 0.05);
  return g;
}

// ---------------------------------------------------------------------------
// UI sounds
// ---------------------------------------------------------------------------

export function playButtonClick() {
  const dest = getMasterGain();
  osc('sine', 800, 0.06, 0.15, dest);
  osc('sine', 1200, 0.04, 0.1, dest, 0.02);
}

export function playCardFlip() {
  const dest = getMasterGain();
  noise(0.08, 0.12, dest);
  osc('sine', 600, 0.05, 0.08, dest, 0.02);
  osc('sine', 900, 0.04, 0.06, dest, 0.04);
}

export function playCardSlide() {
  const dest = getMasterGain();
  const c = getCtx();
  // Filtered noise sweep
  const bufferSize = c.sampleRate * 0.2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, c.currentTime);
  filter.frequency.linearRampToValueAtTime(800, c.currentTime + 0.15);
  filter.Q.setValueAtTime(2, c.currentTime);
  const g = c.createGain();
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.18);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(c.currentTime);
  src.stop(c.currentTime + 0.25);
}

// ---------------------------------------------------------------------------
// Combat sounds
// ---------------------------------------------------------------------------

export function playSwordClash() {
  const dest = getMasterGain();
  // Metallic clash: noise burst + high harmonics
  noise(0.08, 0.2, dest);
  osc('sawtooth', 1800, 0.1, 0.12, dest);
  osc('square', 2400, 0.06, 0.08, dest, 0.01);
  osc('sine', 400, 0.15, 0.1, dest, 0.02);
  // Second clash
  noise(0.06, 0.15, dest, 0.12);
  osc('sawtooth', 2000, 0.08, 0.1, dest, 0.12);
}

export function playVictoryFanfare() {
  const dest = getMasterGain();
  // Triumphant ascending notes: C5-E5-G5-C6
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    osc('sine', freq, 0.2, 0.15, dest, i * 0.15);
    osc('triangle', freq * 2, 0.15, 0.05, dest, i * 0.15);
  });
  // Sustain final chord
  osc('sine', 1047, 0.5, 0.12, dest, 0.6);
  osc('sine', 784, 0.5, 0.08, dest, 0.6);
  osc('sine', 523, 0.5, 0.08, dest, 0.6);
}

export function playDefeatRumble() {
  const dest = getMasterGain();
  const c = getCtx();
  // Low rumble
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(80, c.currentTime);
  o.frequency.linearRampToValueAtTime(40, c.currentTime + 0.6);
  g.gain.setValueAtTime(0.2, c.currentTime);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.7);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.8);
  // Descending tone
  osc('sine', 300, 0.3, 0.1, dest);
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(300, c.currentTime + 0.1);
  o2.frequency.linearRampToValueAtTime(100, c.currentTime + 0.5);
  g2.gain.setValueAtTime(0.12, c.currentTime + 0.1);
  g2.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  o2.connect(g2);
  g2.connect(dest);
  o2.start(c.currentTime + 0.1);
  o2.stop(c.currentTime + 0.7);
  noise(0.4, 0.06, dest, 0.05);
}

// ---------------------------------------------------------------------------
// Card event sounds
// ---------------------------------------------------------------------------

export function playDrawCard() {
  const dest = getMasterGain();
  const c = getCtx();
  // Whoosh: filtered noise with frequency sweep
  const bufferSize = c.sampleRate * 0.25;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, c.currentTime);
  filter.frequency.linearRampToValueAtTime(3000, c.currentTime + 0.1);
  filter.frequency.linearRampToValueAtTime(800, c.currentTime + 0.22);
  filter.Q.setValueAtTime(1.5, c.currentTime);
  const g = c.createGain();
  g.gain.setValueAtTime(0.15, c.currentTime);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.22);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(c.currentTime);
  src.stop(c.currentTime + 0.3);
  // Subtle tonal accent
  osc('sine', 700, 0.06, 0.05, dest, 0.05);
}

export function playEquipItem() {
  const dest = getMasterGain();
  // Metallic clink
  osc('sine', 2200, 0.08, 0.12, dest);
  osc('sine', 3300, 0.06, 0.08, dest, 0.01);
  osc('triangle', 1800, 0.1, 0.06, dest, 0.02);
  // Subtle confirmation
  osc('sine', 880, 0.1, 0.06, dest, 0.06);
  osc('sine', 1100, 0.08, 0.05, dest, 0.1);
}

export function playCurseDarkTone() {
  const dest = getMasterGain();
  const c = getCtx();
  // Dark descending sweep
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(500, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.5);
  g.gain.setValueAtTime(0.12, c.currentTime);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.7);
  // Dissonant overlay
  osc('square', 233, 0.3, 0.05, dest, 0.05);
  osc('sine', 247, 0.3, 0.05, dest, 0.05);
  noise(0.2, 0.03, dest, 0.1);
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

export function playDiceRoll() {
  const dest = getMasterGain();
  // Rapid rattle: series of short noise bursts
  for (let i = 0; i < 6; i++) {
    noise(0.03, 0.1 + Math.random() * 0.05, dest, i * 0.04);
    osc('sine', 800 + Math.random() * 600, 0.025, 0.04, dest, i * 0.04);
  }
  // Final impact
  noise(0.06, 0.15, dest, 0.28);
  osc('sine', 500, 0.08, 0.08, dest, 0.28);
}

// ---------------------------------------------------------------------------
// Level up
// ---------------------------------------------------------------------------

export function playLevelUp() {
  const dest = getMasterGain();
  // Ascending chime: quick arpeggio
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    osc('sine', freq, 0.15, 0.12, dest, i * 0.08);
    osc('triangle', freq * 1.5, 0.1, 0.03, dest, i * 0.08 + 0.01);
  });
  // Sparkle
  osc('sine', 2637, 0.3, 0.06, dest, 0.4);
  osc('sine', 3520, 0.2, 0.04, dest, 0.45);
}

export function playLevelDown() {
  const dest = getMasterGain();
  // Descending chime
  const notes = [784, 659, 523, 392];
  notes.forEach((freq, i) => {
    osc('sine', freq, 0.12, 0.1, dest, i * 0.1);
  });
}

// ---------------------------------------------------------------------------
// Game win
// ---------------------------------------------------------------------------

export function playGameWin() {
  const dest = getMasterGain();
  // Grand triumphant fanfare
  // First phrase
  const phrase1 = [523, 659, 784, 1047];
  phrase1.forEach((freq, i) => {
    osc('sine', freq, 0.25, 0.15, dest, i * 0.18);
    osc('triangle', freq * 2, 0.2, 0.06, dest, i * 0.18);
  });
  // Pause then final chord
  const chordStart = 0.85;
  osc('sine', 1047, 0.8, 0.15, dest, chordStart);
  osc('sine', 1319, 0.8, 0.12, dest, chordStart);
  osc('sine', 1568, 0.8, 0.1, dest, chordStart);
  osc('triangle', 523, 0.8, 0.08, dest, chordStart);
  // Sparkles
  for (let i = 0; i < 5; i++) {
    osc('sine', 2000 + Math.random() * 2000, 0.1, 0.04, dest, chordStart + 0.1 + i * 0.12);
  }
}

// ---------------------------------------------------------------------------
// Misc events
// ---------------------------------------------------------------------------

export function playDoorKick() {
  const dest = getMasterGain();
  // Impact thud + creak
  noise(0.1, 0.18, dest);
  osc('sine', 120, 0.15, 0.15, dest);
  osc('sine', 200, 0.08, 0.06, dest, 0.05);
  // Creak
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, c.currentTime + 0.08);
  o.frequency.linearRampToValueAtTime(450, c.currentTime + 0.2);
  o.frequency.linearRampToValueAtTime(350, c.currentTime + 0.3);
  g.gain.setValueAtTime(0, c.currentTime + 0.08);
  g.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.12);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime + 0.08);
  o.stop(c.currentTime + 0.35);
}

export function playRunAway() {
  const dest = getMasterGain();
  const c = getCtx();
  // Quick ascending whoosh
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(200, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.25);
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.35);
  // Footstep-like beats
  for (let i = 0; i < 4; i++) {
    noise(0.03, 0.08, dest, i * 0.06);
  }
}

export function playHelperJoined() {
  const dest = getMasterGain();
  // Friendly two-note chime
  osc('sine', 660, 0.12, 0.1, dest);
  osc('sine', 880, 0.15, 0.12, dest, 0.1);
  osc('triangle', 1320, 0.1, 0.04, dest, 0.12);
}

export function playItemsSold() {
  const dest = getMasterGain();
  // Coin clinks
  for (let i = 0; i < 3; i++) {
    osc('sine', 2800 + Math.random() * 400, 0.06, 0.1, dest, i * 0.08);
    osc('triangle', 4000 + Math.random() * 500, 0.04, 0.05, dest, i * 0.08 + 0.01);
  }
}

export function playCardDiscard() {
  const dest = getMasterGain();
  noise(0.06, 0.08, dest);
  osc('sine', 400, 0.08, 0.06, dest, 0.02);
}

export function playTurnEnd() {
  const dest = getMasterGain();
  osc('sine', 440, 0.1, 0.06, dest);
  osc('sine', 330, 0.12, 0.05, dest, 0.08);
}

export function playMonsterCloned() {
  const dest = getMasterGain();
  const c = getCtx();
  // Eerie doubling effect
  osc('sine', 350, 0.2, 0.08, dest);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(350, c.currentTime + 0.05);
  o.frequency.linearRampToValueAtTime(370, c.currentTime + 0.25);
  g.gain.setValueAtTime(0.08, c.currentTime + 0.05);
  g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime + 0.05);
  o.stop(c.currentTime + 0.35);
  osc('sawtooth', 180, 0.2, 0.04, dest, 0.1);
}

export function playBadStuff() {
  const dest = getMasterGain();
  // Ominous low tone
  osc('sawtooth', 100, 0.25, 0.1, dest);
  osc('sine', 150, 0.2, 0.08, dest, 0.05);
  noise(0.15, 0.04, dest, 0.05);
}
