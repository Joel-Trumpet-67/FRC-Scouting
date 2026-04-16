// ============================================================
//  season/pit-fields.js
//  !! UPDATE THIS FILE EACH NEW SEASON if pit fields change !!
// ============================================================
//
//  Parallel to game-fields.js but for pit scouting.
//  Loaded by pit.html before js/pit.js.
//
// ============================================================


// ── FIELD LABELS ──────────────────────────────────────────────
//  One entry per named field in pit.html.
//  key   = the name="xx" attribute on the <input>
//  value = display label shown on the submit summary page
//
var PIT_FIELD_LABELS = {
  s:   'Scouter',
  e:   'Event',
  pt:  'Team #',
  pn:  'Team Name',
  pw:  'Weight (lbs)',
  pdt: 'Drivetrain',
  pst: 'Style',
  phl: 'Max Hang Level',
  pfc: 'Fuel Capacity',
  pph: 'Photo Taken',
  pcm: 'Comments'
};


// ── LABEL MAPS ─────────────────────────────────────────────────
//  Human-readable versions of radio button values.
//  Update when game options change.

var PIT_DRIVETRAIN_LABELS = {
  'S': 'Swerve',
  'T': 'Tank',
  'M': 'Mechanum',
  'O': 'Other'
};

var PIT_STYLE_LABELS = {
  'SH': 'Shooter',
  'TU': 'Turret',
  'WC': 'WCP CC',
  'KB': 'Kitbot',
  'OT': 'Other'
};

var PIT_HANGLEVEL_LABELS = {
  '1': 'Level 1',
  '2': 'Level 2',
  '3': 'Level 3',
  'X': 'Not Attempting'
};


// ── FRIENDLY VALUE ─────────────────────────────────────────────
//  Converts a raw form value to a display string for the summary page.
//  Add cases here when you add new radio/select fields.
//
function pitFriendlyValue(key, val) {
  if (key === 'pdt') return PIT_DRIVETRAIN_LABELS[val] || val || '—';
  if (key === 'pst') return PIT_STYLE_LABELS[val]      || val || '—';
  if (key === 'phl') return PIT_HANGLEVEL_LABELS[val]  || val || '—';
  if (key === 'pph') return val === '1' ? 'Yes' : 'No';
  return val || '—';
}
