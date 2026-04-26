import { loadSoundEnabled, saveSoundEnabled } from './storage.js';

const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;

let enabled = loadSoundEnabled();
let ctx = null;
let master = null;
let noiseBuffer = null;

function hasAudioSupport() {
  return typeof window !== 'undefined' && !!AudioContextCtor;
}

function ensureAudio() {
  if (!enabled || !hasAudioSupport()) return null;
  if (!ctx) {
    ctx = new AudioContextCtor();
    master = ctx.createGain();
    master.gain.value = 0.05;
    master.connect(ctx.destination);
  }
  return ctx;
}

function getNoiseBuffer(context) {
  if (noiseBuffer) return noiseBuffer;
  const buffer = context.createBuffer(1, context.sampleRate * 0.18, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function schedule(playback) {
  if (!enabled) return;
  const context = ensureAudio();
  if (!context) return;

  const startPlayback = () => playback(context);
  if (context.state === 'running') {
    startPlayback();
    return;
  }

  context.resume().then(startPlayback).catch(() => {});
}

function tone({
  context,
  start = 0,
  duration = 0.09,
  frequency = 440,
  endFrequency = frequency,
  volume = 0.18,
  type = 'sine',
}) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + start;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), now + duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noise({
  context,
  start = 0,
  duration = 0.07,
  volume = 0.04,
  lowpass = 1100,
}) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime + start;

  source.buffer = getNoiseBuffer(context);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpass, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(now);
  source.stop(now + duration + 0.02);
}

export function primeAudio() {
  const context = ensureAudio();
  if (!context || context.state === 'running') return;
  context.resume().catch(() => {});
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value) {
  enabled = !!value;
  saveSoundEnabled(enabled);
  if (enabled) {
    const context = ensureAudio();
    if (context && master) master.gain.setTargetAtTime(0.05, context.currentTime, 0.01);
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.01);
  }
  return enabled;
}

export function playDieToggle(isKept) {
  schedule((context) => {
    tone({
      context,
      duration: 0.05,
      frequency: isKept ? 620 : 480,
      endFrequency: isKept ? 700 : 420,
      volume: 0.05,
      type: 'triangle',
    });
  });
}

export function playRoll(diceCount) {
  schedule((context) => {
    const hits = Math.max(2, Math.min(5, diceCount));
    for (let i = 0; i < hits; i++) {
      const start = i * 0.032;
      noise({
        context,
        start,
        duration: 0.055,
        volume: 0.018 + i * 0.002,
        lowpass: 900 + i * 120,
      });
      tone({
        context,
        start,
        duration: 0.07,
        frequency: 170 + i * 22,
        endFrequency: 120 + i * 12,
        volume: 0.018,
        type: 'triangle',
      });
    }
  });
}

export function playVerdict(correct) {
  schedule((context) => {
    if (correct) {
      tone({ context, duration: 0.11, frequency: 520, endFrequency: 620, volume: 0.045, type: 'sine' });
      tone({ context, start: 0.07, duration: 0.12, frequency: 660, endFrequency: 780, volume: 0.038, type: 'sine' });
      return;
    }

    tone({ context, duration: 0.11, frequency: 360, endFrequency: 290, volume: 0.045, type: 'triangle' });
    tone({ context, start: 0.055, duration: 0.12, frequency: 280, endFrequency: 220, volume: 0.036, type: 'triangle' });
  });
}

export function playScoreMark() {
  schedule((context) => {
    tone({
      context,
      duration: 0.06,
      frequency: 760,
      endFrequency: 640,
      volume: 0.04,
      type: 'triangle',
    });
  });
}

export function playGameComplete() {
  schedule((context) => {
    tone({ context, duration: 0.14, frequency: 440, endFrequency: 520, volume: 0.04, type: 'sine' });
    tone({ context, start: 0.09, duration: 0.16, frequency: 554, endFrequency: 659, volume: 0.038, type: 'sine' });
    tone({ context, start: 0.18, duration: 0.2, frequency: 659, endFrequency: 880, volume: 0.034, type: 'sine' });
  });
}
