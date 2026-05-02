import { buildDiceEngine } from './src/dice.js';
import { loadPolicy } from './src/policy.js';
import { clearAllGames, loadSavedState } from './src/storage.js';
import { isSoundEnabled, setSoundEnabled, primeAudio } from './src/audio.js';
import { setScoringOptions } from './src/scoring.js';
import { settings, updateSettings, applyThemePreference, getDisabledCategoryMask } from './src/settings.js';
import { state, startGame, handleKeepSubmit, handleContinue, restartGame } from './src/game.js';
import { render, renderAllGamesHistory } from './src/render.js';
import { initKeyboardControls } from './src/keyboard.js';
import { initMobileTabs } from './src/mobile-tabs.js';
import { initShakeToRoll } from './src/shake.js';

function isUnplayedFirstTurn(saved) {
  return saved
    && saved.phase === 'keep'
    && saved.turn === 1
    && saved.openMask === 0
    && saved.decisions === 0
    && saved.rerollsLeft === 2
    && saved.kept?.every(k => !k);
}

function savedRulesMatch(saved) {
  if (!saved?.settings) return true;
  return saved.settings.fullHouseScore === settings.fullHouseScore
    && saved.settings.twoPairsEnabled === settings.twoPairsEnabled;
}

async function init() {
  buildDiceEngine();
  setScoringOptions(settings);
  applyThemePreference(settings);

  try {
    const resp = await fetch('policy.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    loadPolicy(await resp.json());
  } catch (_) {
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
  initKeyboardControls();
  initMobileTabs();
  initShakeToRoll({
    onRoll: handleKeepSubmit,
    canRoll: () => (state.phase === 'ready' || (state.phase === 'keep' && state.kept.some(kept => !kept))) && !state.diceAnimating,
  });
  document.addEventListener('pointerdown', primeAudio, { once: true, passive: true, capture: true });

  initSettingsDialog();

  const saved = loadSavedState();
  if (saved && saved.phase !== 'done' && savedRulesMatch(saved)) {
    const restored = isUnplayedFirstTurn(saved)
      ? { ...saved, phase: 'ready', hasRolled: false }
      : saved;
    Object.assign(state, {
      dice: restored.dice, kept: restored.kept, rerollsLeft: restored.rerollsLeft,
      keptOrder: restored.keptOrder ?? restored.kept.map((kept, i) => kept ? i : null).filter(i => i != null),
      phase: restored.phase, openMask: restored.openMask | getDisabledCategoryMask(), upper: restored.upper,
      upperCapped: restored.upperCapped, totalScore: restored.totalScore,
      turn: restored.turn, scores: Object.assign(new Array(15).fill(null), restored.scores ?? []), decisions: restored.decisions,
      correct: restored.correct, history: restored.history,
      displayDice: restored.dice, hasRolled: restored.hasRolled ?? restored.phase !== 'ready',
      readyInTray: restored.readyInTray ?? restored.phase === 'ready',
      diceAnimating: false, visualDice: [],
      savedKept: null, feedback: null, pendingCat: null, afterFeedback: null, feedbackToken: 0,
    });
    render();
  } else {
    startGame();
  }
  renderAllGamesHistory();
}

init();

function initSettingsDialog() {
  const dialog = document.getElementById('settings-dialog');
  const btnOpen = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-settings-close');
  const btnSave = document.getElementById('btn-settings-save');
  const btnDeleteHistory = document.getElementById('btn-delete-history');
  const fullHouseInputs = [...document.querySelectorAll('input[name="full-house-score"]')];
  const twoPairsInput = document.getElementById('setting-two-pairs');
  const previewPotentialInput = document.getElementById('setting-preview-potential');
  const upperSumInput = document.getElementById('setting-upper-sum');
  const finalSumInput = document.getElementById('setting-final-sum');
  const soundInput = document.getElementById('setting-sound');
  const themeInputs = [...document.querySelectorAll('input[name="theme"]')];

  function fillForm() {
    const current = settings;
    fullHouseInputs.forEach(input => { input.checked = input.value === current.fullHouseScore; });
    themeInputs.forEach(input => { input.checked = input.value === current.theme; });
    twoPairsInput.checked = current.twoPairsEnabled;
    previewPotentialInput.checked = current.previewPotentialScores;
    upperSumInput.checked = current.showUpperSectionSum;
    finalSumInput.checked = current.showFinalSumBeforeDone;
    soundInput.checked = current.soundEnabled;
  }

  function formSettings() {
    return {
      fullHouseScore: fullHouseInputs.find(input => input.checked)?.value ?? settings.fullHouseScore,
      twoPairsEnabled: twoPairsInput.checked,
      previewPotentialScores: previewPotentialInput.checked,
      showUpperSectionSum: upperSumInput.checked,
      showFinalSumBeforeDone: finalSumInput.checked,
      soundEnabled: soundInput.checked,
      theme: themeInputs.find(input => input.checked)?.value ?? settings.theme,
    };
  }

  function hasRuleChanges(next) {
    return next.fullHouseScore !== settings.fullHouseScore || next.twoPairsEnabled !== settings.twoPairsEnabled;
  }

  btnOpen.addEventListener('click', () => {
    fillForm();
    dialog.showModal();
  });
  btnClose.addEventListener('click', () => dialog.close());

  btnDeleteHistory.addEventListener('click', () => {
    if (!confirm('Delete all completed game history?')) return;
    clearAllGames();
    renderAllGamesHistory();
  });

  btnSave.addEventListener('click', () => {
    const next = formSettings();
    const shouldRestart = hasRuleChanges(next);
    const gameStarted = state.turn > 1 || state.openMask !== getDisabledCategoryMask() || state.phase !== 'ready';
    if (shouldRestart && gameStarted && !confirm('Rule changes start a fresh game. Continue?')) {
      fillForm();
      return;
    }

    updateSettings(next);
    setScoringOptions(next);
    setSoundEnabled(next.soundEnabled);
    if (next.soundEnabled) primeAudio();
    if (shouldRestart) startGame();
    else render();
    renderAllGamesHistory();
    dialog.close();
  });
}
