import test from 'node:test';
import assert from 'node:assert/strict';

import { createShakeRollController, initShakeToRoll } from '../src/shake.js';

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

function createMotionWindow({ permission = 'granted' } = {}) {
  const listeners = [];
  class DeviceMotionEventMock {}
  DeviceMotionEventMock.requestPermission = async () => permission;

  return {
    DeviceMotionEvent: DeviceMotionEventMock,
    addEventListener(type, listener) {
      listeners.push({ type, listener });
    },
    removeEventListener(type, listener) {
      const index = listeners.findIndex(entry => entry.type === type && entry.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    listeners,
  };
}

test('shake to roll starts disabled until explicitly enabled', () => {
  const win = createMotionWindow();

  const shakeToRoll = initShakeToRoll({
    window: win,
    document: {},
    enabled: false,
    onRoll: () => {},
    canRoll: () => true,
  });

  assert.equal(shakeToRoll.enabled, false);
  assert.equal(win.listeners.length, 0);
});

test('shake to roll starts listening when already enabled', () => {
  const win = createMotionWindow();

  const shakeToRoll = initShakeToRoll({
    window: win,
    document: {},
    enabled: true,
    onRoll: () => {},
    canRoll: () => true,
  });

  assert.equal(shakeToRoll.enabled, true);
  assert.equal(win.listeners.filter(entry => entry.type === 'devicemotion').length, 1);
});

test('shake to roll enables only when motion permission is granted', async () => {
  const win = createMotionWindow({ permission: 'granted' });

  const shakeToRoll = initShakeToRoll({
    window: win,
    document: {},
    enabled: false,
    onRoll: () => {},
    canRoll: () => true,
  });

  assert.equal(await shakeToRoll.setEnabled(true), true);
  assert.equal(shakeToRoll.enabled, true);
  assert.equal(win.listeners.filter(entry => entry.type === 'devicemotion').length, 1);
});

test('shake to roll stays disabled when motion permission is denied', async () => {
  const win = createMotionWindow({ permission: 'denied' });

  const shakeToRoll = initShakeToRoll({
    window: win,
    document: {},
    enabled: false,
    onRoll: () => {},
    canRoll: () => true,
  });

  assert.equal(await shakeToRoll.setEnabled(true), false);
  assert.equal(shakeToRoll.enabled, false);
  assert.equal(win.listeners.length, 0);
});
