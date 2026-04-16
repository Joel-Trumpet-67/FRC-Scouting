// ============================================================
//  season/pit-fields.js
//  !! UPDATE THIS FILE EACH NEW SEASON if pit fields change !!
//
//  Field codes match config_data (pitConfig) in match.html.
//  dataFormat: "tsv" — QR codes use tab-separated values in PIT_TSV_KEYS order.
// ============================================================


// ── FIELD LABELS ──────────────────────────────────────────────
var PIT_FIELD_LABELS = {
  e:   'Event',
  s:   'Scouter',
  t:   'Team #',
  tmn: 'Team Name',
  lbs: 'Weight (lbs)',
  dvt: 'Drivetrain',
  hng: 'Max Hang Level',
  mfc: 'Max Fuel Capacity',
  sty: 'Robot Style',
  com: 'Comments',
  pic: 'Photo Taken'
};

// ── TSV KEY ORDER (must match config_data prematch array order) ──
var PIT_TSV_KEYS = ['e','s','t','tmn','lbs','dvt','hng','mfc','sty','com','pic'];


// ── LABEL MAPS ─────────────────────────────────────────────────

var PIT_DRIVETRAIN_LABELS = {
  // Current values (lowercase — from config)
  's': 'Swerve', 't': 'Tank', 'm': 'Mechanum', 'o': 'Other',
  // Legacy values (uppercase — keeps old entries readable on dashboard)
  'S': 'Swerve', 'T': 'Tank', 'M': 'Mechanum', 'O': 'Other'
};

var PIT_STYLE_LABELS = {
  // Current values
  'S': 'Shooter', 'T': 'Turret', 'D': 'WCP CC', 'K': 'Kitbot',
  // Legacy values
  'SH': 'Shooter', 'TU': 'Turret', 'WC': 'WCP CC', 'KB': 'Kitbot', 'OT': 'Other'
};

var PIT_HANGLEVEL_LABELS = {
  '1': 'Level 1', '2': 'Level 2', '3': 'Level 3',
  'n': 'None',  // current value
  'X': 'None'   // legacy value
};


// ── FRIENDLY VALUE ─────────────────────────────────────────────
function pitFriendlyValue(key, val) {
  if (key === 'dvt' || key === 'pdt') return PIT_DRIVETRAIN_LABELS[val] || val || '—';
  if (key === 'sty' || key === 'pst') return PIT_STYLE_LABELS[val]      || val || '—';
  if (key === 'hng' || key === 'phl') return PIT_HANGLEVEL_LABELS[val]  || val || '—';
  if (key === 'pic' || key === 'pph') return val === '1' ? 'Yes' : 'No';
  return val || '—';
}
