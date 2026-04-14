// ============================================================
// event-config.js — EDIT THIS FILE BEFORE EACH EVENT
// ============================================================
//
//  ⚠ NEVER commit this file — it's in .gitignore for a reason.
//
// ============================================================

const EVENT_CODE        = "2026micmpa";
const TBA_KEY           = "FSce0rjyre8mlq90YaG7I0r9iq9OqeGTDptyA4sG1cu6aMmW7yjQpj2VW7hYAZ7g";
const DEFAULT_SYNC_CODE = "TEAM3603";

// ── OFFLINE LOCAL SERVER ──────────────────────────────────────
//
//  When there's no internet at a competition venue, run server.py
//  on the coach's laptop and set this to the laptop's local IP.
//
//  Steps:
//    1. Coach starts a phone hotspot
//    2. Laptop + all scout phones join that hotspot
//    3. Run: python3 server.py  (in this folder)
//    4. Set LOCAL_SERVER below to the IP shown in the terminal
//    5. All scouts reload match.html — data now goes to the laptop
//
//  Example: const LOCAL_SERVER = 'http://192.168.1.5:5800';
//  Leave empty to use Firebase (normal online mode).
//
const LOCAL_SERVER = '';
