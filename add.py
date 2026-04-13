#!/usr/bin/env python3
"""
add.py — Type in scouting entries from the short codes shown on scout phones.

Run in the FRC-Scouting folder:
    python3 add.py

Each scout's phone shows a line like:
    5 r1 3603 1 45 0 60 2
    (Match · Robot · Team · AutoClimb · Auto% · Def · Tele% · End)

You read those numbers, type them here, hit Enter.
Data is saved to entries.json and the dashboard auto-refreshes (if server.py is running).

ROBOT positions:  r1 r2 r3 = Red 1-2-3 |  b1 b2 b3 = Blue 1-2-3
AUTO CLIMB:       0=None  1=L1  2=L2  3=L3
ENDGAME:          1=L1  2=L2  3=L3  F=Failed  X=Not attempted
"""

import json, os, sys
from datetime import datetime

ENTRIES_FILE = 'entries.json'
try:
    from config_loader import EVENT_CODE
except Exception:
    EVENT_CODE = None

# Try to read EVENT_CODE from config/event-config.js without executing JS
def read_event_code():
    path = os.path.join(os.path.dirname(__file__), 'config', 'event-config.js')
    if not os.path.exists(path):
        return '2026event'
    with open(path) as f:
        for line in f:
            if 'EVENT_CODE' in line and '=' in line:
                # Extract the string value between quotes
                import re
                m = re.search(r'["\']([^"\']+)["\']', line)
                if m:
                    return m.group(1)
    return '2026event'

EVENT = read_event_code()


def load():
    if not os.path.exists(ENTRIES_FILE):
        return []
    with open(ENTRIES_FILE, encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save(entries):
    with open(ENTRIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2)

def is_dup(entries, m, r, scout):
    return any(e.get('m')==str(m) and e.get('r')==r and e.get('s')==scout
               and e.get('e')==EVENT for e in entries)

def parse_code(parts, scout):
    """Parse the 8-space-separated values shown on the scout's phone."""
    if len(parts) < 8:
        raise ValueError(f"Need 8 values, got {len(parts)}: {' '.join(parts)}")
    m, r, t, a, ap, df, tp, end = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]

    # Basic validation
    valid_robots = {'r1','r2','r3','b1','b2','b3'}
    if r not in valid_robots:
        raise ValueError(f"Robot must be one of {sorted(valid_robots)}, got '{r}'")
    if end.upper() not in {'1','2','3','F','X'}:
        raise ValueError(f"Endgame must be 1/2/3/F/X, got '{end}'")

    return {
        's':    scout,
        'e':    EVENT,
        'l':    'qm',
        'm':    m,
        'r':    r,
        't':    t,
        'acl':  a,
        'apct': ap,
        'def':  df,
        'tpct': tp,
        'efs':  end.upper(),
        'die':  '0',
        'tip':  '0',
        'dta':  'N',
        'cmm':  '',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }

def prompt(label, default=None):
    suffix = f' [{default}]' if default else ''
    val = input(f'  {label}{suffix}: ').strip()
    return val if val else (default or '')

def run_interactive():
    print()
    print('╔══════════════════════════════════════════════════════╗')
    print('║         FRC Scouting — Add Entry (add.py)            ║')
    print('╠══════════════════════════════════════════════════════╣')
    print(f'║  Event: {EVENT:<45}║')
    print(f'║  File:  {ENTRIES_FILE:<45}║')
    print('╠══════════════════════════════════════════════════════╣')
    print('║  Code format shown on phone:                         ║')
    print('║  MATCH  ROBOT  TEAM  ACLIMB  AUTO%  DEF  TELE%  END ║')
    print('║  e.g.:  5  r1  3603  1  45  0  60  2               ║')
    print('╚══════════════════════════════════════════════════════╝')
    print()

    entries = load()

    while True:
        print(f'  ({len(entries)} entries so far)  Enter code — or blank to quit')
        print()

        scout = prompt('Scout initials (e.g. JT)').upper()
        if not scout:
            break

        code_line = prompt('Code from phone (8 values)')
        if not code_line:
            break

        parts = code_line.split()
        try:
            entry = parse_code(parts, scout)
        except ValueError as e:
            print(f'\n  ✗ Bad code: {e}\n')
            continue

        if is_dup(entries, entry['m'], entry['r'], scout):
            print(f"\n  ⚠  Already have Q{entry['m']} {entry['r']} from {scout} — skipping.\n")
            continue

        entries.append(entry)
        save(entries)

        team   = entry['t']
        match  = entry['m']
        robot  = entry['r']
        end    = {'1':'L1 Climb','2':'L2 Climb','3':'L3 Climb','F':'Failed','X':'No climb'}.get(entry['efs'], entry['efs'])
        df     = 'DEFENSE' if entry['def'] == '1' else f"Auto {entry['apct']}%  Tele {entry['tpct']}%"
        print(f'\n  ✓  Saved: Q{match} {robot}  Team {team}  [{df}]  End: {end}  ({len(entries)} total)\n')


if __name__ == '__main__':
    run_interactive()
