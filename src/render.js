import { CAT_NAMES, UPPER_THRESHOLD, UPPER_BONUS, PIPS } from './constants.js';
import { dieSVG, diceCounts } from './dice.js';
import { scoreCategory } from './scoring.js';
import { loadAllGames } from './storage.js';
import { settings, getActiveCategoryCount, getLowerOrder, getScorecardKeyOrder } from './settings.js';
// game.js imports this module too — circular is safe since all cross-calls happen at runtime
import { state, handleScoreClick, startGame, toggleDieKeep } from './game.js';

function isGameDone(phase) {
  return phase === 'done';
}

export function getPotentialScoreText(points, config = settings) {
  return config.previewPotentialScores ? String(points) : '—';
}

export function getUpperSumText(upperScore, phase, config = settings) {
  return config.showUpperSectionSum || isGameDone(phase) ? String(upperScore) : '—';
}

export function getFinalSumText(totalScore, phase, config = settings) {
  return config.showFinalSumBeforeDone || isGameDone(phase) ? String(totalScore) : '—';
}

export function getScorecardBonusState(upperScore, phase = 'done', config = settings) {
  const hideUpperMath = !config.showUpperSectionSum && !isGameDone(phase);
  const achieved = !hideUpperMath && upperScore >= UPPER_THRESHOLD;
  const remaining = Math.max(UPPER_THRESHOLD - upperScore, 0);

  return {
    achieved,
    label: achieved ? 'Bonus erreicht' : `Bonus +${UPPER_BONUS}`,
    detail: hideUpperMath
      ? `ab ${UPPER_THRESHOLD} Punkten`
      : achieved
      ? `${UPPER_THRESHOLD} von ${UPPER_THRESHOLD} Punkten in der oberen Sektion`
      : `ab ${UPPER_THRESHOLD} Punkten, noch ${remaining} nötig`,
    scoreText: achieved ? String(UPPER_BONUS) : '—',
  };
}

export function buildScorecardSelectionLabel(cat, points, config = settings) {
  if (!config.previewPotentialScores) return `${CAT_NAMES[cat]} auswählen`;
  return `${CAT_NAMES[cat]} auswählen, ${points} Punkte eintragen`;
}

export function getDoneEncouragement(totalScore, accuracy, upperBonus) {
  if (accuracy >= 90 && upperBonus) {
    return 'Strong choices, steady upper-section pressure, and the bonus landed.';
  }
  if (accuracy >= 90) {
    return 'Your choices stayed very close to optimal all game.';
  }
  if (accuracy >= 75 && upperBonus) {
    return 'The bonus path held, with a few useful notes for the next sheet.';
  }
  if (accuracy >= 75 || totalScore >= 220) {
    return 'Good table sense: a few corrections, but the shape of the game stayed solid.';
  }
  return 'A full sheet of practice: the marked corrections are the useful part.';
}

function getDoneStamp(accuracy) {
  if (accuracy >= 90) return 'Clean sheet';
  if (accuracy >= 75) return 'Reviewed';
  return 'Practice logged';
}

function handleScorecardRowKeydown(event, cat) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
  handleScoreClick(cat);
}

function getScorecardKeyByCat() {
  return new Map(getScorecardKeyOrder(settings).map(([key, cat]) => [cat, key]));
}

const TRAY_X = [12, 31, 50, 69, 88];
const ARENA_SLOTS = [
  { x: 22, y: 24 }, { x: 45, y: 16 }, { x: 70, y: 25 },
  { x: 34, y: 48 }, { x: 61, y: 50 },
];
let layoutSeed = 0;
let diceAnimationTimer = null;

function makeVisualDie(i) {
  return { zone: 'tray', x: TRAY_X[i], y: 86, rot: 0, seed: 0 };
}

function ensureVisualDice() {
  if (state.visualDice?.length !== 5) {
    state.visualDice = Array.from({ length: 5 }, (_, i) => makeVisualDie(i));
    if (state.phase !== 'ready' || !state.readyInTray) {
      for (let i = 0; i < 5; i++) {
        Object.assign(state.visualDice[i], state.kept[i] ? trayLayout(i) : arenaLayout(i));
      }
    }
  }
  if (!state.displayDice || state.displayDice.length !== 5) {
    state.displayDice = [...state.dice];
  }
}

function trayLayout(i) {
  const orderIndex = state.keptOrder?.indexOf(i) ?? -1;
  const trayIndex = orderIndex >= 0 ? orderIndex : i;
  return { zone: 'tray', x: TRAY_X[trayIndex], y: 86, rot: 0 };
}

