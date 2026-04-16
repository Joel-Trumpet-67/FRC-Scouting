// ============================================================
// js/pit.js — Pit scouting form logic
// ============================================================
//
//  HOW IT WORKS:
//    1. Scout opens pit.html on their phone during pit scouting
//    2. They enter a team number (auto-fills team name from season/teams.js)
//    3. Fill out robot specs (drivetrain, hang level, weight, etc.)
//    4. On submit, data is pushed to Firebase → dashboard can read it
//    5. A QR code is always shown on the submit page so data can be
//       transferred to the coach laptop via Excel even without WiFi
//
//  Firebase path: sessions/{code}/pit/{team_number}
//  (One entry per team — rescanning a pit overwrites the previous entry.)
//
//  FILES THIS DEPENDS ON (loaded before this script in pit.html):
//    - config/event-config.js   (EVENT_CODE, TBA_KEY)
//    - config/firebase-config.js (FIREBASE_CONFIG)
//    - season/teams.js           (TEAM_DATA)
//    - season/pit-fields.js      (PIT_FIELD_LABELS, pitFriendlyValue)
//    - assets/lib/easy.qrcode.min.js
//
// ============================================================

// Touch swipe support
document.addEventListener("touchstart", startTouch, false);
document.addEventListener("touchend",   moveTouch,  false);

var initialX   = null;
var xThreshold = 0.3;
var slide      = 0;

// Firebase / sync
var db       = null;
var syncCode = null;
var pitRef   = null;

// QR code object (easy.qrcode)
var qrPitObj = null;

// ============================================================
// NAVIGATION
// ============================================================

function swipePage(increment) {
  var slides = document.getElementById("main-panel-holder").children;
  var next   = slide + increment;
  if (next < 0 || next >= slides.length) return;

  if (increment > 0) {
    var err = validatePitPage(slide);
    if (err) { showPageError(slide, err); return; }
  }
  clearPageError(slide);

  slides[slide].style.display = "none";
  slide = next;
  window.scrollTo(0, 0);
  slides[slide].style.display = "table";

  // When arriving at the submit page, refresh summary + generate QR
  if (slide === slides.length - 1) {
    updatePitSummary();
    document.getElementById("submit-status").textContent = "";
    document.getElementById("submit-status").style.color = "";
    generatePitQR();
  }
}

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

// ── Page validation ────────────────────────────────────────────
function validatePitPage(pageIndex) {
  if (pageIndex === 0) {
    var s  = (document.getElementById('input_s').value  || '').trim();
    var pt = (document.getElementById('input_pt').value || '').trim();
    if (!s)  return 'Enter Scouter Initials before continuing.';
    if (!pt) return 'Enter a Team # before continuing.';
  }
  return null;
}

function showPageError(pageIndex, msg) {
  var el = document.getElementById('page-error-' + pageIndex);
  if (!el) return;
  el.textContent = '\u26A0 ' + msg;
  el.style.display = 'block';
}

