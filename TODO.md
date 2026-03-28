# FRC Scouting App — TODO List

---

## 📁 Project Structure (reference)

```
FRC-Scouting/
├── match.html              ← Scout form (open on phones during matches)
├── dashboard.html          ← Live rankings (open on laptop at pit/stands)
│
├── config/
│   ├── event-config.js     ← EDIT THIS EACH EVENT (EVENT_CODE + TBA_KEY)
│   └── firebase-config.js  ← Firebase credentials (one-time setup)
│
├── js/
│   ├── match.js            ← Scout form logic
│   └── dashboard.js        ← Dashboard logic
│
├── css/
│   ├── scouting.css        ← Scout form styles
│   └── dashboard.css       ← Dashboard styles
│
├── assets/
│   ├── fonts/alexisv3.ttf
│   ├── images/2026/field_image.png  ← replace with new field image each year
│   └── lib/easy.qrcode.min.js
│
├── server.js               ← Optional local dev server (not needed for GitHub Pages)
└── config.json             ← Local server config (not needed for GitHub Pages)
```

---

## 🔁 Before Each Event (checklist)

- [ ] Open `config/event-config.js`
- [ ] Change `EVENT_CODE` to the new event (e.g. `"2026milac"`)
- [ ] Confirm `TBA_KEY` is still valid (check at thebluealliance.com/account)
- [ ] Replace `assets/images/YEAR/field_image.png` with the current season's field image
- [ ] Update `FIELD_LABELS` in `js/match.js` if game fields changed
- [ ] Update `EFS_LABELS` / `DTA_LABELS` in `js/match.js` for new endgame options
- [ ] Update the team detail modal field list in `js/dashboard.js` `openTeamModal()`
- [ ] Push to GitHub → GitHub Pages auto-deploys

---

## 🚀 High Priority (do before next season)

### Add DEFAULT_SYNC_CODE to config
- Add `const DEFAULT_SYNC_CODE = "FRC3603";` to `config/event-config.js`
- In `js/match.js` `initFirebase()`, use it as a fallback if localStorage is empty
- Scouts won't need to type the code in — just open and go
- **File to edit:** `config/event-config.js`, `js/match.js`

### Pit scouting page
- Add `pit.html` + `js/pit.js` for collecting robot spec data before the event:
  drivetrain type, auto modes available, max climb level, notes
- Use the same Firebase sync code to store under `sessions/{code}/pit/{team}`
- Show pit data alongside match data in the team detail modal
- **Files to create:** `pit.html`, `js/pit.js`

### Per-page validation before swipe
- Block advancing from Pre-Match until Scouter initials + Match # are filled
- Show a brief error message instead of silently allowing blank data through
- **File to edit:** `js/match.js` → `swipePage()` function

---

## 📋 Medium Priority

### Offline queue (submit when reconnected)
- If Firebase is unreachable at submit time, save the entry to `localStorage`
- On next Firebase connect, push the queued entries and clear the queue
- Prevents data loss at venues with spotty wifi
- **File to edit:** `js/match.js` → `submitData()`, `initFirebase()`

### Export pick list
- Add an "Export Pick List" button in `dashboard.html`
- Exports team number, scouted avg, SB EPA, and pick status as CSV
- **File to edit:** `js/dashboard.js` → add `exportPicklist()` next to `exportCSV()`

### Persist sort preference
- Save `sortCol` + `sortDir` to `localStorage` in `sortBy()`
- Restore them on page load so sort survives refresh during alliance selection
- **File to edit:** `js/dashboard.js` → `sortBy()`, boot section

### 3-state pick list toggle (manual overrated)
- Current cycle: Available → Do Not Pick → Available
- New cycle: Available → Overrated → Do Not Pick → Available
- Lets coaches manually mark a team as overrated even without SB data
- **File to edit:** `js/dashboard.js` → `toggleStatus()`

---

## 💡 Nice to Have (future season)

### Coach notes on teams
- Add a text area in the team detail modal
- Saves to Firebase: `sessions/{code}/notes/{team}`
- Visible to all coaches connected to the same sync code

### Match sparkline in team modal
- Small inline chart in the team detail modal showing scoring trend by match
- Helps spot sandbagging or robots that improve/decline over the day
- Could use a simple `<canvas>` or a tiny charting library

### Alliance selection simulator
- Pick 3 alliances, calculate combined EPA, highlight pick conflicts
- Useful during alliance selection at champs/districts

### Light mode / print mode
- Dashboard dark theme is hard to read outdoors or under bright lights
- Add a CSS toggle or `@media print` styles so coaches can print rankings

---

## ✅ Completed

- Firebase Realtime Database sync via shared room code
- TBA auto-fill (team numbers from live match schedule)
- Match preview grid showing all 6 positions (R1–R3 / B1–B3)
- Robot position + scouter initials persist after each submit
- Hub Capacity counter in Teleop
- GitHub Pages hosting (no server needed)
- Dashboard with Statbotics EPA columns + scouted averages
- Sortable table (click any column header)
- Team detail modal with all scouting entries
- Overrated auto-flagging (SB rank vs. scouted percentile)
- Picklist synced live across all connected devices
- Export CSV
- Refactored into clean folder structure (config/, js/, css/, assets/)
- EVENT_CODE + TBA_KEY extracted to config/event-config.js
