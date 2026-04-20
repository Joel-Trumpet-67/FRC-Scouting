// strategy.js — Choreo compare view embedded in dashboard
// Reads strategy data from localStorage (written by strategy.html).

var ST_KEY     = 'strategy_teams';
var ST_PALETTE = [
  '#f55','#5af','#5d5','#fa5','#c5f','#5ff','#ff5','#f5a',
  '#a5f','#5fa','#f95','#59f','#9f5','#f59','#5f9','#95f'
];
var stActiveTeams = {};
var stImgReady    = false;

function strategyImgReady() {
  var img    = document.getElementById('st-img');
  var canvas = document.getElementById('st-canvas');
  if (!canvas || !img) return;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  stImgReady = true;
  stRedraw();
}

function buildStrategyView() {
  var all   = stLoad();
  var teams = Object.keys(all).sort(function(a, b) { return parseInt(a) - parseInt(b); });

  var chipsEl  = document.getElementById('st-chips');
  var noMsg    = document.getElementById('st-no-teams');
  var fieldEl  = document.getElementById('st-field');
  var legendEl = document.getElementById('st-legend');

  if (!teams.length) {
    chipsEl.innerHTML      = '';
    noMsg.style.display    = 'block';
    fieldEl.style.display  = 'none';
    legendEl.style.display = 'none';
    return;
  }

  noMsg.style.display    = 'none';
  fieldEl.style.display  = 'flex';
  legendEl.style.display = 'flex';

  teams.forEach(function(t) { if (stActiveTeams[t] === undefined) stActiveTeams[t] = true; });
  Object.keys(stActiveTeams).forEach(function(t) { if (!all[t]) delete stActiveTeams[t]; });

  chipsEl.innerHTML = teams.map(function(t, i) {
    var col = ST_PALETTE[i % ST_PALETTE.length];
    var on  = stActiveTeams[t];
    return '<div style="' +
      'padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;' +
      'border:2px solid ' + col + ';' +
      'color:' + col + ';' +
      'background:' + (on ? col + '22' : 'transparent') + ';' +
      'opacity:' + (on ? '1' : '0.35') + ';' +
      'transition:opacity 0.15s;user-select:none;"' +
      ' onclick="stToggle(\'' + t + '\')">' + t + '</div>';
  }).join('');

  // Init canvas if image already loaded
  var img = document.getElementById('st-img');
  if (img && img.complete && img.naturalWidth && !stImgReady) {
    strategyImgReady();
  } else {
    stRedraw();
  }
}

function stToggle(team) {
  stActiveTeams[team] = !stActiveTeams[team];
  buildStrategyView();
}

function stRedraw() {
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
    var d   = all[t];
    var col = ST_PALETTE[i % ST_PALETTE.length];
    stDrawPath(ctx,  d.auto     || [], col, 11);
    stDrawSpots(ctx, d.autoshot || [], col, '#fd0', 10, 'A');
    stDrawSpots(ctx, d.tele     || [], col, '#fa6', 10, 'T');
  });
}

function stDrawPath(ctx, waypoints, color, r) {
  if (!waypoints.length) return;
  var pts = waypoints.map(stParse);
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([7, 5]);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.globalAlpha = 0.65;
  ctx.stroke();
  ctx.restore();

  pts.forEach(function(p, i) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = color + 'cc';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold ' + (r - 1) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i + 1, p.x, p.y);
  });
}

function stDrawSpots(ctx, waypoints, fillColor, ringColor, r, label) {
  waypoints.forEach(function(p) {
    var c = stParse(p);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = fillColor + 'cc';
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
