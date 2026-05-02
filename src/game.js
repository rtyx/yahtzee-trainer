import { CAT_NAMES, UPPER_THRESHOLD, UPPER_BONUS } from './constants.js';
import { playDieToggle, playGameComplete, playRoll, playScoreMark, playVerdict } from './audio.js';
import { diceCounts, keptCounts, arraysEqual } from './dice.js';
import { scoreCategory } from './scoring.js';
import { computeOptimalKeep, evAfterKeep, bestPlacement, catEV } from './policy.js';
import { buildKeepFeedback, buildScoreFeedback } from './feedback.js';
import { saveGameState, clearSavedState, saveCompletedGame } from './storage.js';
import { settings, getAllUsedMask, getDisabledCategoryMask } from './settings.js';
// render.js imports this module too — circular is safe since all cross-calls happen at runtime
import { render, renderAllGamesHistory, animateNewDice, resetDiceToTray, layoutDiceForState } from './render.js';

export const state = {
  dice:          [1,1,1,1,1],
  kept:          [false,false,false,false,false],
  keptOrder:     [],
  savedKept:     null,
  rerollsLeft:   2,
  phase:         'ready',
  openMask:      0,
  upper:         0,
  upperCapped:   0,
  totalScore:    0,
  turn:          1,
  scores:        new Array(15).fill(null),
  decisions:     0,
  correct:       0,
  history:       [],
  feedback:      null,
  pendingCat:    null,
  afterFeedback: null,
  feedbackToken: 0,
  displayDice:   [1,1,1,1,1],
  hasRolled:     false,
  readyInTray:   true,
  diceAnimating: false,
  visualDice:    [],
};

const rnd     = () => Math.floor(Math.random() * 6) + 1;
const rollAll = () => [rnd(), rnd(), rnd(), rnd(), rnd()];

function rollUnkept() {
  for (let i = 0; i < 5; i++) if (!state.savedKept[i]) state.dice[i] = rnd();
}

export function saveState() {
  saveGameState({
    dice:        [...state.dice],
    kept:        [...state.kept],
    keptOrder:   [...state.keptOrder],
    rerollsLeft: state.rerollsLeft,
    phase:       state.phase === 'feedback' ? (state.pendingCat != null ? 'score' : 'keep') : state.phase,
    openMask:    state.openMask,
    upper:       state.upper,
    upperCapped: state.upperCapped,
    totalScore:  state.totalScore,
    turn:        state.turn,
    scores:      [...state.scores],
    decisions:   state.decisions,
    correct:     state.correct,
    history:     [...state.history],
    hasRolled:   state.hasRolled,
    readyInTray: state.readyInTray,
    settings:    {
      combinationScore: settings.combinationScore,
      twoPairsEnabled: settings.twoPairsEnabled,
    },
  });
}

export function startGame() {
  Object.assign(state, {
    openMask: getDisabledCategoryMask(), upper: 0, upperCapped: 0, totalScore: 0,
    turn: 1, scores: new Array(15).fill(null),
    decisions: 0, correct: 0, history: [],
    diceAnimating: false,
  });
  clearSavedState();
  startTurn({ readyInTray: true, randomizeDice: true });
}

export function startTurn({ readyInTray = false, randomizeDice = false } = {}) {
  if (randomizeDice) state.dice = rollAll();
  state.displayDice   = [...state.dice];
  state.kept          = [false,false,false,false,false];
  state.keptOrder     = [];
  state.savedKept     = null;
  state.rerollsLeft   = 2;
  state.phase         = 'ready';
  state.feedback      = null;
  state.pendingCat    = null;
  state.afterFeedback = null;
  state.hasRolled     = false;
  state.readyInTray   = readyInTray;
  state.diceAnimating = false;
  if (readyInTray) resetDiceToTray();
  render();
  saveState();
}

export function handleKeepSubmit() {
  if (state.phase === 'ready' && !state.diceAnimating) {
    playRoll(5);
    state.dice        = rollAll();
    state.phase       = 'keep';
    state.hasRolled   = true;
    state.readyInTray = false;
    render();
    saveState();
    requestAnimationFrame(() => animateNewDice(null));
    return;
  }

  if (state.phase !== 'keep' || state.diceAnimating) return;
  const n = state.kept.filter(Boolean).length;

  if (n < 5) {
    playRoll(5 - n);
    doKeepSubmit();
  } else {
    doKeepSubmit();
  }
}

export function canToggleDieKeep(phase = state.phase, diceAnimating = state.diceAnimating) {
  return (phase === 'keep' || phase === 'score') && !diceAnimating;
}

export function shouldShowDecisionFeedback(config = settings) {
  return config.showDecisionFeedback !== false;
}

export function shouldConfirmRestart(gameState = state, disabledCategoryMask = getDisabledCategoryMask()) {
  return gameState.openMask !== disabledCategoryMask
    || gameState.turn !== 1
    || gameState.phase !== 'ready'
    || gameState.rerollsLeft !== 2
    || gameState.decisions !== 0;
}

export function getScorePhaseKeepState(kept, keptOrder) {
  return {
    kept: [...kept],
    keptOrder: keptOrder.filter(i => kept[i]),
  };
}

export function hasPositiveScoringAlternative(counts, selectedCat, openMask) {
  for (let cat = 0; cat < state.scores.length; cat++) {
    if (cat === selectedCat) continue;
    if (openMask & (1 << cat)) continue;
    if (scoreCategory(counts, cat) > 0) return true;
  }
  return false;
}

export function shouldConfirmZeroScore(counts, selectedCat, openMask) {
  return scoreCategory(counts, selectedCat) === 0
    && hasPositiveScoringAlternative(counts, selectedCat, openMask);
}

