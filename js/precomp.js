// ============================================================
// precomp.js — Pre-competition capability scouting logic
// ============================================================
//
//  WHAT THIS IS:
//    Pre-comp scouting is done BEFORE the event when you know
//    which teams will attend but don't have a match schedule yet.
//    Scouts fill this out from pit visits, reveal videos, or
//    watching past-season matches. One entry per team — re-scouting
//    a team overwrites the previous entry.
//
//  HOW IT DIFFERS FROM match.js:
//    - No match number or robot position (no schedule needed)
//    - Team # is entered manually (no TBA schedule auto-fill)
//    - TBA is used only to fetch the team ROSTER (names + autocomplete)
//    - Submit uses Firebase SET (not push) → one record per team number
//    - Data stored at: sessions/{code}/precomp/{teamNumber}
//    - Dashboard reads from that path to show the Pre-Comp tab
//
//  TO UPDATE FOR A NEW SEASON:
//    1. Update FIELD_LABELS if questions change (e.g. new endgame options)
//    2. Update the label maps below (PAL_LABELS, PEC_LABELS, etc.)
//    3. Update the HTML in precomp.html to match the new fields
//    4. Everything else (submit, clear, sync) is automatic
//
//  FILES THIS DEPENDS ON (loaded before this script in precomp.html):
//    - config/event-config.js    (EVENT_CODE, TBA_KEY)
//    - config/firebase-config.js (FIREBASE_CONFIG)
//
// ============================================================

// Touch swipe support (same as match.js)
document.addEventListener("touchstart", startTouch, false);
document.addEventListener("touchend",   moveTouch,  false);

var initialX   = null;
var xThreshold = 0.3;   // fraction of screen width required to trigger a swipe
var slide      = 0;

// TBA team roster: { "3603": "Bronc Botics", "254": "The Cheesy Poofs", ... }
// Populated in fetchTeamRoster() from TBA /event/{code}/teams/simple
var teamNames = {};

// Firebase / sync
var db         = null;
var syncCode   = null;
var precompRef = null;   // Firebase ref: sessions/{code}/precomp

// ============================================================
// NAVIGATION (same logic as match.js)
// ============================================================

function swipePage(increment) {
  var slides = document.getElementById("main-panel-holder").children;
  var next   = slide + increment;
  if (next < 0 || next >= slides.length) return;

  slides[slide].style.display = "none";
  slide = next;
  window.scrollTo(0, 0);
  slides[slide].style.display = "table";

  // When arriving at the Submit page (last), refresh the summary
  if (slide === slides.length - 1) {
    updateSummary();
    document.getElementById("submit-status").textContent = "";
    document.getElementById("submit-status").style.color = "";
    document.getElementById("data").innerHTML = "";
    document.getElementById("copyButton").setAttribute("value", "Copy Data");
  }
}

function startTouch(e) { initialX = e.touches[0].screenX; }

function moveTouch(e) {
  if (initialX === null) return;
  var diffX = initialX - e.changedTouches[0].screenX;
  if      (diffX / screen.width >  xThreshold) swipePage(1);
  else if (diffX / screen.width < -xThreshold) swipePage(-1);
  initialX = null;
}

// TODO: add per-page validation before allowing swipe forward.
//       Block leaving page 1 until Scouter Initials + Team # are filled.
//       Show a brief error rather than silently advancing with blank data.

// ============================================================
// COUNTER (increment/decrement buttons — same as match.js)
// ============================================================

function counter(element, step) {
  var ctr    = element.getElementsByClassName("counter")[0];
  var result = parseInt(ctr.value) + step;
  if (isNaN(result)) result = 0;
  ctr.value  = result >= 0 ? result : 0;
}

// ============================================================
// DATA COLLECTION (same pattern as match.js)
// ============================================================

