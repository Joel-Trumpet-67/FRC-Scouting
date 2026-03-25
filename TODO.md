# FRC Scouting App — TODOs

---

## 🔧 CONFIG FILE (Priority — do this before next event)

**Goal:** Pull all per-event settings out of `firebase-config.js` into a tiny
`config.js` that anyone on the team can open and change in 30 seconds.

**What `config.js` would look like (the whole file):**
```js
const EVENT   = "2026milac";   // ← change this each event
const TBA_KEY = "D0sik...";    // ← your TBA read key (one-time setup)
```

**Steps to implement:**
1. Create `config.js` with just `EVENT` and `TBA_KEY` constants
2. Add `<script src="config.js"></script>` to `match.html` and `dashboard.html`
   **above** `firebase-config.js`
3. In `match.html` change the event input default:
   `value="2026ilch"` → `value=""` and set it from `EVENT` in `match.js`
4. In `match.js` `fetchSchedule()` use `EVENT` as the fallback when the
   event field is empty
5. In `firebase-config.js` remove `TBA_KEY` (it moves to `config.js`)
6. Tell your team: **"Only ever edit `config.js`"**

---

## ✅ Done
- Firebase Realtime Database sync via room code
- TBA auto-fill (team numbers from live match schedule)
- Match preview grid showing all 6 positions (R1–R3 / B1–B3)
- Robot position + initials persist after each submit
- Hub Capacity counter in Teleop
- GitHub Pages hosting

---

## 📋 Remaining

### Dashboard redesign
- Simple rank-ordered table (1st → last place by Statbotics rank)
- Statbotics EPA columns alongside scouted averages
- Alliance pick list with overrated-team auto-flagging

### Pit Scouting page
- Add `pit.html` for robot specs / drive train / auto capabilities

### Alliance Pick List persistence
- `/picklist` endpoint (or Firebase path `sessions/{code}/picklist/`)
- Scouts can mark teams: Available / Overrated / Do Not Pick
