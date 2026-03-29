// ============================================================
// firebase-config.js — Firebase project credentials
// ============================================================
//
//  SETUP (one-time, ~5 minutes):
//
//  1. Go to https://console.firebase.google.com
//  2. Click "Add project" → name it anything (e.g. "frc-scouting")
//  3. Disable Google Analytics (not needed) → Create project
//  4. Click the </> (Web) icon → Register app → copy the firebaseConfig values below
//  5. In the left sidebar: Build → Realtime Database → Create database
//     → Start in TEST MODE → Enable
//
//  Then copy this file:
//    cp config/firebase-config.example.js config/firebase-config.js
//  Fill in your values and you're done.
//
//  ⚠ NEVER commit config/firebase-config.js — it's in .gitignore for a reason.
//
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
