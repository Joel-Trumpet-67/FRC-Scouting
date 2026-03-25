// Touch swipe support
document.addEventListener("touchstart", startTouch, false);
document.addEventListener("touchend",   moveTouch,  false);

var initialX   = null;
var xThreshold = 0.3;
var slide      = 0;
var dataFormat = "tsv";

// TBA schedule cache
var schedule      = null;
var scheduleEvent = null;

// Firebase / sync
var db         = null;
var syncCode   = null;
var entriesRef = null;

// ===== NAVIGATION =====
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

// ===== COUNTER =====
function counter(element, step) {
  var ctr = element.getElementsByClassName("counter")[0];
  var result = parseInt(ctr.value) + step;
  if (isNaN(result)) result = 0;
  ctr.value = result >= 0 ? result : 0;
}

// ===== TIMER =====
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

// ===== FIELD IMAGE (CANVAS) =====
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

// ===== DATA COLLECTION =====
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

// ===== SUBMIT PAGE SUMMARY =====
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
  ect: "Climb Timer (s)",
  efs: "Final Status",
  die: "Died/Immobilized",
  tip: "Tippy",
  dta: "Downtime Actions",
  cmm: "Comments"
};

var EFS_LABELS = { "1":"Level 1 Climb", "2":"Level 2 Climb", "3":"Level 3 Climb", "F":"Failed Climb", "X":"Not attempted" };
var DTA_LABELS = { "D":"Defence", "P":"Pickup Fuel", "B":"Both", "N":"No Actions" };
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

// ===== FIREBASE SUBMIT =====
function submitData() {
  var data     = getDataObject();
  var statusEl = document.getElementById("submit-status");
  var btn      = document.getElementById("submit");

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

  // Duplicate check then push
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
        statusEl.textContent = "✓ Saved to sync code: " + syncCode;
        statusEl.style.color = "#27ae60";
        btn.setAttribute("value", "Submitted ✓");
      }
    });
  });
}

// ===== DISPLAY / COPY (backup) =====
function displayData() {
  document.getElementById("data").innerHTML = getData();
}

function copyData() {
  navigator.clipboard.writeText(getData());
  document.getElementById("copyButton").setAttribute("value", "Copied");
}

// ===== MATCH START (updates display_r) =====
function updateMatchStart() {
  var robotMap = { r1:"Red-1", b1:"Blue-1", r2:"Red-2", b2:"Blue-2", r3:"Red-3", b3:"Blue-3" };
  var robotField = document.forms.scoutingForm.r;
  if (robotField) {
    var displayR = document.getElementById("display_r");
    if (displayR) displayR.value = robotMap[robotField.value] || "";
  }
  // Also try to auto-fill team from TBA
  autoFillTeam();
}

// ===== TBA SCHEDULE INTEGRATION =====
function fetchSchedule() {
  var event = (document.getElementById("input_e").value || "").trim();
  if (!event || event === scheduleEvent) return;

  var statusEl = document.getElementById("tba-status");
  var key = (typeof TBA_KEY !== "undefined") ? TBA_KEY : "";
  if (!key) {
    if (statusEl) statusEl.textContent = "TBA key not set in firebase-config.js";
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
        if (statusEl) statusEl.textContent = "TBA: " + (data.error || "No data");
        schedule = null;
      }
    })
    .catch(function() {
      if (statusEl) statusEl.textContent = "TBA fetch failed — check TBA_KEY in firebase-config.js";
    });
}

function autoFillTeam() {
  if (!schedule) return;
  var matchNumEl = document.getElementById("input_m");
  var levelEl    = document.querySelector('input[name="l"]:checked');
  var robotEl    = document.querySelector('input[name="r"]:checked');
  if (!matchNumEl || !matchNumEl.value || !levelEl || !robotEl) return;

  var matchNum = parseInt(matchNumEl.value);
  var level    = levelEl.value;   // qm | sf | f
  var robot    = robotEl.value;   // r1 | b1 | r2 | b2 | r3 | b3

  // Build the expected TBA match key, e.g. "2026mimus_qm12"
  var event    = (document.getElementById("input_e").value || "").trim();
  var matchKey = event + "_" + level + matchNum;

  var match = schedule.find(function(m) {
    if (level === "qm") return m.key === matchKey;
    // For sf/f, match_number alone isn't unique; just match comp_level + match_number
    return m.comp_level === level && m.match_number === matchNum;
  });

  if (!match) {
    showMatchPreview(null);
    return;
  }

  // Auto-fill team number
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

function showMatchPreview(match) {
  var el = document.getElementById("match-preview");
  if (!el) return;
  if (!match) { el.innerHTML = ""; return; }

  var red  = (match.alliances.red.team_keys  || []).map(function(k){ return k.replace("frc",""); }).join(", ");
  var blue = (match.alliances.blue.team_keys || []).map(function(k){ return k.replace("frc",""); }).join(", ");

  el.innerHTML =
    '<span style="color:#ff8080;font-weight:600;">&#9632; Red: ' + red  + '</span>' +
    '&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<span style="color:#80c8ff;font-weight:600;">&#9632; Blue: ' + blue + '</span>';
}

// ===== CLEAR FORM =====
function clearForm() {
  var slides = document.getElementById("main-panel-holder").children;
  slides[slide].style.display = "none";
  slide = 0;
  slides[0].style.display = "table";
  window.scrollTo(0, 0);

  // Increment match # (original behavior)
  var matchEl = document.getElementById("input_m");
  if (matchEl) {
    var m = parseInt(matchEl.value);
    matchEl.value = isNaN(m) ? "" : m + 1;
  }

  // Reset robot
  document.querySelectorAll('input[name="r"]').forEach(r => r.checked = false);
  var displayR = document.getElementById("display_r");
  if (displayR) displayR.value = "";

  // Clear XY coordinates
  document.querySelectorAll("[id*='XY_']").forEach(e => { e.value = "[]"; });

  // Clear all input_ elements
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
            var intF  = document.getElementById("intervalId_" + code);
            var statF = document.getElementById("status_"     + code);
            var startB = document.getElementById("start_"     + code);
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

  // Reset submit button state
  var submitBtn = document.getElementById("submit");
  if (submitBtn) { submitBtn.setAttribute("value", "Submit"); submitBtn.disabled = false; }

  drawFields();
}

// ===== FIREBASE + SYNC CODE =====
function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch(e) {
    console.error("Firebase init failed:", e.message);
    showSyncBanner("Firebase not configured — edit firebase-config.js", "#c0392b");
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

// ===== INIT =====
window.onload = function() {
  // Field image canvas
  var img = document.getElementById("img_as");
  if (img) {
    if (img.complete && img.naturalWidth) initCanvas();
    else img.onload = initCanvas;
  }

  // Firebase
  initFirebase();

  // Re-fetch schedule when event field changes
  var eventEl = document.getElementById("input_e");
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
