// ============================================================
//  season/game-fields.js
//  !! UPDATE THIS FILE EACH NEW SEASON !!
// ============================================================
//
//  This file contains EVERYTHING that is specific to the current
//  FRC game. When a new season starts, this is the only JS file
//  you need to edit (plus the HTML form pages in match.html).
//
//  WHAT'S IN HERE:
//    1. FIELD_LABELS        — display names for every form field
//    2. Label maps          — human-readable versions of radio/select values
//    3. friendlyValue()     — converts raw values for the summary page
//    4. SEASON_SCORING      — how to compute auto/tele/end points from entries
//    5. MODAL_FIELDS        — which fields to show in the team detail modal
//
//  WHAT TO CHANGE EACH SEASON:
//    □ Update FIELD_LABELS to match your new form fields in match.html
//    □ Update EFS_LABELS for the new endgame options
//    □ Update DTA_LABELS for new downtime / between-match action options
//    □ Update SEASON_SCORING.numericFields to match your new counter fields
//    □ Update SEASON_SCORING.computeStats() with the new scoring formula
//    □ Update MODAL_FIELDS to match your new form fields
//    □ Also update the HTML form pages in match.html (auto/tele/endgame)
//    □ Replace assets/images/YEAR/field_image.png with the new field map
//
// ============================================================


// ── 1. FIELD LABELS ──────────────────────────────────────────
//
//  One entry per named field in match.html.
//  key   = the name="xx" attribute on the <input>
//  value = display label shown on the submit summary page
//
//  Add a new line when you add a new field.
//  Remove a line when you remove a field.
//  The order here controls the order on the summary page.
//
var FIELD_LABELS = {
  // Pre-match (game-agnostic — rarely needs changing)
  s:   'Scouter',
  e:   'Event',
  l:   'Match Level',
  m:   'Match #',
  r:   'Robot',
  t:   'Team #',
  // ── AUTO (2026 game-specific) ──
  ad8: 'Dumps 8',
  as1: 'Auton Shot 1',
  as5: 'Auton Shot 5',
  amf: 'Auton Missed',
  ac1: 'Auton L1 Climb',
  // ── TELEOP (2026 game-specific) ──
  taw: 'Won Auto?',
  ts1: 'Teleop Shot 1',
  ts5: 'Teleop Shot 5',
  tmf: 'Teleop Missed',
  hcap:'Hub Capacity',
  // ── ENDGAME (2026 game-specific) ──
  ect: 'Climb Timer (s)',
  efs: 'Final Status',
  // ── MISC (mostly game-agnostic) ──
  die: 'Died/Immobilized',
  tip: 'Tippy',
  dta: 'Downtime Actions',
  cmm: 'Comments'
};


// ── 2. LABEL MAPS ────────────────────────────────────────────
//
//  Human-readable versions of radio button / select values.
//  Update the values (right side) when game options change.
//  Keep the keys (left side) matching the HTML input values.

// Endgame final status  ← update each season for new climb levels
var EFS_LABELS = {
  '1': 'Level 1 Climb',
  '2': 'Level 2 Climb',
  '3': 'Level 3 Climb',
  'F': 'Failed Climb',
  'X': 'Not attempted'
};

// Between-match / downtime actions  ← update if options change
var DTA_LABELS = {
  'D': 'Defence',
  'P': 'Pickup Fuel',
  'B': 'Both',
  'N': 'No Actions'
};

// Robot positions — same every year, rarely needs changing
var ROBOT_LABELS = {
  r1:'Red-1', b1:'Blue-1',
  r2:'Red-2', b2:'Blue-2',
  r3:'Red-3', b3:'Blue-3'
};

// Match levels — same every year, rarely needs changing
var LEVEL_LABELS = { qm:'Quals', sf:'Semifinals', f:'Finals' };


