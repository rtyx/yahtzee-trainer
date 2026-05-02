let scoringOptions = {
  combinationScore: 'fixed',
};

export function setScoringOptions(options = {}) {
  scoringOptions = { ...scoringOptions, ...options };
}

function scoringMode(options) {
  return options.combinationScore ?? options.fullHouseScore ?? 'fixed';
}

function kindScore(counts, size, fixedScore, options) {
  for (let i = 5; i >= 0; i--) {
    if (counts[i] >= size) return scoringMode(options) === 'sum' ? (i + 1) * size : fixedScore;
  }
  return 0;
}

function straightScore(counts, length, fixedScore, options) {
  const vals = new Set();
  counts.forEach((c, i) => { if (c > 0) vals.add(i + 1); });
  for (let start = 1; start <= 7 - length; start++) {
    const run = Array.from({ length }, (_, i) => start + i);
    if (run.every(v => vals.has(v))) {
      return scoringMode(options) === 'sum' ? run.reduce((sum, v) => sum + v, 0) : fixedScore;
    }
  }
  return 0;
}

export function scoreCategory(counts, cat, options = scoringOptions) {
  const diceSum = counts.reduce((s, c, i) => s + (i + 1) * c, 0);
  const maxC = Math.max(...counts);
  if (cat < 6)   return (cat + 1) * counts[cat];
  if (cat === 6)  return kindScore(counts, 3, 20, options);
  if (cat === 7)  return kindScore(counts, 4, 30, options);
  if (cat === 8) {
    const nz = counts.filter(c => c > 0).sort((a, b) => a - b);
    const isFullHouse = nz.length === 2 && nz[0] === 2 && nz[1] === 3;
    if (!isFullHouse) return 0;
    return 25;
  }
  if (cat === 9)  return straightScore(counts, 4, 30, options);
  if (cat === 10) return straightScore(counts, 5, 40, options);
  if (cat === 11) return maxC === 5 ? 50 : 0;
  if (cat === 12) return diceSum;
  if (cat === 13) {
    for (let i = 5; i >= 0; i--) if (counts[i] >= 2) return (i + 1) * 2;
    return 0;
  }
  if (cat === 14) {
    const pairs = [];
    for (let i = 5; i >= 0; i--) if (counts[i] >= 2) pairs.push(i + 1);
    return pairs.length >= 2 ? (pairs[0] + pairs[1]) * 2 : 0;
  }
  return 0;
}
