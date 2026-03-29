# FRC Scouting App — TODO & Reference

---

## 📁 Project Structure (reference)

```
FRC-Scouting/
├── match.html              ← Match scouting form (open on phones during matches)
├── dashboard.html          ← Live dashboard (open on laptop)
│
├── season/
│   └── game-fields.js      ← !! EDIT THIS EACH NEW SEASON !! (labels, scoring, fields)
│
├── config/
│   ├── event-config.js     ← EDIT THIS EACH EVENT (EVENT_CODE + TBA_KEY) — gitignored
│   ├── event-config.example.js
│   ├── firebase-config.js  ← Firebase credentials (one-time setup) — gitignored
│   └── firebase-config.example.js
│
├── js/
│   ├── match.js            ← Match form logic (game-agnostic)
│   └── dashboard.js        ← Dashboard logic (game-agnostic)
│
├── css/
│   ├── scouting.css        ← Styles for the scouting form
│   └── dashboard.css       ← Dashboard styles
│
├── assets/
│   ├── fonts/
│   ├── images/2026/        ← replace with new field image each year
│   └── lib/
│
├── server.js               ← Optional local dev server (not needed for GitHub Pages)
└── config.json             ← Local server config (not needed for GitHub Pages)
```

---

## 🔁 Before Each Event (checklist)

- [ ] Open `config/event-config.js` → change `EVENT_CODE` to the new event
- [ ] Confirm `TBA_KEY` is still valid (check at thebluealliance.com/account)
- [ ] Push to GitHub → GitHub Pages auto-deploys in ~1 minute
- [ ] Share the `match.html` URL and sync code with your scouting team

---

## 🗓 Each New Season (checklist)

- [ ] Update `season/game-fields.js` → `FIELD_LABELS`, `EFS_LABELS`, `DTA_LABELS`, `SEASON_SCORING`, `MODAL_FIELDS`
- [ ] Update the Auto / Teleop / Endgame pages in `match.html` (marked with `GAME-SPECIFIC PAGES` comments)
- [ ] Replace `assets/images/YEAR/field_image.png` with the new field map

---

## 🚀 Still To Do

### Add DEFAULT_SYNC_CODE to config
- Add `const DEFAULT_SYNC_CODE = "TEAM1234";` to `config/event-config.js`
- In `js/match.js` `initFirebase()`, fall back to `DEFAULT_SYNC_CODE` if localStorage is empty
- Scouts open the app and it just works — no code entry needed

### Export pick list
- Add an "Export Pick List" button on the dashboard
- Exports team number, scouted avg, SB EPA, and pick status as CSV
- **File:** `js/dashboard.js` → add `exportPicklist()` next to `exportCSV()`

### Persist sort preference
- Save `sortCol` + `sortDir` to `localStorage` in `sortBy()`
- Restore on page load so sort survives refresh during alliance selection
- **File:** `js/dashboard.js` → `sortBy()` + boot section

### 3-state pick list toggle
- Current cycle: Available → DNP → Available
- New cycle: Available → Overrated → DNP → Available
- Lets coaches manually flag a team as overrated even without SB data
- **File:** `js/dashboard.js` → `toggleStatus()`

### Firebase security rules
- Currently in test mode (open read/write)
- Add rules so only authenticated users (or users with the sync code) can write
- Document the recommended rules in README

### Coach notes on teams
- Text area in the team detail modal that saves to Firebase
- Path: `sessions/{code}/notes/{team}` — visible to all coaches on the same sync code
- **File:** `js/dashboard.js` → `openTeamModal()`

### Match sparkline in team modal
- Small SVG chart in the team detail modal showing a team's scoring trend match-by-match
- Helps spot sandbagging or robots that improve/decline over the day
- **File:** `js/dashboard.js` → `openTeamModal()`

---

## 💡 Nice to Have

- **Light mode / print mode** — dark theme is hard to read outdoors; `@media print` styles for rankings sheet
- **Alliance selection simulator** — pick 3 alliances, show combined EPA, flag pick conflicts
- **Matches scouted confidence** — show count next to each team so coaches know if averages are from 1 match or 10
- **Recent submit flash** — briefly highlight a row green when new data comes in for that team

---

## ✅ Completed

- Firebase Realtime Database sync via shared sync code
- TBA schedule auto-fill (team # from live match schedule)
- Match preview grid (all 6 positions R1–R3 / B1–B3)
- Robot position + scouter initials persist between matches
- Dashboard with Statbotics EPA + scouted averages, sortable columns
- Team detail modal with per-match entry list
- Overrated auto-flagging (SB rank vs. scouted percentile mismatch)
- Pick list synced live across all coach devices
- Export CSV
- Alliance selection mode (dedicated tab, Ours/Taken/DNP, live banner)
- Offline queue — submissions saved locally when Firebase unreachable, auto-syncs on reconnect
- Per-page validation — blocks advancing past Pre-Match with blank fields
- `.gitignore` + config example templates (credentials never committed)
- `season/game-fields.js` — all game-specific config isolated in one folder
- Hardcoded team references removed (generic examples throughout)
- README rewritten for public / CD audience
- GitHub Pages deploy instructions + season update checklist in README
