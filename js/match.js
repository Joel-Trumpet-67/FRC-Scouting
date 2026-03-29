// ============================================================
// match.js — Scout form logic
// ============================================================
//
//  HOW IT WORKS:
//    1. Scout opens match.html on their phone
//    2. They enter a shared sync code (e.g. "FRC3603") to join the session
//    3. TBA schedule is fetched to auto-fill team numbers
//    4. On submit, data is pushed to Firebase → dashboard reads it live
//
//  TO ADD OR CHANGE GAME FIELDS (each new season):
//    1. Add/remove <input> elements in match.html (give each a name="xx" id="input_xx")
//    2. Add the field label to FIELD_LABELS below (so the summary page shows it)
//    3. Add friendly display logic to friendlyValue() if needed
//    The rest (data collection, submit, clear) is fully automatic.
//
//  FILES THIS DEPENDS ON (loaded before this script in match.html):
//    - config/event-config.js   (EVENT_CODE, TBA_KEY)
//    - config/firebase-config.js (FIREBASE_CONFIG)
//
// ============================================================

// Touch swipe support
document.addEventListener("touchstart", startTouch, false);
document.addEventListener("touchend",   moveTouch,  false);

var initialX   = null;
var xThreshold = 0.3;   // fraction of screen width required to trigger swipe
var slide      = 0;

// TBA schedule cache
var schedule      = null;
var scheduleEvent = null;

// Firebase / sync
var db         = null;
var syncCode   = null;
var entriesRef = null;

// ============================================================
// NAVIGATION
// ============================================================

