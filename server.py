#!/usr/bin/env python3
"""
server.py — Offline local server for FRC scouting.

Replaces Firebase when there's no internet at a competition venue.
Scouts submit to this server; data is saved to scouting.db (SQLite) here.
Dashboard polls this server every 3 seconds for new entries.

SETUP:
  1. Coach creates a phone hotspot
  2. Laptop + all scout phones join that hotspot
  3. Run this script in the FRC-Scouting folder:
         python3 server.py
  4. Copy the Scout URL from the terminal output
  5. Open config/event-config.js in VS Code
     Set:  const LOCAL_SERVER = 'http://<IP shown>:5800';
  6. Scouts open  http://<IP>:5800/match.html
     Coach opens  http://<IP>:5800/dashboard.html

  Data is saved to scouting.db (SQLite) in this folder.
  Download via browser: http://<IP>:5800/db
  Press Ctrl+C to stop the server.
"""

import http.server
import json
import os
import socket
import sqlite3
import sys
import threading
from datetime import datetime

PORT    = 5800
DB_FILE = 'scouting.db'
_lock   = threading.Lock()

# Maps QR/form field keys → SQL column names (mirrors SQL_EXPORT_COLUMNS in game-fields.js)
_KEY_TO_COL = {
    's':   'scout',            'e':  'event_code',
    'l':   'match_level',      'm':  'match_number',
    'r':   'robot_position',   't':  'team_number',
    'ad8': 'auto_dumps_8',     'as1': 'auto_shot_1',
    'as5': 'auto_shot_5',      'amf': 'auto_missed_fuel',
    'ac1': 'auto_l1',          'taw': 'won_auto',
    'ts1': 'tele_shot_1',      'ts5': 'tele_shot_5',
    'tmf': 'tele_missed_fuel', 'ect': 'climb_time',
    'efs': 'final_status',     'die': 'died',
    'tip': 'tippy',            'dta': 'downtime_actions',
    'cmm': 'comments',
}

_SQL_COLS = list(_KEY_TO_COL.values())


# ── Database setup ─────────────────────────────────────────────

def _db():
    """Open a thread-local SQLite connection."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    cols_ddl = ',\n    '.join(f'{c}  TEXT' for c in _SQL_COLS)
    with _db() as conn:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS match_entries (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                {cols_ddl},
                timestamp TEXT,
                raw_json  TEXT,
                UNIQUE(scout, event_code, match_number, robot_position)
            )
        """)


# ── Entry storage ──────────────────────────────────────────────

def _entry_to_row(entry):
    """Map a raw form entry dict to a SQL column dict."""
    row = {col: str(entry.get(key, '') or '') for key, col in _KEY_TO_COL.items()}
    row['timestamp'] = entry.get('timestamp', datetime.utcnow().isoformat() + 'Z')
    row['raw_json']  = json.dumps(entry)
    return row

def save_entry(entry):
    """Insert entry into DB. Returns True if saved, False if duplicate."""
    row = _entry_to_row(entry)
    placeholders = ', '.join(f':{c}' for c in _SQL_COLS + ['timestamp', 'raw_json'])
    cols_sql      = ', '.join(_SQL_COLS + ['timestamp', 'raw_json'])
    sql = f'INSERT OR IGNORE INTO match_entries ({cols_sql}) VALUES ({placeholders})'
    with _lock:
        with _db() as conn:
            cur = conn.execute(sql, row)
            return cur.rowcount > 0

def load_entries():
    """Return all match entries as a list of dicts (JSON-compatible)."""
    with _db() as conn:
        rows = conn.execute('SELECT raw_json FROM match_entries ORDER BY id').fetchall()
    result = []
    for r in rows:
        try:
            result.append(json.loads(r['raw_json']))
        except Exception:
            pass
    return result


# ── KVS parser (QR code format) ────────────────────────────────

def parse_kvs(kvs):
    """Parse 'key=value;key=value' string (QR code format) into a dict."""
    entry = {}
    for pair in kvs.split(';'):
        if '=' in pair:
            k, _, v = pair.partition('=')
            entry[k.strip()] = v.strip()
    return entry


# ── HTTP handler ───────────────────────────────────────────────

