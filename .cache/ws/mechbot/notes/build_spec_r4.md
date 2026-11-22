# Build R4: binding spec (panel R4 chair, 19:30 UTC Sat). Supersedes the R4 parts of panel_r4_schedule.md 3.4 / 9.2.

Inputs: panel_r4_past_events.md (PE), panel_r4_gameplay.md (GP), panel_r4_schedule.md (SC), build_spec_r3a2.md,
submissions.md (V1 4.98, V2 4.60, V3 4.83, **V4 5.15**; V4 = V1 + `retreat: 'd3'`), bot/lib/{tactics,brain,params}.js read-only.

State: BEHIND (best 5.15, cut about 5.4 now, projected 5.80-5.92 at the close). Salts cannot close a 0.6 gap; the mean
must rise. R4 adds the owner's rule and the two largest gaps the code shows (16% of life roaming with no target; a
laser held in 1 of 6 simulator matches). Every item is a preset; with every new preset at its first (old) value R4
reproduces R3a2 byte for byte on the 14 identity streams, for both the V1 and the V4 SELECT.

Leader for R4 arms until the factorial fit: **V4 presets** (V1 + `retreat: 'd3'`). If V4's three-draw mean after the
19:44 window falls below 4.98, use V1's presets instead.

---

## 1. What R4 contains

Two stages on one code line. R4a is pushed first so the owner's rule is drawn in the 20:44 window; R4b adds the rest
without touching R4a's behaviour (R4b with its new presets off = R4a, identity streams).

