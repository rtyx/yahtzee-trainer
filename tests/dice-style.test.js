import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('kept dice do not render a text badge', () => {
  const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');
  assert.equal(css.includes('content: "held"'), false);
});

test('dice roll uses one tumble animation instead of a pre-roll shake', () => {
  const componentCss = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');
  const baseCss = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');

  assert.equal(componentCss.includes('pre-roll'), false);
  assert.equal(baseCss.includes('dice-shake'), false);
});
