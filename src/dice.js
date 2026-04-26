import { PIPS } from './constants.js';

export const K_MULTISETS = {};
export const K_PROBS = {};

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function multinomialProb(counts) {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 1.0;
  let num = factorial(n);
  for (const c of counts) num /= factorial(c);
  return num / Math.pow(6, n);
}

export function buildDiceEngine() {
  for (let k = 0; k <= 5; k++) {
    K_MULTISETS[k] = [];
    if (k === 0) { K_MULTISETS[0] = [[0,0,0,0,0,0]]; K_PROBS[0] = [1.0]; continue; }
    for (let c1 = 0; c1 <= k; c1++)
    for (let c2 = 0; c2 <= k-c1; c2++)
    for (let c3 = 0; c3 <= k-c1-c2; c3++)
    for (let c4 = 0; c4 <= k-c1-c2-c3; c4++)
    for (let c5 = 0; c5 <= k-c1-c2-c3-c4; c5++) {
      const c6 = k - c1 - c2 - c3 - c4 - c5;
      K_MULTISETS[k].push([c1, c2, c3, c4, c5, c6]);
    }
    K_PROBS[k] = K_MULTISETS[k].map(c => multinomialProb(c));
  }
}

export function diceCounts(dice) {
  const c = [0,0,0,0,0,0];
  for (const d of dice) c[d - 1]++;
  return c;
}

export function keptCounts(dice, kept) {
  const c = [0,0,0,0,0,0];
  for (let i = 0; i < 5; i++) if (kept[i]) c[dice[i] - 1]++;
  return c;
}

export function countsToValues(counts) {
  const vals = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < counts[i]; j++) vals.push(i + 1);
  return vals;
}

export function arraysEqual(a, b) { return a.every((v, i) => v === b[i]); }

export function dieSVG(value) {
  const circles = PIPS[value]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="8.5"/>`)
    .join('');
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
}
