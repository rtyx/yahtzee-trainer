import test from 'node:test';
import assert from 'node:assert/strict';

import { buildKeepFeedback, buildScoreFeedback } from '../src/feedback.js';

test('score feedback explains Chance as a flexible fallback, not a bonus slot', () => {
  const openMask = [0, 3, 5, 7, 8, 11, 13, 14].reduce((mask, cat) => mask | (1 << cat), 0);

  const feedback = buildScoreFeedback(
    false,
    2,
    12,
    6,
    20,
    135.27432908869062,
    134.67549239604875,
    openMask,
    34,
  );

  assert.equal(
    feedback.tip,
    'Dreier (6 pts) keeps your bonus path alive — you\'re at 34/63 and need 29 more for +35. Taking Chance here gives up upper progress and uses a flexible fallback slot that is often more valuable later.',
  );
});

test('score feedback explains upper-slot pace when a lower face beats higher immediate points', () => {
  const openMask = [4, 9, 10, 13, 14].reduce((mask, cat) => mask | (1 << cat), 0);

  const feedback = buildScoreFeedback(
    false,
    2,
    3,
    6,
    8,
    149.9,
    146.9,
    openMask,
    15,
  );

  assert.equal(
    feedback.tip,
    'Vierer scores 2 more right now, but 8 is 4 points below the 12-point pace for that slot. Dreier is 3 points below the 9-point pace, leaving Vierer open and making the bonus path 1 point easier.',
  );
});

test('keep feedback names lower-section targets when the kept face is already closed upstairs', () => {
  const openMask = [3, 4, 6, 9, 10, 13, 14].reduce((mask, cat) => mask | (1 << cat), 0);

  const feedback = buildKeepFeedback(
    false,
    [0,0,0,0,2,0],
    [0,1,0,1,0,0],
    109.7,
    107.0,
    openMask,
  );

  assert.equal(
    feedback.tip,
    'Swap the 2 and 4 for the 5 and 5 — a pair of 5s toward Volles Haus or Vier Gleiche (Chance is the fallback if it stalls) is the higher-EV hand to build toward.',
  );
});

test('keep feedback explains three of a closed face as a lower-section chase', () => {
  const openMask = [3, 4, 6, 9, 10, 13, 14].reduce((mask, cat) => mask | (1 << cat), 0);

  const feedback = buildKeepFeedback(
    false,
    [0,0,0,0,3,0],
    [0,0,0,0,2,0],
    110.6,
    105.6,
    openMask,
  );

  assert.equal(
    feedback.tip,
    'Keep the 5 too — three 5s toward Volles Haus, Vier Gleiche, or YATZY (Chance is the fallback if it stalls) is the strongest path from here.',
  );
});

test('score feedback explains why zeroing YATZY can preserve Full House', () => {
  const openMask = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 14]
    .reduce((mask, cat) => mask | (1 << cat), 0);

  const feedback = buildScoreFeedback(
    false,
    11,
    8,
    0,
    0,
    9.1,
    2.3,
    openMask,
    53,
  );

  assert.equal(
    feedback.tip,
    'Both score 0 now. Sacrifice YATZY because Volles Haus is much more reachable on a future turn; leaving Volles Haus open is worth 6.8 more EV than chasing the rarer YATZY.',
  );
});
