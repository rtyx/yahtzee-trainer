import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { zeroScoreConfirmMessage } from '../src/confirm.js';

test('zero-score confirmation copy names the selected category', () => {
  assert.equal(
    zeroScoreConfirmMessage('YATZY'),
    'Are you sure you want to score 0 in YATZY? Other open categories can score points.',
  );
});

test('app shell includes the custom confirmation surface', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /id="confirm-overlay"/);
  assert.match(html, /role="alertdialog"/);
});