function arenaLayout(i) {
  const slot = ARENA_SLOTS[(i + layoutSeed) % ARENA_SLOTS.length];
  const wave = layoutSeed + i * 11;
  const x = Math.max(11, Math.min(89, slot.x + Math.sin(wave * 1.7) * 7));
  const y = Math.max(12, Math.min(57, slot.y + Math.cos(wave * 1.3) * 6));
  const rot = Math.round(Math.sin(wave * 2.1) * 26);
  return { zone: 'arena', x, y, rot };
}

function placeDie(i, layout) {
  ensureVisualDice();
  Object.assign(state.visualDice[i], layout, { seed: state.visualDice[i].seed + 1 });
}

export function resetDiceToTray() {
  clearDiceAnimationTimers();
  ensureVisualDice();
  for (let i = 0; i < 5; i++) placeDie(i, trayLayout(i));
}

export function layoutDiceForState() {
  ensureVisualDice();
  for (let i = 0; i < 5; i++) {
    placeDie(i, state.kept[i] ? trayLayout(i) : arenaLayout(i));
  }
}

function clearDiceAnimationTimers() {
  if (diceAnimationTimer) clearTimeout(diceAnimationTimer);
  diceAnimationTimer = null;
  document.querySelectorAll('.die.rolling, .die.pre-roll').forEach(el => el.classList.remove('rolling', 'pre-roll'));
}

export function render() {
  renderHeader();
  renderDice();
  renderPhaseLabel();
  renderButtons();
  renderFeedback();
  renderScorecard();
  renderTurnHistory();
  document.dispatchEvent(new CustomEvent('yahtzee:render'));
}

function renderHeader() {
  const acc = state.decisions >= 5
    ? Math.round(100 * state.correct / state.decisions) + '%' : '—';
  document.getElementById('stat-turn-val').textContent  = `${state.turn}/${getActiveCategoryCount(settings)}`;
  document.getElementById('stat-score-val').textContent = getFinalSumText(state.totalScore, state.phase, settings);
  document.getElementById('stat-acc-val').textContent   = acc;
}

function renderDice() {
  const container = document.getElementById('dice-container');
  ensureVisualDice();
  const locked = state.phase === 'ready' || state.phase === 'score' || state.phase === 'feedback' || state.phase === 'done' || state.diceAnimating;

  for (let i = 0; i < 5; i++) {
    let die = container.querySelector(`.die[data-index="${i}"]`);
    if (!die) {
      die = document.createElement('div');
      die.className = 'die';
      die.dataset.index = i;
      die.addEventListener('click', () => toggleDieKeep(i));
      die.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        toggleDieKeep(i);
      });
      container.appendChild(die);
    }

    const visual = state.visualDice[i];
    const value = state.displayDice[i] ?? state.dice[i];
    die.classList.toggle('kept', state.kept[i]);
    die.classList.toggle('no-interact', locked);
    die.classList.toggle('in-tray', visual.zone === 'tray');
    die.classList.toggle('in-arena', visual.zone === 'arena');
    die.tabIndex = locked ? -1 : 0;
    die.setAttribute('role', locked ? 'img' : 'button');
    die.style.setProperty('--die-x', `${visual.x}%`);
    die.style.setProperty('--die-y', `${visual.y}%`);
    die.style.setProperty('--die-rot', `${visual.rot}deg`);
    die.style.zIndex = visual.zone === 'tray' ? 8 + i : 14 + i;
    die.setAttribute(
      'aria-label',
      locked
        ? `Die ${i + 1}: ${value}`
        : `Die ${i + 1}: ${value}, ${state.kept[i] ? 'held' : 'available to hold'}`,
    );
    die.title = locked
      ? `Die ${i + 1}: ${value}`
      : state.kept[i] ? 'Release this die' : 'Hold this die';
    if (!locked) die.setAttribute('aria-pressed', String(state.kept[i]));
    else die.removeAttribute('aria-pressed');
    die.innerHTML = `${dieSVG(value)}${locked ? '' : `<span class="keycap die-keycap">${value}</span>`}`;
  }
}

