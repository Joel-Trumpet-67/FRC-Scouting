// ============================================================
// worlds.js — Match strategy sheet for Team 3603, Johnson Division
// ============================================================

var OUR_TEAM  = '3603';
var EVENT_KEY = '2026joh';
var TBA_BASE  = 'https://www.thebluealliance.com/api/v3';

var allMatches  = [];   // all qual matches from TBA
var ourMatches  = [];   // qual matches involving Team 3603
var sbData      = {};   // team number string → { sbTotal, sbRank, numTeams }
var notes       = JSON.parse(localStorage.getItem('worlds_match_notes') || '{}');
var schedLoaded = false;
var schedTimer  = null;
var sortCol     = 'sbRank';
var sortDir     = 'asc';
var editingMatchKey = null;

// ── Match index: team number → array of match objects they play in ──
var teamMatchIndex = {};   // built after schedule loads

document.addEventListener('DOMContentLoaded', function() {
  renderTeamsTable();   // show teams with no schedule/SB data first
  fetchSchedule();
  fetchStatbotics();
});


// ============================================================
// TBA SCHEDULE
// ============================================================

function fetchSchedule() {
  fetch(TBA_BASE + '/event/' + EVENT_KEY + '/matches', {
    headers: { 'X-TBA-Auth-Key': TBA_KEY }
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var quals = (data || []).filter(function(m) { return m.comp_level === 'qm'; });
      quals.sort(function(a, b) { return a.match_number - b.match_number; });

      if (quals.length === 0) {
        // Not posted yet — retry in 60 seconds
        if (!schedTimer) schedTimer = setInterval(fetchSchedule, 60000);
        return;
      }

      clearInterval(schedTimer);
      allMatches  = quals;
      ourMatches  = quals.filter(function(m) { return teamInMatch(m, OUR_TEAM); });
      schedLoaded = true;

      buildTeamMatchIndex();
      renderOurMatches();
      renderTeamsTable();

      setPill('pill-sched',
        ourMatches.length + ' of ' + quals.length + ' matches',
        'pill-green');
      document.getElementById('sched-pending').style.display = 'none';
      document.getElementById('our-count').textContent =
        '(' + ourMatches.length + ' qual matches)';
    })
    .catch(function() {
      if (!schedTimer) schedTimer = setInterval(fetchSchedule, 60000);
    });
}

function buildTeamMatchIndex() {
  teamMatchIndex = {};
  allMatches.forEach(function(m) {
    allTeamsInMatch(m).forEach(function(t) {
      if (!teamMatchIndex[t]) teamMatchIndex[t] = [];
      teamMatchIndex[t].push(m);
    });
  });
}

function teamInMatch(m, team) {
  return allTeamsInMatch(m).indexOf('frc' + team) > -1;
}

function allTeamsInMatch(m) {
  var red  = (m.alliances.red.team_keys  || []);
  var blue = (m.alliances.blue.team_keys || []);
  return red.concat(blue);
}

function allianceFor(m, team) {
  var key = 'frc' + team;
  if ((m.alliances.red.team_keys  || []).indexOf(key) > -1) return 'red';
  if ((m.alliances.blue.team_keys || []).indexOf(key) > -1) return 'blue';
  return null;
}


// ============================================================
// RENDER OUR MATCH CARDS
// ============================================================

function renderOurMatches() {
  var grid = document.getElementById('our-matches-grid');
  if (!ourMatches.length) {
    grid.innerHTML = '<div class="no-data">No matches found for Team 3603.</div>';
    return;
  }
  grid.innerHTML = ourMatches.map(function(m) {
    return buildMatchCard(m);
  }).join('');
}

