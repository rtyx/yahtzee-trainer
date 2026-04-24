// === YAHTZEE TRAINER ===

const CAT_NAMES = [
  'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a Kind', 'Four of a Kind', 'Full House',
  'Small Straight', 'Large Straight', 'Yahtzee', 'Chance',
];
const ALL_USED_MASK = (1 << 13) - 1;
const UPPER_THRESHOLD = 63;
const UPPER_BONUS = 35;

// --- Dice Engine ---
let K_MULTISETS = {};
let K_PROBS = {};

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

function buildDiceEngine() {
  for (let k = 0; k <= 5; k++) {
    K_MULTISETS[k] = [];
    if (k === 0) { K_MULTISETS[0] = [[0,0,0,0,0,0]]; K_PROBS[0] = [1.0]; continue; }
    for (let c1 = 0; c1 <= k; c1++)
    for (let c2 = 0; c2 <= k-c1; c2++)
    for (let c3 = 0; c3 <= k-c1-c2; c3++)
    for (let c4 = 0; c4 <= k-c1-c2-c3; c4++)
    for (let c5 = 0; c5 <= k-c1-c2-c3-c4; c5++) {
      K_MULTISETS[k].push([c1, c2, k-c1-c2-c3-c4-c5, c3, c4, c5]);
      // fix order: c1..c5 then c6
    }
    K_PROBS[k] = K_MULTISETS[k].map(c => multinomialProb(c));
  }
}

function buildDiceEngineCorrect() {
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

// --- Scoring (must match solver.py exactly) ---
function scoreCategory(counts, cat) {
  const diceSum = counts.reduce((s, c, i) => s + (i + 1) * c, 0);
  const maxC = Math.max(...counts);
  if (cat < 6) return (cat + 1) * counts[cat];
  if (cat === 6) return maxC >= 3 ? diceSum : 0;
  if (cat === 7) return maxC >= 4 ? diceSum : 0;
  if (cat === 8) {
    const nz = counts.filter(c => c > 0).sort((a, b) => a - b);
    return nz.length === 2 && nz[0] === 2 && nz[1] === 3 ? 25 : 0;
  }
  if (cat === 9) {
    const vals = new Set();
    counts.forEach((c, i) => { if (c > 0) vals.add(i + 1); });
    return [1,2,3].some(a => [a,a+1,a+2,a+3].every(v => vals.has(v))) ? 30 : 0;
  }
  if (cat === 10) {
    const vals = new Set();
    counts.forEach((c, i) => { if (c > 0) vals.add(i + 1); });
    const s = [...vals].sort((a, b) => a - b).join(',');
    return (s === '1,2,3,4,5' || s === '2,3,4,5,6') ? 40 : 0;
  }
  if (cat === 11) return maxC === 5 ? 50 : 0;
  if (cat === 12) return diceSum;
  return 0;
}

function diceCounts(dice) {
  const c = [0,0,0,0,0,0];
  for (const d of dice) c[d - 1]++;
  return c;
}

function keptCounts(dice, kept) {
  const c = [0,0,0,0,0,0];
  for (let i = 0; i < 5; i++) if (kept[i]) c[dice[i] - 1]++;
  return c;
}

function countsToValues(counts) {
  const vals = [];
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < counts[i]; j++) vals.push(i + 1);
  return vals;
}

function arraysEqual(a, b) {
  return a.every((v, i) => v === b[i]);
}

// --- Within-Turn DP ---
let V = null;
let dpMemo = new Map();

function bestPlacementEV(counts, openMask, upper) {
  let best = -Infinity;
  for (let c = 0; c < 13; c++) {
    if (openMask & (1 << c)) continue;
    const s = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const newUpper = Math.min(upper + ua, 63);
    const fv = V[openMask | (1 << c)][newUpper];
    if (s + fv > best) best = s + fv;
  }
  return best === -Infinity ? 0 : best;
}

function bestPlacement(counts, openMask, upper) {
  let best = null;
  for (let c = 0; c < 13; c++) {
    if (openMask & (1 << c)) continue;
    const s = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const newUpper = Math.min(upper + ua, 63);
    const ev = s + V[openMask | (1 << c)][newUpper];
    if (!best || ev > best.ev) best = { cat: c, ev, score: s };
  }
  return best;
}

