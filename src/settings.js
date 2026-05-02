import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './storage.js';

export const GAME_VERSION_HASH = import.meta.env?.VITE_YAHTZEE_COMMIT_HASH ?? 'dev';

export let settings = loadSettings();

let mediaQuery = null;

export function getDisabledCategoryMask(config = settings) {
  return config.twoPairsEnabled ? 0 : (1 << 14);
}

export function getAllUsedMask(config = settings) {
  return ((1 << 15) - 1) | getDisabledCategoryMask(config);
}

export function getActiveCategoryCount(config = settings) {
  return 15 - (config.twoPairsEnabled ? 0 : 1);
}

export function getLowerOrder(config = settings) {
  const order = [13, 14, 6, 7, 9, 10, 8, 12, 11];
  return config.twoPairsEnabled ? order : order.filter(cat => cat !== 14);
}

export function getScorecardKeyOrder(config = settings) {
  const order = [
    ['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4],
    ['6', 5], ['7', 13], ['8', 14], ['9', 6], ['0', 7],
    ['Q', 9], ['W', 10], ['E', 8], ['R', 12], ['T', 11],
  ];
  return config.twoPairsEnabled ? order : order.filter(([, cat]) => cat !== 14);
}

function resolveTheme(config = settings) {
  if (config.theme === 'light' || config.theme === 'dark') return config.theme;
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyThemePreference(config = settings) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.themePreference = config.theme;
  document.documentElement.dataset.theme = resolveTheme(config);
}

export function applyGameVersionMarker(doc = globalThis.document) {
  if (typeof doc === 'undefined') return;
  const marker = doc.getElementById('settings-version-hash');
  if (marker) marker.textContent = GAME_VERSION_HASH;
}

function ensureThemeListener() {
  if (typeof window === 'undefined' || !window.matchMedia || mediaQuery) return;
  mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  mediaQuery.addEventListener?.('change', () => {
    if (settings.theme === 'system') applyThemePreference(settings);
  });
}

export function updateSettings(patch) {
  settings = saveSettings({ ...settings, ...patch });
  applyThemePreference(settings);
  document.dispatchEvent(new CustomEvent('yahtzee:settings-changed', { detail: settings }));
  return settings;
}

export function resetSettings() {
  return updateSettings(DEFAULT_SETTINGS);
}

ensureThemeListener();
applyThemePreference(settings);
applyGameVersionMarker();
