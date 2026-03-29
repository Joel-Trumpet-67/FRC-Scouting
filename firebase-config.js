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

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApVYifFNS9OzggMyPVvy9ARbBqA8mDXFI",
  authDomain: "frc-scouting-26.firebaseapp.com",
  projectId: "frc-scouting-26",
  storageBucket: "frc-scouting-26.firebasestorage.app",
  messagingSenderId: "275321456262",
  appId: "1:275321456262:web:1c15b9cbcfa64d1ddd7307",
  measurementId: "G-K0T42CVJQ8"
};

// Your TBA API key (get one free at https://www.thebluealliance.com/account)
// Used to auto-fill team numbers from the live match schedule.
// Leave as "" to skip TBA auto-fill.
const TBA_KEY = "";
