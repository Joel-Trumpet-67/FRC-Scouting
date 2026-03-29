// ============================================================
// dashboard.js — Live rankings dashboard logic
// ============================================================
//
//  HOW IT WORKS:
//    1. Dashboard connects to the same Firebase sync code as scouts
//    2. Scouting entries stream in live via Firebase listener
//    3. Statbotics EPA data is fetched for the event and merged in
//    4. Table is sorted/rendered with combined scouted + EPA metrics
//    5. Overrated teams are auto-flagged when SB rank >> scout rank
//
//  TO CHANGE DISPLAYED METRICS (each new season):
//    1. Add columns to the <thead> in dashboard.html
//    2. Add field processing in processData() below
//    3. Add render logic in renderTable() below
//    4. Update the team detail modal in openTeamModal() if needed
//
//  FILES THIS DEPENDS ON (loaded before this script in dashboard.html):
//    - config/event-config.js    (EVENT_CODE)
//    - config/firebase-config.js (FIREBASE_CONFIG)
//
// ============================================================

var allData        = [];   // raw Firebase entries (array of objects)
var teamStats      = [];   // processed per-team stats (one entry per team)
var statboticsData = {};   // keyed by team number string
var picklistData   = {};   // keyed by team number string: "available" | "overrated" | "dnp"
var sortCol        = 'sbRank';
var sortDir        = 'asc';

var db              = null;
var syncCode        = null;
var entriesRef      = null;
var picklistRef     = null;
var fbListener      = null;
var picklistListener = null;
var sbEvent          = null;   // last event we fetched Statbotics data for (cache key)

// ============================================================
// FIREBASE INIT
// ============================================================

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch(e) {
    setPill('pill-fb', 'Firebase error — check config/firebase-config.js', 'p-red');
    return;
  }
  syncCode = localStorage.getItem('scout_sync_code');
  if (syncCode) {
    applyCode(syncCode);
  } else {
    document.getElementById('sync-modal').style.display = 'flex';
  }
}

function applyCode(code) {
  syncCode = code;
  localStorage.setItem('scout_sync_code', code);
  document.getElementById('sync-modal').style.display = 'none';
  setPill('pill-code', 'Code: ' + code, 'p-blue');
  document.getElementById('page-title').textContent = code + ' — Scouting Dashboard';

  // Detach all old listeners before switching to a new sync code
  if (fbListener       && entriesRef)  entriesRef.off('value',  fbListener);
  if (picklistListener && picklistRef) picklistRef.off('value', picklistListener);

  // Reset Statbotics cache so it re-fetches for the new code's event
  sbEvent = null;

  entriesRef  = db.ref('sessions/' + code + '/entries');
  picklistRef = db.ref('sessions/' + code + '/picklist');

  // Load picklist once, then subscribe to live entries
  picklistRef.once('value', function(snap) {
    picklistData = snap.val() || {};
    subscribeEntries();
  });

  // Keep picklist in sync (scouts/coaches can update from any device)
  picklistListener = function(snap) {
    picklistData = snap.val() || {};
    renderTable();
  };
  picklistRef.on('value', picklistListener);
}

function subscribeEntries() {
  setPill('pill-fb', 'Connecting…', 'p-grey');
  fbListener = entriesRef.on('value', function(snapshot) {
    var raw = snapshot.val() || {};
    allData = Object.values(raw);
    processData();
    var event = getEvent();
    if (event) fetchStatbotics(event);
    else { renderTable(); updateChips(); }
    setPill('pill-fb', '● Live (' + allData.length + ' entries)', 'p-green');
    document.getElementById('ts').textContent = 'Updated: ' + new Date().toLocaleTimeString();
  }, function() {
    setPill('pill-fb', 'Firebase error', 'p-red');
  });
}

function joinCode() {
  var v = document.getElementById('sync-input').value.trim().toUpperCase().replace(/\s+/g,'');
  if (!v) return;
  applyCode(v);
}

function changeCode() {
  document.getElementById('sync-input').value = syncCode || '';
  document.getElementById('sync-modal').style.display = 'flex';
}

// TODO: add a "read-only" view mode that doesn't require a sync code — useful for
//       coaches who just want to browse without connecting to a live session.

// ============================================================
// STATBOTICS DATA
// ============================================================