function swipePage(increment) {
  var slides = document.getElementById("main-panel-holder").children;
  var next = slide + increment;
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

// TODO: add per-page validation before allowing swipe forward.
//       Example: block leaving Pre-Match until Scouter + Match # are filled in.
//       This prevents scouts from accidentally advancing with missing data.

// ============================================================
// COUNTER (increment/decrement buttons)
// ============================================================

function counter(element, step) {
  var ctr = element.getElementsByClassName("counter")[0];
  var result = parseInt(ctr.value) + step;
  if (isNaN(result)) result = 0;
  ctr.value = result >= 0 ? result : 0;
}

// ============================================================
// TIMER (climb timer with 0.1s precision)
// ============================================================

function getIdBase(name) {
  return name.slice(name.indexOf("_"), name.length);
}

function timer(element) {
  var timerID       = element.firstChild;
  var tId           = getIdBase(timerID.id);
  var timerStatus   = document.getElementById("status"     + tId);
  var startButton   = document.getElementById("start"      + tId);
  var intervalField = document.getElementById("intervalId" + tId);
  var inp           = document.getElementById("input"      + tId);

  if (timerStatus.value === "stopped") {
    timerStatus.value = "started";
    startButton.setAttribute("value", "Stop");
    var intId = setInterval(function() {
      if (document.getElementById("status" + tId).value === "started") {
        var t = parseFloat(inp.value) + 0.1;
        inp.value = t.toFixed(1);
      }
    }, 100);
    intervalField.value = intId;
  } else {
    timerStatus.value = "stopped";
    startButton.setAttribute("value", "Start");
    clearInterval(intervalField.value);
    intervalField.value = "";
  }
}

function resetTimer(element) {
  var timerID       = element.firstChild;
  var tId           = getIdBase(timerID.id);
  var inp           = document.getElementById("input"      + tId);
  var timerStatus   = document.getElementById("status"     + tId);
  var startButton   = document.getElementById("start"      + tId);
  var intervalField = document.getElementById("intervalId" + tId);

  inp.value = 0;
  if (intervalField.value !== "") clearInterval(intervalField.value);
  intervalField.value = "";
  timerStatus.value = "stopped";
  startButton.setAttribute("value", "Start");
}

// TODO: add a "lap" button to the climb timer so scouts can record when each
//       level was reached (L1 time, L2 time, L3 time) during a multi-stage climb.

// ============================================================
// FIELD IMAGE (auto-start position canvas)
// ============================================================

function initCanvas() {
  var img    = document.getElementById("img_as");
  var canvas = document.getElementById("canvas_as");
  if (!canvas || !img) return;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.style.width  = "min(" + img.naturalWidth + "px, 96vw)";
  canvas.style.height = "auto";
  drawFields();
}

function drawFields() {
  var fields = document.querySelectorAll("[id*='canvas_']");
  for (var f of fields) {
    var code    = f.id.substring(7);
    var img     = document.getElementById("img_"   + code);
    var shapeEl = document.getElementById("shape_" + code);
    if (!img || !img.complete || !img.naturalWidth) continue;

    var shapeArr = shapeEl ? shapeEl.value.split(" ") : ["circle","5","black","red","true"];
    var ctx = f.getContext("2d");
    ctx.clearRect(0, 0, f.width, f.height);
    ctx.drawImage(img, 0, 0, f.width, f.height);

    var xyStr = document.getElementById("XY_" + code).value;
    if (xyStr.length > 2) {
      var pts = JSON.parse(xyStr);
      for (var p of pts) {
        var coord  = p.split(",");
        var cx     = parseFloat(coord[0]);
        var cy     = parseFloat(coord[1]);
        var radius = parseInt(shapeArr[1]) || 5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
        ctx.lineWidth   = 2;
        ctx.strokeStyle = shapeArr[2] || "#FFFFFF";
        if (shapeArr[4] && shapeArr[4].toLowerCase() === "true") ctx.fillStyle = shapeArr[3];
        ctx.stroke();
        if (shapeArr[4] && shapeArr[4].toLowerCase() === "true") ctx.fill();
      }
    }
  }
}

function onFieldClick(event) {
  var target      = event.target;
  var base        = getIdBase(target.id);
  var coords      = event.offsetX + "," + event.offsetY;
  var changingXY  = document.getElementById("XY"               + base);
  var changingIn  = document.getElementById("input"            + base);
  var restrictEl  = document.getElementById("clickRestriction" + base);
  var restriction = restrictEl ? restrictEl.value : "none";

  if (restriction === "one") {
    changingXY.value = JSON.stringify([coords]);
    changingIn.value = JSON.stringify([1]);
  } else {
    var xyArr = JSON.parse(changingXY.value);
    xyArr.push(coords);
    changingXY.value = JSON.stringify(xyArr);
  }
  drawFields();
}

function undo(element) {
  var undoID      = element.firstChild;
  var base        = getIdBase(undoID.id);
  var changingXY  = document.getElementById("XY"    + base);
  var changingIn  = document.getElementById("input" + base);
  var xyArr  = JSON.parse(changingXY.value); xyArr.pop();
  var boxArr = JSON.parse(changingIn.value); boxArr.pop();
  changingXY.value = JSON.stringify(xyArr);
  changingIn.value = JSON.stringify(boxArr);
  drawFields();
}

function flip(element) {
  var flipID = element.firstChild;
  var canvas = document.getElementById("canvas" + getIdBase(flipID.id));
  canvas.style.transform = canvas.style.transform === "" ? "rotate(180deg)" : "";
  drawFields();
}

// TODO: each season, replace assets/images/2026/field_image.png with the new field image.
//       Update the <img src="..."> in match.html to point to the new path.
//       The canvas logic above doesn't need changes — it's position-independent.

// ============================================================
// DATA COLLECTION
// ============================================================

// Returns a plain object with all named form fields
function getDataObject() {
  var Form = document.forms.scoutingForm;
  var seen = [];
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

// Returns comma-separated string (matches original scoutingPASS format)
function getData() {
  return Object.values(getDataObject()).join(",");
}

// ============================================================
// SUBMIT PAGE — SUMMARY TABLE
// ============================================================

// Add an entry here for every named field in match.html.
// key = the name="xx" attribute on the input, value = display label.
// TODO: update this table each season when game fields change.
var FIELD_LABELS = {
  s:   "Scouter",
  e:   "Event",
  l:   "Match Level",
  m:   "Match #",
  r:   "Robot",
  t:   "Team #",
  ad8: "Dumps 8",
  as1: "Auton Shot 1",
  as5: "Auton Shot 5",
  amf: "Auton Missed",
  ac1: "Auton L1 Climb",
  taw: "Won Auto?",
  ts1: "Teleop Shot 1",
  ts5: "Teleop Shot 5",
  tmf: "Teleop Missed",
  hcap:"Hub Capacity",
  ect: "Climb Timer (s)",
  efs: "Final Status",
  die: "Died/Immobilized",
  tip: "Tippy",
  dta: "Downtime Actions",
  cmm: "Comments"
};

// TODO: update these label maps when game-specific options change each season.
var EFS_LABELS   = { "1":"Level 1 Climb", "2":"Level 2 Climb", "3":"Level 3 Climb", "F":"Failed Climb", "X":"Not attempted" };
var DTA_LABELS   = { "D":"Defence", "P":"Pickup Fuel", "B":"Both", "N":"No Actions" };
var ROBOT_LABELS = { r1:"Red-1", b1:"Blue-1", r2:"Red-2", b2:"Blue-2", r3:"Red-3", b3:"Blue-3" };
var LEVEL_LABELS = { qm:"Quals", sf:"Semifinals", f:"Finals" };

function friendlyValue(key, val) {
  if (key === "efs") return EFS_LABELS[val] || val;
  if (key === "dta") return DTA_LABELS[val] || val;
  if (key === "r")   return ROBOT_LABELS[val] || val;
  if (key === "l")   return LEVEL_LABELS[val] || val;
  if (key === "ad8" || key === "ac1" || key === "taw" ||
      key === "die" || key === "tip")
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

  // Basic validation — must have the 4 core fields
  if (!data.s || !data.m || !data.r || !data.t) {
    statusEl.textContent = "Fill in Scouter, Match #, Robot, and Team # first.";
    statusEl.style.color = "#c0392b";
    return;
  }

  if (!entriesRef) {
    statusEl.textContent = "No sync code set — enter a code in the banner above.";
    statusEl.style.color = "#c0392b";
    return;
  }

  btn.setAttribute("value", "Submitting…");
  btn.disabled = true;

  // Duplicate check: same scouter + match # + robot + event = already submitted
  // TODO: add a "force submit anyway" button for cases where a re-scout is intentional
  entriesRef.once("value", function(snapshot) {
    var existing = snapshot.val() || {};
    var isDup = Object.values(existing).some(function(d) {
      return d.s === data.s && d.m === data.m && d.r === data.r && d.e === data.e;
    });
    if (isDup) {
      statusEl.textContent = "⚠ Duplicate — already submitted this match/robot/scouter.";
      statusEl.style.color = "#c0392b";
      btn.setAttribute("value", "Submit");
      btn.disabled = false;
      return;
    }
    data.timestamp = new Date().toISOString();
    entriesRef.push(data, function(err) {
      if (err) {
        statusEl.textContent = "✖ Firebase error: " + err.message;
        statusEl.style.color = "#c0392b";
        btn.setAttribute("value", "Submit");
        btn.disabled = false;
      } else {
        statusEl.textContent = "✓ Saved! Advancing to next match…";
        statusEl.style.color = "#27ae60";
        btn.setAttribute("value", "Submitted ✓");
        setTimeout(clearForm, 1500);
      }
    });
  });
}

// ============================================================
// DISPLAY / COPY (backup, in case Firebase is down)
// ============================================================

function displayData() {
  document.getElementById("data").innerHTML = getData();
}

function copyData() {
  navigator.clipboard.writeText(getData());
  document.getElementById("copyButton").setAttribute("value", "Copied");
}

// TODO: if Firebase is unavailable, queue submissions in localStorage and
//       retry when the connection is restored. This would let scouts work offline.

// ============================================================
// MATCH START (updates robot display label, triggers TBA auto-fill)
// ============================================================

function updateMatchStart() {
  var robotMap = { r1:"Red-1", b1:"Blue-1", r2:"Red-2", b2:"Blue-2", r3:"Red-3", b3:"Blue-3" };
  var robotField = document.forms.scoutingForm.r;
  if (robotField) {
    var displayR = document.getElementById("display_r");
    if (displayR) displayR.value = robotMap[robotField.value] || "";
  }
  autoFillTeam();
}

// ============================================================
// TBA SCHEDULE INTEGRATION
// ============================================================

function fetchSchedule() {
  var event = (document.getElementById("input_e").value || "").trim();
  if (!event || event === scheduleEvent) return;

  var statusEl = document.getElementById("tba-status");

  // TBA_KEY comes from config/event-config.js
  var key = (typeof TBA_KEY !== "undefined" && TBA_KEY) ? TBA_KEY : "";
  if (!key) {
    if (statusEl) statusEl.textContent = "TBA_KEY missing — set it in config/event-config.js";
    return;
  }

  if (statusEl) statusEl.textContent = "Fetching TBA schedule…";

  fetch("https://www.thebluealliance.com/api/v3/event/" + event + "/matches/simple", {
    headers: { "X-TBA-Auth-Key": key }
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (Array.isArray(data)) {
        schedule      = data;
        scheduleEvent = event;
        if (statusEl) statusEl.textContent = "✓ TBA: " + data.length + " matches loaded";
        autoFillTeam();
      } else {
        if (statusEl) statusEl.textContent = "TBA: " + (data.error || "No data — check EVENT_CODE in config/event-config.js");
        schedule = null;
      }
    })
    .catch(function() {
      if (statusEl) statusEl.textContent = "TBA fetch failed — check TBA_KEY in config/event-config.js";
    });
}

// Reads match level + number + robot position and auto-fills the team number field.
function autoFillTeam() {
  if (!schedule) return;
  var matchNumEl = document.getElementById("input_m");
  var levelEl    = document.querySelector('input[name="l"]:checked');
  var robotEl    = document.querySelector('input[name="r"]:checked');
  if (!matchNumEl || !matchNumEl.value || !levelEl || !robotEl) return;

  var matchNum = parseInt(matchNumEl.value);
  var level    = levelEl.value;   // qm | sf | f
  var robot    = robotEl.value;   // r1 | b1 | r2 | b2 | r3 | b3

  // Build the expected TBA match key, e.g. "2026milac_qm12"
  var event    = (document.getElementById("input_e").value || "").trim();
  var matchKey = event + "_" + level + matchNum;

  var match = schedule.find(function(m) {
    if (level === "qm") return m.key === matchKey;
    // For sf/f, match_number alone isn't unique — match by comp_level + match_number
    return m.comp_level === level && m.match_number === matchNum;
  });

  if (!match) {
    showMatchPreview(null);
    return;
  }

  // Auto-fill team number from the correct alliance + position
  var allianceKey = robot.charAt(0) === "r" ? "red" : "blue";
  var pos         = parseInt(robot.charAt(1)) - 1;
  var alliance    = match.alliances[allianceKey];
  if (alliance && alliance.team_keys && alliance.team_keys[pos]) {
    var teamNum = alliance.team_keys[pos].replace("frc", "");
    var teamEl  = document.getElementById("input_t");
    if (teamEl) teamEl.value = teamNum;
    var label = document.getElementById("teamname-label");
    if (label) label.textContent = "Auto-filled from TBA";
  }

  showMatchPreview(match);
}

// Renders a 2-row grid showing all 6 match positions (Red 1-3 / Blue 1-3)
function showMatchPreview(match) {
  var el = document.getElementById("match-preview");
  if (!el) return;
  if (!match) { el.innerHTML = ""; return; }

  var red  = (match.alliances.red.team_keys  || []).map(function(k){ return k.replace("frc",""); });
  var blue = (match.alliances.blue.team_keys || []).map(function(k){ return k.replace("frc",""); });

  function cell(color, bg, label, team) {
    return '<td style="background:' + bg + ';color:' + color + ';padding:8px 6px;text-align:center;width:33%;">' +
      '<div style="font-size:10px;opacity:0.75;">' + label + '</div>' +
      '<div style="font-size:18px;">' + (team||'?') + '</div></td>';
  }

  el.innerHTML =
    '<table style="width:100%;border-collapse:collapse;">' +
    '<tr>' +
      cell('#fff','#c0392b','Red 1', red[0]) +
      cell('#fff','#c0392b','Red 2', red[1]) +
      cell('#fff','#c0392b','Red 3', red[2]) +
    '</tr><tr>' +
      cell('#fff','#1a5fa8','Blue 1', blue[0]) +
      cell('#fff','#1a5fa8','Blue 2', blue[1]) +
      cell('#fff','#1a5fa8','Blue 3', blue[2]) +
    '</tr></table>';
}

// ============================================================
// CLEAR FORM (after submit, reset for next match)
// ============================================================

function clearForm() {
  // Save robot position so we can restore it for the next match
  var savedRobotEl  = document.querySelector('input[name="r"]:checked');
  var savedRobotVal = savedRobotEl ? savedRobotEl.value : null;

  var slides = document.getElementById("main-panel-holder").children;
  slides[slide].style.display = "none";
  slide = 0;
  slides[0].style.display = "table";
  window.scrollTo(0, 0);

  // Increment match # automatically
  var matchEl = document.getElementById("input_m");
  if (matchEl) {
    var m = parseInt(matchEl.value);
    matchEl.value = isNaN(m) ? "" : m + 1;
  }

  // Clear XY coordinates (field canvas)
  document.querySelectorAll("[id*='XY_']").forEach(e => { e.value = "[]"; });

  // Clear all input_ elements (counters, timers, text, checkboxes, radios)
  // Skips: match # (m), event (e), scouter (s) — these persist between matches
  document.querySelectorAll("[id*='input_']").forEach(function(e) {
    var code = e.id.substring(6);
    if (code === "m" || code === "e" || code === "s") return;
    if (code.startsWith("r_") || code.startsWith("l_")) return;
    if (e.className === "clickableImage") { e.value = "[]"; return; }

    var radio = code.indexOf("_");
    if (radio > -1) {
      var baseCode = code.substr(0, radio);
      if (e.checked) {
        e.checked = false;
        var disp = document.getElementById("display_" + baseCode);
        if (disp) disp.value = "";
      }
      var def = document.getElementById("default_" + baseCode);
      if (def && def.value && def.value === e.value) {
        e.checked = true;
        var disp2 = document.getElementById("display_" + baseCode);
        if (disp2) disp2.value = def.value;
      }
    } else {
      if (e.type === "number" || e.type === "text" || e.type === "hidden") {
        if (e.className === "counter" || e.className === "timer") {
          e.value = 0;
          if (e.className === "timer") {
            var intF   = document.getElementById("intervalId_" + code);
            var statF  = document.getElementById("status_"     + code);
            var startB = document.getElementById("start_"      + code);
            if (intF && intF.value !== "") clearInterval(intF.value);
            if (intF)   intF.value  = "";
            if (statF)  statF.value = "stopped";
            if (startB) startB.setAttribute("value", "Start");
          }
        } else {
          e.value = "";
        }
      } else if (e.type === "checkbox") {
        e.checked = false;
      }
    }
  });

  // Restore robot position for next match (scouts stay on the same robot)
  if (savedRobotVal) {
    var robotInput = document.querySelector('input[name="r"][value="' + savedRobotVal + '"]');
    if (robotInput) robotInput.checked = true;
    var displayR = document.getElementById("display_r");
    if (displayR) displayR.value = savedRobotVal;
  }

  // Reset submit button state
  var submitBtn = document.getElementById("submit");
  if (submitBtn) { submitBtn.setAttribute("value", "Submit"); submitBtn.disabled = false; }

  // Auto-fill team for new match + same robot position
  autoFillTeam();
  drawFields();
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

  syncCode = localStorage.getItem("scout_sync_code");
  if (syncCode) {
    applyCode(syncCode);
  } else {
    showCodeModal();
  }
}

function applyCode(code) {
  syncCode   = code;
  entriesRef = db.ref("sessions/" + code + "/entries");
  localStorage.setItem("scout_sync_code", code);
  showSyncBanner("Sync: " + code, "#27ae60");
  fetchSchedule();
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

// TODO: show entry count in the sync banner so scouts can confirm their data went through.
//       e.g. "Sync: FRC3603 (12 entries)"  — listen on entriesRef and count.

// ============================================================
// INIT
// ============================================================

window.onload = function() {
  // Set event code from config/event-config.js (so scouts don't have to type it)
  var eventEl = document.getElementById("input_e");
  if (eventEl && typeof EVENT_CODE !== "undefined" && EVENT_CODE) {
    eventEl.value = EVENT_CODE;
  }

  // Field image canvas setup
  var img = document.getElementById("img_as");
  if (img) {
    if (img.complete && img.naturalWidth) initCanvas();
    else img.onload = initCanvas;
  }

  // Firebase
  initFirebase();

  // Re-fetch schedule when event field changes
  if (eventEl) {
    eventEl.addEventListener("change", fetchSchedule);
    eventEl.addEventListener("blur",   fetchSchedule);
  }

  // Auto-fill team when match # changes
  var matchEl = document.getElementById("input_m");
  if (matchEl) matchEl.addEventListener("input", autoFillTeam);

  // Auto-fill team when robot or level radio changes
  document.querySelectorAll('input[name="r"], input[name="l"]').forEach(function(el) {
    el.addEventListener("change", autoFillTeam);
  });
};