function confirmZeroScore(cat) {
  return confirm(`Are you sure you want to score 0 in ${CAT_NAMES[cat]}? Other open categories can score points.`);
}

export function toggleDieKeep(index) {
  if (!canToggleDieKeep()) return;
  if (index < 0 || index >= state.kept.length) return;

  state.kept[index] = !state.kept[index];
  if (state.kept[index]) {
    if (!state.keptOrder.includes(index)) state.keptOrder.push(index);
  } else {
    state.keptOrder = state.keptOrder.filter(i => i !== index);
  }

  layoutDiceForState();
  playDieToggle(state.kept[index]);
  render();
}

export function keepNextDieByValue(value) {
  if (state.phase !== 'keep' || state.diceAnimating) return;
  const index = state.dice.findIndex((dieValue, i) => dieValue === value && !state.kept[i]);
  if (index === -1) return;

  state.kept[index] = true;
  if (!state.keptOrder.includes(index)) state.keptOrder.push(index);

  layoutDiceForState();
  playDieToggle(true);
  render();
}

export function clearKeptDice() {
  if (state.phase !== 'keep' || state.diceAnimating) return;
  if (!state.kept.some(Boolean)) return;

  state.kept = [false,false,false,false,false];
  state.keptOrder = [];

  layoutDiceForState();
  playDieToggle(false);
  render();
}

function doKeepSubmit() {
  if (state.phase !== 'keep') return;
  const counts   = diceCounts(state.dice);
  const userKeep = keptCounts(state.dice, state.kept);
  const userN    = userKeep.reduce((a, b) => a + b, 0);

  if (userN === 5) {
    const scoreKeepState = getScorePhaseKeepState(state.kept, state.keptOrder);
    state.rerollsLeft = 0;
    state.kept        = scoreKeepState.kept;
    state.keptOrder   = scoreKeepState.keptOrder;
    layoutDiceForState();
    state.phase       = 'score';
    state.feedback    = null;
    render();
    return;
  }

  const opt    = computeOptimalKeep(counts, state.rerollsLeft, state.openMask, state.upperCapped);
  const userEV = evAfterKeep(userKeep, state.rerollsLeft - 1, state.openMask, state.upperCapped);
  const isOpt  = arraysEqual(opt.keep, userKeep) || Math.abs(opt.ev - userEV) < 0.05;

  state.decisions++;
  if (isOpt) state.correct++;

  state.savedKept = [...state.kept];
  if (!shouldShowDecisionFeedback()) {
    proceedAfterKeep();
    return;
  }

  state.feedback      = buildKeepFeedback(isOpt, opt.keep, userKeep, opt.ev, userEV, state.openMask);
  state.phase         = 'feedback';
  state.afterFeedback = proceedAfterKeep;
  const token         = ++state.feedbackToken;

  render();
  playVerdict(isOpt);
  if (isOpt) setTimeout(() => { if (state.feedbackToken === token) proceedAfterKeep(); }, 1100);
}

function proceedAfterKeep() {
  state.afterFeedback = null;
  const prevKept = [...state.savedKept];
  rollUnkept();
  state.rerollsLeft--;
  state.savedKept = null;

  if (state.rerollsLeft === 0) {
    const scoreKeepState = getScorePhaseKeepState(prevKept, state.keptOrder);
    state.kept = scoreKeepState.kept;
    state.keptOrder = scoreKeepState.keptOrder;
    state.phase = 'score';
  } else {
    state.kept  = [...prevKept];
    state.phase = 'keep';
  }

  state.feedback = null;
  render();
  saveState();
  animateNewDice(prevKept);
}

export function handleScoreClick(cat) {
  if (state.phase !== 'score' || state.diceAnimating) return;
  if (state.openMask & (1 << cat)) return;

  const counts    = diceCounts(state.dice);
  const userScore = scoreCategory(counts, cat);
  if (shouldConfirmZeroScore(counts, cat, state.openMask) && !confirmZeroScore(cat)) return;

  const userEV    = catEV(counts, state.openMask, state.upperCapped, cat);
  const opt       = bestPlacement(counts, state.openMask, state.upperCapped);
  const isOpt     = cat === opt.cat || Math.abs(userEV - opt.ev) < 0.05;

  state.decisions++;
  if (isOpt) state.correct++;
  state.pendingCat = cat;
  if (!shouldShowDecisionFeedback()) {
    proceedAfterScore();
    return;
  }

  state.feedback      = buildScoreFeedback(isOpt, opt.cat, cat, opt.score, userScore, opt.ev, userEV, state.openMask, state.upperCapped);
  state.phase         = 'feedback';
  state.afterFeedback = proceedAfterScore;
  const token         = ++state.feedbackToken;

  render();
  playVerdict(isOpt);
  if (isOpt) setTimeout(() => { if (state.feedbackToken === token) proceedAfterScore(); }, 1100);
}

export function handleContinue() {
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

  if (state.openMask === getAllUsedMask(settings)) {
    const upperBonus = state.upper >= UPPER_THRESHOLD;
    if (upperBonus) state.totalScore += UPPER_BONUS;
    state.phase    = 'done';
    state.feedback = null;
    saveCompletedGame(state.totalScore, state.decisions, state.correct, upperBonus);
    clearSavedState();
    render();
    renderAllGamesHistory();
    playGameComplete();
    return;
  }

  playScoreMark();
  state.history.unshift({ turn: state.turn, dice: [...state.dice], cat, score: s });
  state.turn++;
  startTurn({ readyInTray: false, randomizeDice: false });
}

export function restartGame() {
  if (!shouldConfirmRestart()) {
    startGame();
    return;
  }
  if (confirm('Start a new game? Your current progress will be lost.')) startGame();
}
