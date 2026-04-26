import { buildDiceEngine } from './src/dice.js';
import { loadPolicy } from './src/policy.js';
import { loadSavedState } from './src/storage.js';
import { isSoundEnabled, setSoundEnabled, primeAudio } from './src/audio.js';
import { state, startGame, handleKeepSubmit, handleContinue, restartGame } from './src/game.js';
import { render, renderAllGamesHistory } from './src/render.js';

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
    Object.assign(state, {
      dice: saved.dice, kept: saved.kept, rerollsLeft: saved.rerollsLeft,
      phase: saved.phase, openMask: saved.openMask, upper: saved.upper,
      upperCapped: saved.upperCapped, totalScore: saved.totalScore,
      turn: saved.turn, scores: saved.scores, decisions: saved.decisions,
      correct: saved.correct, history: saved.history,
      savedKept: null, feedback: null, pendingCat: null, afterFeedback: null, feedbackToken: 0,
    });
    render();
  } else {
    startGame();
  }
  renderAllGamesHistory();
}

init();
