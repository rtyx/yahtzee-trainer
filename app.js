import { buildDiceEngine } from './src/dice.js';
import { loadPolicy } from './src/policy.js';
import { clearAllGames, loadSavedState } from './src/storage.js';
import { isSoundEnabled, setSoundEnabled, primeAudio } from './src/audio.js';
import { setScoringOptions } from './src/scoring.js';
import { settings, updateSettings, applyThemePreference, getDisabledCategoryMask } from './src/settings.js';
import { state, startGame, handleKeepSubmit, handleContinue, restartGame } from './src/game.js';
import { render, renderAllGamesHistory } from './src/render.js';
import { initKeyboardControls } from './src/keyboard.js';
import { activateScorecardTab, initMobileTabs } from './src/mobile-tabs.js';
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
  const savedCombinationScore = saved.settings.combinationScore ?? saved.settings.fullHouseScore;
  return savedCombinationScore === settings.combinationScore
    && saved.settings.twoPairsEnabled === settings.twoPairsEnabled;
}

async function loadPolicyFor(config) {
  const resp = await fetch(config.combinationScore === 'sum' ? 'policy-sum.json' : 'policy.json');
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  loadPolicy(await resp.json());
}

async function init() {
  buildDiceEngine();
  setScoringOptions(settings);
  applyThemePreference(settings);

  try {
    await loadPolicyFor(settings);
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
  document.getElementById('btn-reroll').addEventListener('click', handlePrimaryAction);
  document.getElementById('btn-continue').addEventListener('click', handleContinue);
  document.getElementById('btn-restart').addEventListener('click', restartGame);
  initKeyboardControls();
  initMobileTabs();
  const shakeToRoll = initShakeToRoll({
    enabled: settings.shakeToRollEnabled,
    onRoll: handleKeepSubmit,
    canRoll: () => (state.phase === 'ready' || (state.phase === 'keep' && state.kept.some(kept => !kept))) && !state.diceAnimating,
  });
  document.addEventListener('pointerdown', primeAudio, { once: true, passive: true, capture: true });

  initSettingsDialog(shakeToRoll);

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

function handlePrimaryAction() {
  if (state.phase === 'score' && !state.diceAnimating) {
    activateScorecardTab();
    return;
  }
  handleKeepSubmit();
}

function initSettingsDialog(shakeToRoll) {
  const dialog = document.getElementById('settings-dialog');
  const btnOpen = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-settings-close');
  const btnSave = document.getElementById('btn-settings-save');
  const btnDeleteHistory = document.getElementById('btn-delete-history');
  const combinationScoreInputs = [...document.querySelectorAll('input[name="combination-score"]')];
  const twoPairsInput = document.getElementById('setting-two-pairs');
  const previewPotentialInput = document.getElementById('setting-preview-potential');
  const upperSumInput = document.getElementById('setting-upper-sum');
  const finalSumInput = document.getElementById('setting-final-sum');
  const decisionFeedbackInput = document.getElementById('setting-decision-feedback');
  const shakeRollInput = document.getElementById('setting-shake-roll');
  const soundInput = document.getElementById('setting-sound');
  const themeInputs = [...document.querySelectorAll('input[name="theme"]')];

  function fillForm() {
    const current = settings;
    combinationScoreInputs.forEach(input => { input.checked = input.value === current.combinationScore; });
    themeInputs.forEach(input => { input.checked = input.value === current.theme; });
    twoPairsInput.checked = current.twoPairsEnabled;
    previewPotentialInput.checked = current.previewPotentialScores;
    upperSumInput.checked = current.showUpperSectionSum;
    finalSumInput.checked = current.showFinalSumBeforeDone;
    decisionFeedbackInput.checked = current.showDecisionFeedback;
    shakeRollInput.checked = current.shakeToRollEnabled;
    shakeRollInput.disabled = !shakeToRoll.supported;
    soundInput.checked = current.soundEnabled;
  }

  function formSettings() {
    return {
      combinationScore: combinationScoreInputs.find(input => input.checked)?.value ?? settings.combinationScore,
      twoPairsEnabled: twoPairsInput.checked,
      previewPotentialScores: previewPotentialInput.checked,
      showUpperSectionSum: upperSumInput.checked,
      showFinalSumBeforeDone: finalSumInput.checked,
      showDecisionFeedback: decisionFeedbackInput.checked,
      shakeToRollEnabled: shakeRollInput.checked,
      soundEnabled: soundInput.checked,
      theme: themeInputs.find(input => input.checked)?.value ?? settings.theme,
    };
  }

  function hasRuleChanges(next) {
    return next.combinationScore !== settings.combinationScore || next.twoPairsEnabled !== settings.twoPairsEnabled;
  }

  function hasScoredProgress() {
    return state.turn > 1
      || state.decisions > 0
      || state.openMask !== getDisabledCategoryMask()
      || state.scores.some(score => score != null);
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

  btnSave.addEventListener('click', async () => {
    if (btnSave.disabled) return;
    const next = formSettings();
    const shouldRestart = hasRuleChanges(next);
    if (shouldRestart && hasScoredProgress() && !confirm('Rule changes start a fresh game. Continue?')) return;

    const originalText = btnSave.textContent;
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    try {
      if (next.shakeToRollEnabled) {
        const activated = await shakeToRoll.setEnabled(true);
        if (!activated) {
          next.shakeToRollEnabled = false;
          shakeRollInput.checked = false;
          alert('Shake to roll could not be activated. On iPhone, allow Motion & Orientation access when prompted, then try again.');
        }
      } else {
        await shakeToRoll.setEnabled(false);
      }

      if (shouldRestart) await loadPolicyFor(next);
      updateSettings(next);
      setScoringOptions(next);
      setSoundEnabled(next.soundEnabled);
      if (next.soundEnabled) primeAudio();
      if (shouldRestart) startGame();
      else render();
      renderAllGamesHistory();
      dialog.close();
    } catch (error) {
      console.error('Could not save settings', error);
      alert('Could not save settings because the scoring policy failed to load. Try refreshing the page, then save again.');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = originalText;
    }
  });
}
