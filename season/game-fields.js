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
  // ── AUTO (2026 new format) ──
  acl: 'Auto Climb',
  apct:'Auto Contribution %',
  // ── AUTO (2026 old format — kept for backward compat) ──
  ad8: 'Dumps 8',
  as1: 'Auton Shot 1',
  as5: 'Auton Shot 5',
  amf: 'Auton Missed',
  ac1: 'Auton L1 Climb',
  // ── TELEOP ──
  def: 'Played Defense?',
  tpct:'Tele Contribution %',
  // ── TELEOP (old format) ──
  taw: 'Won Auto?',
  ts1: 'Teleop Shot 1',
  ts5: 'Teleop Shot 5',
  tmf: 'Teleop Missed',
  // ── DEFENSE ──
  dhit:  'Hits/Bumps',
  dpin:  'Pins',
  dfmiss:'Cycles Disrupted',
  dguard:'Hub Guarded',
  dfoul: 'Fouls Received',
  dycard:'Yellow Card',
  drcard:'Red Card',
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
  if (key === 'acl') { var lv = {'0':'None','1':'L1','2':'L2','3':'L3'}; return lv[val] || val || '—'; }
  if (key === 'ad8' || key === 'ac1' || key === 'taw' ||
      key === 'die' || key === 'tip' ||
      key === 'def' || key === 'dycard' || key === 'drcard')
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
  // Old format fields: as1/as5/ad8/ac1/ts1/ts5
  // New format fields: apct/tpct/acl (old entries have these as 0)
  numericFields: ['as1', 'as5', 'ad8', 'ac1', 'ts1', 'ts5', 'apct', 'tpct', 'acl'],

  // Fields collected as raw strings (for categorical stats like climb rate)
  rawFields: ['efs'],

  // ── SCORING FORMULA ──────────────────────────────────────
  //  s = accumulated team object (offense entries only, defense filtered by processData):
  //    s.matches  = number of offense matches scouted
  //    s.efs      = array of endgame status strings ('1','2','3','F','X')
  //    OLD FORMAT: s.as1/as5/ad8/ac1/ts1/ts5 = shot/action counts
  //    NEW FORMAT: s.apct = auto contribution %, s.tpct = tele contribution %, s.acl = climb level 0-3
  //
  //  Returns an object merged into teamStats.
  //
  computeStats: function(s) {
    function _avg(arr) {
      return arr.length ? arr.reduce(function(a,b){return a+b;},0)/arr.length : 0;
    }

    // Detect format: new entries have non-zero apct values
    var hasNew = s.apct && s.apct.some(function(v){ return v > 0; });

    var auto, tele;
    if (hasNew) {
      // New format — auto = avg climb pts from acl level (0→0, 1→15, 2→30, 3→45)
      var ACL_PTS = {0:0, 1:15, 2:30, 3:45};
      auto = _avg(s.acl.map(function(v){ return ACL_PTS[Math.round(v)] || 0; }));
      // Tele = raw contribution % (0-100) — displayed with % in table
      tele = _avg(s.tpct);
    } else {
      // Old format — shots + dump (8pts) + L1 climb bonus (15pts)
      auto = _avg(s.as1)*1 + _avg(s.as5)*5 + _avg(s.ad8)*8 + _avg(s.ac1)*15;
      // Teleop: shots only
      tele = _avg(s.ts1)*1 + _avg(s.ts5)*5;
    }

    // Endgame climb: L1=10, L2=20, L3=30 — same for both formats
    var CLIMB_PTS = {'1':10, '2':20, '3':30};
    var end = s.efs.length
      ? s.efs.reduce(function(sum,v){ return sum+(CLIMB_PTS[v]||0); }, 0) / s.efs.length
      : 0;
    var climbs = s.efs.filter(function(v){ return v==='1'||v==='2'||v==='3'; });

    return {
      scoutAuto:   auto,
      scoutTele:   tele,
      scoutEnd:    end,
      scoutTotal:  auto + tele + end,
      climbRate:   s.matches ? (climbs.length / s.matches) * 100 : 0,
      isNewFormat: hasNew,
      avgAutoPct:  hasNew ? _avg(s.apct) : null,
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
// Old-format entry fields (shot counters)
var MODAL_FIELDS_OLD = [
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
  // ── Endgame ──
  { key: 'ect',  label: 'Climb Timer (s)' },
  { key: 'efs',  label: 'Final Status',    fn: function(v){ return EFS_LABELS[v]||v||'—'; } },
  // ── Misc ──
  { key: 'die',  label: 'Died',            fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'tip',  label: 'Tippy',           fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'dta',  label: 'Downtime',        fn: function(v){ return DTA_LABELS[v]||v||'—'; } }
];

// New-format entry fields (contribution % sliders + defense counters)
var MODAL_FIELDS_NEW = [
  // ── Auto ──
  { key: 'acl',    label: 'Auto Climb',        fn: function(v){ var l={'0':'None','1':'L1','2':'L2','3':'L3'}; return l[v]||v||'—'; } },
  { key: 'apct',   label: 'Auto Contribution %' },
  // ── Teleop ──
  { key: 'def',    label: 'Played Defense',    fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'tpct',   label: 'Tele Contribution %' },
  { key: 'tip',    label: 'Tippy',             fn: function(v){ return v==='1'?'Yes':'No'; } },
  // ── Defense (only shown when def=1) ──
  { key: 'dhit',   label: 'Hits/Bumps' },
  { key: 'dpin',   label: 'Pins' },
  { key: 'dfmiss', label: 'Cycles Disrupted' },
  { key: 'dguard', label: 'Hub Guarded' },
  { key: 'dfoul',  label: 'Fouls Received' },
  { key: 'dycard', label: 'Yellow Card',       fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'drcard', label: 'Red Card',          fn: function(v){ return v==='1'?'Yes':'No'; } },
  // ── Endgame ──
  { key: 'ect',    label: 'Climb Timer (s)' },
  { key: 'efs',    label: 'Final Status',      fn: function(v){ return EFS_LABELS[v]||v||'—'; } },
  // ── Misc ──
  { key: 'die',    label: 'Died',              fn: function(v){ return v==='1'?'Yes':'No'; } },
  { key: 'dta',    label: 'Downtime',          fn: function(v){ return DTA_LABELS[v]||v||'—'; } }
];

// Backward-compat alias — used by old references in dashboard.js
var MODAL_FIELDS = MODAL_FIELDS_OLD;


// ── 6. SQL EXPORT COLUMNS ─────────────────────────────────────
//
//  Maps form field keys to SQL column names, in the exact order
//  they appear in the database table. Used by exportCSV() in
//  dashboard.js — update this whenever the SQL schema changes.
//
//  key — the name="xx" attribute on the <input> in match.html
//  col — the matching column name in the SQL table
//
var SQL_EXPORT_COLUMNS = [
  // ── Prematch ──
  { key: 's',   col: 'scout' },
  { key: 'e',   col: 'event_code' },
  { key: 'l',   col: 'match_level' },
  { key: 'm',   col: 'match_number' },
  { key: 'r',   col: 'robot_position' },
  { key: 't',   col: 'team_number' },
  { key: 'as',  col: 'auto_start_pos' },
  // ── Auton ──
  { key: 'ad8', col: 'auto_dumps_8' },
  { key: 'as1', col: 'auto_shot_1' },
  { key: 'as5', col: 'auto_shot_5' },
  { key: 'amf', col: 'auto_missed_fuel' },
  { key: 'ac1', col: 'auto_l1' },
  // ── Teleop ──
  { key: 'taw', col: 'won_auto' },
  { key: 'ts1', col: 'tele_shot_1' },
  { key: 'ts5', col: 'tele_shot_5' },
  { key: 'tmf', col: 'tele_missed_fuel' },
  // ── New-format Auton ──
  { key: 'acl',    col: 'auto_climb_level' },
  { key: 'apct',   col: 'auto_pct' },
  // ── New-format Teleop ──
  { key: 'def',    col: 'played_defense' },
  { key: 'tpct',   col: 'tele_pct' },
  // ── Defense ──
  { key: 'dhit',   col: 'defense_hits' },
  { key: 'dpin',   col: 'defense_pins' },
  { key: 'dfmiss', col: 'defense_disrupts' },
  { key: 'dguard', col: 'defense_guards' },
  { key: 'dfoul',  col: 'defense_fouls' },
  { key: 'dycard', col: 'defense_yellow_card' },
  { key: 'drcard', col: 'defense_red_card' },
  // ── Endgame ──
  { key: 'ect', col: 'climb_time' },
  { key: 'efs', col: 'final_status' },
  // ── Postmatch ──
  { key: 'die', col: 'died' },
  { key: 'tip', col: 'tippy' },
  { key: 'dta', col: 'downtime_actions' },
  { key: 'cmm', col: 'comments' },
];
