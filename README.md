# FRC Scouting App

A free, real-time match scouting system built for FRC competitions.
Scouts use their phones to submit data → coaches see it live on a dashboard.
No server, no app install, no coding required to use. Runs entirely on GitHub Pages + Firebase.

---

## Features

- 📱 **Phone-friendly scouting form** — designed for one-handed use during matches
- ⚡ **Live sync across all devices** — data appears on the dashboard the moment a scout submits
- 📵 **Offline queue** — if wifi dies mid-match, submissions save locally and auto-sync when connection returns
- 🔢 **TBA integration** — auto-fills team numbers from the live match schedule
- 📊 **Statbotics EPA** — pulls EPA rankings alongside your scouted data so you can cross-reference
- 🏆 **Alliance selection mode** — dedicated view for the 7-minute selection window with one-tap pick/taken/DNP marking, live "Our Alliance" banner, and teams ranked by priority
- 🚩 **Overrated flagging** — automatically highlights teams where your scouted data disagrees with their Statbotics rank
- 📋 **Pick list** — synced live across all coach devices
- 💾 **CSV export** — full data export for post-event analysis
- 🔒 **Sync codes** — each session gets a private code; only devices with that code see your data

---

## What It Looks Like

> 📸 *Add screenshots of match.html, dashboard.html, and the alliance selection tab here*

---

## Quick Start (New Team Setup)

> **Time required:** ~15 minutes, one-time.
> **Cost:** Free. Firebase free tier + GitHub Pages are both free.

### Step 1 — Fork the repo

Click **Fork** at the top of this page. You now have your own copy.

### Step 2 — Set up Firebase (free)

Firebase is the live database that syncs data between scouts and the dashboard.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it anything (e.g. `frc-scouting`) → disable Analytics → **Create**
3. Click the **`</>`** (Web) icon → name your app → **Register**
4. Copy the `firebaseConfig` object that appears — you'll need it in a moment
5. In the left sidebar: **Build → Realtime Database → Create database → Start in test mode → Enable**

### Step 3 — Add your Firebase config

In your forked repo, copy the example file:

```
config/firebase-config.example.js  →  config/firebase-config.js
```

Open `config/firebase-config.js` and paste in your values from Step 2:

