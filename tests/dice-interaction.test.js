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

test('fresh ready games can be restarted without confirmation', () => {
  assert.equal(typeof gameModule.shouldConfirmRestart, 'function');
  assert.equal(
    gameModule.shouldConfirmRestart({
      openMask: 0,
      turn: 1,
      phase: 'ready',
      rerollsLeft: 2,
      decisions: 0,
    }, 0),
    false,
  );
  assert.equal(
    gameModule.shouldConfirmRestart({
      openMask: 0,
      turn: 1,
      phase: 'keep',
      rerollsLeft: 2,
      decisions: 0,
    }, 0),
    true,
  );
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

test('zero score selection asks for confirmation when positive alternatives remain', () => {
  const originalConfirm = globalThis.confirm;
  let prompt = '';
  globalThis.confirm = (message) => {
    prompt = message;
    return false;
  };

  try {
    Object.assign(gameModule.state, {
      dice: [1, 1, 1, 2, 3],
      phase: 'score',
      diceAnimating: false,
      openMask: 0,
      upperCapped: 0,
      pendingCat: null,
      decisions: 0,
      correct: 0,
    });

    gameModule.handleScoreClick(11);

    assert.match(prompt, /score 0/i);
    assert.equal(gameModule.state.phase, 'score');
    assert.equal(gameModule.state.pendingCat, null);
    assert.equal(gameModule.state.decisions, 0);
  } finally {
    globalThis.confirm = originalConfirm;
  }
});

test('zero score selection does not need confirmation when all alternatives are zero', () => {
  const allUsedMask = (1 << 15) - 1;
  const selectedCat = 11;
  const otherZeroCat = 8;
  const openMask = allUsedMask & ~(1 << selectedCat) & ~(1 << otherZeroCat);

  assert.equal(
    gameModule.shouldConfirmZeroScore([1, 1, 1, 1, 1, 0], selectedCat, openMask),
    false,
  );
});
