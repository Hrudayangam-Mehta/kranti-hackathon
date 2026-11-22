# Build R6: binding spec (panel R6 chair, 21:05 UTC Sat). Adds to build_spec_r5.md. Where this file is silent, R5 holds.

Inputs: panel_r6_io.md (IO), panel_r6_rewards.md (RW), panel_r6_robustness.md (RB), build_spec_r5.md (R5),
owner_requests_r6.md (OR), submissions.md, kit/protocol.md. The chair also read variants/V4/bot (read only) and checked
both patches against the current C4 `bot/` without editing it (dry runs only).
Tags: [M] official result, [T] a 6+ bot's choice, [S] our simulator (behaviour only; it has had the wrong sign six times),
[P] protocol / stream, [A] arithmetic or model, [N] no evidence.

## 0. State and the chair's decisions

- Official results: V4 5.15, V4 salt 1 4.69, V4 salt 2 5.06. Leader mean m = 4.97 over 3 draws (sd 0.24).
  Board: top 6.31, cut about 5.4 and rising. Submissions close Sun 16:00 UTC; last safe slot 15:15. State: BEHIND.
- The 20:44 arms (K0, H, S, HL) were pushed at 20:40; their scores are not in yet. R5a (FIN, ISO, LC, ESC) is being
  built and checked for the 21:44 window.
- Decisions:
  1. **No R6 item earns a solo draw on its gain.** The three panels together are worth about +0.05..+0.10 in practice,
     against an sd of 0.24. The owner's items (OR 1, 2) get slots because the owner asked for them, not for their EV.
  2. **"Every build" set** (section 1): RB fixes 1-6, plus IO0, IO7, IO8 and IO13. On this map they leave V4's actions
     identical. They pay only if the final's map folder, zone schedule or balance differ. That is a live risk:
     protocol.md says "`config` is the complete rule set ... balance changes between matches".
  3. **Small physics items ride along.** These are IO1-IO4 (`io: 'all'`), and later IO6, IO9, IO10 and IO11.
     - Each is coded at its old value and switched on in the STACK arm and in every leader after it.
     - None is ever drawn alone: +0.005..+0.02 cannot be seen at sd 0.24.
     - They are dropped only if the arm carrying them reads d <= -0.25.
  4. **C5 (R5a) is not touched**, because its check runs 21:10-21:35. The first R6 code enters C6 (R5b).
  5. **Owner request 6 (dynamic risk factor) was not covered by this panel.** Nothing here implements it (section 6).

---

## 1. Every build at once (V4's actions identical on this map)

| ID | What | Code | Enters | Item test |
|---|---|---|---|---|
| RB1 | Map loader: tries the folder of each `hello.map.files` world.json, then `v2/`, then `dir`, then any sub-folder. Today a `v3/` arena loads **blind** and still passes check.py (sim: -0.62 +- 0.62) | tools/panel_r6/robustness_r6.patch (world.js, bot.js) | C6 | check.py `maps/v3dir` gives world=true nav=true and PASS; `maps/base` PASS |
| RB2 | `anchorToConfig`: `farmStopT`, `scanLateT`, `ffaLatchT`, `openFarmT`, `ffaQuietS` x (zone total / 415); `fpStartT` / `ffaFinalT` / `fpShootT` from the last phase | patch (brain.js) + A1, A2 below | C6 | `maps/anchors.mjs`: default exactly 210/240/200/75/90/375/390/405; zt070 147/168/140/52.5/63/262.5/273/283.5 |
| RB3 | `zoneLateR` / `scanLateR` = radii of phases L-2 / L-3 (this also re-anchors the R5 firewall) | patch | C6 | default 70/140; zs070 49/98; zs130 91/182 |
| RB4 | `hopPlanCfg`: when the campus limits (40 m climb, 45 m hop) find no exit, plan again with the climb limit from the config (59 m today, cap 80; hop 60) | patch (mover.js) + A3 | C6 | A3 count gate; pockets survey |
| RB5 | `magSize`, `magReloadS`, the laser / lightning / mortar threat priors and `mortarMaxR` read from the config | patch (brain, tactics, ffa) | C6 | default values reproduced to 1e-3 |
| RB6 | Start-up warm-up on this map's largest pocket (was the fixed point (-307,106)) | patch (brain.js) | C6 | decisions unchanged |
| IO0 | Tick, decision period, `readyCd`, laser hold 0.11, lightning +tick, mover dt, senses dt, front arc and enemy magazine read from `config.match.tick_hz`, `decide_every`, `mech.front_arc_deg`, `weapons.gun.*`; folded into `anchorToConfig` | new | C7 | T-IO0 (tick_hz 30, decide_every 3); on the default config every literal is reproduced exactly |
| IO7 | An exception during a laser charge keeps `fire[laser]` held and the previous aim | new | C7 | T-IO7 |
| IO8 | Merge the `events` / `sounds` / `beams` of skipped observations (sound age +0.1 per skipped decision). A lost `kill` would otherwise count toward the FFA latch | new | C7 | T-IO8. The streams have no backlog, so they stay identical |
| IO13 | Regen clock: `regenAt`, `fullAt` = 5 s + deficit / 45. Only `heal: need / full` read it | new | C7 | T-IO13 |