function fetchStatbotics(event) {
  // Only hit the API when the event changes — every scout entry fires this,
  // so without a cache check we'd make a network call on every submission.
  if (event === sbEvent) {
    mergeStatbotics();
    autoFlagOverrated();
    renderTable();
    updateChips();
    return;
  }
  sbEvent = event;
  setPill('pill-sb', 'Loading…', 'p-grey');
  fetch('https://api.statbotics.io/v3/team_events?event=' + encodeURIComponent(event) + '&limit=500')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!Array.isArray(data)) throw new Error('bad response');
      statboticsData = {};
      data.forEach(function(d){
        var epa  = d.epa || {};
        var tp   = epa.total_points || {};
        var brk  = epa.breakdown   || {};
        var qual = (d.record && d.record.qual) || {};
        statboticsData[String(d.team)] = {
          rank:     qual.rank      || null,
          numTeams: qual.num_teams || null,
          sbTotal:  tp.mean  != null ? tp.mean  : null,
          sbAuto:   brk.auto_points    != null ? brk.auto_points    : null,
          sbTele:   brk.teleop_points  != null ? brk.teleop_points  : null,
          sbEnd:    brk.endgame_points != null ? brk.endgame_points : null,
        };
      });
      mergeStatbotics();
      autoFlagOverrated();
      renderTable();
      updateChips();
      setPill('pill-sb', '✓ SB: ' + data.length + ' teams', 'p-blue');
    })
    .catch(function(){
      renderTable(); updateChips();
      setPill('pill-sb', 'Statbotics unavailable', 'p-grey');
    });
}

function mergeStatbotics() {
  // Attach SB data to already-scouted teams
  teamStats = teamStats.map(function(s){
    var sb = statboticsData[s.t] || {};
    return Object.assign({}, s, {
      sbRank:   sb.rank     != null ? sb.rank     : null,
      numTeams: sb.numTeams != null ? sb.numTeams : null,
      sbTotal:  sb.sbTotal  != null ? sb.sbTotal  : null,
      sbAuto:   sb.sbAuto   != null ? sb.sbAuto   : null,
      sbTele:   sb.sbTele   != null ? sb.sbTele   : null,
      sbEnd:    sb.sbEnd    != null ? sb.sbEnd    : null,
    });
  });

  // Also show teams from Statbotics that haven't been scouted yet
  var scouted = teamStats.map(function(s){ return s.t; });
  Object.keys(statboticsData).forEach(function(team){
    if (scouted.indexOf(team) !== -1) return;
    var sb = statboticsData[team];
    teamStats.push({
      t: team, matches: 0,
      scoutAuto: null, scoutTele: null, hcap: null, climbRate: null,
      sbRank: sb.rank, numTeams: sb.numTeams,
      sbTotal: sb.sbTotal, sbAuto: sb.sbAuto, sbTele: sb.sbTele, sbEnd: sb.sbEnd,
    });
  });
}

// ============================================================
// PROCESS ENTRIES → TEAM STATS
// ============================================================

// Summarizes raw scouting entries into per-team averages.
// TODO: add more computed fields here as needed (e.g. defence rate, auto leave %).
//       Just push values into the array in the teams loop, then average them below.
function processData() {
  var teams = {};
  allData.forEach(function(e){
    var t = String(e.t || '?');
    if (!teams[t]) teams[t] = { t:t, matches:0, as1:[], as5:[], ts1:[], ts5:[], hcap:[], efs:[] };
    var s = teams[t]; s.matches++;
    s.as1.push(num(e.as1));  s.as5.push(num(e.as5));
    s.ts1.push(num(e.ts1));  s.ts5.push(num(e.ts5));
    s.hcap.push(num(e.hcap));
    s.efs.push(e.efs || 'X');
  });

  teamStats = Object.values(teams).map(function(s){
    var climbs = s.efs.filter(function(v){ return v==='1'||v==='2'||v==='3'; });
    return {
      t:          s.t,
      matches:    s.matches,
      // Auto points: Shot1 × 1pt + Shot5 × 5pts (average across matches)
      scoutAuto:  avg(s.as1) + avg(s.as5) * 5,
      // Teleop points: same scoring
      scoutTele:  avg(s.ts1) + avg(s.ts5) * 5,
      hcap:       avg(s.hcap),
      climbRate:  s.matches ? climbs.length / s.matches * 100 : 0,
      // Statbotics fields filled in by mergeStatbotics()
      sbRank:null, numTeams:null, sbTotal:null, sbAuto:null, sbTele:null, sbEnd:null,
    };
  });
  mergeStatbotics();
}