function clearPageError(pageIndex) {
  var el = document.getElementById('page-error-' + pageIndex);
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

// ============================================================
// COUNTER
// ============================================================

function pitCounter(element, step) {
  var ctr    = element.getElementsByClassName("counter")[0];
  var result = parseInt(ctr.value) + step;
  if (isNaN(result)) result = 0;
  ctr.value  = result >= 0 ? result : 0;
}

// ============================================================
// TEAM NAME LOOKUP (season/teams.js)
// ============================================================

function updatePitTeamLabel(num) {
  var label = document.getElementById('pit-teamname-label');
  if (!label) return;
  var t = TEAM_DATA && TEAM_DATA[String(num)];
  label.textContent = t ? num + ' \u2014 ' + t.name + ' (' + t.city + ', ' + t.state + ')' : '';
  // Auto-fill team name field if it's empty
  var nameEl = document.getElementById('input_pn');
  if (nameEl && !nameEl.value && t) nameEl.value = t.name;
}

// ============================================================
// DATA COLLECTION
// ============================================================

// Returns a plain object with all named form fields
function getPitDataObject() {
  var Form = document.forms.pitForm;
  var seen = [];
  var result = {};

  Array.from(Form.elements).forEach(function(el) {
    if (el.name && !seen.includes(el.name)) seen.push(el.name);
  });

  seen.forEach(function(fieldname) {
    var field = Form[fieldname];
    if (!field) return;
    if (field.type === "checkbox") {
      result[fieldname] = field.checked ? "1" : "0";
    } else {
      result[fieldname] = field.value
        ? field.value.replace(/"/g, "").replace(/;/g, "-")
        : "";
    }
  });

  return result;
}

// Returns comma-separated string (same format as match data — Excel/QR compatible)
function getPitData() {
  return Object.values(getPitDataObject()).join(",");
}

// ============================================================
// SUMMARY TABLE
// ============================================================

function updatePitSummary() {
  var data  = getPitDataObject();
  var table = document.getElementById("pit-summary-table");
  if (!table) return;

  var rows = Object.keys(PIT_FIELD_LABELS).map(function(key) {
    var label = PIT_FIELD_LABELS[key];
    var val   = pitFriendlyValue(key, data[key] || "");
    return '<tr>' +
      '<td style="text-align:right;padding:4px 10px;color:#555;white-space:nowrap;">' + label + ':</td>' +
      '<td style="text-align:left;padding:4px 10px;color:#000;font-weight:600;">' + val + '</td>' +
    '</tr>';
  });

  table.innerHTML = rows.join("");
}

// ============================================================
// QR CODE
// ============================================================

function generatePitQR() {
  var data      = getPitData();
  var container = document.getElementById('qrcode-pit');
  if (!container) return;

  // Always regenerate from scratch so data is current
  container.innerHTML = '';
  qrPitObj = new QRCode(container, {
    text:         data || ' ',
    correctLevel: QRCode.CorrectLevel.L,
    width:        220,
    height:       220
  });
}

// ============================================================
// FIREBASE SUBMIT
// ============================================================

function pitSubmitData() {
  var data     = getPitDataObject();
  var statusEl = document.getElementById("submit-status");
  var btn      = document.getElementById("submit");

  if (!data.s || !data.pt) {
    statusEl.textContent = "Fill in Scouter and Team # first.";
    statusEl.style.color = "#c0392b";
    return;
  }

  data.timestamp = new Date().toISOString();

  // Offline path — QR is already shown on this page; just notify
  if (!pitRef) {
    statusEl.textContent = "\u26A1 No Firebase \u2014 use QR code above to transfer data.";
    statusEl.style.color = "#e67e22";
    return;
  }

  btn.setAttribute("value", "Submitting\u2026");
  btn.disabled = true;

  // Store at sessions/{code}/pit/{team_number} — one entry per team (overwrites on rescan)
  pitRef.child(String(data.pt)).set(data, function(err) {
    if (err) {
      statusEl.textContent = "\u26A0 Firebase error \u2014 use QR code above to transfer data.";
      statusEl.style.color = "#c0392b";
    } else {
      statusEl.textContent = "\u2713 Pit data saved for Team " + data.pt + "!";
      statusEl.style.color = "#27ae60";
    }
    btn.setAttribute("value", "Submit");
    btn.disabled = false;
  });
}

// ============================================================
// CLEAR FORM
// ============================================================

function pitClearForm() {
  var slides = document.getElementById("main-panel-holder").children;
  slides[slide].style.display = "none";
  slide = 0;
  slides[0].style.display = "table";
  window.scrollTo(0, 0);

  // Clear inputs — preserve event code and scouter initials between scouts
  document.querySelectorAll('#pitForm input').forEach(function(el) {
    if (el.id === 'input_e' || el.id === 'input_s') return;
    if (el.type === 'radio')    { el.checked = false; return; }
    if (el.type === 'checkbox') { el.checked = false; return; }
    if (el.type === 'button')   { return; }
    if (el.className === 'counter') { el.value = '15'; return; }
    el.value = '';
  });

  document.getElementById('pit-teamname-label').textContent = '';

  // Reset submit button
  var btn = document.getElementById("submit");
  if (btn) { btn.setAttribute("value", "Submit"); btn.disabled = false; }

  // Clear QR
  var container = document.getElementById('qrcode-pit');
  if (container) container.innerHTML = '';
  qrPitObj = null;

  document.getElementById("submit-status").textContent = "";
}

// ============================================================
// FIREBASE + SYNC CODE
// ============================================================

function initPitFirebase() {
  if (typeof DEFAULT_SYNC_CODE !== 'undefined' && DEFAULT_SYNC_CODE) {
    syncCode = DEFAULT_SYNC_CODE;
  } else {
    syncCode = localStorage.getItem("scout_sync_code");
  }

  if (syncCode) {
    localStorage.setItem("scout_sync_code", syncCode);
    showSyncBanner('Sync: ' + syncCode, '#27ae60');
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch(e) {
    console.error("Firebase init failed:", e.message);
    showSyncBanner('Firebase offline \u2014 QR mode only', '#e67e22');
    return;
  }

  if (syncCode) {
    pitRef = db.ref("sessions/" + syncCode + "/pit");
  } else {
    document.getElementById("sync-modal").style.display = "flex";
  }
}

function applyCode(code) {
  syncCode = code;
  pitRef   = db ? db.ref("sessions/" + code + "/pit") : null;
  localStorage.setItem("scout_sync_code", code);
  showSyncBanner('Sync: ' + code, '#27ae60');
  document.getElementById("sync-modal").style.display = "none";
}

function joinCode() {
  var input = document.getElementById("sync-input").value.trim().toUpperCase().replace(/\s+/g, "");
  if (!input) return;
  applyCode(input);
}

function changeCode() {
  document.getElementById("sync-input").value = syncCode || "";
  document.getElementById("sync-modal").style.display = "flex";
}

function showSyncBanner(text, color) {
  var el = document.getElementById("sync-banner");
  if (!el) return;
  el.textContent = text;
  el.style.color  = color || "#eee";
}

// ============================================================
// INIT
// ============================================================

window.onload = function() {
  var eventEl = document.getElementById("input_e");
  if (eventEl && typeof EVENT_CODE !== "undefined" && EVENT_CODE) {
    eventEl.value = EVENT_CODE;
  }

  initPitFirebase();
};