function buildMatchCard(m) {
  var mn      = m.match_number;
  var ourSide = allianceFor(m, OUR_TEAM);
  var red     = (m.alliances.red.team_keys  || []).map(stripFrc);
  var blue    = (m.alliances.blue.team_keys || []).map(stripFrc);
  var note    = notes[m.key] || '';

  var time = '';
  if (m.predicted_time || m.time) {
    var ts = new Date((m.predicted_time || m.time) * 1000);
    time = ts.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  }

  function teamChip(t, side) {
    var isUs      = t === OUR_TEAM;
    var td        = TEAM_DATA[t] || {};
    var name      = td.name || '';
    var sb        = sbData[t];
    var epa       = sb && sb.sbTotal != null ? sb.sbTotal.toFixed(1) : '—';
    var cls       = 'team-chip team-chip-' + side + (isUs ? ' team-chip-us' : '');
    return '<div class="' + cls + '">' +
             '<span class="chip-num">' + t + '</span>' +
             (name ? '<span class="chip-name">' + name + '</span>' : '') +
             '<span class="chip-epa">' + epa + '</span>' +
           '</div>';
  }

  var enemies = ourSide === 'red' ? blue : red;
  var allies  = ourSide === 'red' ? red  : blue;
  var enemyEpa = enemies.reduce(function(s, t) {
    return s + (sbData[t] && sbData[t].sbTotal != null ? sbData[t].sbTotal : 0);
  }, 0);
  var allyEpa = allies.reduce(function(s, t) {
    return s + (sbData[t] && sbData[t].sbTotal != null ? sbData[t].sbTotal : 0);
  }, 0);

  return '<div class="match-card" id="mc-' + m.key + '">' +
    '<div class="mc-header">' +
      '<div class="mc-num">Q' + mn + '</div>' +
      (time ? '<div class="mc-time">' + time + '</div>' : '') +
      '<div class="mc-side side-' + ourSide + '">' + (ourSide === 'red' ? 'Red' : 'Blue') + ' Alliance</div>' +
      '<button class="mc-note-btn" onclick="openNotes(\'' + m.key + '\', ' + mn + ')">' +
        (note ? '📝 Edit Notes' : '+ Notes') +
      '</button>' +
    '</div>' +

    '<div class="mc-alliances">' +
      '<div class="mc-alliance mc-allies">' +
        '<div class="mc-alliance-label">Our Alliance</div>' +
        '<div class="mc-epa-sum">Combined EPA: ' + allyEpa.toFixed(1) + '</div>' +
        allies.map(function(t) { return teamChip(t, ourSide); }).join('') +
      '</div>' +
      '<div class="mc-vs">vs</div>' +
      '<div class="mc-alliance mc-enemies">' +
        '<div class="mc-alliance-label">Opponents</div>' +
        '<div class="mc-epa-sum">Combined EPA: ' + enemyEpa.toFixed(1) + '</div>' +
        enemies.map(function(t) { return teamChip(t, ourSide === 'red' ? 'blue' : 'red'); }).join('') +
      '</div>' +
    '</div>' +

    (note ? '<div class="mc-note">' + escHtml(note) + '</div>' : '') +
  '</div>';
}


// ============================================================
// ALL TEAMS TABLE
// ============================================================

