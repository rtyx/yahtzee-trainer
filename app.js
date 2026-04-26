import { buildDiceEngine } from './src/dice.js';
import { loadPolicy } from './src/policy.js';
import { loadSavedState } from './src/storage.js';
import { isSoundEnabled, setSoundEnabled, primeAudio } from './src/audio.js';
import { state, startGame, handleKeepSubmit, handleContinue, restartGame } from './src/game.js';
import { render, renderAllGamesHistory } from './src/render.js';
import { initKeyboardControls } from './src/keyboard.js';

function isUnplayedFirstTurn(saved) {
  return saved
    && saved.phase === 'keep'
    && saved.turn === 1
    && saved.openMask === 0
    && saved.decisions === 0
    && saved.rerollsLeft === 2
    && saved.kept?.every(k => !k);
}

async function init() {
  buildDiceEngine();

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
  document.addEventListener('pointerdown', primeAudio, { once: true, passive: true, capture: true });

  const btnTheme = document.getElementById('btn-theme');
  btnTheme.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀';
  btnTheme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    btnTheme.textContent = next === 'light' ? '☾' : '☀';
  });

  const btnSound = document.getElementById('btn-sound');
  function renderSoundButton() {
    const soundOn = isSoundEnabled();
    btnSound.textContent = soundOn ? 'SFX on' : 'SFX off';
    btnSound.classList.toggle('muted', !soundOn);
    btnSound.setAttribute('aria-pressed', String(soundOn));
    btnSound.setAttribute('aria-label', soundOn ? 'Mute sound effects' : 'Enable sound effects');
    btnSound.title = soundOn ? 'Mute sound effects' : 'Enable sound effects';
  }
  renderSoundButton();
  btnSound.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    renderSoundButton();
    primeAudio();
  });

  const saved = loadSavedState();
  if (saved && saved.phase !== 'done') {
    const restored = isUnplayedFirstTurn(saved)
      ? { ...saved, phase: 'ready', hasRolled: false }
      : saved;
    Object.assign(state, {
      dice: restored.dice, kept: restored.kept, rerollsLeft: restored.rerollsLeft,
      keptOrder: restored.keptOrder ?? restored.kept.map((kept, i) => kept ? i : null).filter(i => i != null),
      phase: restored.phase, openMask: restored.openMask, upper: restored.upper,
      upperCapped: restored.upperCapped, totalScore: restored.totalScore,
      turn: restored.turn, scores: restored.scores, decisions: restored.decisions,
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
