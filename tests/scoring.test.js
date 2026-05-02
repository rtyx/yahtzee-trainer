import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreCategory } from '../src/scoring.js';

test('full house can score fixed 25 points', () => {
  assert.equal(scoreCategory([0, 2, 0, 3, 0, 0], 8, { fullHouseScore: 'fixed' }), 25);
});

test('full house can score nominal dice total', () => {
  assert.equal(scoreCategory([0, 2, 0, 3, 0, 0], 8, { fullHouseScore: 'sum' }), 16);
});
