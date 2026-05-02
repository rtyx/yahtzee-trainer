import { state } from './game.js';

const MOBILE_QUERY = '(max-width: 580px)';
const TABS = ['scorecard', 'dice'];
const SCORE_TO_DICE_DELAY_MS = 2000;

let activeTab = 'dice';
let mediaQuery = null;
let initialized = false;
let scoreReturnTimer = null;
let scoreReturnToken = null;
let scoreReturnHandledToken = null;

function isMobile() {
  return mediaQuery?.matches ?? false;
}

function getRequiredTab() {
  if (state.phase === 'done') return 'dice';
  return null;
}

function setActiveTab(next, { userInitiated = false } = {}) {
  if (!TABS.includes(next)) return;
  if (userInitiated) {
    if (state.phase === 'feedback' && state.pendingCat != null) {
      scoreReturnHandledToken = state.feedbackToken;
    }
    clearScoreReturnTimer();
  }
  const required = getRequiredTab();
  activeTab = userInitiated && required ? required : next;
  syncTabs();
}

export function activateScorecardTab() {
  setActiveTab('scorecard', { userInitiated: true });
  requestAnimationFrame(() => {
    const firstScoreRow = document.querySelector('.scorecard-panel.scoring .sc-data-row.clickable');
    if (firstScoreRow instanceof HTMLElement) {
      firstScoreRow.focus({ preventScroll: true });
      return;
    }
    document.getElementById('tab-scorecard')?.focus({ preventScroll: true });
  });
}

function clearScoreReturnTimer() {
  if (scoreReturnTimer) clearTimeout(scoreReturnTimer);
  scoreReturnTimer = null;
  scoreReturnToken = null;
}

function scheduleScoreReturnIfNeeded() {
  if (!isMobile()) {
    clearScoreReturnTimer();
    return;
  }

  const isScoreFeedback = state.phase === 'feedback' && state.pendingCat != null;
  if (!isScoreFeedback) return;
  if (scoreReturnToken === state.feedbackToken) return;
  if (scoreReturnHandledToken === state.feedbackToken) return;

  clearScoreReturnTimer();
  scoreReturnToken = state.feedbackToken;
  scoreReturnTimer = setTimeout(() => {
    scoreReturnTimer = null;
    scoreReturnHandledToken = scoreReturnToken;
    scoreReturnToken = null;
    setActiveTab('dice');
  }, SCORE_TO_DICE_DELAY_MS);
}

function syncTabs() {
  const app = document.getElementById('app');
  if (!app) return;

  if (isMobile()) {
    scheduleScoreReturnIfNeeded();
    const required = getRequiredTab();
    if (required) activeTab = required;
    app.dataset.mobileTab = activeTab;
  } else {
    clearScoreReturnTimer();
    delete app.dataset.mobileTab;
  }

  for (const tabName of TABS) {
    const tab = document.getElementById(`tab-${tabName}`);
    const panel = document.getElementById(tabName === 'dice' ? 'game-panel' : 'scorecard-panel');
    const selected = activeTab === tabName;

    tab?.setAttribute('aria-selected', String(selected));
    tab?.setAttribute('tabindex', selected ? '0' : '-1');
    panel?.setAttribute('aria-hidden', String(isMobile() && !selected));
  }
}

function handleTabClick(event) {
  const tab = event.currentTarget;
  if (!(tab instanceof HTMLElement)) return;
  setActiveTab(tab.id === 'tab-scorecard' ? 'scorecard' : 'dice', { userInitiated: true });
}

function handleTabKeydown(event) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const next = activeTab === 'dice' ? 'scorecard' : 'dice';
  setActiveTab(next, { userInitiated: true });
  document.getElementById(`tab-${activeTab}`)?.focus();
}

export function initMobileTabs() {
  if (initialized) return;
  initialized = true;
  mediaQuery = window.matchMedia(MOBILE_QUERY);

  for (const tabName of TABS) {
    const tab = document.getElementById(`tab-${tabName}`);
    tab?.addEventListener('click', handleTabClick);
    tab?.addEventListener('keydown', handleTabKeydown);
  }

  mediaQuery.addEventListener('change', syncTabs);
  document.addEventListener('yahtzee:render', syncTabs);
  syncTabs();
}
