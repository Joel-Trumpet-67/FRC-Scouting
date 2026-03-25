// FRC Scouting Server
// Run: node server.js
// Form:      http://localhost:3000/match.html
// Dashboard: http://localhost:3000/dashboard.html
//
// Before using TBA auto-fill, add your key to config.json:
//   { "tba_key": "YOUR_KEY_FROM_thebluealliance.com/account" }

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PORT        = 3000;
const DATA_FILE     = path.join(__dirname, 'scouting_data.json');
const CONFIG_FILE   = path.join(__dirname, 'config.json');
const PICKLIST_FILE = path.join(__dirname, 'picklist.json');

// ── In-memory cache for external API calls (2 min TTL) ────────────────────────
const apiCache = {};
const CACHE_TTL = 2 * 60 * 1000;

function getCached(key) {
  const e = apiCache[key];
  return (e && Date.now() - e.ts < CACHE_TTL) ? e.data : null;
}
function setCache(key, data) { apiCache[key] = { data, ts: Date.now() }; }

// ── Config (TBA key) ──────────────────────────────────────────────────────────
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE))
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) { console.error('config.json parse error:', e.message); }
  return { tba_key: '' };
}

// ── Scouting data ─────────────────────────────────────────────────────────────
function readData() {
  try {
    if (fs.existsSync(DATA_FILE))
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.error('Data read error:', e.message); }
  return [];
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Picklist data ──────────────────────────────────────────────────────────────
function readPicklist() {
  try {
    if (fs.existsSync(PICKLIST_FILE))
      return JSON.parse(fs.readFileSync(PICKLIST_FILE, 'utf8'));
  } catch (e) { console.error('Picklist read error:', e.message); }
  return {};
}
function writePicklist(data) {
  fs.writeFileSync(PICKLIST_FILE, JSON.stringify(data, null, 2));
}

// ── External HTTPS helper ─────────────────────────────────────────────────────
function fetchJSON(apiUrl, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = new URL(apiUrl);
    const opts = {
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   'GET',
      headers:  Object.assign({ 'User-Agent': 'FRC-Scouting/1.0' }, extraHeaders || {})
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 401) return reject(new Error('TBA: Unauthorized — check your API key in config.json'));
        if (res.statusCode === 404) return reject(new Error('Not found (404) — check the event code'));
        try   { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON from upstream API')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Response helper ───────────────────────────────────────────────────────────
function respond(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ── Static file MIME types ────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',  '.ico':  'image/x-icon',
  '.ttf':  'font/ttf',   '.woff': 'font/woff',
};

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const urlPath = req.url.split('?')[0];
  const query   = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');

  try {

    // ── POST /submit ───────────────────────────────────────────────────────────
    if (req.method === 'POST' && urlPath === '/submit') {
      const body = await readBody(req);
      const entry = JSON.parse(body);
      entry.timestamp = new Date().toISOString();
      const data = readData();
      const isDup = data.some(d =>
        d.s === entry.s && d.m === entry.m && d.r === entry.r && d.e === entry.e
      );
      if (isDup) {
        respond(res, 409, { error: 'Duplicate entry for this match/robot/scouter.' });
        return;
      }
      data.push(entry);
      writeData(data);
      console.log(`[${ts()}] Saved — Team ${entry.t}, Match ${entry.m} (${data.length} total)`);
      respond(res, 200, { success: true, total: data.length });
      return;
    }

    // ── GET /data ──────────────────────────────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/data') {
      respond(res, 200, readData());
      return;
    }

    // ── DELETE /data ───────────────────────────────────────────────────────────
    if (req.method === 'DELETE' && urlPath === '/data') {
      writeData([]);
      console.log(`[${ts()}] All data cleared.`);
      respond(res, 200, { success: true });
      return;
    }

    // ── GET /api/status ────────────────────────────────────────────────────────
    // Tells the client whether a TBA key is configured
    if (req.method === 'GET' && urlPath === '/api/status') {
      const cfg = readConfig();
      respond(res, 200, { tba_configured: !!(cfg.tba_key && cfg.tba_key !== 'YOUR_TBA_KEY_HERE') });
      return;
    }

    // ── GET /api/tba/event/:event/matches/simple ───────────────────────────────
    // Proxies TBA so the browser never needs to know the API key
    if (req.method === 'GET' && urlPath.startsWith('/api/tba/')) {
      const cfg = readConfig();
      if (!cfg.tba_key || cfg.tba_key === 'YOUR_TBA_KEY_HERE') {
        respond(res, 400, { error: 'No TBA key configured. Edit config.json and add your key from thebluealliance.com/account' });
        return;
      }
      const tbaPath  = urlPath.replace('/api/tba', '');
      const cacheKey = 'tba:' + tbaPath;
      const cached   = getCached(cacheKey);
      if (cached) { respond(res, 200, cached); return; }

      const data = await fetchJSON('https://www.thebluealliance.com/api/v3' + tbaPath, {
        'X-TBA-Auth-Key': cfg.tba_key
      });
      setCache(cacheKey, data);
      console.log(`[${ts()}] TBA fetched: ${tbaPath}`);
      respond(res, 200, data);
      return;
    }

    // ── GET /api/config ────────────────────────────────────────────────────────
    // Returns safe public config (team_code only — never the TBA key)
    if (req.method === 'GET' && urlPath === '/api/config') {
      const cfg = readConfig();
      respond(res, 200, {
        team_code: (cfg.team_code && cfg.team_code !== 'YOUR_TEAM_CODE') ? cfg.team_code : null
      });
      return;
    }

    // ── GET /picklist ──────────────────────────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/picklist') {
      respond(res, 200, readPicklist());
      return;
    }

    // ── POST /picklist ─────────────────────────────────────────────────────────
    // body: { team: "3603", status: "removed"|"included"|"dnp" }
    if (req.method === 'POST' && urlPath === '/picklist') {
      const body = await readBody(req);
      const { team, status } = JSON.parse(body);
      if (!team || !['removed', 'included', 'dnp'].includes(status)) {
        respond(res, 400, { error: 'Invalid team or status' });
        return;
      }
      const pl = readPicklist();
      pl[String(team)] = status;
      writePicklist(pl);
      respond(res, 200, { success: true });
      return;
    }

    // ── GET /api/statbotics?event=2026mimus ────────────────────────────────────
    // Proxies Statbotics (no key needed, but avoids CORS issues)
    if (req.method === 'GET' && urlPath === '/api/statbotics') {
      const event = query.get('event');
      if (!event) { respond(res, 400, { error: 'event param required' }); return; }

      const cacheKey = 'statbotics:' + event;
      const cached   = getCached(cacheKey);
      if (cached) { respond(res, 200, cached); return; }

      const data = await fetchJSON(
        `https://api.statbotics.io/v3/team_events?event=${encodeURIComponent(event)}&limit=500`
      );
      setCache(cacheKey, data);
      console.log(`[${ts()}] Statbotics fetched for event: ${event} (${Array.isArray(data) ? data.length : '?'} teams)`);
      respond(res, 200, data);
      return;
    }

    // ── Static files ──────────────────────────────────────────────────────────
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(__dirname, safePath === '/' ? 'match.html' : safePath);

    fs.readFile(filePath, (err, fileData) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + safePath);
        return;
      }
      const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fileData);
    });

  } catch (err) {
    console.error(`[${ts()}] Error:`, err.message);
    respond(res, 500, { error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function ts() { return new Date().toLocaleTimeString(); }

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const cfg      = readConfig();
  const teamCode = (cfg.team_code && cfg.team_code !== 'YOUR_TEAM_CODE') ? cfg.team_code : null;
  const hostname = os.hostname().replace(/\.local$/i, '') + '.local';

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  FRC Scouting${teamCode ? ' — ' + teamCode : ''}${' '.repeat(Math.max(0, 36 - (teamCode ? teamCode.length + 3 : 0)))}║`);
  console.log('╠══════════════════════════════════════════════════╣');

  // Hostname-based URL (memorable, works on most LANs without knowing the IP)
  console.log(`║  SHARE THIS with scouts:                         ║`);
  console.log(`║  http://${hostname}:${PORT}/match.html`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Scouting : http://localhost:${PORT}/match.html       ║`);
  console.log(`║  Dashboard: http://localhost:${PORT}/dashboard.html   ║`);
  console.log('╠══════════════════════════════════════════════════╣');

  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`║  LAN IP   : http://${net.address}:${PORT}  `);
      }
    }
  }

  const keyStatus = (cfg.tba_key && cfg.tba_key !== 'YOUR_TBA_KEY_HERE')
    ? '✓ TBA key configured'
    : '✖ No TBA key — edit config.json to enable auto-fill';
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ${keyStatus}`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});