class ScoutHandler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self._send_cors_headers(200)
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        raw    = self.rfile.read(length)

        if self.path == '/submit':
            self._handle_submit(raw)
        elif self.path == '/scan':
            self._handle_scan(raw)
        else:
            self.send_error(404)

    def _handle_submit(self, raw):
        """Accept a full JSON entry from match.html."""
        try:
            entry  = json.loads(raw)
            saved  = save_entry(entry)
            status = 'saved' if saved else 'duplicate'
            team   = entry.get('t', '?')
            match  = entry.get('m', '?')
            robot  = entry.get('r', '?')
            scout  = entry.get('s', '?')
            total  = len(load_entries())
            print(f'  [{_ts()}]  {"NEW " if saved else "DUP "} '
                  f'Q{match} {robot}  Team {team}  Scout {scout}  '
                  f'(total: {total})')
            self._json_response({'ok': True, 'status': status, 'total': total})
        except Exception as e:
            print(f'  [{_ts()}]  ERROR  {e}')
            self._json_response({'ok': False, 'error': str(e)}, 400)

    def _handle_scan(self, raw):
        """Accept a KVS string (from a scanned QR code) and save it as an entry."""
        try:
            body  = json.loads(raw)
            kvs   = body.get('kvs', '').strip()
            if not kvs:
                self._json_response({'ok': False, 'error': 'missing kvs field'}, 400)
                return
            entry = parse_kvs(kvs)
            if not all(entry.get(k) for k in ('s', 'm', 'r', 't')):
                self._json_response({'ok': False, 'error': 'missing required fields (s, m, r, t)'}, 400)
                return
            entry.setdefault('timestamp', datetime.utcnow().isoformat() + 'Z')
            saved  = save_entry(entry)
            status = 'saved' if saved else 'duplicate'
            total  = len(load_entries())
            print(f'  [{_ts()}]  {"QR  " if saved else "DUP "} '
                  f'Q{entry.get("m","?")} {entry.get("r","?")}  '
                  f'Team {entry.get("t","?")}  Scout {entry.get("s","?")}  '
                  f'(total: {total})')
            self._json_response({'ok': True, 'status': status, 'total': total})
        except Exception as e:
            print(f'  [{_ts()}]  ERROR  {e}')
            self._json_response({'ok': False, 'error': str(e)}, 400)

    def do_GET(self):
        if self.path == '/entries':
            entries = load_entries()
            self._json_response({'entries': entries, 'count': len(entries)})
        elif self.path == '/db':
            self._serve_db()
        else:
            super().do_GET()

    def _serve_db(self):
        """Serve the SQLite database file for download."""
        if not os.path.exists(DB_FILE):
            self.send_error(404, 'No database yet')
            return
        with open(DB_FILE, 'rb') as f:
            data = f.read()
        fname = f'scouting_{_ts().replace(":","-")}.db'
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/x-sqlite3')
        self.send_header('Content-Disposition', f'attachment; filename="{fname}"')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json_response(self, data, code=200):
        body = json.dumps(data).encode()
        self._send_cors_headers(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self, code):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, *args):
        pass


# ── Helpers ────────────────────────────────────────────────────

def _ts():
    return datetime.now().strftime('%H:%M:%S')

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


# ── Main ───────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    ip = get_local_ip()

    print()
    print('╔══════════════════════════════════════════════════════╗')
    print('║        FRC Scouting — Offline Local Server           ║')
    print('╠══════════════════════════════════════════════════════╣')
    print(f'║  Scout URL:     http://{ip}:{PORT}/match.html')
    print(f'║  Dashboard URL: http://{ip}:{PORT}/dashboard.html')
    print(f'║  Database file: {os.path.abspath(DB_FILE)}')
    print(f'║  Download DB:   http://{ip}:{PORT}/db')
    print('╠══════════════════════════════════════════════════════╣')
    print('║  NEXT STEP:                                          ║')
    print(f'║  Open config/event-config.js and set:               ║')
    print(f'║    LOCAL_SERVER = "http://{ip}:{PORT}";')
    print('║  Then reload match.html and dashboard.html           ║')
    print('╠══════════════════════════════════════════════════════╣')
    print('║  All devices must be on the SAME WiFi / hotspot      ║')
    print('║  Press Ctrl+C to stop                                ║')
    print('╚══════════════════════════════════════════════════════╝')
    print()
    print(f'  [{_ts()}]  Server started — waiting for scouts…')
    print()

    try:
        with http.server.ThreadingHTTPServer(('', PORT), ScoutHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        total = len(load_entries())
        print()
        print(f'  [{_ts()}]  Stopped. {total} entries in {DB_FILE}')
        print()
        sys.exit(0)