// ── 3. FRIENDLY VALUE ────────────────────────────────────────
//
//  Converts a raw form value to a display string for the summary page.
//  Called once per field in updateSummary().
//  Add cases here when you add fields with radio/select options.
//
function friendlyValue(key, val) {
  if (key === 'efs') return EFS_LABELS[val] || val;
  if (key === 'dta') return DTA_LABELS[val] || val;
  if (key === 'r')   return ROBOT_LABELS[val] || val;
  if (key === 'l')   return LEVEL_LABELS[val] || val;
  if (key === 'ad8' || key === 'ac1' || key === 'taw' ||
      key === 'die' || key === 'tip')
    return val === '1' ? 'Yes' : 'No';
  return val || '—';
}


// ── 4. SEASON SCORING ────────────────────────────────────────
//
//  Tells the dashboard how to compute per-team averages from
//  raw scouting entries. This is the main thing to update when
//  the game's scoring system changes.
//
//  numericFields — counter/number fields to average across matches
//  rawFields     — non-numeric fields to collect as strings (e.g. radio values)
//  computeStats  — given accumulated arrays, return averaged per-period scores
//
//  Example scoring change: if next year removes Shot5 and adds a
//  "Park" option, update numericFields and rewrite computeStats().
//
var SEASON_SCORING = {

  // Fields whose values are pushed into arrays and averaged
  // Must match name="xx" attributes in match.html
  numericFields: ['as1', 'as5', 'ts1', 'ts5', 'hcap'],

  // Fields collected as raw strings (for categorical stats like climb rate)
  rawFields: ['efs'],

  // ── SCORING FORMULA ──────────────────────────────────────
  //  s = accumulated team object:
  //    s.matches  = number of matches scouted
  //    s.as1      = array of Shot-1 counts (one per match)
  //    s.as5      = array of Shot-5 counts
  //    s.ts1/ts5  = same for teleop
  //    s.hcap     = hub capacity counts
  //    s.efs      = array of endgame status strings ('1','2','3','F','X')
  //
  //  Returns an object that gets merged into teamStats for each team.
  //  Keys here must match what renderTable() and renderAllianceTable() expect.
  //
  computeStats: function(s) {
    function _avg(arr) {
      return arr.length ? arr.reduce(function(a,b){return a+b;},0)/arr.length : 0;
    }
    var climbs = s.efs.filter(function(v){ return v==='1'||v==='2'||v==='3'; });
    return {
      // 2026 scoring: Shot1 = 1pt, Shot5 = 5pts
      scoutAuto:  _avg(s.as1)*1 + _avg(s.as5)*5,
      scoutTele:  _avg(s.ts1)*1 + _avg(s.ts5)*5,
      hcap:       _avg(s.hcap),
      climbRate:  s.matches ? (climbs.length / s.matches) * 100 : 0
    };
  }
};


// ── 5. MODAL FIELDS ──────────────────────────────────────────
//
//  Controls which fields appear in the team detail modal,
//  in what order, and how their values are displayed.
//
//  key   — the field name from the scouting entry
//  label — display label in the modal
//  fn    — optional: function(rawValue) → display string
//          if omitted, the raw value is shown as-is (defaults to '0' if blank)
//
//  Add/remove entries to match your new game fields.
//
var MODAL_FIELDS = [
  // ── Auto ──
  { key: 'as1',  label: 'Auto Shot 1' },
  { key: 'as5',  label: 'Auto Shot 5' },
  { key: 'amf',  label: 'Auto Missed' },
  { key: 'ad8',  label: 'Dumps 8',         fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'ac1',  label: 'L1 Climb',        fn: function(v){ return v==='1'?'Yes':'No'; } },
  // ── Teleop ──
  { key: 'taw',  label: 'Won Auto',        fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'ts1',  label: 'Tele Shot 1' },
  { key: 'ts5',  label: 'Tele Shot 5' },
  { key: 'tmf',  label: 'Tele Missed' },
  { key: 'hcap', label: 'Hub Cap' },
  // ── Endgame ──
  { key: 'ect',  label: 'Climb Timer (s)' },
  { key: 'efs',  label: 'Final Status',    fn: function(v){ return EFS_LABELS[v]||v||'—'; } },
  // ── Misc ──
  { key: 'die',  label: 'Died',            fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'tip',  label: 'Tippy',           fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'dta',  label: 'Downtime',        fn: function(v){ return DTA_LABELS[v]||v||'—'; } }
];