// ============================================================
// OVERRATED AUTO-FLAGGING
// ============================================================

// Flags teams whose Statbotics EPA rank is high but scouted performance is low.
// Uses percentile comparison — if a team is top 35% by SB but bottom 35% by scout data,
// they get auto-flagged as "Overrated" in the picklist.
// TODO: tune the 0.65/0.35 thresholds based on how accurate they are in practice.
function autoFlagOverrated() {
  var both = teamStats.filter(function(s){ return s.sbTotal != null; });
  if (both.length < 4) return;  // need enough teams to compare

  var byScout = both.slice().sort(function(a,b){ return (a.scoutAuto+a.scoutTele)-(b.scoutAuto+b.scoutTele); });
  var bySB    = both.slice().sort(function(a,b){ return a.sbTotal - b.sbTotal; });
  var n = both.length - 1;

  both.forEach(function(s){
    var key = String(s.t);
    if (picklistData[key] === 'dnp') return;  // don't override manual DNP
    var sp = byScout.findIndex(function(x){ return x.t===s.t; }) / n;
    var bp = bySB.findIndex(function(x){ return x.t===s.t; }) / n;
    if (bp >= 0.65 && sp <= 0.35) {
      if (picklistRef) picklistRef.child(key).set('overrated');
    } else if (picklistData[key] === 'overrated') {
      // No longer qualifies — reset to available
      if (picklistRef) picklistRef.child(key).set('available');
    }
  });
}

// ============================================================
// TABLE RENDERING
// ============================================================

function renderTable() {
  var rows = teamStats.slice().sort(function(a,b){
    var va=a[sortCol], vb=b[sortCol];
    if (va==null && vb==null) return 0;
    if (va==null) return 1;
    if (vb==null) return -1;
    if (sortCol==='t') { va=parseInt(va)||0; vb=parseInt(vb)||0; }
    return sortDir==='asc' ? (va>vb?1:va<vb?-1:0) : (va<vb?1:va>vb?-1:0);
  });

  // Update header sort indicators
  document.querySelectorAll('#hdr th').forEach(function(th){
    th.classList.remove('sorted-asc','sorted-desc');
    if (th.dataset.col===sortCol) th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
  });

  var tbody = document.getElementById('tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="11">No entries yet for this sync code.</td></tr>';
    return;
  }

  // Compute min/max ranges for color-coding each column
  function rng(col) {
    var v=rows.map(function(r){return r[col];}).filter(function(v){return v!=null;});
    return v.length?{min:Math.min.apply(null,v),max:Math.max.apply(null,v)}:null;
  }
  var R={};
  ['scoutAuto','scoutTele','hcap','climbRate','sbTotal','sbAuto','sbTele','sbEnd'].forEach(function(c){R[c]=rng(c);});

  tbody.innerHTML = rows.map(function(r){
    var rankCls = r.sbRank<=3?'rank top3':r.sbRank<=10?'rank top10':'rank';
    var status  = picklistData[String(r.t)] || 'available';
    var bdg,bcls;
    if (status==='dnp')            { bdg='❌ Do Not Pick'; bcls='badge b-dnp'; }
    else if (status==='overrated') { bdg='⚠️ Overrated';   bcls='badge b-over'; }
    else                           { bdg='✅ Available';   bcls='badge b-ok'; }
    return '<tr>'+
      '<td class="'+rankCls+'">'+(r.sbRank!=null?r.sbRank:'—')+'</td>'+
      '<td class="team"><a class="tba" href="#" onclick="openTeamModal(\''+r.t+'\');return false;">'+r.t+'</a></td>'+
      htd(r.scoutAuto,R.scoutAuto)+
      htd(r.scoutTele,R.scoutTele)+
      htd(r.hcap,R.hcap)+
      (r.climbRate!=null?'<td class="'+clsCl(r.climbRate)+'">'+r.climbRate.toFixed(0)+'%</td>':'<td class="low">—</td>')+
      sbtd(r.sbTotal,R.sbTotal,true)+
      sbtd(r.sbAuto,R.sbAuto,false)+
      sbtd(r.sbTele,R.sbTele,false)+
      sbtd(r.sbEnd,R.sbEnd,false)+
      '<td><span class="'+bcls+'" onclick="toggleStatus(\''+r.t+'\')">'+bdg+'</span></td>'+
    '</tr>';
  }).join('');
}

