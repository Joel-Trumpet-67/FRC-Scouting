#!/usr/bin/env python3
"""
server.py — Offline local server for FRC scouting.

Replaces Firebase when there's no internet at a competition venue.
Scouts submit to this server; data is saved to entries.json here.
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

  Data is saved to entries.json in this folder (visible in VS Code).
  Press Ctrl+C to stop the server.
"""

import http.server
import json
import os
import socket
import sys
import threading
from datetime import datetime

PORT         = 5800
ENTRIES_FILE = 'entries.json'
_lock        = threading.Lock()


# ── Entry storage ──────────────────────────────────────────────

def load_entries():
    if not os.path.exists(ENTRIES_FILE):
        return []
    with open(ENTRIES_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_entry(entry):
    with _lock:
        entries = load_entries()
        # Deduplicate: same scouter + match + robot + event
        key = (entry.get('s',''), entry.get('m',''), entry.get('r',''), entry.get('e',''))
        if any((e.get('s',''),e.get('m',''),e.get('r',''),e.get('e','')) == key for e in entries):
            return False   # duplicate — not saved
        entries.append(entry)
        with open(ENTRIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries, f, indent=2)
        return True


# ── HTTP handler ───────────────────────────────────────────────

class ScoutHandler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self._send_cors_headers(200)
        self.end_headers()

    def do_POST(self):
        if self.path != '/submit':
            self.send_error(404)
            return
        length  = int(self.headers.get('Content-Length', 0))
        raw     = self.rfile.read(length)
        try:
            entry   = json.loads(raw)
            saved   = save_entry(entry)
            status  = 'saved' if saved else 'duplicate'
            team    = entry.get('t', '?')
            match   = entry.get('m', '?')
            robot   = entry.get('r', '?')
            scout   = entry.get('s', '?')
            total   = len(load_entries())
            print(f'  [{_ts()}]  {"NEW " if saved else "DUP "} '
                  f'Q{match} {robot}  Team {team}  Scout {scout}  '
                  f'(total: {total})')
            self._json_response({'ok': True, 'status': status, 'total': total})
        except Exception as e:
            print(f'  [{_ts()}]  ERROR  {e}')
            self._json_response({'ok': False, 'error': str(e)}, 400)

    def do_GET(self):
        if self.path == '/entries':
            entries = load_entries()
            self._json_response({'entries': entries, 'count': len(entries)})
        else:
            super().do_GET()   # serve static files normally

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
        pass   # silence default access log (we print our own above)


# ── Helpers ────────────────────────────────────────────────────

def _ts():
    return datetime.now().strftime('%H:%M:%S')

def get_local_ip():
    """Returns the machine's LAN IP (works on most platforms)."""
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
    ip = get_local_ip()

    print()
    print('╔══════════════════════════════════════════════════════╗')
    print('║        FRC Scouting — Offline Local Server           ║')
    print('╠══════════════════════════════════════════════════════╣')
    print(f'║  Scout URL:     http://{ip}:{PORT}/match.html')
    print(f'║  Dashboard URL: http://{ip}:{PORT}/dashboard.html')
    print(f'║  Entries file:  {os.path.abspath(ENTRIES_FILE)}')
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
        print(f'  [{_ts()}]  Stopped. {total} entries saved to {ENTRIES_FILE}')
        print()
        sys.exit(0)
