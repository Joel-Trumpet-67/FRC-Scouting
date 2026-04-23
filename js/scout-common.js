// scout-common.js — shared utilities for match.js and pit.js

// ── Touch swipe ───────────────────────────────────────────────

function startTouch(e) {
  initialX = e.touches[0].screenX;
}

function moveTouch(e) {
  if (initialX === null) return;
  var diffX = initialX - e.changedTouches[0].screenX;
  if      (diffX / screen.width >  xThreshold) swipePage(1);
  else if (diffX / screen.width < -xThreshold) swipePage(-1);
  initialX = null;
}

// ── Page error display ────────────────────────────────────────

function showPageError(pageIndex, msg) {
  var el = document.getElementById('page-error-' + pageIndex);
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

function clearPageError(pageIndex) {
  var el = document.getElementById('page-error-' + pageIndex);
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

// ── Sync banner ───────────────────────────────────────────────

function showSyncBanner(text, color) {
  var el = document.getElementById('sync-banner');
  if (!el) return;
  el.textContent = text;
  el.style.color = color || '#eee';
}

// ── Sync code modal ───────────────────────────────────────────

function joinCode() {
  var input = document.getElementById('sync-input').value.trim().toUpperCase().replace(/\s+/g, '');
  if (!input) return;
  document.getElementById('sync-modal').style.display = 'none';
  applyCode(input);
}

function changeCode() {
  document.getElementById('sync-input').value = syncCode || '';
  document.getElementById('sync-modal').style.display = 'flex';
}