**Chair's amendments to the RB patch** (found by checking it against params.js):

- **A1 (bug for later presets).** `anchorToConfig` overwrites the absolute keys (`fpStartT`, `ffaFinalT`, `fpShootT`,
  `zoneLateR`, `scanLateR`, `magSize`, `magReloadS`, `mortarMaxR`) even when a SELECT preset set them. Its `has()`
  checks only the raw overrides object, and presets arrive as `overrides.select`.
  - Today no preset sets an anchored key (grep of `bot/lib/params.js`), so identity holds.
  - But a later preset, including the risk factor, would be reset without warning.
  - Fix: also skip a key when `P[key] !== PARAMS[key]` after `resolveParams`.
  - Test: a synthetic preset with `zoneLateR: 90` keeps 90.
- **A2.** Every new match-clock constant joins the scaled list. R5b LG's "t < 90 s" becomes the param `lgUntilT: 90`.
  - `heal` and `zoneEsc` read only the live `obs.zone` and the config, so they add no clock.
  - `openingS`, `earlyOpenS` and `h50SeekFromS` stay as they are (first hold, low risk).
- **A3.** RB4's identity is measured, not proven: 24 squad + 12 FFA sim matches and 300 stream decisions. The fallback
  can fire wherever the campus limits return null, not only in pockets. So it gets a count gate: instrument the number
  of null results from the old limits over sim squad 1-40 and FFA 411-414.
  - Count 0: RB4 goes into every build.
  - Otherwise: RB4 ships behind `pocketCfg: off -> on` (old = off), draw-free, final build only.
- **Not in the set:**
  - RB7 (3 m nav grid above 1.5 M cells): an untested path. It needs test_world on a 3 m grid first (R6b, optional).
  - RB8 (chirality from `B.rng()`): it changes actions and averages 0, so it is dropped.

**Gate for the set** (on top of R5 section 3.3, run at C6 and again at C7):
- the 14 R3a2 streams byte-identical to the previous code under the V4 SELECT and the K0 SELECT;
- the FFA-inert set (kit + check2a ffa_s1-4 in auto and forced FFA, sim FFA 411-414) identical;
- check.py PASS on maps `base`, `v3dir`, `zt070`, `rot90` and `wide` under the 1-CPU quota, worst answer <= 15 ms;
- sim: 24 squad + 12 FFA matches identical to the previous code, one run at a time, fuse 0.

Ship (RB): `patch -p1` on `bot/` (dry run on C4: PASS, offsets only), then test_world, test_brain, package.sh,
`maps/run_check.sh base` and `v3dir` on dist/bot.js.

---

## 2. Presets (the old value reproduces V4), ranked by expected practice gain

