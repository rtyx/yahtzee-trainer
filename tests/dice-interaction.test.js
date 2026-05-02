import test from 'node:test';
import assert from 'node:assert/strict';

import * as gameModule from '../src/game.js';
import * as renderModule from '../src/render.js';

test('dice can be visually toggled while selecting a score', () => {
  assert.equal(typeof gameModule.canToggleDieKeep, 'function');
  assert.equal(gameModule.canToggleDieKeep('score', false), true);
});

test('score-phase dice remain interactive for visual keep toggles', () => {
  assert.equal(typeof renderModule.getDiceInteractionState, 'function');
  assert.deepEqual(renderModule.getDiceInteractionState('score', false), {
    interactive: true,
    locked: false,
  });
});

test('decision feedback pauses only when enabled', () => {
  assert.equal(typeof gameModule.shouldShowDecisionFeedback, 'function');
  assert.equal(gameModule.shouldShowDecisionFeedback({ showDecisionFeedback: true }), true);
  assert.equal(gameModule.shouldShowDecisionFeedback({ showDecisionFeedback: false }), false);
});