function renderTeamsTable() {
  var rows = Object.keys(TEAM_DATA).map(function(t) {
    var td  = TEAM_DATA[t];
    var sb  = sbData[t] || {};
    var matches = teamMatchIndex[t] || [];  // matches this team plays in

    // Which of those matches also have us in them?
    var vsUs = matches.filter(function(m) {
      if (!schedLoaded) return false;
      var ourSide  = allianceFor(m, OUR_TEAM);
      var theirSide = allianceFor(m, t);
      return ourSide && theirSide && ourSide !== theirSide;
    });
    var withUs = matches.filter(function(m) {
      if (!schedLoaded) return false;
      var ourSide   = allianceFor(m, OUR_TEAM);
      var theirSide = allianceFor(m, t);
      return ourSide && theirSide && ourSide === theirSide && t !== OUR_TEAM;
    });

    return {
      num:        parseInt(t),
      name:       td.name || '',
      loc:        (td.city || '') + (td.state ? ', ' + td.state : ''),
      sbTotal:    sb.sbTotal != null ? sb.sbTotal : null,
      sbRank:     sb.sbRank  != null ? sb.sbRank  : null,
      matchCount: vsUs.length + withUs.length,
      vsUs:       vsUs,
      withUs:     withUs,
      key:        t,
    };
  });

  // Sort
  rows.sort(function(a, b) {
    var va = a[sortCol], vb = b[sortCol];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  document.getElementById('teams-tbody').innerHTML = rows.map(function(r) {
    var isUs   = r.key === OUR_TEAM;
    var epa    = r.sbTotal != null ? r.sbTotal.toFixed(1) : '—';
    var rank   = r.sbRank  != null ? '#' + r.sbRank       : '—';

    var matchTags = '';
    r.vsUs.forEach(function(m) {
      matchTags += '<span class="mtag mtag-opp" title="Opponent in Q' + m.match_number + '">vs Q' + m.match_number + '</span>';
    });
    r.withUs.forEach(function(m) {
      matchTags += '<span class="mtag mtag-ally" title="Ally in Q' + m.match_number + '">w/ Q' + m.match_number + '</span>';
    });
    if (!matchTags && schedLoaded && r.key !== OUR_TEAM) {
      matchTags = '<span class="mtag mtag-none">—</span>';
    }
    if (!schedLoaded) matchTags = '<span class="mtag mtag-none">awaiting schedule</span>';

    return '<tr class="' + (isUs ? 'row-us' : '') + '">' +
      '<td class="td-num">' + r.num + '</td>' +
      '<td class="td-name">' + escHtml(r.name) + '</td>' +
      '<td class="td-loc">'  + escHtml(r.loc)  + '</td>' +
      '<td class="td-epa ' + epaClass(r.sbTotal) + '">' + epa + '</td>' +
      '<td class="td-rank">' + rank + '</td>' +
      '<td class="td-matches">' + matchTags + '</td>' +
    '</tr>';
  }).join('');

  // Update sort arrows
  document.querySelectorAll('.sortable').forEach(function(th) {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortCol) th.classList.add('sort-' + sortDir);
  });
}

function sortTeams(col) {
  if (sortCol === col) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = col;
    sortDir = col === 'num' ? 'asc' : 'asc';
  }
  renderTeamsTable();
}

function epaClass(v) {
  if (v == null) return '';
  if (v >= 60)  return 'epa-high';
  if (v >= 40)  return 'epa-mid';
  return 'epa-low';
}


// ============================================================
// STATBOTICS
// ============================================================

function fetchStatbotics() {
  fetch('https://api.statbotics.io/v3/team_events?event=' + EVENT_KEY + '&limit=500')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data)) return;
      sbData = {};
      data.forEach(function(d) {
        var epa  = d.epa || {};
        var tp   = epa.total_points || {};
        var qual = (d.record && d.record.qual) || {};
        sbData[String(d.team)] = {
          sbTotal:  tp.mean  != null ? tp.mean  : null,
          sbRank:   qual.rank      != null ? qual.rank      : null,
          numTeams: qual.num_teams != null ? qual.num_teams : null,
        };
      });
      renderOurMatches();
      renderTeamsTable();
      setPill('pill-sb', 'SB: ' + data.length + ' teams', 'pill-blue');
    })
    .catch(function() {
      setPill('pill-sb', 'Statbotics unavailable', 'pill-grey');
    });
}


// ============================================================
// MATCH NOTES
// ============================================================

function openNotes(matchKey, matchNum) {
  editingMatchKey = matchKey;
  document.getElementById('notes-modal-title').textContent = 'Q' + matchNum + ' — Strategy Notes';
  document.getElementById('notes-textarea').value = notes[matchKey] || '';
  document.getElementById('notes-modal').classList.add('open');
  document.getElementById('notes-textarea').focus();
}

function saveNotes() {
  var text = document.getElementById('notes-textarea').value.trim();
  if (text) notes[editingMatchKey] = text;
  else      delete notes[editingMatchKey];
  localStorage.setItem('worlds_match_notes', JSON.stringify(notes));
  closeNotes();
  renderOurMatches();
}

function closeNotes() {
  document.getElementById('notes-modal').classList.remove('open');
  editingMatchKey = null;
}


// ============================================================
// HELPERS
// ============================================================

function stripFrc(key) { return key.replace('frc', ''); }

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setPill(id, text, cls) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'pill ' + cls;
}
