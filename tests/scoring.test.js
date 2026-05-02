import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreCategory } from '../src/scoring.js';

test('full house can score fixed 25 points', () => {
  assert.equal(scoreCategory([0, 2, 0, 3, 0, 0], 8, { combinationScore: 'fixed' }), 25);
});

test('full house stays fixed in nominal mode', () => {
  assert.equal(scoreCategory([0, 2, 0, 3, 0, 0], 8, { combinationScore: 'sum' }), 25);
});

test('combination categories use predefined values in fixed mode', () => {
  assert.equal(scoreCategory([0, 0, 3, 0, 1, 1], 6, { combinationScore: 'fixed' }), 20);
  assert.equal(scoreCategory([0, 0, 0, 4, 0, 1], 7, { combinationScore: 'fixed' }), 30);
  assert.equal(scoreCategory([1, 1, 1, 1, 0, 1], 9, { combinationScore: 'fixed' }), 30);
  assert.equal(scoreCategory([1, 1, 1, 1, 1, 0], 10, { combinationScore: 'fixed' }), 40);
  assert.equal(scoreCategory([0, 0, 0, 0, 5, 0], 11, { combinationScore: 'fixed' }), 50);
});

test('combination categories use nominal dice values in sum mode except fixed specials', () => {
  assert.equal(scoreCategory([0, 0, 3, 0, 1, 1], 6, { combinationScore: 'sum' }), 9);
  assert.equal(scoreCategory([0, 0, 0, 4, 0, 1], 7, { combinationScore: 'sum' }), 16);
  assert.equal(scoreCategory([1, 1, 1, 1, 0, 1], 9, { combinationScore: 'sum' }), 10);
  assert.equal(scoreCategory([1, 1, 1, 1, 1, 0], 10, { combinationScore: 'sum' }), 15);
  assert.equal(scoreCategory([0, 0, 0, 0, 5, 0], 11, { combinationScore: 'sum' }), 50);
});