| Stage | Item | Preset (old value first) | Type | Gated by | Source, estimate |
|---|---|---|---|---|---|
| R4a | **H hunt50** (seek + 50% burst gate + commit + short retreat pulse) | `hunt: off / h50 / lite` | S | 20:45 | owner; PE 9.2 + GP 1; 0 to +0.3, contested |
| R4a | S seek only (hunt50's seek, no gate) | `seek: off / on` | S | 20:45 | GP I2; +0.05 to +0.25 |
| R4b | L laser in contact (130 m grab, laser-first opening) | `laserGrab: std / wide` | S | 21:40 | GP I1; +0.1 to +0.3 [T x3] |
| R4b | I isolate leg only within 12 m | `isolate: any / near` | S | 21:40 | GP I3; +0.05 to +0.2 |
| R4b | A aim dwell for P1's aim clause | `engAim: cone / dwell` | S | 21:40 | GP R3; 0 to +0.15 |
| R4b | FFA laser band far | `laserRangeFfa: same / far` | FFA only | 21:40 | GP R7; final only |
| R4b | FFA hold full charge to 1.9 s | `laserForceFfa: off / on` | FFA only | 21:40 | GP I10; final only |
| R4b | FFA opening guard after the first foreign death | `ffaOpenGuard: off / on` | pre-latch | 21:40 | GP R8, SC 3.1; final safety |
| R4b | steal only in FFA (for the A1 arm) | `R1: on / off / ffa` | S | 21:40 | SC 2.4; 0 |
| R4b stretch | overkill guard (only if code-complete by 21:15, else it waits) | `overkill: off / on` | S | 21:40 | PE 4; 0 to +0.1 |

Defaults in the R4 SELECT: every new preset at its old value, except `laserRangeFfa: 'far'` and `laserForceFfa: 'on'`
once the identity streams show them inert in practice (they act only while `B.env === 'FFA'`, like Z5-Z10).
`ffaOpenGuard` stays `off` in practice variants (it can act in practice when a house bot dies to something other than
us) and is switched on in the final code F at 12:30 Sun; Port-F checks it (SC 6).

Firewall for every type S item here: acts only while `B.env !== 'FFA'` **and** `B.foreignDeaths < h50ForeignMax` (1).
In a final this means it acts only before the first death we did not cause. Engineers: count local squad matches with
a foreign death before the latch (seeds 1-20); if more than 5% have one, set `h50ForeignMax` to 2 and note it.

---

## 2. H: hunt50 (R4a). The owner's rule, built as one direct search

One sentence: walk to the nearest house bot; open fire on a mech that is not already attacking us only when the damage
we can put out in the next 3 s is at least 50% of its **current** hp and we keep 30% hp through the exchange; once
committed, finish it; then, if others have a line on us, retreat to near cover for at most 4 s and come back loaded.

Current hp, not full hp: against a fresh hunter one laser cycle deals 38-66% (PE 9.1), the gun alone 25-35%. Read on
full hp the rule would make us passive, which measured -0.34 to -0.5. Return fire and the D0 hostile answer are never
blocked.

### 2.1 PARAMS (all new; `hunt: 'off'` sets `hunt50: false, h50Pulse: false`)
`hunt: { off: { hunt50: false, h50Pulse: false }, h50: { hunt50: true, h50Pulse: true }, lite: { hunt50: true, h50Pulse: false } }`
`seek: { off: { seekOn: false }, on: { seekOn: true } }` (hunt50 implies the seek)

| Name | Value | Meaning |
|---|---|---|
| h50Frac | 0.5 | open fire when burst3 >= 0.5 x target hp (current, cube bonus included) |
| h50WindowS | 3.0 | burst window |
| h50LaserReadyS | 1.5 | the beam counts when cooldown + remaining charge <= 1.5 s |
| h50LightR | 60 | lightning counts within 60 m: min(10, floor((energy - 15) / 3)) zaps x 60 x 0.8 |
| h50EngR | 200 | gate tested on listed mechs within 200 m with a line now or < 1 s ago |
| h50MinHpf | 0.35 | no new commit below 35% hp |
| h50Reserve | 0.30 | commit only if me.hp - IN x TTK >= 0.30 x me.maxHp (or finishable within 1.5 s) |
| h50Leave | 0.30 | leave the commit when burst3 < 0.30 x target hp and the laser is cooling > h50LeaveCoolS |
| h50LeaveCoolS / h50NoDmgS | 1.0 / 3.0 | ... or 3 s without our damage on it |
| h50SafeHpf / h50Safe3Hpf / h50Safe3N | 0.25 / 0.40 / 3 | while committed, LOSING only under 25% hp, or under 40% with >= 3 lines on us |
| h50PulseMax | 4.0 | longest retreat pulse (under the 5 s regen trigger: a longer one gifts hp to damaged hunters) |
| h50CoverS | 1.5 | pulse only to a found hide cell with B.tCover <= 1.5 s (about 13 m at walk speed) |
| h50MagMin | 8 | pulse ends when the gun holds >= 8 rounds (or no gun) and the laser cooldown <= 0.3 s (or no laser) |
| h50CubeR / h50CubeWaitS | 40 / 3.0 | after a kill, take its cubes within 40 m first if <= 1 other line on us (wait at most 3 s) |
| h50ForeignMax | 1 | firewall (section 1) |
| h50PreyR / h50PreyMemS | 400 / 12 | prey = non-NPC tracks hp > 0, conf >= 0.25, seen within 12 s, within 400 m, reachable |
| h50Hp / h50Hostile / h50Laser / h50CrowdR / h50Crowd | 0.05 / 80 / 60 / 60 / 100 | prey cost terms (2.4) |
| h50PreyHys | 30 | keep the current prey unless a new one is 30 m cheaper |
| h50ArriveLaser / h50ArriveGun | 125 / 90 | stop seeking at this distance (fight legs take over) |
| h50SeekHpf / h50SeekFromS | 0.6 / 20 | seek only at >= 60% hp and from t >= 20 s |
| h50SoundS / h50SoundMid / h50SoundFar | 3 / 120 / 200 | no prey: walk this far along the loudest gun / laser / lightning sector heard in 3 s |
| h50LastEnemyS | 30 | then B.lastEnemy if younger than 30 s and farther than 45 m |
| h50RingFrac / h50RingStepDeg / h50ArriveR | 0.41 / 30 / 45 | then the house parking ring 0.41 x nr around next_center, 30 deg on per arrival |
| h50SeekBoostE / h50SeekBoostD | 90 / 150 | boost while seeking only at energy >= 90 and goal > 150 m |

### 2.2 burst3, TTK, IN (new lib/hunt.js; closed form, at most 6 candidates, well under 0.1 ms)
```
burst3(tr): k = me.dmgMult; rm = tr.rearOn ? me.rearMult : 1
  gun   (dist <= 0.97 x range, and flight <= 0.55 s or tr steady 0.6 s):
        shots = reload > 0 ? floor(max(0, 3 - reload) / cd) : min(ammo, 1 + floor(3 / cd)); shots = min(shots, mag)
        d += shots x damage x k x B.gunStat.q(dist) x rm
  laser (dist <= 0.93 x range, cooldown + max(0, full - charge) <= 1.5): d += damage x k x rm x (tr.hasMortar ? 1 + cookoff : 1)
  light (dist <= 60): d += min(10, floor((energy - 15) / 3)) x 60 x k x rm x 0.8
TTK(tr): step 0.05 s to 8 s; gun every cd from the magazine (wait the reload first), reload 2.4 s when empty; first beam at
  cooldown + max(0, full - charge) + latency, then every cooldown + full; TTK = first t with cumulative >= tr.hp (else 99)
IN: sum over non-NPC mechs with a line on us in the last 1 s: tr.a if it has >= dmgMinSamples, else the D1 prior
  98 x hit(dist) (hit: < 75 m 1.0, 75-100 0.86, 100-126 0.57, 126-151 0.32, beyond 0.2) + 117 if it carries a laser
```
burst3 must reproduce GP table 1.3 within 1% (gun 0 cubes: 513 / 486 / 405 at 30 / 60 / 100 m; gun + laser: 828 / 720).

### 2.3 Gate, commit, retreat (SQUAD posture, firewall on, nr > zoneLateR, aliveN > 3, target not an NPC)
- `hunt.pre()` in the brain's assess stage, **before** `selectTarget`: prey set every 1 s; for each listed mech within
  h50EngR with a line: `tr.h50Ok = !opening && me.hpf >= h50MinHpf && burst3 >= h50Frac x tr.hp && reserveOk(tr)`.
  `opening` is the existing guard (20 s under fightEarly while no foreign death).
- `selectTarget`, non-NPC `ok` expression under hunt50: `tr.hostile || (tr === B.target && t - tr.lastDmgOutT < 5) ||
  tr === B.h50.commit || tr.h50Ok`, with the FFA clauses untouched. The band clause, `unengaged` and `engaged()` are off
  for non-hostile mechs under hunt50. The ranking stays the leader's focus cost (P3 'add': -200 current, -200
  finishable or <= 30%), so the search picks the quickest committable kill without a second ranking.
