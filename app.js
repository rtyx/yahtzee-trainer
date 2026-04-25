// === YAHTZEE TRAINER ===

const CAT_NAMES = [
  'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a Kind', 'Four of a Kind', 'Full House',
  'Small Straight', 'Large Straight', 'Yahtzee', 'Chance',
  'One Pair', 'Two Pairs',
];
const ALL_USED_MASK = (1 << 15) - 1;
const UPPER_THRESHOLD = 63;
const UPPER_BONUS = 35;

// --- Pip positions (SVG viewBox 0 0 100 100) ---
const PIPS = {
  1: [[50, 50]],
  2: [[70, 22], [30, 78]],
  3: [[70, 22], [50, 50], [30, 78]],
  4: [[30, 22], [70, 22], [30, 78], [70, 78]],
  5: [[30, 22], [70, 22], [50, 50], [30, 78], [70, 78]],
  6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]],
};

function dieSVG(value) {
  const circles = PIPS[value]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="8.5"/>`)
    .join('');
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
}

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
      const c6 = k - c1 - c2 - c3 - c4 - c5;
      K_MULTISETS[k].push([c1, c2, c3, c4, c5, c6]);
    }
    K_PROBS[k] = K_MULTISETS[k].map(c => multinomialProb(c));
  }
}

// --- Scoring ---
function scoreCategory(counts, cat) {
  const diceSum = counts.reduce((s, c, i) => s + (i + 1) * c, 0);
  const maxC = Math.max(...counts);
  if (cat < 6)  return (cat + 1) * counts[cat];
  if (cat === 6) return maxC >= 3 ? diceSum : 0;
  if (cat === 7) return maxC >= 4 ? diceSum : 0;
  if (cat === 8) {
    const nz = counts.filter(c => c > 0).sort((a, b) => a - b);
    return nz.length === 2 && nz[0] === 2 && nz[1] === 3 ? 25 : 0;
  }
  if (cat === 9) {
    const v = new Set(); counts.forEach((c, i) => { if (c > 0) v.add(i + 1); });
    return [1,2,3].some(a => [a,a+1,a+2,a+3].every(x => v.has(x))) ? 30 : 0;
  }
  if (cat === 10) {
    const v = new Set(); counts.forEach((c, i) => { if (c > 0) v.add(i + 1); });
    const s = [...v].sort((a,b) => a-b).join(',');
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
  for (let i = 0; i < 6; i++) for (let j = 0; j < counts[i]; j++) vals.push(i + 1);
  return vals;
}

function arraysEqual(a, b) { return a.every((v, i) => v === b[i]); }

// --- Within-Turn DP ---
let V = null;
let dpMemo = new Map();

function bestPlacementEV(counts, openMask, upper) {
  let best = -Infinity;
  for (let c = 0; c < 15; c++) {
    if (openMask & (1 << c)) continue;
    const s = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const fv = V[openMask | (1 << c)][Math.min(upper + ua, 63)];
    if (s + fv > best) best = s + fv;
  }
  return best === -Infinity ? 0 : best;
}

function bestPlacement(counts, openMask, upper) {
  let best = null;
  for (let c = 0; c < 15; c++) {
    if (openMask & (1 << c)) continue;
    const s = scoreCategory(counts, c);
    const ua = c < 6 ? (c + 1) * counts[c] : 0;
    const ev = s + V[openMask | (1 << c)][Math.min(upper + ua, 63)];
    if (!best || ev > best.ev) best = { cat: c, ev, score: s };
  }
  return best;
}

function catEV(counts, openMask, upper, cat) {
  const s = scoreCategory(counts, cat);
  const ua = cat < 6 ? (cat + 1) * counts[cat] : 0;
  return s + V[openMask | (1 << cat)][Math.min(upper + ua, 63)];
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
  const outcomes = K_MULTISETS[kRoll], probs = K_PROBS[kRoll];
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

// --- Feedback helpers ---

function describeKeepTarget(keep) {
  const n = keep.reduce((a,b) => a+b, 0);
  if (n === 0) return "rerolling everything";
  const maxCount = Math.max(...keep);
  const vals = countsToValues(keep);
  if (maxCount === 5) return `five ${vals[0]}s — Yahtzee`;
  if (maxCount === 4) return `four ${vals[0]}s`;
  if (maxCount === 3) {
    const tv = keep.findIndex(c => c === 3) + 1;
    const others = vals.filter(v => v !== tv);
    if (others.length === 2 && others[0] === others[1])
      return `full house (${tv}s over ${others[0]}s)`;
    return `three ${tv}s`;
  }
  const pairs = keep.reduce((acc, c, i) => { if (c >= 2) acc.push(i+1); return acc; }, []);
  if (pairs.length === 2) return `two pair (${pairs[0]}s & ${pairs[1]}s)`;
  if (pairs.length === 1) return `a pair of ${pairs[0]}s`;
  const uniq = [...new Set(vals)].sort((a,b) => a-b);
  const isRun = uniq.every((v,i) => i === 0 || v === uniq[i-1]+1);
  if (isRun && uniq.length >= 4) {
    if (uniq.length >= 5) return `large straight (${uniq[0]}–${uniq[uniq.length-1]})`;
    return `straight run (${uniq[0]}–${uniq[uniq.length-1]})`;
  }
  return `[${vals.join(', ')}]`;
}

function buildKeepFeedback(correct, optKeep, userKeep, optEV, userEV) {
  const optVals  = countsToValues(optKeep);
  const userVals = countsToValues(userKeep);
  let tip = '';

  if (!correct) {
    const optN  = optKeep.reduce((a,b) => a+b, 0);
    const userN = userKeep.reduce((a,b) => a+b, 0);
    const optTarget = describeKeepTarget(optKeep);

    if (optN === 0) {
      tip = `None of these dice are worth holding — rerolling all five gives the best expected return from this position.`;
    } else if (optN < userN) {
      const extras = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < userKeep[i]-optKeep[i]; j++) extras.push(i+1);
      tip = `Release the ${extras.length === 1 ? extras[0] : `[${extras.join(', ')}]`} — keeping only ${optTarget} leaves more dice in play and improves your odds at high-value hands.`;
    } else if (optN > userN) {
      const more = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < optKeep[i]-userKeep[i]; j++) more.push(i+1);
      tip = `Keep the ${more.length === 1 ? more[0] : `[${more.join(', ')}]`} too — building toward ${optTarget} is the strongest path from here.`;
    } else {
      const out = [], inn = [];
      for (let i = 0; i < 6; i++) {
        const d = optKeep[i] - userKeep[i];
        if (d > 0) for (let j=0;j<d;j++) inn.push(i+1);
        if (d < 0) for (let j=0;j<-d;j++) out.push(i+1);
      }
      tip = `Swap the ${out.length===1?out[0]:`[${out.join(', ')}]`} for the ${inn.length===1?inn[0]:`[${inn.join(', ')}]`} — ${optTarget} is the higher-EV hand to build toward.`;
    }
  }

  return {
    correct, type: 'keep',
    optVals, userVals, optEV, userEV,
    evDiff: +(optEV - userEV).toFixed(1), tip,
  };
}

function buildScoreFeedback(correct, optCat, userCat, optScore, userScore, optEV, userEV, openMask, upper) {
  let tip = '';

  if (!correct) {
    const optName  = CAT_NAMES[optCat];
    const userName = CAT_NAMES[userCat];
    const evDiff   = (optEV - userEV).toFixed(1);
    const upperOpen = [];
    for (let c = 0; c < 6; c++) if (!(openMask & (1 << c))) upperOpen.push(c);
    const upperNeeded = UPPER_THRESHOLD - upper;

    if (optCat < 6 && upper < UPPER_THRESHOLD) {
      const expected = (optCat + 1) * 3;
      if (optScore >= expected || upperOpen.length <= 3) {
        tip = `${optName} (${optScore} pts) keeps your bonus path alive — you're at ${upper}/${UPPER_THRESHOLD} and need ${upperNeeded} more for +${UPPER_BONUS}. Scoring ${userName} here wastes a slot you need for the bonus.`;
      } else {
        tip = `${optName} contributes to the upper bonus (${upper}/${UPPER_THRESHOLD} toward +${UPPER_BONUS}). With ${upperOpen.length} upper slots remaining, the ${evDiff}-pt EV edge comes from keeping the bonus reachable.`;
      }
    } else if (optScore > userScore) {
      tip = `${optName} scores ${optScore - userScore} more points right now — take the larger immediate gain when it doesn't close off important future options.`;
    } else if (optScore < userScore) {
      const highValueMax = { 8: 25, 9: 30, 10: 40, 11: 50 };
      if (userCat in highValueMax) {
        tip = `${userName} can score ${highValueMax[userCat]} pts when you hit it fully — don't burn it for just ${userScore}. Score ${optName} now and save ${userName} for a proper roll.`;
      } else if (optScore === 0) {
        tip = `Scoring ${optName} as a zero clears the slot strategically — you won't roll better, and holding it open costs more than taking the zero now.`;
      } else {
        tip = `${optName} now (${optScore} pts) keeps higher-value categories open for the remaining turns. Using ${userName} here costs ${evDiff} in expected future score.`;
      }
    } else {
      tip = `${optName} and ${userName} score equally right now, but ${optName} leaves better future options open — a ${evDiff}-pt difference in expected score.`;
    }
  }

  return {
    correct, type: 'score',
    optCat, userCat, optScore, userScore, optEV, userEV,
    evDiff: +(optEV - userEV).toFixed(1), tip,
  };
}

