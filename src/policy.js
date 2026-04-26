import { K_MULTISETS, K_PROBS } from './dice.js';
import { scoreCategory } from './scoring.js';

export let V = null;
let policyCatCount = 15;

export function loadPolicy(data) {
  V = data.V;
  policyCatCount = Math.round(Math.log2(V.length));
}

let dpMemo = new Map();

function policyMask(mask) {
  return mask & ((1 << policyCatCount) - 1);
}

export function bestPlacementEV(counts, openMask, upper) {
  let best = -Infinity;
  for (let c = 0; c < policyCatCount; c++) {
    if (openMask & (1 << c)) continue;
    const s  = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const fv = V[policyMask(openMask | (1 << c))][Math.min(upper + ua, 63)];
    if (s + fv > best) best = s + fv;
  }
  return best === -Infinity ? 0 : best;
}

export function bestPlacement(counts, openMask, upper) {
  let best = null;
  for (let c = 0; c < policyCatCount; c++) {
    if (openMask & (1 << c)) continue;
    const s  = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const ev = s + V[policyMask(openMask | (1 << c))][Math.min(upper + ua, 63)];
    if (!best || ev > best.ev) best = { cat: c, ev, score: s };
  }
  return best;
}

export function catEV(counts, openMask, upper, cat) {
  const s  = scoreCategory(counts, cat);
  const ua = cat < 6 ? (cat + 1) * counts[cat] : 0;
  const nextMask = cat < policyCatCount ? openMask | (1 << cat) : openMask;
  return s + V[policyMask(nextMask)][Math.min(upper + ua, 63)];
}

function keepSubsets(counts) {
  const result = [];
  function gen(face, cur) {
    if (face === 6) { result.push([...cur]); return; }
    for (let k = 0; k <= counts[face]; k++) { cur[face] = k; gen(face + 1, cur); }
  }
  gen(0, [0,0,0,0,0,0]);
  return result;
}

export function evAfterKeep(kept, nextRerolls, openMask, upper) {
  const kRoll = 5 - kept.reduce((a, b) => a + b, 0);
  let ev = 0;
  const outcomes = K_MULTISETS[kRoll], probs = K_PROBS[kRoll];
  for (let i = 0; i < outcomes.length; i++) {
    const full = kept.map((c, j) => c + outcomes[i][j]);
    const val  = nextRerolls === 0
      ? bestPlacementEV(full, openMask, upper)
      : bestKeepEV(full, nextRerolls, openMask, upper);
    ev += probs[i] * val;
  }
  return ev;
}

function bestKeepEV(counts, rerolls, openMask, upper) {
  const key = `${counts.join(',')},${rerolls}`;
  if (dpMemo.has(key)) return dpMemo.get(key);
  let best = -Infinity;
  for (const keep of keepSubsets(counts)) {
    const ev = evAfterKeep(keep, rerolls - 1, openMask, upper);
    if (ev > best) best = ev;
  }
  dpMemo.set(key, best);
  return best;
}

export function computeOptimalKeep(counts, rerolls, openMask, upper) {
  dpMemo = new Map();
  let best = null;
  for (const keep of keepSubsets(counts)) {
    const ev = evAfterKeep(keep, rerolls - 1, openMask, upper);
    if (!best || ev > best.ev) best = { keep: [...keep], ev };
  }
  return best;
}
