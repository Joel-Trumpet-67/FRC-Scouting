// ─────────────────────────────────────────────────────────────────────────────
// Firebase Configuration
// ─────────────────────────────────────────────────────────────────────────────
//
// HOW TO SET UP (one-time, ~5 minutes):
//
//  1. Go to https://console.firebase.google.com
//  2. Click "Add project" → name it anything (e.g. "frc-scouting")
//  3. Disable Google Analytics (not needed) → Create project
//  4. Click "Web" (</> icon) to add a web app → Register app
//  5. Copy the firebaseConfig object below and paste it in
//  6. In the left sidebar: Build → Realtime Database → Create database
//     → Start in TEST MODE → Enable
//
//  Done! Share your sync code (e.g. "FRC3603") with your scouts.
//  Everyone who enters the same code sees the same data live.
//
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Your TBA API key (get one free at https://www.thebluealliance.com/account)
// Used to auto-fill team numbers from the live match schedule.
// Leave as "" to skip TBA auto-fill.
const TBA_KEY = "";
