// ============================================================
// event-config.js — EDIT THIS FILE BEFORE EACH EVENT
// ============================================================
//
//  1. EVENT_CODE — the TBA event code for the current competition.
//     Find it at: https://www.thebluealliance.com → click your event → copy the last part of the URL
//     Examples:  "2026milac"  = 2026 Michigan Lac    (district)
//                "2026cmp"    = 2026 Championship
//
//  2. TBA_KEY — your read-only API key from The Blue Alliance.
//     Get one free at: https://www.thebluealliance.com/account
//     This only needs to change if your key expires.
//
// ============================================================

const EVENT_CODE = "2026mibig";   // ← change this each event
const TBA_KEY    = "2QOo8b2XNWxQYpsUtcYLmnn5RL80UCzxrNyVhOe52BcwREBjwFSJfh0esuZTEeu7";

// TODO: add DEFAULT_SYNC_CODE here so scouts don't have to type it in each time
//       e.g. const DEFAULT_SYNC_CODE = "FRC3603";
//       Then in match.js initFirebase(), fall back to DEFAULT_SYNC_CODE if nothing in localStorage.