// Returns a <td> colored by percentile rank within the column's range
function htd(v,rng) {
  if (v==null) return '<td class="low">—</td>';
  var cls='mid';
  if (rng&&rng.max!==rng.min){var n=(v-rng.min)/(rng.max-rng.min);cls=n>=0.75?'good':n>=0.5?'ok':n<=0.25?'low':'mid';}
  return '<td class="'+cls+'">'+r1(v)+'</td>';
}

// Returns a Statbotics <td> with a gold-ish color scheme
function sbtd(v,rng,first) {
  var ex=first?' sb-div':'';
  if (v==null) return '<td class="sb-low'+ex+'">—</td>';
  var cls='sb';
  if (rng&&rng.max!==rng.min){var n=(v-rng.min)/(rng.max-rng.min);if(n<=0.25)cls='sb-low';}
  return '<td class="'+cls+ex+'">'+r1(v)+'</td>';
}

// Climb rate color class
function clsCl(r) { return r>=75?'good':r>=50?'ok':r>=25?'mid':'low'; }

// TODO: add a "matches scouted" column so coaches can see data confidence at a glance.
// TODO: add a row highlight when a team was recently submitted (flash green for 2 seconds).

// ============================================================
// SORTING
// ============================================================

function sortBy(col) {
  if (sortCol===col) { sortDir=sortDir==='asc'?'desc':'asc'; }
  else { sortCol=col; sortDir=['sbRank','t'].includes(col)?'asc':'desc'; }
  renderTable();
}

// TODO: persist sortCol + sortDir in localStorage so the sort preference
//       survives page refresh during competition.

// ============================================================
// PICK LIST
// ============================================================

// Cycles through available → dnp → available (overrated is set automatically or manually)
function toggleStatus(team) {
  var cur  = picklistData[String(team)] || 'available';
  var next = (cur==='available'||cur==='overrated') ? 'dnp' : 'available';
  if (picklistRef) picklistRef.child(String(team)).set(next);
}

// TODO: add a 3-state cycle: available → overrated → dnp → available
//       so coaches can manually mark teams as overrated even without SB data.

// ============================================================
// CHIPS (summary stats at top of page)
// ============================================================

function updateChips() {
  document.getElementById('c-teams').textContent   = teamStats.length || '—';
  document.getElementById('c-entries').textContent = allData.length   || '—';
  document.getElementById('c-event').textContent   = getEvent()       || '—';
  document.getElementById('c-sb').textContent      = Object.keys(statboticsData).length || '—';
}

// ============================================================
// EXPORT CSV
// ============================================================

