#!/usr/bin/env python3
"""
FRC Scout Rotation Tool
=======================
Commands:
  python rotation.py status          - Show current scout -> team assignments
  python rotation.py switch          - Suggest a swap for the next match
  python rotation.py apply <i> <j>   - Apply a swap between positions i and j
  python rotation.py next            - Advance to next match
  python rotation.py set <num>       - Set current match number manually
  python rotation.py refresh         - Re-fetch EPA data from Statbotics
"""

import json
import os
import sys
import urllib.request
import urllib.error

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
STATE_FILE  = os.path.join(SCRIPT_DIR, "state.json")

TBA_BASE = "https://www.thebluealliance.com/api/v3"
SB_BASE  = "https://api.statbotics.io/v3"

# Minimum matches between swaps before a warning is shown
MIN_MATCHES_BETWEEN_SWAPS = 5
# Max positions apart a swap can be before asking for confirmation
MAX_JUMP = 3


# ── I/O helpers ───────────────────────────────────────────────

def load_json(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def fetch_url(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  [HTTP {e.code}] {url}")
        return None
    except Exception as e:
        print(f"  [network error] {e}")
        return None


# ── API helpers ───────────────────────────────────────────────

def tba_get(key, path):
    return fetch_url(TBA_BASE + path, {"X-TBA-Auth-Key": key})


def fetch_all_epa(event_code):
    """
    Fetch EPA for every team at the event from Statbotics.
    Returns dict: { "1234": 52.3, ... }
    """
    url = f"{SB_BASE}/team_events?event={event_code}&limit=500"
    data = fetch_url(url)
    if not isinstance(data, list):
        return {}
    result = {}
    for d in data:
        team = str(d.get("team", ""))
        epa_block = (d.get("epa") or {}).get("total_points", {})
        mean = epa_block.get("mean") if isinstance(epa_block, dict) else None
        if team and mean is not None:
            result[team] = round(float(mean), 2)
    return result


# ── Scoring ───────────────────────────────────────────────────

def alignment_score(queue, ranked_teams):
    """
    Measures how well scouts are matched to team EPA ranks.
    Lower = better. 0 = perfect (scout rank 1 on highest-EPA team, etc.)

    queue        - current scout order, queue[0] covers the highest-EPA team
    ranked_teams - teams sorted by EPA desc (same length as queue)
    """
    score = 0
    for i, scout in enumerate(queue):
        # scout["rank"] is 1-indexed skill rank; epa position is i+1
        score += abs(scout["rank"] - (i + 1))
    return score


# ── Commands ──────────────────────────────────────────────────

def cmd_status(cfg, state):
    match_num  = state.get("match_number", 1)
    event      = cfg.get("event_code", "?")
    queue      = state.get("queue", [])
    last_teams = state.get("last_teams", [])
    epa_cache  = state.get("epa_cache", {})

    print()
    print(f"  Match {match_num}  |  Event: {event}")
    print(f"  {'Pos':>3}  {'Scout':<14} {'Skill':>5}  {'Team':>6}  {'EPA':>8}")
    print("  " + "-" * 44)
    for i, scout in enumerate(queue):
        team    = str(last_teams[i]) if i < len(last_teams) else "-"
        epa     = epa_cache.get(team)
        epa_str = f"{epa:.1f}" if epa is not None else "-"
        print(f"  {i+1:>3}  {scout['name']:<14} {'#'+str(scout['rank']):>5}   {team:>5}  {epa_str:>8}")
    print()


def cmd_switch(cfg, state):
    tba_key   = cfg.get("tba_key", "")
    event     = cfg.get("event_code", "")
    match_num = state.get("match_number", 1)
    queue     = state.get("queue", [])
    epa_cache = state.get("epa_cache", {})

    if not tba_key or tba_key == "YOUR_TBA_KEY_HERE":
        print("\n  TBA key not configured. Add tba_key to config.json.\n")
        return
    if not event:
        print("\n  event_code not configured in config.json.\n")
        return

    # Load EPA cache if empty
    if not epa_cache:
        print("  Fetching EPA from Statbotics...")
        epa_cache = fetch_all_epa(event)
        if epa_cache:
            state["epa_cache"] = epa_cache
            save_json(STATE_FILE, state)
        else:
            print("  Warning: could not fetch EPA data. Rankings may be incomplete.\n")

    print(f"\n  Fetching match {match_num} from TBA...")
    matches = tba_get(tba_key, f"/event/{event}/matches/simple")
    if not matches:
        print("  Could not fetch match schedule.\n")
        return

    qual_matches = sorted(
        [m for m in matches if m.get("comp_level") == "qm"],
        key=lambda m: m["match_number"]
    )
    match = next((m for m in qual_matches if m["match_number"] == match_num), None)
    if not match:
        print(f"  Match {match_num} not found in TBA schedule.\n")
        return

    alliances = match["alliances"]
    raw_teams = alliances["red"]["team_keys"] + alliances["blue"]["team_keys"]
    teams     = [t.replace("frc", "") for t in raw_teams]

    # Sort teams by EPA descending; teams with no EPA go to the end
    ranked_teams = sorted(teams, key=lambda t: epa_cache.get(str(t), -1.0), reverse=True)

    print(f"\n  Teams in match {match_num} ranked by EPA:")
    for i, t in enumerate(ranked_teams):
        e     = epa_cache.get(str(t))
        e_str = f"{e:.1f}" if e is not None else "N/A"
        arrow = "  <- needs best scout" if i == 0 else ""
        print(f"    {i+1}. Team {t:>5}   EPA: {e_str:>6}{arrow}")

    n           = len(queue)
    curr_score  = alignment_score(queue, ranked_teams)
    print(f"\n  Alignment score: {curr_score}  (0 = perfect match)")

    # Find the best valid swap (within MAX_JUMP positions)
    best       = None
    best_score = curr_score
    for i in range(n):
        for j in range(i + 1, min(i + MAX_JUMP + 1, n)):
            q2       = queue[:]
            q2[i], q2[j] = q2[j], q2[i]
            s        = alignment_score(q2, ranked_teams)
            if s < best_score:
                best_score = s
                best       = (i, j)

    if best:
        i, j    = best
        improve = curr_score - best_score
        print(f"  After swap:      {best_score}  (improvement: {improve})")
        print()
        print(f"  +------ Suggested swap --------------------------------+")
        print(f"  |  {queue[i]['name']:<14} pos {i+1}, skill #{queue[i]['rank']}")
        print(f"  |    <-> swaps with")
        print(f"  |  {queue[j]['name']:<14} pos {j+1}, skill #{queue[j]['rank']}")
        print(f"  |")
        e_i = epa_cache.get(str(ranked_teams[i]))
        e_j = epa_cache.get(str(ranked_teams[j]))
        print(f"  |  {queue[j]['name']} -> Team {ranked_teams[i]}  (EPA {e_i:.1f if e_i is not None else 'N/A'})")
        print(f"  |  {queue[i]['name']} -> Team {ranked_teams[j]}  (EPA {e_j:.1f if e_j is not None else 'N/A'})")
        print(f"  +------------------------------------------------------+")

        last_swap = state.get("last_swap_match", 0)
        since     = match_num - last_swap
        if last_swap > 0 and since < MIN_MATCHES_BETWEEN_SWAPS:
            print(f"\n  WARNING: only {since} match(es) since last swap (min recommended: {MIN_MATCHES_BETWEEN_SWAPS})")

        print(f"\n  To apply:  python rotation.py apply {i+1} {j+1}")
    else:
        print("  No beneficial swap found — current assignment is already optimal.")

    # Save ranked_teams so status can show last known assignments
    state["last_teams"] = ranked_teams
    save_json(STATE_FILE, state)
    print()


def cmd_apply(cfg, state, args):
    if len(args) < 2:
        print("  Usage: python rotation.py apply <pos1> <pos2>")
        return
    try:
        i = int(args[0]) - 1
        j = int(args[1]) - 1
    except ValueError:
        print("  Positions must be integers.")
        return

    queue = state.get("queue", [])
    n     = len(queue)
    if not (0 <= i < n and 0 <= j < n):
        print(f"  Invalid positions. Must be between 1 and {n}.")
        return
    if abs(i - j) > MAX_JUMP:
        print(f"  Jump of {abs(i-j)} exceeds recommended max ({MAX_JUMP}).")
        try:
            ans = input("  Proceed anyway? (y/n): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            ans = "n"
        if ans != "y":
            print("  Cancelled.")
            return

    a, b             = queue[i]["name"], queue[j]["name"]
    queue[i], queue[j] = queue[j], queue[i]
    state["queue"]           = queue
    state["last_swap_match"] = state.get("match_number", 1)
    save_json(STATE_FILE, state)

    print(f"\n  Swapped: {a} <-> {b}")
    print(f"  New order: {' -> '.join(s['name'] for s in queue)}\n")


def cmd_next(cfg, state):
    state["match_number"] = state.get("match_number", 1) + 1
    save_json(STATE_FILE, state)
    print(f"  Advanced to match {state['match_number']}")


def cmd_set(cfg, state, args):
    if not args:
        print("  Usage: python rotation.py set <match_number>")
        return
    try:
        state["match_number"] = int(args[0])
        save_json(STATE_FILE, state)
        print(f"  Match set to {state['match_number']}")
    except ValueError:
        print("  Match number must be an integer.")


def cmd_refresh(cfg, state):
    event = cfg.get("event_code", "")
    if not event:
        print("  event_code not set in config.json")
        return
    print(f"  Fetching EPA data for event '{event}'...")
    epa = fetch_all_epa(event)
    if epa:
        state["epa_cache"] = epa
        save_json(STATE_FILE, state)
        print(f"  Cached EPA for {len(epa)} teams.")
    else:
        print("  Failed to fetch EPA data.")


# ── Bootstrap ─────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "tba_key":    "YOUR_TBA_KEY_HERE",
    "event_code": "2026mibig",
    "scouts": [
        {"rank": 1, "name": "Scout1"},
        {"rank": 2, "name": "Scout2"},
        {"rank": 3, "name": "Scout3"},
        {"rank": 4, "name": "Scout4"},
        {"rank": 5, "name": "Scout5"},
        {"rank": 6, "name": "Scout6"},
    ]
}

HELP = """\
Commands:
  status          - current scout assignments
  switch          - suggest a swap for the next match
  apply <i> <j>   - swap scouts at positions i and j  (1-indexed)
  next            - advance to next match
  set <num>       - set match number manually
  refresh         - re-fetch EPA data from Statbotics
"""


def init_state(cfg):
    return {
        "match_number":    1,
        "queue":           sorted(cfg.get("scouts", []), key=lambda s: s["rank"]),
        "last_swap_match": 0,
        "last_teams":      [],
        "epa_cache":       {},
    }


def main():
    cfg = load_json(CONFIG_FILE)
    if cfg is None:
        print(f"  No config found. Creating {CONFIG_FILE}")
        print("  Edit it to add your scout names, then re-run.")
        save_json(CONFIG_FILE, DEFAULT_CONFIG)
        return

    state = load_json(STATE_FILE)
    if state is None or "queue" not in state:
        state = init_state(cfg)
        save_json(STATE_FILE, state)

    args = sys.argv[1:]
    if not args:
        print(HELP)
        return

    cmd  = args[0].lower()
    rest = args[1:]

    if   cmd in ("status",  "s"):  cmd_status(cfg, state)
    elif cmd in ("switch",  "sw"): cmd_switch(cfg, state)
    elif cmd in ("apply",   "a"):  cmd_apply(cfg, state, rest)
    elif cmd in ("next",    "n"):  cmd_next(cfg, state)
    elif cmd in ("set",):          cmd_set(cfg, state, rest)
    elif cmd in ("refresh", "r"):  cmd_refresh(cfg, state)
    else:
        print(f"  Unknown command: '{cmd}'\n")
        print(HELP)


if __name__ == "__main__":
    main()
