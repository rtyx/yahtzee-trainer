export function scoreCategory(counts, cat) {
  const diceSum = counts.reduce((s, c, i) => s + (i + 1) * c, 0);
  const maxC = Math.max(...counts);
  if (cat < 6)   return (cat + 1) * counts[cat];
  if (cat === 6)  return maxC >= 3 ? diceSum : 0;
  if (cat === 7)  return maxC >= 4 ? diceSum : 0;
  if (cat === 8) {
    const nz = counts.filter(c => c > 0).sort((a, b) => a - b);
    return nz.length === 2 && nz[0] === 2 && nz[1] === 3 ? 25 : 0;
  }
  if (cat === 9) {
    const v = new Set(); counts.forEach((c, i) => { if (c > 0) v.add(i + 1); });
    return [1, 2, 3].some(a => [a, a+1, a+2, a+3].every(x => v.has(x))) ? 30 : 0;
  }
  if (cat === 10) {
    const v = new Set(); counts.forEach((c, i) => { if (c > 0) v.add(i + 1); });
    const s = [...v].sort((a, b) => a - b).join(',');
    return (s === '1,2,3,4,5' || s === '2,3,4,5,6') ? 40 : 0;
  }
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
