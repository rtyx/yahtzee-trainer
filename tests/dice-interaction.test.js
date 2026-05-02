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

test('score phase turns the roll button into a score-now action', () => {
  assert.equal(typeof renderModule.getRollButtonState, 'function');
  assert.deepEqual(
    renderModule.getRollButtonState('score', [false, false, false, false, false], false),
    {
      visible: true,
      disabled: false,
      label: 'Score now',
      showShortcut: true,
    },
  );
});

test('decision feedback pauses only when enabled', () => {
  assert.equal(typeof gameModule.shouldShowDecisionFeedback, 'function');
  assert.equal(gameModule.shouldShowDecisionFeedback({ showDecisionFeedback: true }), true);
  assert.equal(gameModule.shouldShowDecisionFeedback({ showDecisionFeedback: false }), false);
});

test('score phase preserves dice kept before the final roll', () => {
  assert.equal(typeof gameModule.getScorePhaseKeepState, 'function');

  assert.deepEqual(
    gameModule.getScorePhaseKeepState(
      [true, true, false, true, true],
      [3, 0, 1, 4],
    ),
    {
      kept: [true, true, false, true, true],
      keptOrder: [3, 0, 1, 4],
    },
  );
});

test('score phase drops stale kept-order entries before visual toggles continue', () => {
  assert.deepEqual(
    gameModule.getScorePhaseKeepState(
      [true, false, false, true, false],
      [1, 3, 0, 4],
    ),
    {
      kept: [true, false, false, true, false],
      keptOrder: [3, 0],
    },
  );
});
