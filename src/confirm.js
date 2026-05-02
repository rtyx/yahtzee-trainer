let activeRequest = null;
let testHandler = null;

export function setConfirmHandlerForTests(handler) {
  testHandler = handler;
}

export function zeroScoreConfirmMessage(categoryName) {
  return `Are you sure you want to score 0 in ${categoryName}? Other open categories can score points.`;
}

export function confirmAction({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
} = {}) {
  if (testHandler) {
    return Promise.resolve(testHandler({ title, message, confirmLabel, cancelLabel, tone }));
  }

  const doc = globalThis.document;
  if (!doc) return Promise.resolve(false);

  const overlay = doc.getElementById('confirm-overlay');
  const panel = doc.getElementById('confirm-panel');
  const titleEl = doc.getElementById('confirm-title');
  const messageEl = doc.getElementById('confirm-message');
  const confirmBtn = doc.getElementById('confirm-accept');
  const cancelBtn = doc.getElementById('confirm-cancel');
  if (!overlay || !panel || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
    return Promise.resolve(false);
  }

  if (activeRequest) activeRequest.resolve(false);

  const originalParent = overlay.parentNode;
  const originalNextSibling = overlay.nextSibling;
  const openDialog = doc.querySelector('dialog[open]');
  if (openDialog && !openDialog.contains(overlay)) {
    openDialog.appendChild(overlay);
  }

  titleEl.textContent = title || 'Confirm action';
  messageEl.textContent = message || '';
  confirmBtn.textContent = confirmLabel;
  cancelBtn.textContent = cancelLabel;
  panel.dataset.tone = tone;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  const previousFocus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;

  return new Promise((resolve) => {
    function finish(confirmed) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      doc.removeEventListener('keydown', onKeydown, true);
      if (originalParent && overlay.parentNode !== originalParent) {
        originalParent.insertBefore(overlay, originalNextSibling);
      }
      activeRequest = null;
      previousFocus?.focus?.({ preventScroll: true });
      resolve(confirmed);
    }

    function onConfirm() {
      finish(true);
    }

    function onCancel() {
      finish(false);
    }

    function onOverlayClick(event) {
      if (event.target === overlay) finish(false);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [cancelBtn, confirmBtn];
      const currentIndex = focusable.indexOf(doc.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    }

    activeRequest = { resolve: finish };
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
    doc.addEventListener('keydown', onKeydown, true);
    requestAnimationFrame(() => cancelBtn.focus({ preventScroll: true }));
  });
}
