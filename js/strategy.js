// strategy.js — Choreo compare view embedded in dashboard
// Reads strategy data from localStorage (written by strategy.html).

var ST_KEY     = 'strategy_teams';
var ST_PALETTE = [
  '#f55','#5af','#5d5','#fa5','#c5f','#5ff','#ff5','#f5a',
  '#a5f','#5fa','#f95','#59f','#9f5','#f59','#5f9','#95f'
];

var stActiveTeams  = {};
var stImgReady     = false;
var stLayout       = 'overlay';
var stAnimProgress = 1;
var stAnimPlaying  = false;
var stAnimRaf      = null;
var stAnimSpeed    = 0.005;

// ── Image ready ───────────────────────────────────────────────

function strategyImgReady() {
  var img    = document.getElementById('st-img');
  var canvas = document.getElementById('st-canvas');
  if (!canvas || !img) return;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  stImgReady = true;
  stRedrawCmpFrame();
}

// ── Build / refresh view ──────────────────────────────────────

function buildStrategyView() {
  var all   = stLoad();
  var teams = Object.keys(all).sort(function(a, b) { return parseInt(a) - parseInt(b); });

  var chipsEl     = document.getElementById('st-chips');
  var noMsg       = document.getElementById('st-no-teams');
  var fieldEl     = document.getElementById('st-field');
  var legendEl    = document.getElementById('st-legend');
  var layoutBar   = document.getElementById('st-layout-bar');
  var playbackBar = document.getElementById('st-playback-bar');
  var splitGrid   = document.getElementById('st-split-grid');

  if (!teams.length) {
    chipsEl.innerHTML = '';
    noMsg.style.display    = 'block';
    fieldEl.style.display  = 'none';
    legendEl.style.display = 'none';
    if (layoutBar)   layoutBar.style.display   = 'none';
    if (playbackBar) playbackBar.style.display  = 'none';
    if (splitGrid)   splitGrid.style.display    = 'none';
    return;
  }

  noMsg.style.display    = 'none';
  legendEl.style.display = 'flex';
  if (layoutBar)   layoutBar.style.display   = 'flex';
  if (playbackBar) playbackBar.style.display  = 'flex';

  teams.forEach(function(t) { if (stActiveTeams[t] === undefined) stActiveTeams[t] = true; });
  Object.keys(stActiveTeams).forEach(function(t) { if (!all[t]) delete stActiveTeams[t]; });

  chipsEl.innerHTML = teams.map(function(t, i) {
    var col = ST_PALETTE[i % ST_PALETTE.length];
    var on  = stActiveTeams[t];
    return '<div class="st-chip' + (on ? ' on' : '') + '"' +
      ' style="color:' + col + ';border-color:' + col + ';background:' + (on ? col + '22' : 'transparent') + ';"' +
      ' onclick="stToggle(\'' + t + '\')">' + t + '</div>';
  }).join('');

  if (stLayout === 'overlay') {
    fieldEl.style.display = 'block';
    if (splitGrid) splitGrid.style.display = 'none';
    var img = document.getElementById('st-img');
    if (img && img.complete && img.naturalWidth && !stImgReady) {
      strategyImgReady();
    } else {
      stRedrawCmpFrame();
    }
  } else {
    fieldEl.style.display = 'none';
    if (splitGrid) { splitGrid.style.display = 'grid'; stBuildSplitView(); }
  }
}

function stToggle(team) {
  stActiveTeams[team] = !stActiveTeams[team];
  buildStrategyView();
}

// ── Layout toggle ─────────────────────────────────────────────

function stSetLayout(layout) {
  stLayout = layout;
  var btnOverlay = document.getElementById('st-layout-overlay');
  var btnSplit   = document.getElementById('st-layout-split');
  if (btnOverlay) btnOverlay.classList.toggle('st-layout-active', layout === 'overlay');
  if (btnSplit)   btnSplit.classList.toggle('st-layout-active',   layout === 'split');
  buildStrategyView();
}

// ── Playback ──────────────────────────────────────────────────

function stPlayPause() {
  if (stAnimPlaying) {
    stAnimPlaying = false;
    if (stAnimRaf) { cancelAnimationFrame(stAnimRaf); stAnimRaf = null; }
    stUpdatePlayBtn();
  } else {
    if (stAnimProgress >= 1) stAnimProgress = 0;
    stAnimPlaying = true;
    stUpdatePlayBtn();
    stAnimStep();
  }
}

function stResetAnim() {
  stAnimPlaying = false;
  if (stAnimRaf) { cancelAnimationFrame(stAnimRaf); stAnimRaf = null; }
  stAnimProgress = 1;
  var sl = document.getElementById('st-anim-slider');
  if (sl) sl.value = 100;
  stUpdatePlayBtn();
  if (stLayout === 'overlay') stRedrawCmpFrame();
  else stRedrawAllSplitPanels();
}

function stUpdatePlayBtn() {
  var btn = document.getElementById('st-play-btn');
  if (!btn) return;
  btn.innerHTML = stAnimPlaying ? '&#9646;&#9646; Pause' : '&#9654; Play';
}

function stAnimStep() {
  stAnimRaf = requestAnimationFrame(function() {
    if (!stAnimPlaying) return;
    stAnimProgress += stAnimSpeed;
    if (stAnimProgress >= 1) {
      stAnimProgress = 1;
      stAnimPlaying  = false;
      stUpdatePlayBtn();
    }
    var sl = document.getElementById('st-anim-slider');
    if (sl) sl.value = stAnimProgress * 100;
    if (stLayout === 'overlay') stRedrawCmpFrame();
    else stRedrawAllSplitPanels();
    if (stAnimPlaying) stAnimStep();
  });
}