function catEV(counts, openMask, upper, cat) {
  const s = scoreCategory(counts, cat);
  const ua = cat < 6 ? (cat + 1) * counts[cat] : 0;
  const newUpper = Math.min(upper + ua, 63);
  return s + V[openMask | (1 << cat)][newUpper];
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

function evAfterKeep(kept, nextRerolls, openMask, upper) {
  const kRoll = 5 - kept.reduce((a, b) => a + b, 0);
  let ev = 0;
  const outcomes = K_MULTISETS[kRoll];
  const probs = K_PROBS[kRoll];
  for (let i = 0; i < outcomes.length; i++) {
    const full = kept.map((c, j) => c + outcomes[i][j]);
    const val = nextRerolls === 0
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

function computeOptimalKeep(counts, rerolls, openMask, upper) {
  dpMemo = new Map();
  let best = null;
  for (const keep of keepSubsets(counts)) {
    const ev = evAfterKeep(keep, rerolls - 1, openMask, upper);
    if (!best || ev > best.ev) best = { keep: [...keep], ev };
  }
  return best;
}

// --- Game State ---
const state = {
  dice: [1,1,1,1,1],
  kept: [false,false,false,false,false],
  savedKept: null,          // boolean[5] saved when user submits keep
  rerollsLeft: 2,
  phase: 'keep',            // 'keep' | 'score' | 'feedback' | 'done'
  openMask: 0,
  upper: 0,                 // actual upper total (for display)
  upperCapped: 0,           // min(upper, 63) for DP
  totalScore: 0,
  turn: 1,
  scores: new Array(13).fill(null),
  decisions: 0,
  correct: 0,
  feedback: null,
  pendingCat: null,
  afterFeedback: null,
  feedbackToken: 0,
};

const rnd = () => Math.floor(Math.random() * 6) + 1;

function rollAll() { return [rnd(), rnd(), rnd(), rnd(), rnd()]; }

function rollUnkept() {
  for (let i = 0; i < 5; i++)
    if (!state.savedKept[i]) state.dice[i] = rnd();
}

// --- Feedback builders ---
function makeKeepFeedback(correct, optKeep, userKeep, optEV, userEV) {
  const optVals = countsToValues(optKeep);
  const userVals = countsToValues(userKeep);
  const optN = optKeep.reduce((a, b) => a + b, 0);
  const userN = userKeep.reduce((a, b) => a + b, 0);
  let tip = '';
  if (!correct) {
    if (optN < userN) {
      const extras = [];
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < userKeep[i] - optKeep[i]; j++) extras.push(i + 1);
      tip = `The [${extras.join(', ')}] ${extras.length > 1 ? "don't help" : "doesn't help"} enough — more reroll flexibility is worth more.`;
    } else if (optN > userN) {
      const more = [];
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < optKeep[i] - userKeep[i]; j++) more.push(i + 1);
      tip = `Keep [${more.join(', ')}] — ${more.length > 1 ? "they're" : "it's"} worth holding onto.`;
    } else {
      const swapOut = [], swapIn = [];
      for (let i = 0; i < 6; i++) {
        const d = optKeep[i] - userKeep[i];
        if (d > 0) for (let j = 0; j < d; j++) swapIn.push(i + 1);
        if (d < 0) for (let j = 0; j < -d; j++) swapOut.push(i + 1);
      }
      tip = `Drop [${swapOut.join(', ')}], keep [${swapIn.join(', ')}] instead.`;
    }
  }
  return {
    correct, type: 'keep',
    optVals, userVals,
    optEV, userEV,
    evDiff: +(optEV - userEV).toFixed(1),
    tip,
  };
}

function makeScoreFeedback(correct, optCat, userCat, optScore, userScore, optEV, userEV) {
  let tip = '';
  if (!correct) {
    tip = optScore > userScore
      ? `${CAT_NAMES[optCat]} scores ${optScore - userScore} more points right now.`
      : `${CAT_NAMES[optCat]} preserves better future options — the long-term value is higher.`;
  }
  return {
    correct, type: 'score',
    optCat, userCat,
    optScore, userScore,
    optEV, userEV,
    evDiff: +(optEV - userEV).toFixed(1),
    tip,
  };
}

// --- Game Flow ---
function startGame() {
  Object.assign(state, {
    openMask: 0, upper: 0, upperCapped: 0, totalScore: 0,
    turn: 1, scores: new Array(13).fill(null),
    decisions: 0, correct: 0,
  });
  startTurn();
}

function startTurn() {
  state.dice = rollAll();
  state.kept = [false,false,false,false,false];
  state.savedKept = null;
  state.rerollsLeft = 2;
  state.phase = 'keep';
  state.feedback = null;
  state.pendingCat = null;
  state.afterFeedback = null;
  render();
}

function handleKeepSubmit() {
  if (state.phase !== 'keep') return;

  const counts = diceCounts(state.dice);
  const userKeep = keptCounts(state.dice, state.kept);
  const userN = userKeep.reduce((a, b) => a + b, 0);

  // Keeping all 5 = score now
  if (userN === 5) {
    state.rerollsLeft = 0;
    state.kept = [false,false,false,false,false];
    state.phase = 'score';
    state.feedback = null;
    render();
    return;
  }

  const opt = computeOptimalKeep(counts, state.rerollsLeft, state.openMask, state.upperCapped);
  const userEV = evAfterKeep(userKeep, state.rerollsLeft - 1, state.openMask, state.upperCapped);
  const isCorrect = arraysEqual(opt.keep, userKeep) || Math.abs(opt.ev - userEV) < 0.05;

  state.decisions++;
  if (isCorrect) state.correct++;

  state.savedKept = [...state.kept];
  state.feedback = makeKeepFeedback(isCorrect, opt.keep, userKeep, opt.ev, userEV);
  state.phase = 'feedback';
  const token = ++state.feedbackToken;
  state.afterFeedback = proceedAfterKeep;

  render();
  if (isCorrect) setTimeout(() => { if (state.feedbackToken === token) proceedAfterKeep(); }, 1200);
}

function proceedAfterKeep() {
  state.afterFeedback = null;
  rollUnkept();
  state.rerollsLeft--;
  state.kept = [false,false,false,false,false];
  state.savedKept = null;
  state.phase = state.rerollsLeft === 0 ? 'score' : 'keep';
  state.feedback = null;
  render();
  animateNewDice();
}

function handleScoreClick(cat) {
  if (state.phase !== 'score') return;
  if (state.openMask & (1 << cat)) return;

  const counts = diceCounts(state.dice);
  const userScore = scoreCategory(counts, cat);
  const userEV = catEV(counts, state.openMask, state.upperCapped, cat);
  const opt = bestPlacement(counts, state.openMask, state.upperCapped);
  const isCorrect = cat === opt.cat || Math.abs(userEV - opt.ev) < 0.05;

  state.decisions++;
  if (isCorrect) state.correct++;
  state.pendingCat = cat;

  state.feedback = makeScoreFeedback(isCorrect, opt.cat, cat, opt.score, userScore, opt.ev, userEV);
  state.phase = 'feedback';
  const token = ++state.feedbackToken;
  state.afterFeedback = proceedAfterScore;

  render();
  if (isCorrect) setTimeout(() => { if (state.feedbackToken === token) proceedAfterScore(); }, 1200);
}

function handleContinue() {
  if (state.phase !== 'feedback') return;
  if (state.afterFeedback) {
    const fn = state.afterFeedback;
    state.afterFeedback = null;
    fn();
  }
}

function proceedAfterScore() {
  state.afterFeedback = null;
  const cat = state.pendingCat;
  const counts = diceCounts(state.dice);
  const s = scoreCategory(counts, cat);

  state.scores[cat] = s;
  state.openMask |= (1 << cat);
  state.totalScore += s;
  if (cat < 6) { state.upper += s; state.upperCapped = Math.min(state.upper, 63); }

  if (state.openMask === ALL_USED_MASK) {
    if (state.upper >= UPPER_THRESHOLD) state.totalScore += UPPER_BONUS;
    state.phase = 'done';
    state.feedback = null;
    render();
    return;
  }

  state.turn++;
  startTurn();
}

// --- Animations ---
function animateNewDice() {
  const dies = document.querySelectorAll('.die');
  dies.forEach((el, i) => {
    if (!state.savedKept || !state.savedKept[i]) {
      el.classList.remove('rolling');
      void el.offsetWidth; // reflow
      el.classList.add('rolling');
    }
  });
}

// --- Render ---
function render() {
  renderHeader();
  renderDice();
  renderActionHint();
  renderButtons();
  renderFeedback();
  renderScorecard();
}

function renderHeader() {
  const acc = state.decisions > 0
    ? Math.round(100 * state.correct / state.decisions) + '%'
    : '—';
  document.getElementById('stat-turn').textContent = `Turn ${state.turn}/13`;
  document.getElementById('stat-score').textContent = `Score: ${state.totalScore}`;
  document.getElementById('stat-accuracy').textContent = `Accuracy: ${acc}`;
}

function renderDice() {
  const container = document.getElementById('dice-container');
  container.innerHTML = '';
  const locked = state.phase === 'score' || state.phase === 'feedback' || state.phase === 'done';

  for (let i = 0; i < 5; i++) {
    const die = document.createElement('div');
    die.className = 'die';
    if (state.kept[i]) die.classList.add('kept');
    if (locked) die.classList.add('no-interact');
    die.textContent = state.dice[i];

    if (!locked) {
      die.addEventListener('click', () => {
        if (state.phase !== 'keep') return;
        state.kept[i] = !state.kept[i];
        renderDice();
        renderActionHint();
        renderButtons();
      });
    }
    container.appendChild(die);
  }

  const lbl = document.getElementById('rerolls-label');
  if (state.phase === 'score') {
    lbl.textContent = 'Click a category below to score ↓';
  } else if (state.phase === 'done') {
    lbl.textContent = '';
  } else if (state.phase === 'feedback') {
    lbl.textContent = '';
  } else {
    const pl = state.rerollsLeft === 1 ? 'reroll' : 'rerolls';
    lbl.textContent = `${state.rerollsLeft} ${pl} left — click dice to keep them`;
  }
}

function renderActionHint() {
  const el = document.getElementById('action-hint');
  if (state.phase !== 'keep') { el.textContent = ''; return; }
  const n = state.kept.filter(Boolean).length;
  if (n === 5) el.textContent = 'Keeping all 5 — press button to skip to scoring';
  else if (n === 0) el.textContent = 'Rerolling all 5 dice';
  else el.textContent = `Keeping ${n}, rerolling ${5 - n}`;
}

function renderButtons() {
  const btnReroll = document.getElementById('btn-reroll');
  const btnCont = document.getElementById('btn-continue');
  btnReroll.classList.add('hidden');
  btnCont.classList.add('hidden');

  if (state.phase === 'keep') {
    btnReroll.classList.remove('hidden');
    const n = state.kept.filter(Boolean).length;
    btnReroll.textContent = n === 5 ? 'Skip to scoring →' : 'Reroll unkept →';
  } else if (state.phase === 'feedback' && state.feedback && !state.feedback.correct) {
    btnCont.classList.remove('hidden');
  }
}

function renderFeedback() {
  const panel = document.getElementById('feedback-panel');

  if (state.phase === 'done') {
    const acc = state.decisions > 0 ? Math.round(100 * state.correct / state.decisions) : 100;
    const bonusLine = state.upper >= UPPER_THRESHOLD
      ? `<div style="font-size:0.85rem;margin-top:0.2rem">+${UPPER_BONUS} upper section bonus!</div>` : '';
    panel.className = 'feedback-panel done';
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="fb-header">🎉 Game complete!</div>
      <div style="font-size:1.6rem;font-weight:800;margin:0.4rem 0">${state.totalScore} pts</div>
      ${bonusLine}
      <div style="margin-top:0.4rem">Optimal decisions: ${state.correct}/${state.decisions} (${acc}%)</div>
      <button class="btn-play-again" onclick="startGame()">Play Again</button>`;
    return;
  }

  if (!state.feedback) { panel.classList.add('hidden'); return; }

  const f = state.feedback;
  panel.classList.remove('hidden');
  panel.className = `feedback-panel ${f.correct ? 'correct' : 'wrong'}`;

  if (f.type === 'keep') {
    const optStr = f.optVals.length ? `[${f.optVals.join(', ')}]` : 'nothing (reroll all)';
    const userStr = f.userVals.length ? `[${f.userVals.join(', ')}]` : 'nothing';
    if (f.correct) {
      panel.innerHTML = `
        <div class="fb-header">✅ Optimal keep!</div>
        <div>Keep ${optStr} &nbsp;<span class="fb-ev">EV: ${f.optEV.toFixed(1)} pts remaining</span></div>`;
    } else {
      panel.innerHTML = `
        <div class="fb-header">❌ Not the best keep</div>
        <div class="fb-row"><span class="lbl">Optimal:</span> keep ${optStr} <span class="fb-ev">EV ${f.optEV.toFixed(1)}</span></div>
        <div class="fb-row"><span class="lbl">Yours:</span> keep ${userStr} <span class="fb-ev">EV ${f.userEV.toFixed(1)}</span></div>
        <div class="fb-diff">−${f.evDiff} expected pts</div>
        <div class="fb-tip">${f.tip}</div>`;
    }
  } else {
    if (f.correct) {
      panel.innerHTML = `
        <div class="fb-header">✅ Optimal score!</div>
        <div>${CAT_NAMES[f.optCat]} for <strong>${f.optScore} pts</strong> &nbsp;<span class="fb-ev">EV: ${f.optEV.toFixed(1)} pts remaining</span></div>`;
    } else {
      panel.innerHTML = `
        <div class="fb-header">❌ Not the best score</div>
        <div class="fb-row"><span class="lbl">Optimal:</span> ${CAT_NAMES[f.optCat]} (${f.optScore} pts) <span class="fb-ev">EV ${f.optEV.toFixed(1)}</span></div>
        <div class="fb-row"><span class="lbl">Yours:</span> ${CAT_NAMES[f.userCat]} (${f.userScore} pts) <span class="fb-ev">EV ${f.userEV.toFixed(1)}</span></div>
        <div class="fb-diff">−${f.evDiff} expected pts</div>
        <div class="fb-tip">${f.tip}</div>`;
    }
  }
}

function renderScorecard() {
  const isScoring = state.phase === 'score';
  const counts = isScoring ? diceCounts(state.dice) : null;

  function buildRows(cats, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    for (const cat of cats) {
      const tr = document.createElement('tr');
      const used = !!(state.openMask & (1 << cat));
      if (used) {
        tr.className = 'used';
        tr.innerHTML = `<td>${CAT_NAMES[cat]}</td><td>${state.scores[cat]}</td>`;
      } else if (isScoring) {
        const pot = scoreCategory(counts, cat);
        tr.className = 'open clickable';
        tr.innerHTML = `<td>${CAT_NAMES[cat]}</td><td class="${pot === 0 ? 'zero' : ''}">${pot}</td>`;
        tr.addEventListener('click', () => handleScoreClick(cat));
      } else {
        tr.className = 'open';
        tr.innerHTML = `<td>${CAT_NAMES[cat]}</td><td>—</td>`;
      }
      tbody.appendChild(tr);
    }
  }

  buildRows([0,1,2,3,4,5], 'scorecard-upper');
  buildRows([6,7,8,9,10,11,12], 'scorecard-lower');

  const bonusEl = document.getElementById('upper-bonus-row');
  if (state.upper >= UPPER_THRESHOLD) {
    bonusEl.className = 'bonus-row achieved';
    bonusEl.textContent = `✅ Upper bonus +${UPPER_BONUS} earned!`;
  } else {
    bonusEl.className = 'bonus-row';
    const need = UPPER_THRESHOLD - state.upper;
    bonusEl.textContent = `${state.upper}/63 — need ${need} more for +35 bonus`;
  }

  document.getElementById('total-row').innerHTML =
    `<span>Total</span><span>${state.totalScore}</span>`;
}

// --- Init ---
async function init() {
  buildDiceEngineCorrect();

  const loadingEl = document.getElementById('loading');
  const appEl = document.getElementById('app');

  try {
    const resp = await fetch('policy.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    V = data.V;
  } catch (e) {
    loadingEl.innerHTML = `
      <p style="color:#dc2626;text-align:center;max-width:360px">
        Failed to load policy.json.<br><br>
        Serve this folder with a local web server:<br>
        <code style="background:#f1f5f9;padding:0.2rem 0.4rem;border-radius:4px">
          python3 -m http.server 8080
        </code>
      </p>`;
    return;
  }

  loadingEl.classList.add('hidden');
  appEl.classList.remove('hidden');

  document.getElementById('btn-reroll').addEventListener('click', handleKeepSubmit);
  document.getElementById('btn-continue').addEventListener('click', handleContinue);

  startGame();
}

init();
