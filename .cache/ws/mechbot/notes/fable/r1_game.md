# r1_game — game designer / gameplay engineer (Fable panel, round 1, expert 4)

Tags: [M] official score, [S] simulator (behaviour only, ranks nothing), [A] analysis of the code.
Tree read: r7work/ckpt_07_LG/lib (tactics.js, brain.js, stance.js, hunt.js, params.js). Base = the 5.35 build
(KB SELECT + aggr any70f + fb on + loseCover near + lcLowHpf 0.10, salt 1).
Scratch: fable_work/r1_game (rec7d.js = rec7 plus a per-decision history; lib2 = the tree plus the LK change below;
diag.py, cmp.py, out/). Core 2 was shared by about five runs, so my own sample is small and is labelled as such.

## 1. What makes us leave a fight today (5.35 build) [A]
Order in decideMode (tactics.js 448-503): ZONE > doomed (FIGHT) > LOSING (DISENGAGE) > HEAL > FIGHT.

| Gate | Site | Value now | What it does |
|---|---|---|---|
| finishing | losingRaw 402, 409 | finishHpf 0.20, finishThreats 2 | target under 20% and at most 2 mechs on us: never LOSING |
| lose1 | losingRaw 416-419 | lose1Hpf 0.35, lose1Margin 0.10 | 1 mech on us: LOSING under 35% if it is 10 points healthier than us |
| lose2 / lose3 | 414-415 | 0.50 / 0.60 | 2 mechs on us: under 50%; 3 to 5: under 60% |
| lose6 | 413 | 6 | 6 or more on us: LOSING at any hp |
| loseHys, loseMinS | 410, 409, 421 | 0.05, 1.5 s | once LOSING, thresholds +5 points and a 1.5 s minimum stay |
| LC veto | losing 393-396 | lcCoverS 1.5, lcLowHpf 0.10 | LOSING survives only with a found hide cell that is within 1.5 s of travel, or under 10% hp with any found cell. Behind hunt.firewall(): SQUAD, no foreign death, next radius > 70, more than 3 alive |
| doomed / lastStand | decideMode 476, stance 91-93 | lastStandHpf 0.25, lastStandAttackers 2 | under 25% with 2 attackers and no cell within 3 s: FIGHT is forced and the target rule becomes "quickest kill" (tactics 326) |
| HEAL | decideMode 472 | healEnterHp 0.55, healAfterLoseHp 0.9 for 6 s | out of contact 1.5 s: heal under 55%, or under 90% in the 6 s after a LOSING retreat |

"n mechs on us" is B.threats = n1: mechs with a line on us in the last 2 s that aim at us or hurt us.
Two consequences that matter for the owner's idea:
- With LC on, lose1/2/3Hpf no longer decide WHETHER we leave above 10% hp; cover distance does. They only decide
  from which hp a cell within 1.5 s pulls us out. That is why the Opus "oneHit" (0.20/0.25/0.30) touched few matches
  (4 of 36 [S]) and scored 5.29 against 5.31 [M].
- Inside the last-zone radius (next radius <= 70) and at 3 or fewer alive the firewall is false, so LC is off and the
  raw 35/50/60% thresholds are back.

## 2. "Keep fighting until health is down to one hit" against the code
One hit = the largest single hit a house bot has = one laser beam, 315 of 1400 hp = 22.5% (gun bullet 45).
The idea has two halves and the official results split them:
- (a) "do not leave while above one hit": supported. Every step that leaves less has scored higher [M]:
  LC on +0.06, lcLowHpf 0.25 -> 0.15 +0.02, 0.15 -> 0.10 +0.04, cover 1.5 -> 1.0 +0.02, cover 2.0 -0.02, healDoc -0.21.