// --- Game State ---
const state = {
  dice: [1,1,1,1,1],
  kept: [false,false,false,false,false],
  savedKept: null,
  rerollsLeft: 2,
  phase: 'keep',
  openMask: 0,
  upper: 0,
  upperCapped: 0,
  totalScore: 0,
  turn: 1,
  scores: new Array(13).fill(null),
  decisions: 0,
  correct: 0,
  history: [],
  feedback: null,
  pendingCat: null,
  afterFeedback: null,
  feedbackToken: 0,
};

const rnd = () => Math.floor(Math.random() * 6) + 1;
function rollAll() { return [rnd(),rnd(),rnd(),rnd(),rnd()]; }
function rollUnkept() {
  for (let i = 0; i < 5; i++) if (!state.savedKept[i]) state.dice[i] = rnd();
}

// --- Game Flow ---
function startGame() {
  Object.assign(state, {
    openMask: 0, upper: 0, upperCapped: 0, totalScore: 0,
    turn: 1, scores: new Array(13).fill(null),
    decisions: 0, correct: 0, history: [],
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
  animateNewDice(null);
}

function handleKeepSubmit() {
  if (state.phase !== 'keep') return;

  const n = state.kept.filter(Boolean).length;

  if (n < 5) {
    // Pre-roll shake animation before processing
    const diceEls = [...document.querySelectorAll('.die')];
    diceEls.forEach((el, i) => {
      if (!state.kept[i]) el.classList.add('pre-roll');
    });
    const btn = document.getElementById('btn-reroll');
    btn.disabled = true;
    setTimeout(() => {
      diceEls.forEach(el => el.classList.remove('pre-roll'));
      btn.disabled = false;
      doKeepSubmit();
    }, 340);
  } else {
    doKeepSubmit();
  }
}

function doKeepSubmit() {
  if (state.phase !== 'keep') return;
  const counts   = diceCounts(state.dice);
  const userKeep = keptCounts(state.dice, state.kept);
  const userN    = userKeep.reduce((a,b) => a+b, 0);

  if (userN === 5) {
    state.rerollsLeft = 0;
    state.kept = [false,false,false,false,false];
    state.phase = 'score';
    state.feedback = null;
    render();
    return;
  }

  const opt      = computeOptimalKeep(counts, state.rerollsLeft, state.openMask, state.upperCapped);
  const userEV   = evAfterKeep(userKeep, state.rerollsLeft - 1, state.openMask, state.upperCapped);
  const isOpt    = arraysEqual(opt.keep, userKeep) || Math.abs(opt.ev - userEV) < 0.05;

  state.decisions++;
  if (isOpt) state.correct++;

  state.savedKept     = [...state.kept];
  state.feedback      = buildKeepFeedback(isOpt, opt.keep, userKeep, opt.ev, userEV);
  state.phase         = 'feedback';
  state.afterFeedback = proceedAfterKeep;
  const token         = ++state.feedbackToken;

  render();
  if (isOpt) setTimeout(() => { if (state.feedbackToken === token) proceedAfterKeep(); }, 1100);
}

function proceedAfterKeep() {
  state.afterFeedback = null;
  const prevKept = [...state.savedKept];
  rollUnkept();
  state.rerollsLeft--;
  state.savedKept = null;

  if (state.rerollsLeft === 0) {
    state.kept = [false,false,false,false,false];
    state.phase = 'score';
  } else {
    // Keep the previously-kept dice still selected so they stay highlighted
    state.kept = [...prevKept];
    state.phase = 'keep';
  }

  state.feedback = null;
  render();
  animateNewDice(prevKept);
}

function handleScoreClick(cat) {
  if (state.phase !== 'score') return;
  if (state.openMask & (1 << cat)) return;

  const counts    = diceCounts(state.dice);
  const userScore = scoreCategory(counts, cat);
  const userEV    = catEV(counts, state.openMask, state.upperCapped, cat);
  const opt       = bestPlacement(counts, state.openMask, state.upperCapped);
  const isOpt     = cat === opt.cat || Math.abs(userEV - opt.ev) < 0.05;

  state.decisions++;
  if (isOpt) state.correct++;
  state.pendingCat    = cat;
  state.feedback      = buildScoreFeedback(isOpt, opt.cat, cat, opt.score, userScore, opt.ev, userEV, state.openMask, state.upperCapped);
  state.phase         = 'feedback';
  state.afterFeedback = proceedAfterScore;
  const token         = ++state.feedbackToken;

  render();
  if (isOpt) setTimeout(() => { if (state.feedbackToken === token) proceedAfterScore(); }, 1100);
}

function handleContinue() {
  if (state.phase !== 'feedback') return;
  const fn = state.afterFeedback;
  state.afterFeedback = null;
  if (fn) fn();
}

function proceedAfterScore() {
  state.afterFeedback = null;
  const cat    = state.pendingCat;
  const counts = diceCounts(state.dice);
  const s      = scoreCategory(counts, cat);

  state.scores[cat]  = s;
  state.openMask    |= (1 << cat);
  state.totalScore  += s;
  if (cat < 6) { state.upper += s; state.upperCapped = Math.min(state.upper, 63); }

  if (state.openMask === ALL_USED_MASK) {
    if (state.upper >= UPPER_THRESHOLD) state.totalScore += UPPER_BONUS;
    state.phase    = 'done';
    state.feedback = null;
    render();
    return;
  }
  state.history.unshift({ turn: state.turn, dice: [...state.dice], cat, score: s });
  state.turn++;
  startTurn();
}

function restartGame() {
  if (state.openMask === 0 && state.turn === 1 && state.phase === 'keep' && state.rerollsLeft === 2) {
    return; // game just started, nothing to restart
  }
  if (confirm('Start a new game? Your current progress will be lost.')) {
    startGame();
  }
}

// --- Animations ---
function animateNewDice(prevKept = null) {
  document.querySelectorAll('.die').forEach((el, i) => {
    if (!prevKept || !prevKept[i]) {
      el.classList.remove('rolling');
      void el.offsetWidth;
      el.classList.add('rolling');
    }
  });
}

// --- Render ---
function render() {
  renderHeader();
  renderDice();
  renderPhaseLabel();
  renderButtons();
  renderFeedback();
  renderScorecard();
  renderTurnHistory();
}

function renderHeader() {
  const acc = state.decisions >= 5
    ? Math.round(100 * state.correct / state.decisions) + '%' : '—';
  document.getElementById('stat-turn-val').textContent  = `${state.turn}/${CAT_NAMES.length}`;
  document.getElementById('stat-score-val').textContent = state.totalScore;
  document.getElementById('stat-acc-val').textContent   = acc;
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
    die.innerHTML = dieSVG(state.dice[i]);

    if (!locked) {
      die.addEventListener('click', () => {
        if (state.phase !== 'keep') return;
        state.kept[i] = !state.kept[i];
        renderDice();
        renderPhaseLabel();
        renderButtons();
      });
    }
    container.appendChild(die);
  }
}

function renderPhaseLabel() {
  const el = document.getElementById('phase-label');
  if (state.phase === 'score') {
    el.innerHTML = `<span class="phase-line-a">Final roll — select a category to score</span>`;
  } else if (state.phase === 'done') {
    el.innerHTML = '';
  } else if (state.phase === 'feedback') {
    el.innerHTML = '';
  } else {
    const n     = state.kept.filter(Boolean).length;
    const rolls = state.rerollsLeft;
    const hint  = n === 5 ? 'keeping all — will skip to scoring'
                : n === 0 ? `rerolling all five`
                : `keeping ${n}, rerolling ${5 - n}`;
    el.innerHTML = `
      <span class="phase-line-a">${rolls} ${rolls === 1 ? 'reroll' : 'rerolls'} remaining — click dice to keep</span>
      <span class="phase-line-b">${hint}</span>`;
  }
}

function renderButtons() {
  const btnRoll = document.getElementById('btn-reroll');
  const btnCont = document.getElementById('btn-continue');
  btnRoll.classList.add('hidden');
  btnCont.classList.add('hidden');
  btnCont.className = 'btn btn-outline hidden';

  if (state.phase === 'keep') {
    btnRoll.classList.remove('hidden');
    const n = state.kept.filter(Boolean).length;
    btnRoll.textContent = n === 5 ? 'Score now' : `Roll ${5 - n} ${5 - n === 1 ? 'die' : 'dice'}`;
  } else if (state.phase === 'feedback' && state.feedback && !state.feedback.correct) {
    btnCont.className = 'btn btn-gold';
    btnCont.classList.remove('hidden');
  }
}

function renderFeedback() {
  const wrap  = document.getElementById('feedback-wrap');
  const panel = document.getElementById('feedback-panel');

  if (state.phase === 'done') {
    const acc  = state.decisions > 0 ? Math.round(100 * state.correct / state.decisions) : 100;
    const bon  = state.upper >= UPPER_THRESHOLD;
    panel.className = 'feedback-panel done-panel';
    panel.innerHTML = `
      <p class="done-title">Game complete</p>
      <p class="done-score">${state.totalScore}</p>
      <p class="done-pts">points</p>
      ${bon ? `<p class="done-bonus">✦ Upper section bonus +${UPPER_BONUS} earned</p>` : ''}
      <p class="done-sub">Optimal decisions: ${state.correct} / ${state.decisions} &nbsp;·&nbsp; ${acc}% accuracy</p>
      <button class="btn-play-again" onclick="startGame()">Play again</button>`;
    wrap.classList.add('open');
    return;
  }

  if (!state.feedback) { wrap.classList.remove('open'); return; }

  const f = state.feedback;
  panel.className = `feedback-panel ${f.correct ? 'correct' : 'wrong'}`;

  if (f.type === 'keep') {
    const optStr  = f.optVals.length  ? `[${f.optVals.join(', ')}]`  : 'nothing — reroll all';
    const userStr = f.userVals.length ? `[${f.userVals.join(', ')}]` : 'nothing';
    if (f.correct) {
      panel.innerHTML = `
        <span class="fb-icon">✦ Optimal</span>
        <p class="fb-ok-detail">Keep ${optStr} &thinsp;— EV ${f.optEV.toFixed(1)} pts remaining</p>`;
    } else {
      panel.innerHTML = `
        <span class="fb-icon">Not the best keep</span>
        <div class="fb-table">
          <span class="fb-lbl">Optimal</span><span class="fb-val">keep ${optStr}</span><span class="fb-ev">EV ${f.optEV.toFixed(1)}</span>
          <span class="fb-lbl">Yours</span><span class="fb-val">keep ${userStr}</span><span class="fb-ev">EV ${f.userEV.toFixed(1)}</span>
        </div>
        <p class="fb-diff">−${f.evDiff} expected pts</p>
        <p class="fb-tip">${f.tip}</p>`;
    }
  } else {
    if (f.correct) {
      panel.innerHTML = `
        <span class="fb-icon">✦ Optimal</span>
        <p class="fb-ok-detail">${CAT_NAMES[f.optCat]} for ${f.optScore} pts &thinsp;— EV ${f.optEV.toFixed(1)} pts remaining</p>`;
    } else {
      panel.innerHTML = `
        <span class="fb-icon">Not the best score</span>
        <div class="fb-table">
          <span class="fb-lbl">Optimal</span><span class="fb-val">${CAT_NAMES[f.optCat]} (${f.optScore} pts)</span><span class="fb-ev">EV ${f.optEV.toFixed(1)}</span>
          <span class="fb-lbl">Yours</span><span class="fb-val">${CAT_NAMES[f.userCat]} (${f.userScore} pts)</span><span class="fb-ev">EV ${f.userEV.toFixed(1)}</span>
        </div>
        <p class="fb-diff">−${f.evDiff} expected pts</p>
        <p class="fb-tip">${f.tip}</p>`;
    }
  }
  wrap.classList.add('open');
}

function renderScorecard() {
  const body    = document.getElementById('scorecard-body');
  const isScore = state.phase === 'score';
  document.querySelector('.scorecard-panel')?.classList.toggle('scoring', isScore);
  const counts  = isScore ? diceCounts(state.dice) : null;

  body.innerHTML = '';

  const upper = UPPER_THRESHOLD;

  function makeRow(cat) {
    const used     = !!(state.openMask & (1 << cat));
    const canClick = isScore && !used;
    const div      = document.createElement('div');

    if (used) {
      div.className = 'sc-row used';
      div.innerHTML = `<span class="sc-name">${CAT_NAMES[cat]}</span><span class="sc-score">${state.scores[cat]}</span>`;
    } else if (canClick) {
      const pot = scoreCategory(counts, cat);
      div.className = 'sc-row clickable';
      div.innerHTML = `<span class="sc-name">${CAT_NAMES[cat]}</span><span class="sc-score${pot === 0 ? ' zero' : ''}">${pot}</span>`;
      div.addEventListener('click', () => handleScoreClick(cat));
    } else {
      div.className = 'sc-row open';
      div.innerHTML = `<span class="sc-name">${CAT_NAMES[cat]}</span><span class="sc-score">—</span>`;
    }
    return div;
  }

  // Upper section
  const secA = document.createElement('div');
  secA.className = 'sc-section';
  secA.textContent = 'Upper Section';
  body.appendChild(secA);
  for (let c = 0; c <= 5; c++) body.appendChild(makeRow(c));

  // Bonus progress
  const pct     = Math.min(100, Math.round(state.upper / upper * 100));
  const bonusEl = document.createElement('div');
  bonusEl.className = 'sc-bonus';
  const achieved = state.upper >= upper;
  bonusEl.innerHTML = `
    <div class="sc-bonus-row ${achieved ? 'achieved' : ''}">
      <span>${achieved ? `✦ Bonus earned +${UPPER_BONUS}` : `${state.upper} / ${upper} for +${UPPER_BONUS}`}</span>
    </div>
    ${!achieved ? `<div class="sc-bonus-track"><div class="sc-bonus-fill" style="width:${pct}%"></div></div>` : ''}`;
  body.appendChild(bonusEl);

  // Lower section
  const secB = document.createElement('div');
  secB.className = 'sc-section';
  secB.textContent = 'Lower Section';
  body.appendChild(secB);
  for (let c = 6; c <= 14; c++) body.appendChild(makeRow(c));

  // Total
  const totalEl = document.createElement('div');
  totalEl.className = 'sc-total';
  totalEl.innerHTML = `<span class="sc-total-lbl">Total</span><span class="sc-total-val">${state.totalScore}</span>`;
  body.appendChild(totalEl);

  document.getElementById('sc-total').textContent = state.totalScore;
}

function renderTurnHistory() {
  const el = document.getElementById('turn-history');
  if (!el) return;
  if (state.history.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = state.history.map(h => {
    const miniDice = h.dice.map(v => {
      const circles = PIPS[v].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="9"/>`).join('');
      return `<svg class="mini-die" viewBox="0 0 100 100">${circles}</svg>`;
    }).join('');
    const sign = h.score > 0 ? '+' : '';
    return `<div class="turn-row">
      <span class="turn-row-num">T${h.turn}</span>
      <div class="turn-row-dice">${miniDice}</div>
      <span class="turn-row-cat">${CAT_NAMES[h.cat]}</span>
      <span class="turn-row-score">${sign}${h.score}</span>
    </div>`;
  }).join('');
}

// --- Init ---
async function init() {
  buildDiceEngine();

  try {
    const resp = await fetch('policy.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    V = data.V;
  } catch (e) {
    document.getElementById('loading').innerHTML = `
      <p style="color:var(--red,oklch(46% 0.17 22));text-align:center;max-width:320px;font-family:var(--font-sans);font-size:0.9rem;line-height:1.6">
        Could not load policy.json.<br>
        Run: <code style="background:var(--sheet-tint,oklch(96% 0.01 86));border:1px solid var(--line,oklch(78% 0.012 80));padding:0.15em 0.4em;border-radius:3px">python3 -m http.server 8181</code>
      </p>`;
    return;
  }

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('btn-reroll').addEventListener('click', handleKeepSubmit);
  document.getElementById('btn-continue').addEventListener('click', handleContinue);
  document.getElementById('btn-restart').addEventListener('click', restartGame);

  const btnTheme = document.getElementById('btn-theme');
  btnTheme.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀';
  btnTheme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    btnTheme.textContent = next === 'light' ? '☾' : '☀';
  });

  startGame();
}

init();