function exportCSV() {
  if (!allData.length) { alert('No data to export.'); return; }
  var h   = Object.keys(allData[0]);
  var csv = [h.join(',')].concat(allData.map(function(r){
    return h.map(function(k){ return JSON.stringify(r[k]!=null?r[k]:''); }).join(',');
  })).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'scouting_'+(getEvent()||'export')+'_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// TODO: add an "Export Pick List" button that exports just the picklist with
//       each team's scouted + SB data next to their pick status.

// ============================================================
// CLEAR ALL DATA
// ============================================================

function clearAll() {
  if (!confirm('Delete ALL scouting data for code: ' + syncCode + '?')) return;
  if (!entriesRef) return;
  entriesRef.remove().catch(function(e){ alert('Error: '+e.message); });
}

// ============================================================
// HELPERS
// ============================================================

function num(v)   { return parseFloat(v)||0; }
function avg(arr) { return arr.length ? arr.reduce(function(a,b){return a+b;},0)/arr.length : 0; }
function r1(v)    { return Math.round(v*10)/10; }

// Returns the most common event code across all scouting entries
// Falls back to EVENT_CODE from config/event-config.js
function getEvent() {
  var c={};
  allData.forEach(function(d){ if(d.e) c[d.e]=(c[d.e]||0)+1; });
  var k=Object.keys(c);
  if (k.length) return k.sort(function(a,b){return c[b]-c[a];})[0];
  return (typeof EVENT_CODE !== 'undefined') ? EVENT_CODE : null;
}

function setPill(id, text, cls) {
  var el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'pill ' + cls;
}

// ============================================================
// TEAM DETAIL MODAL
// ============================================================

// TODO: add a match-by-match sparkline/mini-chart inside the modal showing
//       how a team's scoring trended across matches (useful for spotting sandbagging).
// TODO: add a "Notes" text field in the modal that saves to Firebase
//       under sessions/{code}/notes/{team} — so coaches can annotate teams.
function openTeamModal(team) {
  var sb      = statboticsData[String(team)] || {};
  var entries = allData.filter(function(d){ return String(d.t) === String(team); });
  entries.sort(function(a,b){ return (parseInt(a.m)||0)-(parseInt(b.m)||0); });

  document.getElementById('tm-title').textContent = 'Team ' + team;
  document.getElementById('tm-sub').innerHTML =
    'Rank: ' + (sb.rank ? sb.rank + ' / ' + (sb.numTeams||'?') : '—') +
    ' &nbsp;|&nbsp; <a class="tba" href="https://www.thebluealliance.com/team/'+team+'" target="_blank" style="color:#97c7f0;">View on TBA ↗</a>';

  // Statbotics chips
  var sbHtml = '';
  if (sb.sbTotal != null) {
    function chip(l,v){ return '<div class="tm-sb-chip"><div class="v">'+(v!=null?Math.round(v*10)/10:'—')+'</div><div class="l">'+l+'</div></div>'; }
    sbHtml = chip('EPA Total',sb.sbTotal) + chip('Auto',sb.sbAuto) + chip('Teleop',sb.sbTele) + chip('Endgame',sb.sbEnd);
  }
  document.getElementById('tm-sb').innerHTML = sbHtml;

  // Friendly label maps
  // TODO: update these each season to match the new game's endgame/downtime options.
  var EFS = { '1':'L1 Climb','2':'L2 Climb','3':'L3 Climb','F':'Failed','X':'No Attempt' };
  var DTA = { 'D':'Defence','P':'Pickup','B':'Both','N':'None' };
  var ROB = { r1:'Red 1',b1:'Blue 1',r2:'Red 2',b2:'Blue 2',r3:'Red 3',b3:'Blue 3' };

  var listHtml = '';
  if (!entries.length) {
    listHtml = '<div class="no-entries">No scouting entries yet for this team.</div>';
  } else {
    document.getElementById('tm-entries-hdr').textContent = entries.length + ' Scouting ' + (entries.length===1?'Entry':'Entries');
    entries.forEach(function(e){
      var isRed  = (e.r||'').charAt(0)==='r';
      var robTag = '<span class="m-robot '+(isRed?'red-tag':'blue-tag')+'">'+(ROB[e.r]||e.r||'?')+'</span>';
      var fields = [
        ['Auto Shot 1', e.as1||'0'],
        ['Auto Shot 5', e.as5||'0'],
        ['Auto Missed', e.amf||'0'],
        ['Dumps 8',     e.ad8==='1'?'Yes':'No'],
        ['L1 Climb',    e.ac1==='1'?'Yes':'No'],
        ['Won Auto',    e.taw==='1'?'Yes':'No'],
        ['Tele Shot 1', e.ts1||'0'],
        ['Tele Shot 5', e.ts5||'0'],
        ['Tele Missed', e.tmf||'0'],
        ['Hub Cap',     e.hcap||'0'],
        ['Climb Timer', e.ect||'0'],
        ['Final Status',EFS[e.efs]||e.efs||'—'],
        ['Died',        e.die==='1'?'Yes':'No'],
        ['Tippy',       e.tip==='1'?'Yes':'No'],
        ['Downtime',    DTA[e.dta]||e.dta||'—'],
      ].map(function(f){
        return '<div class="tm-field">'+f[0]+': <span>'+f[1]+'</span></div>';
      }).join('');

      var comment = e.cmm ? '<div class="tm-comment">"' + e.cmm + '"</div>' : '';

      listHtml +=
        '<div class="tm-entry">'+
          '<div class="tm-entry-hdr">'+
            '<span class="m-num">Match '+(e.m||'?')+'</span>'+
            robTag+
            '<span class="m-scout">'+(e.s||'?')+'</span>'+
          '</div>'+
          '<div class="tm-fields">'+fields+'</div>'+
          comment+
        '</div>';
    });
  }
  document.getElementById('tm-entries-list').innerHTML = listHtml;
  document.getElementById('team-modal').classList.add('open');
}

function closeTeamModal() {
  document.getElementById('team-modal').classList.remove('open');
}

// Close modal when clicking the dark backdrop
document.getElementById('team-modal').addEventListener('click', function(e){
  if (e.target === this) closeTeamModal();
});

// ============================================================
// BOOT
// ============================================================

initFirebase();
