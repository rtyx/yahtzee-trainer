import test from 'node:test';
import assert from 'node:assert/strict';

import * as renderModule from '../src/render.js';

test('bonus state explains remaining upper-section progress', () => {
  assert.equal(typeof renderModule.getScorecardBonusState, 'function');
  assert.deepEqual(renderModule.getScorecardBonusState(34), {
    achieved: false,
    label: 'Bonus +35',
    detail: 'ab 63 Punkten, noch 29 nötig',
    scoreText: '—',
  });
});

test('bonus state confirms when the upper-section threshold is met', () => {
  assert.equal(typeof renderModule.getScorecardBonusState, 'function');
  assert.deepEqual(renderModule.getScorecardBonusState(63), {
    achieved: true,
    label: 'Bonus erreicht',
    detail: '63 von 63 Punkten in der oberen Sektion',
    scoreText: '35',
  });
});

test('score-selection label announces category and potential points', () => {
  assert.equal(typeof renderModule.buildScorecardSelectionLabel, 'function');
  assert.equal(
    renderModule.buildScorecardSelectionLabel(0, 3),
    'Einer auswählen, 3 Punkte eintragen',
  );
  assert.equal(
    renderModule.buildScorecardSelectionLabel(12, 0),
    'Chance auswählen, 0 Punkte eintragen',
  );
});

test('score-selection label can hide potential points', () => {
  assert.equal(
    renderModule.buildScorecardSelectionLabel(0, 3, { previewPotentialScores: false }),
    'Einer auswählen',
  );
});

test('scorecard helper math can stay hidden until the game is done', () => {
  assert.equal(typeof renderModule.getPotentialScoreText, 'function');
  assert.equal(typeof renderModule.getUpperSumText, 'function');
  assert.equal(typeof renderModule.getFinalSumText, 'function');

  assert.equal(renderModule.getPotentialScoreText(18, { previewPotentialScores: false }), '—');
  assert.equal(renderModule.getPotentialScoreText(18, { previewPotentialScores: true }), '18');

  assert.equal(renderModule.getUpperSumText(42, 'score', { showUpperSectionSum: false }), '—');
  assert.equal(renderModule.getUpperSumText(42, 'done', { showUpperSectionSum: false }), '42');
  assert.equal(renderModule.getUpperSumText(42, 'score', { showUpperSectionSum: true }), '42');

  assert.equal(renderModule.getFinalSumText(171, 'feedback', { showFinalSumBeforeDone: false }), '—');
  assert.equal(renderModule.getFinalSumText(171, 'done', { showFinalSumBeforeDone: false }), '171');
  assert.equal(renderModule.getFinalSumText(171, 'feedback', { showFinalSumBeforeDone: true }), '171');
});

test('game-complete encouragement scales with accuracy and bonus result', () => {
  assert.equal(typeof renderModule.getDoneEncouragement, 'function');
  assert.equal(
    renderModule.getDoneEncouragement(245, 93, true),
    'Strong choices, steady upper-section pressure, and the bonus landed.',
  );
  assert.equal(
    renderModule.getDoneEncouragement(180, 61, false),
    'A full sheet of practice: the marked corrections are the useful part.',
  );
});
