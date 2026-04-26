const STORAGE_KEY_GAME    = 'yahtzee_current';
const STORAGE_KEY_HISTORY = 'yahtzee_history';
const STORAGE_KEY_SOUND   = 'yahtzee_sound_enabled';

export function saveGameState(snap) {
  try { localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(snap)); } catch (_) {}
}

export function clearSavedState() {
  try { localStorage.removeItem(STORAGE_KEY_GAME); } catch (_) {}
}

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function saveCompletedGame(score, decisions, correct, upperBonus) {
  try {
    const history = loadAllGames();
    history.unshift({
      date:     new Date().toISOString(),
      score, decisions, correct,
      accuracy: decisions > 0 ? Math.round(100 * correct / decisions) : 100,
      upperBonus,
    });
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50)));
  } catch (_) {}
}

export function loadAllGames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

export function saveSoundEnabled(enabled) {
  try { localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(!!enabled)); } catch (_) {}
}

export function loadSoundEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOUND);
    return raw == null ? true : JSON.parse(raw) !== false;
  } catch (_) {
    return true;
  }
}