```js
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

> ⚠️ `config/firebase-config.js` is in `.gitignore` — it will never be committed. Your keys stay private.

### Step 4 — Get a TBA API key (free)

The Blue Alliance is used to auto-fill team numbers from the match schedule.

1. Go to [thebluealliance.com/account](https://thebluealliance.com/account) (sign in with Google)
2. Scroll to **Read API Keys** → **Add new key** → copy it

### Step 5 — Set your event code

Copy the second example file:

```
config/event-config.example.js  →  config/event-config.js
```

Open it and fill in:

```js
const EVENT_CODE = "2026miket";   // TBA event code — last part of the event's URL
const TBA_KEY    = "your_key_here";
```

To find your event code: go to [thebluealliance.com](https://thebluealliance.com), find your event, and copy the last segment of the URL (e.g. `2026miket`).

### Step 6 — Deploy to GitHub Pages (free, 2 clicks)

> No server needed. GitHub Pages hosts static files for free directly from your repo.

1. In your forked repo go to **Settings → Pages** (left sidebar)
2. Under **Source / Branch**, select **`main`** and **`/ (root)`** → click **Save**
3. GitHub will show a green banner: *"Your site is live at..."* — usually takes under a minute

Your app is now live at:

```
https://YOUR-USERNAME.github.io/FRC-Scouting/match.html      ← scouts open this on their phones
https://YOUR-USERNAME.github.io/FRC-Scouting/dashboard.html  ← coaches open this on the laptop
```

**Every `git push` auto-redeploys.** When you update event codes or game fields before a competition, just push and GitHub Pages picks it up within 30–60 seconds — no manual steps.

Share the `match.html` link with your scouts. Open `dashboard.html` on the coach laptop. Done.

> 💡 **Testing locally?** You can also open `match.html` directly in a browser — no server required. Firebase still syncs as long as you have internet.

---

## How Sync Codes Work

When a scout (or coach) opens the app for the first time, they're asked to enter a **sync code** — any word or phrase you choose (e.g. `TEAM1234` or `CURIE2026`).

- Every device that enters the **same code** sees the same data, live
- Devices on a **different code** are completely isolated
- The code is remembered on each device — scouts only type it once per event
- You can change codes between events to start fresh

**Recommended workflow:** pick one code per event and share it in your team's group chat before the event starts.

---

## Using It at Competition

### Before matches start
1. Share the `match.html` link and sync code with your scouting team
2. Assign each scout a robot position (Red 1, Blue 2, etc.)
3. Open `dashboard.html` on the coach laptop — enter the same sync code

### During matches
1. Scout opens `match.html`, enters sync code once, fills out the form for their robot
2. On submit, data instantly appears on the coach dashboard
3. If wifi is spotty — no problem. Data is saved locally and syncs automatically when connection returns

### Alliance selection
1. On the dashboard, click **Alliance Selection** tab
2. Teams are ranked by priority (Statbotics rank + scouted data)
3. Tap **Ours** when you pick a team, **Taken** when another alliance picks them, **DNP** for do-not-pick
4. Your alliance is shown in the banner at the top — tap a team to remove them
5. All changes sync live to every coach device

---

## Before Each Event (Checklist)

- [ ] Open `config/event-config.js` → update `EVENT_CODE` to the new event
- [ ] Confirm `TBA_KEY` is still valid ([check here](https://thebluealliance.com/account))
- [ ] Push to GitHub → GitHub Pages deploys automatically
- [ ] Share `match.html` URL + sync code with your scouts

---

## New Season Checklist

All game-specific config is isolated in the `season/` folder. When the game changes:

**Files to edit:**

- [ ] **`season/game-fields.js`** — update field labels, scoring formula, radio value maps, and the team modal field list *(see the comments inside — every section tells you what to change)*
- [ ] **`match.html`** — swap out the Auto, Teleop, and Endgame form pages *(clearly marked with `GAME-SPECIFIC PAGES` comments)*
- [ ] **`assets/images/YEAR/field_image.png`** — replace with the new season's field map image

**Files you do NOT need to touch:**
- `js/match.js` — game-agnostic
- `js/dashboard.js` — game-agnostic
- `css/` — game-agnostic
- `config/` — only changes if your Firebase project or TBA key changes

After editing, `git push` and GitHub Pages auto-deploys within a minute.

---

## Project Structure

```
FRC-Scouting/
├── match.html                     ← Scouting form (open on phones)
├── dashboard.html                 ← Live dashboard (open on laptop)
│
├── season/                        ← !! UPDATE THIS EACH NEW SEASON !!
│   └── game-fields.js             ← Field labels, scoring formula, modal fields
│
├── config/
│   ├── firebase-config.js         ← Your Firebase credentials (gitignored)
│   ├── firebase-config.example.js ← Template — copy and fill in
│   ├── event-config.js            ← EVENT_CODE + TBA_KEY (gitignored)
│   └── event-config.example.js   ← Template — copy and fill in
│
├── js/
│   ├── match.js                   ← Scouting form logic (game-agnostic)
│   └── dashboard.js               ← Dashboard logic (game-agnostic)
│
├── css/
│   ├── scouting.css               ← Styles for the scouting form
│   └── dashboard.css              ← Styles for the dashboard
│
└── assets/
    ├── images/2026/               ← Field image (replace each season)
    └── lib/                       ← Third-party JS (QR code library)
```

---

## Tech Stack

| | |
|---|---|
| **Hosting** | GitHub Pages (free) |
| **Database** | Firebase Realtime Database (free tier) |
| **Schedule / Teams** | The Blue Alliance API v3 (free) |
| **Rankings** | Statbotics API (free) |
| **Frontend** | Vanilla HTML / CSS / JS — no build tools, no npm, no framework |

---

## Contributing

PRs welcome. If you adapt this for your team and add something useful, consider opening a PR so other teams benefit too.

To run locally without GitHub Pages, open `match.html` directly in a browser — it works without a server since everything is static.

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).