- `hunt.post()` after `selectTarget`: commit = the picked target if it passed the gate, is hostile, or is already
  committed. Leave the commit when it dies, or burst3 < h50Leave x hp with the laser cooling > 1 s, or 3 s without our
  damage on it.
- `losing()`, first line after the FFA line: while committed, return
  `me.hpf < h50SafeHpf || (linesOnUs >= h50Safe3N && me.hpf < h50Safe3Hpf)` (both the d3 and the pulse paths;
  `lastStand` / doomed unchanged). linesOnUs = non-NPC mechs with a line on us in the last 1 s within 160 m.
- **Then retreat (`h50Pulse`, the 'h50' option only):** start a pulse (a) right after our kill with >= 1 other line on
  us, or (b) when our burst is spent (gun reloading or empty, and no laser or laser not ready within 1 s) with >= 2 lines
  on us. After a kill take its cubes first (h50CubeR, h50CubeWaitS). The pulse runs only if `B.hide.state === 'found'`
  and `B.tCover <= h50CoverS`; with no such cell, fight on (P4's rule). `decideMode`: while `t < B.h50.pulseUntil` and
  not zoneUrgent / doomed, want DISENGAGE (existing retreatLegs; fire, charge and the D0 answer stay on, no holdFire).
  The pulse ends at the h50MagMin condition, at h50PulseMax, or when a finishable target has a line.
- HEAL and the leader's LOSING thresholds (d3 in V4) are otherwise unchanged.

### 2.4 Seek (HOLD mode only; used by hunt50 and by `seek: 'on'`)
`brain.holdLegs`: `if ((P.hunt50 || P.seekOn) && firewall && hunt.seekLegs()) return` before `stance.idleLegs()`.
Seek runs at me.hpf >= 0.6 and t >= 20 s, with no target, no drop task and no loot (LOOT keeps its priority).
1. Prey known: cost = pathEst + 0.05 x hp - 80 [D0 hostile] + 60 [carries a laser] + 100 [another mech within 60 m of
   it]; reachable = same nav component, not on a roof, zoneSlack(arrival + 10 s) >= 3. Goal = its dead-reckoned
   position; arrive 125 m with a laser, 90 m gun only; the torso looks at it (`B.lookHint`).
2. No prey: the loudest gun / laser / lightning sector of B.heard in the last 3 s, 120 m ('mid') or 200 m ('far')
   along it, pulled back until zoneSlack >= 5.
3. Else B.lastEnemy younger than 30 s and farther than 45 m. 4. Else the 0.41 x nr ring around next_center, nearest
   point first, 30 deg on after each arrival within 45 m.
Walk; boost only at energy >= 90 and goal > 150 m. One A* per decision at most (moveTo's own plan).
`seek: 'on'` alone = this seek with the R3a2 candidate rules unchanged (no gate, no commit, no pulse).

### 2.5 Tests (new group `h50` in tools/test_brain.js; synthetic observations)
T1 burst3 table (GP 1.3, within 1%). T2 prey remembered 300 m, 8 s ago -> HOLD, legKind 'hunt', goal at it. T3 gun
sound 'mid' at 1.0 rad 2 s ago, nothing listed -> goal 120 m along 1.0 rad. T4 nothing known -> ring point, next goal 30
deg on after arrival. T5 prey 150 / 170 m with 1400 / 700 hp -> the 700 hp one; 150 / 250 m -> the nearer. T6 gun only,
fresh 1400 hp non-hostile at 80 m with a line -> no first shot. T7 the same mech fires at us -> answered at once. T8
reserve: two lines totalling 400 dps, our hp 600, TTK 3 s -> no commit. T9 committed at 45% hp with 2 lines -> FIGHT
(d3 would retreat); at 24% -> DISENGAGE. T10 kill with one other line, hide cell at tCover 1.0 s -> DISENGAGE, ends at
laser ready + 8 rounds, never after 4.0 s; tCover 2.5 s -> no pulse. T11 'lite' -> never a pulse. T12 firewall: env
FFA, or foreignDeaths 1 -> decisions identical to `hunt: 'off'`. T13 late zone / 3 alive -> identical to off. T14
identity: `hunt: 'off'`, `seek: 'off'` on the 14 streams, V1 and V4 SELECT -> byte-identical. T15 FFA streams + sim
411-414 with `hunt: 'h50'` -> byte-identical to off. T16 sim smoke squad seeds 1-10 (behaviour only): 0 errors, 0
stuck, 0 zone deaths, 0 false latches; HOLD-roam share below V4's; mean kill-to-next-damage gap below V1's 5.8 s. T17
one core: worst decision <= V4 + 3 ms, <= 1 A* per decision.

---

## 3. R4b items (each with its own test; identity with the preset off is required for every one)

- **L `laserGrab: 'wide'`** (GP I1). SQUAD posture, no laser held. `economy.chooseGrab`: laser reach 60 -> 130 m path when
  hp >= 50%, at most one mech has a line on us (`B.nLos <= 1`) and the target is not finishable. `selectTarget`: while no
  laser is held, t < 90 s and a wanted laser pickup is known within 200 m path, the P1 `engaged()` clause (and under
  hunt50 the gate) is false for non-hostile mechs. Test: 1v1 at 110 m, laser 90 m away -> grab in one decision; two
  lines -> no grab; a hostile mech in the laser-first window -> answered; laser held -> identical to std.
- **I `isolate: 'near'`** (GP I3). `brain.fightLegs` isolate branch (`B.A - tgt.a > 20 && B.nLos >= 2`): take the posEval
  cell only if it is within `isoNear` 12 m and its `xOther === 0`; otherwise stay in stand-off. Test: best cell at 25 m ->
  legKind 'standoff'; at 8 m with xOther 0 -> 'isolate'.
- **A `engAim: 'dwell'`** (GP R3). In `engaged()` the aim clause needs `tr.aimN >= 3` consecutive decisions (extend the
  K2 counter from 160 to 190 m) and the closing clause 1 s of sustained closing. Drawn together with the existing
  `aimDwell: 'on'` as one arm. Test: a torso sweeping +-46 deg past us at 150 m for 10 s -> never a candidate; aim held 3
  decisions -> candidate.
- **FFA trio.** `laserRangeFfa: 'far'`: in the FFA posture use the far band (125-185 m) whatever `laserRange` says.
  `laserForceFfa: 'on'`: `laserForceS` 1.9 in the FFA posture only (never later than 1.95 s). `ffaOpenGuard: 'on'`: while
  `B.foreignDeaths >= 1` and not yet latched, use the openFarm answer rule (answer only mechs that hit us within 100 m).
  Tests: unit checks of each; FFA streams change only where intended; squad identity with the first two on.
- **`R1: 'ffa'`**: stealing on in the FFA posture only. Test: SQUAD steal targets never set; FFA unchanged.
- **Stretch, `overkill: 'on'`** (PE 4), only if code-complete by 21:15: if the gun's next two rounds at q(d) kill the
  target, do not release a full beam on it; hold (to 1.9 s) for the next candidate within 0.25 rad. The existing lethal
  partial release stays.

## 4. Build schedule and release gate

| UTC | Engineers |
|---|---|
| 19:35-20:15 | R4a code: lib/hunt.js, hooks in brain (pre/post, holdLegs), tactics (ok expression, losing, decideMode), params |
| 20:15-20:40 | T1-T17, identity 14/14 (V1 and V4 SELECT), sim smoke 10 seeds, package.sh PASS, release_gate GO (1-CPU), param_diff: only the intended keys; push H s0, HL s0 (and S s0) commits, log rows first |
| 20:45-21:30 | R4b items, one at a time, each with its test and the identity run |
| 21:30-21:40 | full gate on R4b; push the 21:44 sheet |

If R4a is not gated by 20:50, slots 3 and 4 of the 20:44 window take F06 and F07, and H / HL open the 21:44 window.
A failed identity run blocks the push of that stage; never push an R4 arm whose preset-off build differs from R3a2.
P0 (the official port check) is not run now: the local identity streams carry the pooling; the one official port that
matters is Port-F at 12:44 Sun (SC 3.6, 6). Run P0 only if a window has a spare slot.

---

## 5. Mech Royale: the next two windows (8 slots; repo URL + 40-character hash every time)

| Slot | Window | Code | SELECT change vs V1 | Salt | Role |
|---|---|---|---|---|---|
| M-1944-1 | 19:44 | C3 | `retreat: 'd3'` (V4) | 1 | leader salt, `a749e61c5bc4788830c35d8bcc2e6b1e53b6e95d` |
| M-1944-2 | 19:44 | C3 | `retreat: 'd3'` (V4) | 2 | leader salt, `5b23b8f608d24b59e43ca1640ebf532d248173e8` |
| M-1944-3 | 19:44 | C3 | F02: `farmHp: '90', boost: 'off', upg: 'std'` | 0 | factorial (fallback V4 s3 `99821c0f...` if not gated by 19:52) |
| M-1944-4 | 19:44 | C3 | F03: `focus: 'mult', retreat: 'd3', upg: 'std'` | 0 | factorial (fallback V4 s4 `06af5e8a...`) |
| M-2044-1 | 20:44 | C3 | F04: `focus: 'mult', farmHp: '90', retreat: 'd3', boost: 'off'` | 0 | factorial |
| M-2044-2 | 20:44 | C3 | F05: `laserEcon: 'off', laserRange: 'far', retreat: 'd3', boost: 'off'` | 0 | factorial |
| M-2044-3 | 20:44 | C4 (R4a) | leader + `hunt: 'h50'` (= `retreat: 'd3', hunt: 'h50'`) | 0 | **H: hunt50, the owner's rule, its own variant** |
| M-2044-4 | 20:44 | C4 (R4a) | leader + `hunt: 'lite'` | 0 | HL: hunt50 without the retreat pulse |

Fallback for M-2044-3 / -4 if R4a is late: F06, F07 (SC 3.1 table); H and HL move to the first two 21:44 slots.

Decisions at 20:40 and 21:40 (SC 3.2, BEHIND bar c = -0.05 for the owner's item and for the group screens):
- Leader = V4 presets; its mean pools V4, s1, s2. If a factorial cell scores high, it is a ticket, not a leader.
- H, HL (one draw each, against the leader's mean): <= -0.25 reject; otherwise a second draw in 21:44; after two draws
  adopt at d >= -0.05, a third draw in the grey zone (-0.15 to -0.05).
- If both H and HL pass the screen, the 21:44 window draws both again; if one passes, it gets s1 and s2 in 21:44-22:44.

From 21:44 (outside this list, for planning): every window = 2 factorial runs (F06-F16 in order, finished by the 02:44
window; full fit then gives L1) + 2 R4 arm draws in this queue: H/HL second draws, L (`laserGrab: 'wide'`), S
(`seek: 'on'`), I (`isolate: 'near'`), A (`engAim: 'dwell', aimDwell: 'on'`), A1 (`R1: 'ffa'`), overkill if built;
one leader salt per window once the leader has fewer than 6 draws. Adopted arms carry over onto L1 as presets. No
type B fillers while BEHIND. Freezes as SC 5: SQUAD code 09:00, presets 11:00, FFA code 12:30, last submission 15:15.

## 6. Shopping Sessions (2 slots per hour, same repo URL, hashes from the neutral branch only)
- **First window (19:44 or as soon as the neutral branch is pushed):** S1 = the milestone-1 build (correct: fixtures 36/36,
  dev MATCH, 15 differential seeds, 32 fuzz seeds, clean `--locked` build). S2 by S1's result: build rejected -> the
  Dockerfile fix; dev check failed -> fix + Gate C; hidden practice wrong -> stop speed work, hunt the cause locally,
  resubmit only a found cause; correct -> milestone 2 if it passed Gate C (SC 7.1), else a re-time of the milestone-1 hash.
- **Every later window:** slot A = the newest code variant that passed Gate C (engineers' order: person-name lookups in
  dedup, then sessions and parsing, then parallel links); slot B = a knob of the incumbent (threads, chunk size,
  allocator) or a re-time of the incumbent. Never two untested logic changes in one build.
- **Incumbent rule:** a correct variant replaces it at <= 0.85 x its time; 0.85-1.00 -> one more draw of each, replace
  at a mean ratio <= 0.93.
- **Freezes:** correctness code Sun 09:00, everything Sun 12:00; 12:00-15:15 re-times of the candidate (2-4) and the
  runner-up (1-2). Final pick: fastest mean over >= 2 correct runs among builds that passed Gate P (60M run, exit 0,
  peak memory <= 16 GB, 60M/20M ratio <= 3.5), never the luckiest single time; pick explicitly by 15:40.
- Never an empty hash field (it scores main, the Mech bot); never a Mech hash on the Shopping page or the reverse.

## 7. What waits (and what unlocks it)
- hunt50 extensions, only after H or HL is adopted: GP's cover / peek cycle (`h50Cover`; cover-first bundles measured
  -0.6 to -0.94), the approach from behind the torso, the 60 m crate / drone limit while hunting, I8 kill-drop weapons
  (pairs with L), the second-line trigger variants ('line' measured -0.60 as A06; 'hit').
- Pulse-retreat fixes I4 (`plCoverR` 25) and R2 (`plCount: 'line'`): only if the factorial's D effect favours the pulse.
- I5 time-to-kill retreat, I6 rear pick in SQUAD, I7 last gasp: night block (23:00-06:00) if slots and engineers allow.
- I9 upgrade order for kills: after the factorial's F (upgrade) effect is known.
- PE 3 laser-cycle peek, PE 5 danger-weighted position value: night block; both carry passivity risk.
- PE 7 FFA "never the nearest mech": FFA code only, before 12:30, only with a local FFA league check.
- Supply-drop runs off in SQUAD, finish20: no evidence worth a slot (0-0.2% of time; giddy's walk-in was not kept).
- aimCal and `R3: 'gun'` fillers (type B): only in the AHEAD state.
- P0 port check: only with a spare slot (section 4).
