const DEFAULT_SHAKE_THRESHOLD = 18;
const DEFAULT_SHAKE_COOLDOWN_MS = 900;

function axis(value) {
  return Number.isFinite(value) ? value : 0;
}

function magnitude(acceleration) {
  const x = axis(acceleration?.x);
  const y = axis(acceleration?.y);
  const z = axis(acceleration?.z);
  return Math.hypot(x, y, z);
}

export function createShakeRollController({
  onRoll,
  canRoll = () => true,
  threshold = DEFAULT_SHAKE_THRESHOLD,
  cooldownMs = DEFAULT_SHAKE_COOLDOWN_MS,
} = {}) {
  let lastRollAt = -Infinity;

  function handleMotion(event) {
    const force = magnitude(event.accelerationIncludingGravity ?? event.acceleration);
    const now = event.timeStamp ?? Date.now();

    if (force < threshold) return;
    if (now - lastRollAt < cooldownMs) return;
    if (!canRoll()) return;

    lastRollAt = now;
    onRoll?.();
  }

  return { handleMotion };
}

function isMotionAvailable(win) {
  return typeof win?.DeviceMotionEvent !== 'undefined';
}

function canRequestMotionPermission(win) {
  return typeof win?.DeviceMotionEvent?.requestPermission === 'function';
}

export function initShakeToRoll({
  window: win = globalThis.window,
  document: doc = globalThis.document,
  enabled = false,
  onRoll,
  canRoll,
} = {}) {
  if (!win || !doc || !isMotionAvailable(win)) {
    return {
      supported: false,
      enabled: false,
      setEnabled: async () => false,
      stop: () => {},
    };
  }

  const controller = createShakeRollController({ onRoll, canRoll });
  let listening = false;

  function startListening() {
    if (listening) return;
    win.addEventListener('devicemotion', controller.handleMotion, { passive: true });
    listening = true;
  }

  function stopListening() {
    if (!listening) return;
    win.removeEventListener('devicemotion', controller.handleMotion);
    listening = false;
  }

  async function requestPermission() {
    if (!canRequestMotionPermission(win)) return true;
    try {
      return await win.DeviceMotionEvent.requestPermission() === 'granted';
    } catch (_) {
      return false;
    }
  }

  const api = {
    supported: true,
    get enabled() {
      return listening;
    },
    async setEnabled(nextEnabled) {
      if (!nextEnabled) {
        stopListening();
        return false;
      }

      if (!await requestPermission()) {
        stopListening();
        return false;
      }

      startListening();
      return true;
    },
    stop: stopListening,
  };

  if (enabled) startListening();

  return api;
}