| Rank | ID | Preset (old -> new) | Gain | Evidence | Test | Code | Slot |
|---|---|---|---|---|---|---|---|
| 1 | IO-A | `io: 'v4' -> 'all'`: IO1 gun lead from tick/2; IO2 beam latency 0.05 s (lead, origin and release gate); IO3 mortar / lightning gate on the real leave tick; IO4 hold the trigger when the reload ends inside the decision | +0.02 (-0.03..+0.06) | [P] stream ages; T-IO1 PASS; [S] reload gap 2.476 -> 2.416 s (113 of 120) | T-IO1..T-IO4; identity at `'v4'` | C6: **tools/panel_r6/io_r6_c4.patch** | ride-along: STACK 23:44, then every leader |
| 2 | PR2 | `precharge: off -> line -> probe`. `probe` = R5 PRE plus, once per match, one held decision during the cooldown with no mech in range. If charge builds, hold from cooldown <= 0.80 (cycle about 1.75 s) | +0.02 on top of PRE's +0.03 (10%: about +0.2) | [P] silent; [A]; public laser bots show 2.4 s cycles | T-PR2 + R5 PRE tests | R6b (with R5c PRE) | PRE's night slot, drawn as `probe` |
| 3 | HN | `heal: 'd3' -> 'need'`: target H\* = clamp(1.25 x A_next x TTK_next, 70%, 100%), so 100% gun-only and 70% with a laser; computed from config and this match | +0.03 (-0.10..+0.15) | [A] | RW section 3 T1-T7 | R6a | 02:44 if HF reads d > -0.25 |
| 4 | HF | `heal: 'd3' -> 'full'`: the owner's rule. No voluntary fight below 100% (enter < 95%); between fights only | 0 (-0.15..+0.15) | [S] 25/40 identical, +0.07 +- 0.19; [M] heal breaks 0.00 +- 0.28 pooled | RW section 3 T1-T7 | R6a | **own variant, 01:44** |
| 5 | IO6 | `laserDump: off -> aim`: a forced release goes to a clear mech, then a crate | +0.01 | [S] 5-8% of our beams hit nothing | T-IO6 | R6b | ride-along |
| 6 | IO11 | `beamEta: off -> on`: hide only if cover is reachable by the beam's ETA (0.75 s after the charge is first seen); else turn the shooter into the front arc | +0.01 | [P] house beam 15 ticks after the charge shows | T-IO11 | R6b | ride-along |
| 7 | IO10 | `npcDodge: off -> on` (drone bullets) | +0.005 | [S] 80 hp per match from drones | T-IO10 | R6b | ride-along |
| 8 | IO9 | `takeEarly: off -> on` (empty-slot take one decision early) | ~0 (wins tie races) | [P] closer mech wins same-tick takes | T-IO9 | R6b | ride-along, with LG |
| 9 | ZE | `zoneEsc: off -> edge`: the owner's "take small zone damage instead of a losing fight". Budget min(12, 240 / dps) s, at most min(25% hp, 300), floor 30%, dps <= 60, edge within 30 m away from the threats | 0 (+-0.03) in practice; value is in the final | [A, N]: whether hunters follow us outside is unknown | RW section 4 T1-T6 | R6a | **01:44 on the leader** |
| 10 | UT | `util: off -> tie` (RW section 5 tie-breaker) | 0..+0.10, downside -0.2 | [A] constants from the sim | RW section 5 + R5 gate | R6b, only if two of FIN / ISO / LC / LG are adopted by 01:44 | one draw, never a stack base |
| F | FFA-only | `ffaHeal: '90' -> '100'` (ffaHealExit 1.0); `zoneEscFfa: off -> edge` | final only | [M] S08: quiet variants win FFA rooms | local FFA league >= V4; SQUAD identity | R6a | none; merge before the 12:30 Sun FFA freeze |

**Hard rules for HF / HN / ZE:**
- Firewall as R5: SQUAD posture, `foreignDeaths < 1`, next radius > `zoneLateR`, alive > 3, no wall clock, fixed loop
  counts.
