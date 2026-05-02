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
  onRoll,
  canRoll,
} = {}) {
  if (!win || !doc || !isMotionAvailable(win)) return () => {};

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

  if (!canRequestMotionPermission(win)) {
    startListening();
    return stopListening;
  }

  async function requestMotionPermission() {
    try {
      const permission = await win.DeviceMotionEvent.requestPermission();
      if (permission === 'granted') startListening();
    } catch (_) {
      // Motion permission can be blocked by the browser or OS; the button remains available.
    }
  }

  doc.addEventListener('pointerdown', requestMotionPermission, { once: true, passive: true, capture: true });

  return () => {
    doc.removeEventListener('pointerdown', requestMotionPermission, { capture: true });
    stopListening();
  };
}
