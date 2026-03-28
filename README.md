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
5. The dashboard shows all teams ranked with scouted averages + Statbotics EPA

---

## Changing the Event (Each Competition)

Open **`config/event-config.js`** — this is the only file you need to edit:

```js
const EVENT_CODE = "2026milac";   // ← change this to the new event code
const TBA_KEY    = "your_key";    // ← only change if your key expires
```

Event codes follow the format `YEAR` + `event_id` — find yours at [thebluealliance.com](https://thebluealliance.com) (it's the last part of the event URL).

Also replace `assets/images/2026/field_image.png` with the new season's field image if it changed.

---

## Setup (One-Time, Already Done for This Project)

### 1. Firebase Realtime Database
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project → Add a web app → copy the config object
3. Build → Realtime Database → Create database → **Start in test mode**
4. Paste your config into `config/firebase-config.js`

### 2. TBA API Key
1. Go to [thebluealliance.com/account](https://thebluealliance.com/account)
2. Generate a read-only API key
3. Paste it into `config/event-config.js` as `TBA_KEY`

### 3. GitHub Pages
1. Repo → Settings → Pages → Branch: `main` / `(root)` → Save
2. App is live at `https://YOUR-USERNAME.github.io/FRC-Scouting/`

---

## Scouting Form Pages

| Page | What You Scout |
|------|----------------|
| Pre-Match | Scouter initials, event, match #, robot position (auto-fills team # from TBA) |
| Auton | Dumps, shots (1pt / 5pt), missed fuel, L1 climb |
| Teleop | Won auto, shots (1pt / 5pt), missed fuel, hub capacity |
| Endgame | Climb timer, final climb status (L1 / L2 / L3 / Failed / None) |
| Misc | Died, tippy, downtime actions, comments |
| Submit | Review summary → submit to Firebase → auto-advances to next match |

---

## Project Structure

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
└── assets/
    ├── fonts/              ← Alexis font
    ├── images/2026/        ← Field image (replace each season)
    └── lib/                ← Third-party JS libraries
```

See `TODO.md` for the pre-event checklist and planned improvements.

---

## Tech Stack

- Vanilla HTML/JS — no build tools, no npm
- [Firebase Realtime Database](https://firebase.google.com) — live data sync
- [The Blue Alliance API v3](https://thebluealliance.com) — match schedule + team auto-fill
- [Statbotics API](https://statbotics.io) — EPA rankings for comparison
- GitHub Pages — free static hosting
