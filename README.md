# FRC Scouting App

Live match scouting app for FRC events. Built for GitHub Pages — no server required.
All scouting data syncs in real time across devices using a shared room code (Firebase).

**Live app:** https://Joel-Trumpet-67.github.io/FRC-Scouting/match.html
**Dashboard:** https://Joel-Trumpet-67.github.io/FRC-Scouting/dashboard.html

---

## How It Works

1. Everyone on the scouting team opens `match.html` on their phone/tablet
2. Enter the same **sync code** (e.g. `FRC3603`) on every device
3. Fill out the scouting form for your assigned robot each match
4. Hit **Submit** — data instantly appears on the dashboard
5. The dashboard shows all teams ranked with Statbotics EPA comparison

---

## Changing the Event (Each Competition)

Open `firebase-config.js` and update the event code:

```js
const TBA_KEY = "your_key_here";  // one-time setup, don't change
```

Then open `match.html` and find:

```html
<input type="text" id="input_e" name="e" value="2026milac" required>
```

Change `2026milac` to the new event key (e.g. `2026ilch`).
Event keys follow the format: `YEAR` + `event_code` — find yours at [thebluealliance.com](https://thebluealliance.com).

> **Note:** See `TODO.md` — this will soon move to a single `config.js` file so you only need to edit one place.

---

## Setup (One-Time)

### 1. Firebase Realtime Database
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project → Add a web app → copy the config
3. Build → Realtime Database → Create database → **Start in test mode**
4. Paste your config into `firebase-config.js`

### 2. TBA API Key
1. Go to [thebluealliance.com/account](https://thebluealliance.com/account)
2. Generate a read API key
3. Paste it into `firebase-config.js` as `TBA_KEY`

### 3. GitHub Pages
1. Repo → Settings → Pages → Branch: `main` / `(root)` → Save
2. App is live at `https://YOUR-USERNAME.github.io/FRC-Scouting/`

---

## Scouting Form Pages

| Page | What You Scout |
|------|----------------|
| Pre-Match | Scouter, event, match #, robot position (auto-fills team from TBA) |
| Auton | Dumps, shots (1pt / 5pt), missed fuel, L1 climb |
| Teleop | Won auto, shots (1pt / 5pt), missed fuel, hub capacity |
| Endgame | Climb timer, final climb status (L1 / L2 / L3 / Failed / None) |
| Misc | Died, tippy, downtime actions, comments |
| Submit | Summary review → submit to Firebase |

---

## Files

| File | Purpose |
|------|---------|
| `match.html` | Scouting form (scouts use this) |
| `match.js` | Form logic, TBA auto-fill, Firebase submit |
| `dashboard.html` | Live rankings dashboard |
| `firebase-config.js` | **Edit this** — Firebase config + TBA key |
| `TODO.md` | Planned improvements |
| `resources/` | CSS, fonts, field image |

---

## Tech Stack

- Vanilla HTML/JS — no build tools, no npm
- [Firebase Realtime Database](https://firebase.google.com) — live data sync
- [The Blue Alliance API v3](https://thebluealliance.com) — match schedule + team auto-fill
- [Statbotics API](https://statbotics.io) — EPA rankings for comparison
- GitHub Pages — free static hosting
