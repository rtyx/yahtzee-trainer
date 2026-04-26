import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadSoundEnabled,
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
