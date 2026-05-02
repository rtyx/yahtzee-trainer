import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('kept dice do not render a text badge', () => {
  const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');
  assert.equal(css.includes('content: "held"'), false);
});