function stSliderChange(val) {
  stAnimPlaying = false;
  if (stAnimRaf) { cancelAnimationFrame(stAnimRaf); stAnimRaf = null; }
  stAnimProgress = val / 100;
  stUpdatePlayBtn();
  if (stLayout === 'overlay') stRedrawCmpFrame();
  else stRedrawAllSplitPanels();
}

// ── Overlay rendering ─────────────────────────────────────────

function stRedrawCmpFrame() {
  var img    = document.getElementById('st-img');
  var canvas = document.getElementById('st-canvas');
  if (!img || !img.complete || !img.naturalWidth || !canvas || !canvas.width) return;

  var all   = stLoad();
  var teams = Object.keys(all).sort(function(a, b) { return parseInt(a) - parseInt(b); });

  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  teams.forEach(function(t, i) {
    if (!stActiveTeams[t]) return;
    stDrawTeamFrame(ctx, all[t], ST_PALETTE[i % ST_PALETTE.length], stAnimProgress, 11);
  });
}

// progress 0→0.75 traces auto path, 0.75→0.875 reveals auto shots, 0.875→1 reveals tele shots
function stDrawTeamFrame(ctx, d, col, progress, r) {
  var autoPath  = d.auto     || [];
  var autoShots = d.autoshot || [];
  var teleShots = d.tele     || [];

  stDrawPathAnimated(ctx, autoPath, col, col + 'cc', r, true, Math.min(1, progress / 0.75));

  if (progress >= 0.75 && autoShots.length) {
    var aCount = Math.ceil(Math.min(1, (progress - 0.75) / 0.125) * autoShots.length);
    stDrawSpots(ctx, autoShots.slice(0, aCount), col + 'cc', '#fd0', 10, 'A');
  }
  if (progress >= 0.875 && teleShots.length) {
    var tCount = Math.ceil(Math.min(1, (progress - 0.875) / 0.125) * teleShots.length);
    stDrawSpots(ctx, teleShots.slice(0, tCount), col + 'cc', '#fa6', 10, 'T');
  }
}

function stDrawPathAnimated(ctx, waypoints, lineColor, fillColor, r, dashed, progress) {
  if (!waypoints.length || progress <= 0) return;
  var pts = waypoints.map(stParse);

  if (pts.length === 1) {
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, r, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (r - 1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('1', pts[0].x, pts[0].y);
    return;
  }

  var totalSegs = pts.length - 1;
  var segProg   = progress * totalSegs;
  var fullSegs  = Math.min(Math.floor(segProg), totalSegs);
  var partial   = segProg - fullSegs;

  ctx.save();
  ctx.beginPath();
  if (dashed) ctx.setLineDash([7, 5]);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i <= fullSegs; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (fullSegs < totalSegs && partial > 0) {
    var p1 = pts[fullSegs], p2 = pts[fullSegs + 1];
    ctx.lineTo(p1.x + (p2.x - p1.x) * partial, p1.y + (p2.y - p1.y) * partial);
  }
  ctx.strokeStyle = lineColor; ctx.lineWidth = dashed ? 2.5 : 4; ctx.globalAlpha = 0.65;
  ctx.stroke();
  ctx.restore();

  for (var j = 0; j <= fullSegs && j < pts.length; j++) {
    ctx.beginPath(); ctx.arc(pts[j].x, pts[j].y, r, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (r - 1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(j + 1, pts[j].x, pts[j].y);
  }
}

// ── Split view ────────────────────────────────────────────────

function stBuildSplitView() {
  var all   = stLoad();
  var teams = Object.keys(all).sort(function(a, b) { return parseInt(a) - parseInt(b); });
  var img   = document.getElementById('st-img');
  var grid  = document.getElementById('st-split-grid');
  if (!grid) return;

  var active = teams.filter(function(t) { return stActiveTeams[t]; });

  grid.innerHTML = active.map(function(t) {
    var idx = teams.indexOf(t);
    var col = ST_PALETTE[idx % ST_PALETTE.length];
    return '<div class="st-split-panel">' +
      '<div class="st-split-hdr" style="color:' + col + ';border-left:3px solid ' + col + ';">' + t + '</div>' +
      '<canvas id="st-sp-' + t + '" class="st-split-canvas"></canvas>' +
    '</div>';
  }).join('');

  if (img && img.complete && img.naturalWidth) {
    active.forEach(function(t) {
      var c = document.getElementById('st-sp-' + t);
      if (c) { c.width = img.naturalWidth; c.height = img.naturalHeight; }
    });
    stRedrawAllSplitPanels();
  }
}

function stRedrawAllSplitPanels() {
  var all   = stLoad();
  var teams = Object.keys(all).sort(function(a, b) { return parseInt(a) - parseInt(b); });
  var img   = document.getElementById('st-img');
  if (!img || !img.complete || !img.naturalWidth) return;

  teams.forEach(function(t, i) {
    if (!stActiveTeams[t]) return;
    var canvas = document.getElementById('st-sp-' + t);
    if (!canvas || !canvas.width) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    stDrawTeamFrame(ctx, all[t], ST_PALETTE[i % ST_PALETTE.length], stAnimProgress, 11);
  });
}

// ── Drawing helpers ───────────────────────────────────────────

function stDrawSpots(ctx, waypoints, fillColor, ringColor, r, label) {
  waypoints.forEach(function(p) {
    var c = stParse(p);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = fillColor;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold ' + (r - 1) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, c.x, c.y);
  });
}

function stParse(p) {
  var c = p.split(',');
  return { x: parseFloat(c[0]), y: parseFloat(c[1]) };
}

function stLoad() {
  try { return JSON.parse(localStorage.getItem(ST_KEY) || '{}'); }
  catch(e) { return {}; }
}