function renderPhaseLabel() {
  const el = document.getElementById('phase-label');
  if (state.diceAnimating) {
    el.innerHTML = `<span class="phase-line-a">Dice are settling…</span>`;
  } else if (state.phase === 'ready') {
    el.innerHTML = `
      <span class="phase-line-a">Dice ready</span>
      <span class="phase-line-b">roll to start this turn</span>`;
  } else if (state.phase === 'score') {
    el.innerHTML = `<span class="phase-line-a">Final roll — select a category to score</span>`;
  } else if (state.phase === 'done' || state.phase === 'feedback') {
    el.innerHTML = '';
  } else {
    const n     = state.kept.filter(Boolean).length;
    const rolls = state.rerollsLeft;
    const hint  = n === 5 ? 'keeping all — will skip to scoring'
                : n === 0 ? 'rerolling all five'
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
  btnRoll.disabled = false;
  btnCont.disabled = false;

  if (state.phase === 'ready') {
    btnRoll.classList.remove('hidden');
    btnRoll.innerHTML = `Roll 5 dice <span class="keycap action-keycap">Space</span>`;
    btnRoll.disabled = state.diceAnimating;
  } else if (state.phase === 'keep') {
    btnRoll.classList.remove('hidden');
    const n = state.kept.filter(Boolean).length;
    const label = n === 5 ? 'Score now' : `Roll ${5 - n} ${5 - n === 1 ? 'die' : 'dice'}`;
    btnRoll.innerHTML = `${label} <span class="keycap action-keycap">Space</span>`;
    btnRoll.disabled = state.diceAnimating;
  } else if (state.phase === 'feedback' && state.feedback && !state.feedback.correct) {
    btnCont.className = 'btn btn-gold';
    btnCont.classList.remove('hidden');
    btnCont.innerHTML = `Got it <span class="keycap action-keycap">Space</span>`;
  }
}

function renderFeedback() {
  const wrap  = document.getElementById('feedback-wrap');
  const panel = document.getElementById('feedback-panel');

  if (state.phase === 'done') {
    const acc = state.decisions > 0 ? Math.round(100 * state.correct / state.decisions) : 100;
    const bon = state.upper >= UPPER_THRESHOLD;
    const note = getDoneEncouragement(state.totalScore, acc, bon);
    const stamp = getDoneStamp(acc);
    panel.className = 'feedback-panel done-panel';
    panel.innerHTML = `
      <p class="done-title">Game complete</p>
      <p class="done-score">${state.totalScore}</p>
      <p class="done-pts">points</p>
      ${bon ? `<p class="done-bonus">✦ Upper section bonus +${UPPER_BONUS} earned</p>` : ''}
      <p class="done-note">${note}</p>
      <p class="done-sub">Optimal decisions: ${state.correct} / ${state.decisions} &nbsp;·&nbsp; ${acc}% accuracy</p>
      <p class="done-stamp" aria-hidden="true">${stamp}</p>
      <button class="btn-play-again">Play again</button>`;
    panel.querySelector('.btn-play-again').addEventListener('click', startGame);
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
  const isScore = state.phase === 'score' && !state.diceAnimating;
  document.querySelector('.scorecard-panel')?.classList.toggle('scoring', isScore);
  const counts  = isScore ? diceCounts(state.dice) : null;
  const scorecardKeyByCat = getScorecardKeyByCat();

  const bonusState = getScorecardBonusState(state.upper, state.phase, settings);

  function dataRow(cat) {
    const used     = !!(state.openMask & (1 << cat));
    const canClick = isScore && !used;
    const tr       = document.createElement('tr');

    if (used) {
      tr.className = 'sc-data-row used';
      tr.innerHTML = `<td class="sc-name-cell">${CAT_NAMES[cat]}</td><td class="sc-score-cell">${state.scores[cat]}</td>`;
    } else if (canClick) {
      const pot = scoreCategory(counts, cat);
      const key = scorecardKeyByCat.get(cat);
      tr.className = 'sc-data-row clickable';
      tr.tabIndex = 0;
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-label', buildScorecardSelectionLabel(cat, pot, settings));
      tr.innerHTML = `
        <td class="sc-name-cell"><span class="sc-name-text">${CAT_NAMES[cat]}</span><span class="keycap sc-keycap">${key}</span></td>
        <td class="sc-score-cell${settings.previewPotentialScores && pot === 0 ? ' zero' : ''}">${getPotentialScoreText(pot, settings)}</td>`;
      tr.addEventListener('click', () => handleScoreClick(cat));
      tr.addEventListener('keydown', (event) => handleScorecardRowKeydown(event, cat));
    } else {
      tr.className = 'sc-data-row open';
      tr.innerHTML = `<td class="sc-name-cell">${CAT_NAMES[cat]}</td><td class="sc-score-cell">—</td>`;
    }
    return tr;
  }

  const table = document.createElement('table');
  table.className = 'sc-table';
  table.innerHTML = `<colgroup><col class="sc-col-name"><col class="sc-col-score"></colgroup>`;

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="sc-player-row"><th scope="col">Kategorie</th><th class="sc-th-score" scope="col">Punkte</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  // Upper section
  const secA = document.createElement('tr');
  secA.className = 'sc-section-row';
  secA.innerHTML = `<td colspan="2">Obere Sektion</td>`;
  tbody.appendChild(secA);
  for (let c = 0; c <= 5; c++) tbody.appendChild(dataRow(c));

  // Summe
  const sumRow = document.createElement('tr');
  sumRow.className = 'sc-sub-row';
  sumRow.innerHTML = `<td class="sc-name-cell">Summe</td><td class="sc-score-cell">${getUpperSumText(state.upper, state.phase, settings)}</td>`;
  tbody.appendChild(sumRow);

  // Bonus
  const bonusRow = document.createElement('tr');
  bonusRow.className = `sc-bonus-data-row${bonusState.achieved ? ' earned' : ''}`;
  bonusRow.innerHTML = `
    <td class="sc-name-cell">
      <span class="sc-bonus-label">${bonusState.label}</span>
      <span class="sc-bonus-detail">${bonusState.detail}</span>
    </td>
    <td class="sc-score-cell">${bonusState.scoreText}</td>`;
  tbody.appendChild(bonusRow);

  // Lower section
  const secB = document.createElement('tr');
  secB.className = 'sc-section-row sc-section-lower';
  secB.innerHTML = `<td colspan="2">Untere Sektion</td>`;
  tbody.appendChild(secB);
  for (const c of getLowerOrder(settings)) tbody.appendChild(dataRow(c));

  // Total
  const totalRow = document.createElement('tr');
  totalRow.className = 'sc-total-row';
  totalRow.innerHTML = `<td class="sc-name-cell">Endsumme</td><td class="sc-score-cell">${getFinalSumText(state.totalScore, state.phase, settings)}</td>`;
  tbody.appendChild(totalRow);

  table.appendChild(tbody);
  body.innerHTML = '';
  body.appendChild(table);
}

function renderTurnHistory() {
  const el = document.getElementById('turn-history');
  if (!el) return;
  if (state.history.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = state.history.map(h => {
    const miniDice = h.dice.map(v => {
      const circles = PIPS[v].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="9"/>`).join('');
      return `<svg class="mini-die" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
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

export function renderAllGamesHistory() {
  const el = document.getElementById('all-games-history');
  if (!el) return;
  const games = loadAllGames();
  if (games.length === 0) {
    el.innerHTML = '';
    document.getElementById('all-games-wrap').classList.add('hidden');
    return;
  }
  document.getElementById('all-games-wrap').classList.remove('hidden');
  el.innerHTML = games.map(g => {
    const fmt = new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const bon = g.upperBonus ? ' <span class="ag-bonus">+35</span>' : '';
    return `<div class="ag-row">
      <span class="ag-date">${fmt}</span>
      <span class="ag-score">${g.score}${bon}</span>
      <span class="ag-acc">${g.accuracy}% optimal</span>
    </div>`;
  }).join('');
}

export function animateNewDice(prevKept = null) {
  const rolling = [];
  for (let i = 0; i < 5; i++) {
    if (!prevKept || !prevKept[i]) rolling.push(i);
  }
  if (rolling.length === 0) return;

  clearDiceAnimationTimers();
  state.diceAnimating = true;
  layoutSeed++;
  rolling.forEach(i => placeDie(i, arenaLayout(i)));
  renderDice();
  renderButtons();
  renderPhaseLabel();
  renderScorecard();

  rolling.forEach(i => {
    const el = document.querySelector(`.die[data-index="${i}"]`);
    if (!el) return;
    el.classList.remove('rolling');
    void el.offsetWidth;
    el.classList.add('rolling');
  });

  diceAnimationTimer = setTimeout(() => {
    rolling.forEach(i => { state.displayDice[i] = state.dice[i]; });
    document.querySelectorAll('.die.rolling').forEach(el => el.classList.remove('rolling'));
    state.diceAnimating = false;
    diceAnimationTimer = null;
    renderDice();
    renderButtons();
    renderPhaseLabel();
    renderScorecard();
  }, 620);
}