// Returns a plain object with all named form fields.
function getDataObject() {
  var Form   = document.forms.scoutingForm;
  var seen   = [];
  var result = {};

  Array.from(Form.elements, el => el.name).forEach(fn => {
    if (fn && !seen.includes(fn)) seen.push(fn);
  });

  seen.forEach(function(fieldname) {
    var field = Form[fieldname];
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

// Returns comma-separated string (used for the copy-data backup button)
function getData() {
  return Object.values(getDataObject()).join(",");
}

// ============================================================
// SUBMIT PAGE — SUMMARY TABLE
// ============================================================

// Label map for the summary page.
// TODO: update this table each season if pre-comp questions change.
var FIELD_LABELS = {
  s:      "Scouter",
  e:      "Event",
  t:      "Team #",
  src:    "Scouting Source",
  drv:    "Drive Type",
  pal:    "Auto Level",
  pa1:    "Est. Auto Shot 1",
  pa5:    "Est. Auto Shot 5",
  pac:    "Auto Consistency",
  ptl:    "Scores Low Goal",
  pth:    "Scores High Goal",
  pt1:    "Est. Tele Shot 1",
  pt5:    "Est. Tele Shot 5",
  ptd:    "Plays Defense",
  pec:    "Expected Max Climb",
  per:    "Climb Reliability",
  pot:    "Overall Tier",
  pnotes: "Notes"
};

// Label maps live in js/labels.js (shared with dashboard.js Pre-Comp tab).
// TODO: update js/labels.js each season when game options change.

function friendlyValue(key, val) {
  if (key === "src") return LABEL_SRC[val] || val;
  if (key === "drv") return LABEL_DRV[val] || val;
  if (key === "pal") return LABEL_PAL[val] || val;
  if (key === "pac") return LABEL_PAC[val] || val;
  if (key === "pec") return LABEL_PEC[val] || val;
  if (key === "per") return LABEL_PER[val] || val;
  if (key === "pot") return LABEL_POT[val] || val;
  if (key === "ptl" || key === "pth" || key === "ptd")
    return val === "1" ? "Yes" : "No";
  return val || "—";
}

function updateSummary() {
  var data  = getDataObject();
  var table = document.getElementById("summary-table");
  if (!table) return;

  var rows = Object.keys(FIELD_LABELS).map(function(key) {
    var label = FIELD_LABELS[key];
    var val   = friendlyValue(key, data[key] || "");
    return '<tr>' +
      '<td style="text-align:right;padding:4px 10px;color:#555;white-space:nowrap;">' + label + ':</td>' +
      '<td style="text-align:left;padding:4px 10px;color:#000;font-weight:600;">' + val + '</td>' +
    '</tr>';
  });

  table.innerHTML = rows.join("");
}

// ============================================================
// FIREBASE SUBMIT
// ============================================================

function submitData() {
  var data     = getDataObject();
  var statusEl = document.getElementById("submit-status");
  var btn      = document.getElementById("submit");

  // Require scouter initials and a team number at minimum
  if (!data.s || !data.t) {
    statusEl.textContent = "Fill in Scouter Initials and Team # first.";
    statusEl.style.color = "#c0392b";
    return;
  }

  if (!precompRef) {
    showCodeModal();
    return;
  }

  btn.setAttribute("value", "Submitting…");
  btn.disabled = true;

  data.timestamp = new Date().toISOString();

  // Pre-comp uses SET (not push) — one entry per team number.
  // Re-scouting the same team overwrites the previous entry.
  // This is intentional: pre-comp assessments get refined as you learn more.
  // For match-by-match performance data, use match.html instead.
  precompRef.child(String(data.t)).set(data, function(err) {
    if (err) {
      statusEl.textContent = "✖ Firebase error: " + err.message;
      statusEl.style.color = "#c0392b";
      btn.setAttribute("value", "Submit");
      btn.disabled = false;
    } else {
      statusEl.textContent = "✓ Saved! Clearing for next team…";
      statusEl.style.color = "#27ae60";
      btn.setAttribute("value", "Submitted ✓");
      setTimeout(clearForm, 1500);
    }
  });
}

// TODO: add a "Force Overwrite" prompt when re-scouting an already-scouted team,
//       so scouts don't accidentally overwrite good data. Could check if
//       precompRef.child(teamNum) already has data before calling .set().

// ============================================================
// COPY DATA (backup, in case Firebase is down)
// ============================================================

function copyData() {
  navigator.clipboard.writeText(getData());
  document.getElementById("copyButton").setAttribute("value", "Copied");
}

// ============================================================
// TBA TEAM ROSTER
// ============================================================

// Fetches the list of teams attending the event from TBA.
// This works even BEFORE the event has a match schedule posted.
// Populates the name lookup map and the autocomplete datalist.
// If the event isn't on TBA yet, fails gracefully — scouts type manually.
function fetchTeamRoster() {
  var event    = (typeof EVENT_CODE !== "undefined" && EVENT_CODE) ? EVENT_CODE : "";
  var key      = (typeof TBA_KEY    !== "undefined" && TBA_KEY)    ? TBA_KEY    : "";
  var statusEl = document.getElementById("tba-status");

  if (!event || !key) {
    if (statusEl) statusEl.textContent = "TBA_KEY or EVENT_CODE missing — set them in config/event-config.js";
    return;
  }

  if (statusEl) statusEl.textContent = "Fetching TBA team roster…";

  // /event/{code}/teams/simple works for future events that have team lists
  fetch("https://www.thebluealliance.com/api/v3/event/" + event + "/teams/simple", {
    headers: { "X-TBA-Auth-Key": key }
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data)) throw new Error("unexpected TBA response");

      // Build name map and populate the datalist for autocomplete
      var datalist = document.getElementById("tba-team-list");
      data.forEach(function(team) {
        var num  = String(team.team_number);
        var name = team.nickname || "";
        teamNames[num] = name;
        if (datalist) {
          var opt   = document.createElement("option");
          opt.value = num;
          opt.label = name;
          datalist.appendChild(opt);
        }
      });

      if (statusEl) statusEl.textContent = "✓ TBA: " + data.length + " teams registered for this event";
      showTeamName();   // fill name if team # was already typed
    })
    .catch(function() {
      // Not fatal — event may not be on TBA yet for pre-season use
      if (statusEl) statusEl.textContent = "TBA team list unavailable (event may not be posted yet) — type team # manually";
    });
}

// Looks up a team's nickname after the scout types their number.
// Shows it below the input field for quick confirmation.
function showTeamName() {
  var teamEl = document.getElementById("input_t");
  var label  = document.getElementById("teamname-label");
  if (!teamEl || !label) return;
  var num  = String(teamEl.value || "").trim();
  var name = teamNames[num];
  label.textContent = name ? name : "";
}

// TODO: if the team number isn't in the TBA roster, show a warning
//       so scouts know they may have typed it wrong.

// ============================================================
// CLEAR FORM (after submit, reset for the next team)
// ============================================================

function clearForm() {
  var slides = document.getElementById("main-panel-holder").children;
  slides[slide].style.display = "none";
  slide = 0;
  slides[0].style.display = "table";
  window.scrollTo(0, 0);

  // Clear all input_ elements.
  // Keep: event (e) and scouter (s) — those persist between teams.
  // Clear: team # (t) — every pre-comp entry is a different team.
  document.querySelectorAll("[id*='input_']").forEach(function(el) {
    var code = el.id.substring(6);
    if (code === "e" || code === "s") return;

    if (el.className === "counter") {
      el.value = 0;
    } else if (el.type === "checkbox") {
      el.checked = false;
    } else if (el.type === "number" || el.type === "text") {
      el.value = "";
    }
  });

  // Uncheck all radio buttons
  document.querySelectorAll('input[type="radio"]').forEach(function(r) {
    r.checked = false;
  });

  // Clear team name display
  var label = document.getElementById("teamname-label");
  if (label) label.textContent = "";

  // Reset submit button state
  var btn = document.getElementById("submit");
  if (btn) { btn.setAttribute("value", "Submit"); btn.disabled = false; }
}

// ============================================================
// FIREBASE + SYNC CODE
// ============================================================

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch(e) {
    console.error("Firebase init failed:", e.message);
    showSyncBanner("Firebase not configured — check config/firebase-config.js", "#c0392b");
    return;
  }

  // Always show the modal on load so scouts can confirm/change the code.
  // Pre-fill with the saved code if there is one.
  var saved = localStorage.getItem("scout_sync_code");
  if (saved) {
    document.getElementById("sync-input").value = saved;
  }
  showCodeModal();
}

