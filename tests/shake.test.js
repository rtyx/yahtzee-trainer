import test from 'node:test';
import assert from 'node:assert/strict';

import { createShakeRollController } from '../src/shake.js';

function motion({ x = 0, y = 0, z = 0, time = 0 } = {}) {
  return { accelerationIncludingGravity: { x, y, z }, timeStamp: time };
}

test('shake controller rolls once when motion crosses threshold', () => {
  let rolls = 0;
  const controller = createShakeRollController({
    onRoll: () => { rolls++; },
    canRoll: () => true,
    threshold: 18,
    cooldownMs: 900,
  });

  controller.handleMotion(motion({ x: 2, y: 4, z: 8, time: 100 }));
  controller.handleMotion(motion({ x: 24, y: 4, z: 2, time: 200 }));
  controller.handleMotion(motion({ x: -26, y: 2, z: 4, time: 400 }));

  assert.equal(rolls, 1);
});

test('shake controller ignores motion when rolling is not allowed', () => {
  let rolls = 0;
  const controller = createShakeRollController({
    onRoll: () => { rolls++; },
    canRoll: () => false,
    threshold: 18,
  });

  controller.handleMotion(motion({ x: 24, time: 100 }));

  assert.equal(rolls, 0);
});

test('shake controller can roll again after cooldown', () => {
  let rolls = 0;
  const controller = createShakeRollController({
    onRoll: () => { rolls++; },
    canRoll: () => true,
    threshold: 18,
    cooldownMs: 900,
  });

  controller.handleMotion(motion({ x: 24, time: 100 }));
  controller.handleMotion(motion({ x: 25, time: 1300 }));

  assert.equal(rolls, 2);
});
