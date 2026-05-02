import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadSoundEnabled,
  saveSettings,
  saveSoundEnabled,
} from '../src/storage.js';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test('sound preference defaults to enabled when nothing is saved', () => {
  globalThis.localStorage = createStorage();
  assert.equal(loadSoundEnabled(), true);
});

test('sound preference round-trips through localStorage', () => {
  globalThis.localStorage = createStorage();

  saveSoundEnabled(false);
  assert.equal(loadSoundEnabled(), false);

  saveSoundEnabled(true);
  assert.equal(loadSoundEnabled(), true);
});

test('settings default to system theme and classic rules', () => {
  globalThis.localStorage = createStorage();
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
});

test('settings round-trip and normalize invalid values', () => {
  globalThis.localStorage = createStorage();

  saveSettings({
    combinationScore: 'sum',
    twoPairsEnabled: false,
    soundEnabled: false,
    theme: 'light',
    previewPotentialScores: false,
    showUpperSectionSum: false,
    showFinalSumBeforeDone: false,
    showDecisionFeedback: false,
    shakeToRollEnabled: true,
  });

  assert.deepEqual(loadSettings(), {
    combinationScore: 'sum',
    twoPairsEnabled: false,
    soundEnabled: false,
    theme: 'light',
    previewPotentialScores: false,
    showUpperSectionSum: false,
    showFinalSumBeforeDone: false,
    showDecisionFeedback: false,
    shakeToRollEnabled: true,
  });

  saveSettings({
    combinationScore: 'anything',
    twoPairsEnabled: true,
    soundEnabled: true,
    theme: 'sepia',
    previewPotentialScores: true,
    showUpperSectionSum: true,
    showFinalSumBeforeDone: true,
    showDecisionFeedback: true,
    shakeToRollEnabled: false,
  });

  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
});

test('settings migrate legacy full-house scoring to combination scoring', () => {
  globalThis.localStorage = createStorage();
  globalThis.localStorage.setItem('yahtzee_settings', JSON.stringify({ fullHouseScore: 'sum' }));

  assert.equal(loadSettings().combinationScore, 'sum');
});