- Heal is a between-fights rule. It never ends a fight (A25 measured -1.10). Hostile lines are answered at once. There
  is a 20 s wait cap, and heal never runs while a near kill is armed. LOSING (d3) stays the only way out of a fight.
- ZE never runs out of a fight, at dps >= 100, in HEAL, while looting or while finishing.

**Dropped:**
- IO12: no effect over 32 sim seeds.
- IO5 / PR3: +0.003, not worth the code.
- RB8.

---

## 3. Code stages

| Stage | Window | Contents | Notes |
|---|---|---|---|
| **R5b (C6)** | 21:35-22:35 | R5 items AVO and LG unchanged, plus the RB patch with A1-A3 and `io_r6_c4.patch` (io default `'v4'`) | About 20 min of work. Its checker adds the section 1 gate. If that gate is not green by 22:15, C6 ships without them (the R5 order wins) and they move to C7 |
| **R6a (C7)** | 23:00-00:40, check 00:40-01:10 | IO0, IO7, IO8, IO13; `heal` (d3 / need / full); `zoneEsc` (off / edge); the FFA-only `ffaHeal` and `zoneEscFfa` | Item metrics: heal raises the HEAL share, and deaths within 3 s of a heal exit are not above V4's; ZE has 0 zone deaths and time outside within its budget |
| **R6b (C8)** | 01:10-03:00, shared with R5c | PRE + PR2 first, then R5c in its order (HAND, KD, GASP), then IO6, IO11, IO10, IO9, UT (if its condition holds), SYNC / ARC last | |

Freezes as R5: SQUAD code 09:00 Sun, FFA 12:30 Sun.

---

## 4. Slot plan: changes against build_spec_r5 section 5 (its rules stay)

| Window | Change |
|---|---|
| 21:44 | Nothing from this panel. RW 2.3 makes the case for LC stronger: LOSING exits to far cover cost -0.25 per match. Slot 8 keeps LC unless the second-best 20:44 arm read d >= +0.25 (the bar rises from +0.15) |
| 22:44 | AVO and LG as in R5. The two leader salts are packaged from C6: they play identically and give the every-build set a free live check |
| 23:44 | STACK arm (R5 rule) + `io: 'all'`. The other slots follow R5 |
| 00:44 | R5 rules (second draws, salts) |
| 01:44 | **HF** `heal: 'full'` on the leader (the owner's own variant); **ZE** `zoneEsc: 'edge'` on the leader (it acts at most about 0.05 times per match, so it is a leader salt plus a harm screen); 2 slots by R5 rules |
| 02:44 | HN if HF read d > -0.25, else a leader salt; PRE `precharge: 'probe'` if R6b has passed its check; 2 slots by R5 rules |
| 03:44 on | R6b ride-alongs join the leader after their gate; UT gets one draw if its condition holds |

**Adoption:**
- The heal family follows the owner's H rule: two draws, mean d >= -0.05.
- ZE stays in the final build unless its draw reads d <= -0.25 or the local FFA league is below V4.
- A ride-along stays unless its carrying arm reads d <= -0.25.

## 5. What this buys

- **Practice:** io +0.02, PRE + PR2 +0.05, heal `need` +0.03, IO6 / IO11 / IO10 +0.025. At best about +0.1, which does
  not close the +0.5 gap. The R5 list (K0, FIN, S, LG, ISO, AVO) has to carry the climb.
- **Final:** the every-build set protects against a blind map (sim -0.62) and against the final-point and HP-race rules
  never running under a changed zone schedule.

## 6. Open

- **Owner request 6 (dynamic risk factor r in [0, 1]) is not in any of the three R6 notes.**
  - Natural inputs: RW's lambda_hp(k) (scarce vs abundant hp, P(2+ lines) by kills) and lambda_t (contested 0.014 vs
    free 0.003 pt/s).
  - Form: `risk: off -> sched`, as monotone, bounded maps of existing thresholds; `off` = V4.
  - Its scaled keys must respect amendment A1.
  - Commission its spec before 23:00 so it can join R6b.