- (b) "leave when at one hit": not supported. The low-hp clause scored better the lower it went (0.25 < 0.15 < 0.10),
  i.e. the further below one hit. Reason [A]: regeneration needs 5 s untouched and then 45 hp/s, so 10% -> 70% takes
  about 24 s, against 15 hunters with shared vision. A retreat begun at one hit is too late to pay.
  Each of these steps is inside the lottery range (the mathematician's sd is about 0.03 x sqrt(matches touched)), so
  the direction is consistent but no single step is proven.

Cleanest version, params-only, existing key (this is FABLE_PLAN's F2, rebuilt on the 5.35 base):
- **G1 `loseCover: 'never'` = { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }**. Site: losing() line 395, no edit.
  Meaning: inside the firewall we never leave a fight for cover (except when already standing on the cell,
  tCover <= 0); ZONE, HEAL out of contact and lastStand are unchanged. This is the owner's idea with half (b)
  dropped, on evidence. Divergence: about a quarter of matches (9 of 36 on the low15 base, net -1 [S]). T-F2 already
  passes for this value (BUILD_LOG, 24/24).
- The literal version (F1 'oneHit': lcCoverS 0, lcLowHpf 0.23) raises the low-hp clause back to 23%, the direction
  that scored lower twice. I would give it at most one slot, after G1, and only from the pre-G1 base.
- A dynamic "one hit" (compare our hp with the largest hit of the mechs that have a line on us) needs new code in
  losing() and implements half (b) more exactly. I do not recommend it: it is more code for the half the scores reject.

## 3. What the bot does in its last seconds [S, my run: 16 squad seeds on the 5.35 base]
From the last moment at 50% hp or more until death: 9.7 s on average, in which we deal 1450 damage (one mech has
1400) while changing target 2.5 times. At death the current target still has 46% hp and 1.7 enemy mechs are wounded,
with 0.76 of one mech's hp missing between them. Over the earlier 36-seed base, damage dealt was about 1760 per kill.
So the last descent already contains about one kill's worth of damage; it is spread over two or three mechs.
Other measurements: a retreat does not cost fire (damage per second with a target: DISENGAGE 211, ZONE 203,
FIGHT 163); 14 s per match are spent in HOLD with no target; a laser was fired in 16 of 36 matches (207 hits of 216
beams, about a quarter of all damage); with a laser held, 66% of fight time is inside 100 m although the 'far' band
is 125-185 m, because the house bots close on us.

## 4. Up to four further changes (each one SELECT preset, old value = today byte for byte)

**G2 `lowKill: 'veto'` (new key, minimal code) — the target rule while LOSING is vetoed.**
Today, when LC vetoes a retreat we stay but keep the ordinary target rule (nearest, x2 finishable, x1.6 attacker,
x1.3 current). The "quickest kill" rule exists already but only under lastStand (under 25%, 2 attackers, no cell
within 3 s). G2 applies the same existing multiplier whenever LC has vetoed LOSING.
Exact sites (applied and running in fable_work/r1_game/lib2):
- params.js: `lcKill: false, lowKillHpf: 0` in PARAMS; preset
  `lowKill: { off: { lcKill: false, lowKillHpf: 0 }, veto: { lcKill: true }, hp50: { lowKillHpf: 0.5 }, hp35: { lowKillHpf: 0.35 } }`; SELECT `lowKill: 'off'`.
- tactics.js losing(): `B.lcVeto = false` after `let lose = losingRaw(B)`; `B.lcVeto = true` inside the veto branch (line 395).
- tactics.js selectTarget, before the scoring loop:
  `const lk = !ffa && ((P.lcKill === true && B.lcVeto === true) || (P.lowKillHpf > 0 && me.hpf < P.lowKillHpf && !!B.hunt && B.hunt.firewall()))`
  and line 326 becomes `if ((B.lastStand || lk) && !tr.npc) s *= (B.cfg.mech.hp || 1400) / Math.max(50, tr.hp)`.
  Only the 'mult' focus branch is changed (the 5.35 SELECT uses focus 'mult'). keepTargetHpf and the torso veto still apply.
Expected effect: converts part of the 0.76 mech of spread damage into a kill; honest size +0.0 to +0.1.
Counter-evidence: lastStandHpf 0.35 scored 5.25 [M] (lower), but that preset also forces FIGHT and the LAST-STAND
stance; G2 changes the target only. Divergence class: HIGH (measured in section 6: 9 of 12 matches differ; the
veto is active about 6 s per match, 2127 decisions over 36 matches [S]).
Test: T-F2 scene (hp 40%, two mechs on us, cell 30 m away, far mech at 20% hp, near mech at 90%): 'veto' picks the
weak one in SQUAD, identical to 'off' in forced FFA; identity 84/84 with 'off'; counter lkPick > 0 only when selected.

**G3 `lowKill: 'hp50'` — same rule on an hp trigger (under 50%, firewalled).** One alternative value of the same key,
for the case where G1 is kept (after G1 the veto is nearly always on, so G2 and G3 converge). Draw only one of G2 / G3
first; the other only if the first is kept. Divergence class: medium to high. Same test with hp 45% and no LOSING.

**G4 `loseCover: 'c05'` = { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 } (params-only).** The middle step
between the Opus draw (cover 1.0) and G1 (cover 0): a cell 2 to 3 m away still gives a peek, anything farther does
not. Low divergence (cover 0.75 touched 3 of 36 [S]). Draw only if cover 1.0 is not lower than 5.35 and G1 is not
kept. Test: the BUILD_LOG decision table with a cell at 3 m and at 7 m.

**G5 `lcLate: 'on'` (new key, one line) — keep the LC veto inside the last zone.** losing() line 393 would use
`(P.lcLate === true ? B.env !== 'FFA' && B.foreignDeaths < P.h50ForeignMax : B.hunt.firewall())`. Today the raw
35/50/60% retreat returns exactly when the zone is small and no retreat can work. 4 of my first 14 deaths were in
ZONE mode. Gate before any slot: count the decisions it changes over squad 1-36; drop it if under 20.
Final safety: in a free-for-all a foreign death or the FFA latch switches it off; T-F2 must show that.
Divergence class: low. Test: T-F2 with next radius 60, hp 40%, 2 mechs on us, cell 5 m away: fights on in SQUAD, as
'off' in forced FFA.

Not proposed, on evidence: laser band 'mid' and keepTargetHpf (both read in FFA, not final-safe; a band change
re-rolls every laser match); healEnterHp and aggr 60% (F3, F4: negative in the sim and against the engage memo);
laserGrab (5.04 [M]).

## 5. Order I recommend for the Fable slots on the 5.35 base
1. G1 'never' (F2 rebuilt on low10). 2. G5 lcLate, if its count gate passes. 3. G4 'c05' (only if G1 is not kept and
Opus cover 1.0 is not lower). 4. F1 'oneHit' (literal owner version, one slot). 5. G2 lowKill 'veto' (high divergence:
best drawn on the fresh-salt base, or here once the low-divergence tickets are used). 6. Fresh salt of the best.
Keep rule as in FABLE_PLAN (strictly higher). G1 and G2 are independent keys; if both are kept, the combination is
one more build.

## 6. Simulator check of G2 (behaviour only)
Paired with my base on the same seeds (lib2, override lcKill true, 5.35 SELECT, salt 1):
`K n 12 differ 9 up 2 down 1 net 0 lkPick ticks 853 ['1:7->8', '10:2->2', '11:8->8', '12:2->2', '3:3->3', '4:3->3', '5:3->3', '6:1->2', '9:8->6']`
Identity of lib2 with the new key off (one seed only, seed 7; the full 84-recording identity is the engineer's gate):
`id2 n 1 differ 0 up 0 down 0 net 0 lkPick ticks 0 []`
Reading: G2 changes play in most matches it was tried on, so its divergence class is HIGH, not medium: on a base
that sits above its config mean it is close to a full re-roll. That lowers its rank: draw it only after the
low-divergence tickets (G1, G5, G4), or on the fresh-salt base. The sample is far too small to say anything about
its sign. K50 (hp50) and the G1 + G2 combination were queued but not run (core 2 was shared).

## 7. Limits of this memo
One agent, about 25 minutes; my simulator sample is 16 base seeds and the handful of G2 seeds above; the simulator
has never predicted an official sign. G2, G3 and G5 are new code and have not been through the identity harness,
T-F2 or the release gate. No sub-agent was used.
