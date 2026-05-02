import { state } from './game.js';

const MOBILE_QUERY = '(max-width: 580px)';
const TABS = ['scorecard', 'dice'];

let activeTab = 'dice';
let mediaQuery = null;
let initialized = false;

function isMobile() {
  return mediaQuery?.matches ?? false;
}

function getRequiredTab() {
  if (state.phase === 'score' && !state.diceAnimating) return 'scorecard';
  if (state.phase === 'feedback' || state.phase === 'done') return 'dice';
  return null;
}

function setActiveTab(next, { userInitiated = false } = {}) {
  if (!TABS.includes(next)) return;
  const required = getRequiredTab();
  activeTab = userInitiated && required ? required : next;
  syncTabs();
}

function syncTabs() {
  const app = document.getElementById('app');
  if (!app) return;

  if (isMobile()) {
    const required = getRequiredTab();
    if (required) activeTab = required;
    app.dataset.mobileTab = activeTab;
  } else {
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
