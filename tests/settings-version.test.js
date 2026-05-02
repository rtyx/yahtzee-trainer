import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GAME_VERSION_HASH } from '../src/settings.js';

test('settings exposes a game version hash fallback outside Vite', () => {
  assert.equal(GAME_VERSION_HASH, 'dev');
});

test('settings dialog includes a target for the game version marker', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /id="settings-version-hash"/);
});
