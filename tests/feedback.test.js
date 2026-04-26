import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScoreFeedback } from '../src/feedback.js';

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
