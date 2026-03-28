// ============================================================
// firebase-config.js — Firebase project credentials
// ============================================================
//
//  These values come from your Firebase project settings.
//  You only need to change these if you create a brand-new Firebase project.
//
//  To find them:
//    Firebase Console → Project Settings → Your apps → "SDK setup and configuration"
//
//  DO NOT put TBA_KEY or EVENT_CODE here — those live in event-config.js.
//
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyApVYifFNS9OzggMyPVvy9ARbBqA8mDXFI",
  authDomain:        "frc-scouting-26.firebaseapp.com",
  databaseURL:       "https://frc-scouting-26-default-rtdb.firebaseio.com",
  projectId:         "frc-scouting-26",
  storageBucket:     "frc-scouting-26.firebasestorage.app",
  messagingSenderId: "275321456262",
  appId:             "1:275321456262:web:1c15b9cbcfa64d1ddd7307"
};

// TODO: If you ever hit the free Firebase read quota, consider switching
//       to Firestore instead of Realtime Database (better querying + higher limits).
//       Migration guide: https://firebase.google.com/docs/firestore/firestore-vs-rtdb
