const STORAGE_KEY_GAME    = 'yahtzee_current';
const STORAGE_KEY_HISTORY = 'yahtzee_history';
const STORAGE_KEY_SOUND   = 'yahtzee_sound_enabled';
const STORAGE_KEY_SETTINGS = 'yahtzee_settings';

export const DEFAULT_SETTINGS = {
  fullHouseScore: 'fixed',
  twoPairsEnabled: true,
  soundEnabled: true,
  theme: 'system',
  previewPotentialScores: true,
  showUpperSectionSum: true,
  showFinalSumBeforeDone: true,
  showDecisionFeedback: true,
  shakeToRollEnabled: false,
};

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

export function clearAllGames() {
  try { localStorage.removeItem(STORAGE_KEY_HISTORY); } catch (_) {}
}

function normalizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!['fixed', 'sum'].includes(settings.fullHouseScore)) settings.fullHouseScore = DEFAULT_SETTINGS.fullHouseScore;
  settings.twoPairsEnabled = settings.twoPairsEnabled !== false;
  settings.soundEnabled = settings.soundEnabled !== false;
  settings.previewPotentialScores = settings.previewPotentialScores !== false;
  settings.showUpperSectionSum = settings.showUpperSectionSum !== false;
  settings.showFinalSumBeforeDone = settings.showFinalSumBeforeDone !== false;
  settings.showDecisionFeedback = settings.showDecisionFeedback !== false;
  settings.shakeToRollEnabled = settings.shakeToRollEnabled === true;
  if (!['system', 'light', 'dark'].includes(settings.theme)) settings.theme = DEFAULT_SETTINGS.theme;
  return settings;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return normalizeSettings(JSON.parse(raw));

    const legacySound = localStorage.getItem(STORAGE_KEY_SOUND);
    const legacyTheme = localStorage.getItem('theme');
    return normalizeSettings({
      soundEnabled: legacySound == null ? DEFAULT_SETTINGS.soundEnabled : JSON.parse(legacySound) !== false,
      theme: ['light', 'dark'].includes(legacyTheme) ? legacyTheme : DEFAULT_SETTINGS.theme,
    });
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(normalized.soundEnabled));
  } catch (_) {}
  return normalized;
}

export function saveSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(!!enabled));
    saveSettings({ ...loadSettings(), soundEnabled: !!enabled });
  } catch (_) {}
}

export function loadSoundEnabled() {
  return loadSettings().soundEnabled;
}
