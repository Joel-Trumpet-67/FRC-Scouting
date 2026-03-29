// ============================================================
// labels.js — Shared pre-comp label maps
// ============================================================
//
//  Loaded by both precomp.html and dashboard.html so the same
//  human-readable strings are used in the form summary AND the
//  dashboard pre-comp tab — no duplication, one place to edit.
//
//  TODO: update LABEL_PAL and LABEL_PEC each season when the
//        game changes (auto modes + endgame levels change yearly).
//        The other maps (source, drive, consistency, tier) are
//        game-independent and rarely need updating.
//
// ============================================================

// Where did the scout get this info from?
var LABEL_SRC = { pit:'Pit Visit', vid:'Reveal Video', past:'Past Matches', multi:'Multiple Sources' };

// Robot drivetrain type
var LABEL_DRV = { swerve:'Swerve', tank:'Tank', mec:'Mecanum', other:'Other' };

// TODO: update LABEL_PAL each season — what auto modes does the game have?
var LABEL_PAL = { none:'None', basic:'Basic (L1)', scores:'Scores pieces', full:'Score + Climb' };

// How consistent is their autonomous?
var LABEL_PAC = { unrel:'Unreliable', incon:'Inconsistent', rel:'Reliable' };

// TODO: update LABEL_PEC each season — what endgame levels does the game have?
var LABEL_PEC = { none:'None', l1:'Level 1', l2:'Level 2', l3:'Level 3' };

// How reliable is their climb?
var LABEL_PER = { unrel:'Unreliable', incon:'Inconsistent', rel:'Reliable' };

// Overall robot strength tier
var LABEL_POT = { weak:'Weak', avg:'Average', strong:'Strong', elite:'Elite' };
