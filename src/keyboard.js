import { CAT_NAMES } from './constants.js';
import { settings, getScorecardKeyOrder } from './settings.js';
import {
  state,
  clearKeptDice,
  handleKeepSubmit,
  handleContinue,
  handleScoreClick,
  keepNextDieByValue,
  startGame,
} from './game.js';
import { activateScorecardTab } from './mobile-tabs.js';

const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const toggleModifier = isMac ? 'Meta' : 'Control';

let initialized = false;
let helpOpen = false;
let modifierTapCandidate = false;

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}

function isHelpVisible() {
  return helpOpen;
}

function canUseShortcuts(event) {
  return !isEditableTarget(event.target)
    && !event.altKey
    && !event.shiftKey
    && !event.metaKey
    && !event.ctrlKey;
}

function getMainActionLabel() {
  if (state.diceAnimating) return null;
  if (state.phase === 'ready') return 'Roll 5 dice';
  if (state.phase === 'keep') {
    const kept = state.kept.filter(Boolean).length;
    return kept === 5 ? 'Score now' : `Roll ${5 - kept} ${5 - kept === 1 ? 'die' : 'dice'}`;
  }
  if (state.phase === 'score') return 'Score now';
  if (state.phase === 'feedback' && state.feedback && !state.feedback.correct) return 'Continue';
  if (state.phase === 'done') return 'Play again';
  return null;
}

function renderKeyRow(key, label) {
  return `<div class="keyboard-help-row"><span class="keycap">${key}</span><span>${label}</span></div>`;
}

function renderHelp() {
  const panel = document.getElementById('keyboard-help');
  if (!panel) return;

  const visible = isHelpVisible();
  document.getElementById('app')?.classList.toggle('keyboard-shortcuts-visible', visible);
  panel.classList.toggle('open', visible);
  panel.setAttribute('aria-hidden', String(!visible));
  if (!visible) return;

  const rows = [];
  const mainAction = getMainActionLabel();
  if (mainAction) rows.push(renderKeyRow('Space', mainAction));

  if (state.phase === 'keep' && !state.diceAnimating) {
    rows.push(renderKeyRow('1-6', 'Hold next die with that value'));
    rows.push(renderKeyRow('X', 'Clear held dice'));
  }

  if (state.phase === 'score' && !state.diceAnimating) {
    for (const [key, cat] of getScorecardKeyOrder(settings)) {
      if (state.openMask & (1 << cat)) continue;
      rows.push(renderKeyRow(key, CAT_NAMES[cat]));
    }
  }

  rows.push(renderKeyRow(isMac ? 'Cmd' : 'Ctrl', 'Toggle this key map'));

  panel.innerHTML = `
    <div class="keyboard-help-card">
      <div class="keyboard-help-title">Keyboard</div>
      <div class="keyboard-help-grid">${rows.join('')}</div>
    </div>`;
}

function setHelpOpen(next) {
  if (helpOpen === next) return;
  helpOpen = next;
  renderHelp();
}

function toggleHelp() {
  helpOpen = !helpOpen;
  renderHelp();
}

function runMainAction() {
  if (state.diceAnimating) return;
  if (state.phase === 'ready' || state.phase === 'keep') {
    handleKeepSubmit();
  } else if (state.phase === 'score') {
    activateScorecardTab();
  } else if (state.phase === 'feedback' && state.feedback && !state.feedback.correct) {
    handleContinue();
  } else if (state.phase === 'done') {
    startGame();
  }
}

function handleKeyDown(event) {
  if (event.key === toggleModifier) {
    if (!event.repeat) modifierTapCandidate = true;
    return;
  }

  if (event.metaKey || event.ctrlKey) modifierTapCandidate = false;

  if (event.key === 'Escape') {
    setHelpOpen(false);
    return;
  }

  if (!canUseShortcuts(event)) return;

  if (event.repeat || state.diceAnimating) return;

  if (event.key === ' ') {
    event.preventDefault();
    runMainAction();
    return;
  }

  if (state.phase === 'keep' && /^[1-6]$/.test(event.key)) {
    event.preventDefault();
    keepNextDieByValue(Number(event.key));
    return;
  }

  if (state.phase === 'keep' && event.key.toLowerCase() === 'x') {
    event.preventDefault();
    clearKeptDice();
    return;
  }

  if (state.phase === 'score') {
    const scoreKeys = new Map(getScorecardKeyOrder(settings).map(([key, cat]) => [key.toLowerCase(), cat]));
    const cat = scoreKeys.get(event.key.toLowerCase());
    if (cat == null || (state.openMask & (1 << cat))) return;
    event.preventDefault();
    handleScoreClick(cat);
  }
}

function handleKeyUp(event) {
  if (event.key !== toggleModifier) return;
  if (modifierTapCandidate) toggleHelp();
  modifierTapCandidate = false;
}

function handleBlur() {
  modifierTapCandidate = false;
}

export function initKeyboardControls() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('yahtzee:render', renderHelp);
  window.addEventListener('blur', handleBlur);
  renderHelp();
}
