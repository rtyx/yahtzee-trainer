import { CAT_NAMES, LOWER_ORDER, UPPER_THRESHOLD, UPPER_BONUS, PIPS } from './constants.js';
import { playDieToggle } from './audio.js';
import { dieSVG, diceCounts } from './dice.js';
import { scoreCategory } from './scoring.js';
import { loadAllGames } from './storage.js';
// game.js imports this module too — circular is safe since all cross-calls happen at runtime
import { state, handleScoreClick, startGame } from './game.js';

export function getScorecardBonusState(upperScore) {
  const achieved = upperScore >= UPPER_THRESHOLD;
  const remaining = Math.max(UPPER_THRESHOLD - upperScore, 0);

  return {
    achieved,
    label: achieved ? 'Bonus erreicht' : `Bonus +${UPPER_BONUS}`,
    detail: achieved
      ? `${UPPER_THRESHOLD} von ${UPPER_THRESHOLD} Punkten in der oberen Sektion`
      : `ab ${UPPER_THRESHOLD} Punkten, noch ${remaining} nötig`,
    scoreText: achieved ? String(UPPER_BONUS) : '—',
  };
}

export function buildScorecardSelectionLabel(cat, points) {
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
  handleScoreClick(cat);
}

export function render() {
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
    die.tabIndex = locked ? -1 : 0;
    die.setAttribute('role', locked ? 'img' : 'button');
    die.setAttribute(
      'aria-label',
      locked
        ? `Die ${i + 1}: ${state.dice[i]}`
        : `Die ${i + 1}: ${state.dice[i]}, ${state.kept[i] ? 'held' : 'available to hold'}`,
    );
    die.title = locked
      ? `Die ${i + 1}: ${state.dice[i]}`
      : state.kept[i] ? 'Release this die' : 'Hold this die';
    if (!locked) die.setAttribute('aria-pressed', String(state.kept[i]));
    die.innerHTML = dieSVG(state.dice[i]);

    if (!locked) {
      const toggleDie = () => {
        if (state.phase !== 'keep') return;
        state.kept[i] = !state.kept[i];
        playDieToggle(state.kept[i]);
        renderDice();
        renderPhaseLabel();
        renderButtons();
      };
      die.addEventListener('click', toggleDie);
      die.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleDie();
      });
    }
    container.appendChild(die);
  }
}

function renderPhaseLabel() {
  const el = document.getElementById('phase-label');
  if (state.phase === 'score') {
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
  const isScore = state.phase === 'score';
  document.querySelector('.scorecard-panel')?.classList.toggle('scoring', isScore);
  const counts  = isScore ? diceCounts(state.dice) : null;

  const bonusState = getScorecardBonusState(state.upper);

  function dataRow(cat) {
    const used     = !!(state.openMask & (1 << cat));
    const canClick = isScore && !used;
    const tr       = document.createElement('tr');

    if (used) {
      tr.className = 'sc-data-row used';
      tr.innerHTML = `<td class="sc-name-cell">${CAT_NAMES[cat]}</td><td class="sc-score-cell">${state.scores[cat]}</td>`;
    } else if (canClick) {
      const pot = scoreCategory(counts, cat);
      tr.className = 'sc-data-row clickable';
      tr.tabIndex = 0;
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-label', buildScorecardSelectionLabel(cat, pot));
      tr.innerHTML = `<td class="sc-name-cell">${CAT_NAMES[cat]}</td><td class="sc-score-cell${pot === 0 ? ' zero' : ''}">${pot}</td>`;
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
  sumRow.innerHTML = `<td class="sc-name-cell">Summe</td><td class="sc-score-cell">${state.upper}</td>`;
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
  for (const c of LOWER_ORDER) tbody.appendChild(dataRow(c));

  // Total
  const totalRow = document.createElement('tr');
  totalRow.className = 'sc-total-row';
  totalRow.innerHTML = `<td class="sc-name-cell">Endsumme</td><td class="sc-score-cell">${state.totalScore}</td>`;
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
  document.querySelectorAll('.die').forEach((el, i) => {
    if (!prevKept || !prevKept[i]) {
      el.classList.remove('rolling');
      void el.offsetWidth;
      el.classList.add('rolling');
    }
  });
}