function applyCode(code) {
  syncCode   = code;
  precompRef = db.ref("sessions/" + code + "/precomp");
  localStorage.setItem("scout_sync_code", code);
  showSyncBanner("Sync: " + code, "#27ae60");
}

function showCodeModal() {
  document.getElementById("sync-modal").style.display = "flex";
}

function joinCode() {
  var input = document.getElementById("sync-input").value.trim().toUpperCase().replace(/\s+/g, "");
  if (!input) return;
  document.getElementById("sync-modal").style.display = "none";
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
  el.style.color = color || "#eee";
}

// TODO: show number of teams already pre-scouted in the banner.
//       Listen on precompRef and count keys, then update the banner.
//       e.g. "Sync: FRC3603 — 8 teams scouted"

// ============================================================
// INIT
// ============================================================

window.onload = function() {
  // Set event code from config/event-config.js
  var eventEl = document.getElementById("input_e");
  if (eventEl && typeof EVENT_CODE !== "undefined" && EVENT_CODE) {
    eventEl.value = EVENT_CODE;
  }

  // Show the first panel (all others are hidden via .main-panel { display: none } in scouting.css)
  var slides = document.getElementById("main-panel-holder").children;
  if (slides.length > 0) slides[0].style.display = "table";

  // Firebase
  initFirebase();

  // Fetch TBA team roster (may be empty for future events — that's OK)
  fetchTeamRoster();

  // Update team name label when team # field changes
  var teamEl = document.getElementById("input_t");
  if (teamEl) teamEl.addEventListener("input", showTeamName);
};
