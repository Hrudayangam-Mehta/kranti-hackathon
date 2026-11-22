# Panel R4: gameplay reviewer (hunt50 spec, ten scenario fixes, R3a2 review)

Written Sat 21 Nov 2026, 18:10-19:10 UTC, by the gameplay reviewer (Opus sub-agent). Read-only on `bot/`, `sim/`;
`intel/` not opened. Inputs: `HANDOFF.md`, `notes/top5_synthesis.md`, `measured_deltas.md`, `build_spec_r3.md`,
`build_spec_r3a2.md`, `checkR3a2.md`, `integration_log.md` (R3a2 part), `mechanics_deep.md`, `intel_synthesis.md`,
`panel_r3_scenarios.md`, `rules_audit.md` (L7-L9), DOCTRINE V4, and `bot/lib/{brain,tactics,firecontrol,mover,economy,
stance,senses,params,scan}.js` at the R3a2 state (tools/r3a2/bot_final.sha256).

New scripts and raw outputs (all read-only on bot/ and sim/): `tools/panel_r4/legshare.js` (time / hp lost / damage
by mode and leg), `laserprobe.js` (laser acquisition), `laserhits.js` (beams, hits, forced releases),
`burst_table.py` (hunt50 gate arithmetic), outputs `out_v1.txt`, `out_v2.txt`, `out_v1pull.txt`, `out_v1force.txt`,
`out_laser.txt`, `out_lh15.txt`, `out_lh19.txt`. `burst_and_draws.py` in that folder is another panel member's file.

Tags: [M] official one-change result, [T] choice of a 6+ bot, [S] our simulator (behaviour only; its within-bot deltas
have had the wrong sign six times), [A] arithmetic from the config, [C] contested, [N] no evidence.
Hooks name the file and function; "line" numbers refer to the R3a2 source.

## 0. Verdicts in brief

1. **hunt50** is specified in section 1 as one preset (`hunt: 'h50'`) on top of the R3a2 code state. It reuses the
   focus cost, burstDamage, hideSearch, posEval, retreatLegs, the HEAL state and the laser pre-charge; it replaces the
   R3a2 acquisition clauses (band, `engaged()`, `unengaged`), `pulseLosing()` and the idle roam in SQUAD. Estimate on
   the real scorer against V1: centre -0.1 (range -0.6 to +0.3). Two of its four ingredients have measured support
   (seek, a hostile-or-finishable gate); two have measured losses at weaker bots (peek-and-duck cover cycles,
   break-off at two lines). Ship it as a draw, plus a "lite" draw with the cover cycle off (centre +0.05).
2. **The biggest waste the code shows is not in the fight; it is around it.** In the simulator V1 holds a laser in
   1 of 6 matches (the laser seek runs only out of contact, and R3a2 is almost never out of contact), spends 16% of
   its life roaming with no target, waits 10-17 s from a kill to its next hit in 7 of 20 kill-to-hit gaps, and loses hp fastest
   while walking to cover or to an "isolate" cell (72-73 hp/s against 42 hp/s in a plain stand-off).
3. **R3a2's main risk** is its premise: "caution buys no survival time". In our own simulator V1 lives 75 s against
   5.02's 94 s, and V2 (fightEarly off) out-scores V1 in both independent runs (4.00 vs 3.50 here, 3.80 vs 3.30 in
   the checker's). Two concrete backfire mechanisms in the code: the P4 losing count uses every listed mech within
   160 m (no line needed), and P1's aim clause fires on the house bots' 4.8 s torso sweep. Both have small,
   practice-only fixes (section 3).

## 1. hunt50: the owner's simple direct hunter

### 1.1 What it is

One sentence: walk to the nearest reachable house bot (weakest on ties), and start a fight only when the damage we
can put out in the next 3 s is at least half of its current hp; fire that burst, step behind cover within 15 m until
the laser is charged and the gun reloaded, peek and fire again; leave at once when a second mech gets a line on us
or our hp drops under 35%.

Why each part, with the evidence:

| Part | For | Against |
|---|---|---|
| Seek (path to the nearest bot) | V1 roams 16% of its life with no target and waits 10-17 s in 7 of 20 kill-to-hit gaps [S]; kyoto/giddy fight from 20 s with 240 m acquisition [T x3] | "attack a lone visible enemy within 220 m at > 70% hp" -0.37 [M, A12]; "engage any visible mech to 160 m" -0.29 [M, R11] |
| 50% burst gate | gun-only it reduces to "hostile or already damaged" (table 1.3): hostile-only engagement +0.23 [M, G02]; finishable-first +0.39 [M, G01]; V2 (later, quieter opening) out-scores V1 twice [S] | none measured |
| Burst then cover | house first shot comes a median 1.15 s after a line opens [R]: a peek with a full charge and a full magazine fires about 1 s unanswered | cover-first / peek / duck bundles -0.71, -0.94, -0.60 [M, A17, A18, A06]; walking to cover under fire costs 72 hp/s against 42 in stand-off [S] |
| Leave at a second line, or under 35% | "simultaneous lines kill us; serialising lines is worth more than any threshold" [A, panel R3 headline 3]; low-hp retreat is worth 0.41 at the top [M, A05] | "break off when 2 aim at us" -0.60 [M, A06] |

hunt50 runs only in the SQUAD posture. The FFA latch turns it off, so the final plays exactly like V1 (test T12).

### 1.2 Numbers (PARAMS; the preset `hunt: { off: { hunt50: false }, h50: { hunt50: true }, lite: { hunt50: true, h50Cover: false } }`)

| Name | Value | Meaning |
|---|---|---|
| `hunt50` | false | master switch (off = R3a2 V1 byte for byte) |
| `h50Frac` | 0.5 | engage when burst3 >= h50Frac x target hp |
| `h50WindowS` | 3.0 | burst window |
| `h50LaserReadyS` | 1.5 | the laser counts when cooldown + remaining charge <= this |
| `h50LightR` / `h50LightZaps` / `h50LightHit` | 60 m / 10 / 0.8 | lightning counts within 60 m: min(10, (energy - 15) / 3) zaps of 60 at 80% |
| `h50EngR` | 200 m | gate is tested only on listed mechs within this range with a line (or a line < 1 s ago) |
| `h50MinHpf` | 0.35 | no new engagement below this |
| `h50PreyR` / `h50PreyMemS` | 400 m / 12 s | prey: tracks (listed or remembered) within 400 m, seen within 12 s |
| `h50Hp` | 0.05 m per hp | weakest-first term (700 hp of difference = 35 m) |
| `h50LaserPen` / `h50MortarBonus` | +60 m / -30 m | prefer prey without a laser; a mortar holder with us holding a laser is cheap (cook-off x1.6) |
| `h50HostileBonus` | -80 m | a mech hunting us (D0 hostile) is the squad's current, weakest hunter |
| `h50CrowdR` / `h50Crowd` | 60 m / +100 m | another mech within 60 m of the prey |
| `h50IsoR` / `h50Iso` | 100 m / -40 m | no other mech within 100 m of the prey |
| `h50PreyHys` | 30 m | keep the current prey unless the new cost is 30 m lower |
| `h50BehindR` | 100 m | approach point behind a non-hostile prey's torso (rear x1.5, out of its 120 deg view) |
| `h50ArriveLaser` / `h50ArriveGun` | 125 m / 90 m | stop seeking at this distance (the fight legs take over) |
| `h50SeekHpf` | 0.6 | seek only at or above this hp; below it, roam as now |
| `h50SoundS` / `h50SoundMid` / `h50SoundFar` | 3 s / 120 m / 200 m | no prey: walk this far along the loudest gun / laser / lightning sector heard in 3 s |
| `h50LastEnemyS` | 30 s | then the last enemy fix, if younger |
| `h50RingFrac` / `h50RingStep` | 0.41 / 30 deg | then the house parking ring (0.41 x next radius around next_center), stepping 30 deg per arrival |
| `h50ArriveR` | 45 m | a seek point counts as visited inside 45 m |
| `h50SeekBoostE` / `h50SeekBoostD` | 90 / 150 m | boost while seeking only with energy >= 90 and the goal farther than 150 m |
| `h50FarmR` | 60 m | crate / drone farming limited to 60 m while hunting (cubes and the laser keep their reach) |
| `h50Cover` | true | the burst / cover / peek cycle (false = "lite") |
| `h50CoverR` / `h50CoverPath` | 15 m / 25 m | cover cell (B.hide) only this close, path only this long |
| `h50CoverMaxS` | 4.0 s | longest stay in cover per cycle |
| `h50PeekCharge` | 0.6 | leave cover when the laser charge is >= 0.6 x full (beam within 0.3 s of the peek) |
| `h50ReloadLeft` | 0.5 s | ... and the gun reload has <= 0.5 s left |
| `h50Cycles` | 3 | cover cycles per target, then fight it out |
| `h50BurstMaxS` | 3.5 s | a burst ends at the latest after this |
| `h50FinishS` | 1.5 s | "finishable": what we can fire in 1.5 s covers its hp |
| `h50Second` | 'line' | 'line' = owner's rule (second mech with a line); 'hit' = it hit us in the last 2 s |
| `h50SecondR` / `h50SecondA` | 200 m / 30 | a second line counts within 200 m with dps estimate tr.a >= 30 |
| `h50LowHpf` / `h50HealExit` | 0.35 / 0.6 | retreat under 35%; heal in cover to 60% |
| `h50TailS` | 1.5 s | a retreat lasts 1.5 s after the last losing decision (P4's tail) |

### 1.3 The burst gate

```
burst3(tr):                                    // our expected damage on tr in the next h50WindowS (3 s)
  k  = me.dmgMult                              // 1 + 0.04 x min(our cubes, 10)
  rm = tr.rearOn ? me.rearMult : 1             // we are outside its torso's front half: x1.5
  gun: if me.gun and tr.dist <= 0.97 x range and (gun flight <= 0.55 s or tr steady 0.6 s):
         shots = reload > 0 ? floor(max(0, 3 - reload) / cd) : min(ammo, 1 + floor(3 / cd));  shots = min(shots, mag)
         d += shots x damage x k x gunStat.q(tr.dist) x rm
  laser: if me.laser and tr.dist <= 0.93 x range and cooldown + max(0, full - charge) <= 1.5:
         d += damage x k x rm x (tr.hasMortar ? 1 + cookoff : 1)        // one full beam
  light: if me.lightning and tr.dist <= 60: d += min(10, floor((energy - 15) / 3)) x 60 x k x rm x 0.8
gate(tr) = burst3(tr) >= 0.5 x tr.hp     // tr.hp already includes its cube max-hp bonus (1400 x (1 + 0.04 c))
```

burst3 at full magazine, ready laser, 100 energy (tools/panel_r4/burst_table.py, our qOut priors):

| Loadout (our cubes) | 30 m | 60 m | 100 m | 130 m | 160 m |
|---|---:|---:|---:|---:|---:|
| gun (0) | 513 | 486 | 405 | 405 | 0 (flight gate) |
| gun (5) | 616 | 583 | 486 | 486 | 0 |
| gun + laser (0) | 828 | 801 | 720 | 720 | 315 |
| gun + laser (5) | 994 | 961 | 864 | 864 | 378 |
| gun + lightning (0) | 993 | 966 | 405 | 405 | 0 |

So the largest target hp the gate accepts (front / rear): gun only 972-1026 / 1458-1539 inside 60 m and 810 / 1215 at
100-130 m (a fresh 1400 hp bot only from behind and inside 60 m); gun + laser 1440 at 100-130 m (a fresh 0-cube bot; a 3-cube bot, 1568 hp, only inside 90 m or from
behind); gun + lightning inside 60 m almost anything. In words: with the gun alone hunt50 starts fights only with
damaged bots or from their rear, i.e. "hostile or finishable" until a laser or lightning is in hand. That is the
measured-positive G02 rule plus G01, and it explains why the laser economy (item I2) matters even more under hunt50.

The gate decides only who we **start** on. A D0-hostile mech (hit us in 4 s, or aims at us with a line within 160 m)
is always answered, as now; so is the current target while we hit it in the last 5 s.

### 1.4 Prey choice and the seek

Prey set, recomputed every 1.0 s (no A*: `economy.pathEst` = straight distance, x1.4 without a walk line):
- non-NPC tracks with hp > 0, conf >= 0.25 (listed, or remembered and seen within 12 s; position dead-reckoned by
  senses), within 400 m;
- reachable: same nav component (nearestPassable within 4 m), not on a roof (z - ground > 2 m), and
  `zoneSlack(x, y, t + path / walk + 10) >= 3`.

Prey cost (metres, lowest wins): `pathEst + 0.05 x hp + 60 [has laser] - 30 [has mortar and we hold a laser]
- 80 [D0 hostile] + 100 [another mech within 60 m of it] - 40 [no other mech within 100 m of it]`.
Keep the current prey unless a new one is 30 m cheaper. "Nearest, weakest first on ties": the hp term is the tie
band (two bots 35 m apart in path, the one with 700 hp less wins). Tiers are not visible in observations; current
hp, cubes (inside hp) and loadout are the observable proxies, and the hostile bonus picks the squad's current hunter,
which the rules say is the weakest tier ("hunt you weakest first").

Seek goal (HOLD mode only, hp >= 60%, no target, no drop task, no cube or laser loot; see 1.6 for the priority):
1. Prey known: if it is not hostile and its torso yaw was listed within 1 s, the point 100 m behind it
   (prey - 100 x (cos yaw, sin yaw)), when that point is passable, in our component, inside the zone at arrival and
   its path estimate is at most 1.5 x the direct one; else the prey's position. Arrive radius 125 m with a laser,
   90 m with the gun only. The torso looks at the prey (`B.lookHint`), so it gets listed in the 120 deg wedge.
2. No prey: the loudest sector of B.heard from gun / laser / lightning sounds in the last 3 s: 120 m along it
   ('mid'), 200 m ('far'), pulled back until zoneSlack >= 5.
3. Else `B.lastEnemy` if younger than 30 s (and more than 45 m away; arriving clears it, as idleLegs does).
4. Else the point of the 0.41 x nr ring around next_center nearest to us, then 30 deg further along the ring after
   each arrival (house bots park there, 33-58 s before the shrink [R]).
Legs: `mover.moveTo(goal, 1, arrive)`, walking; boost only at energy >= 90 and goal > 150 m (keep the tank for the
fight; boost is audible at 90 m). One A* per decision at most (moveTo's own plan).

When a prey is listed with a line but fails the gate:
- no laser held: yield to LOOT (crates within 150 m: half of them drop a weapon, a third of those a laser), else
  keep 150-180 m from it and seek the next prey;
- laser held (a cubed bot): close to 90 m only while no other mech is within 150 m of us, else mark the prey
  "too strong" for 20 s and take the next.

### 1.5 The fight cycle (hunt.js state per target; SQUAD, nr > 70, alive > 3, target not an NPC)

| Phase | Enter | Legs / triggers | Leave |
|---|---|---|---|
| APPROACH | target set | existing fightLegs (regain / stand-off in the D2 band: laser 100-130, gun 55-95, lightning rush 28) | first damage dealt or first beam on it -> BURST |
| BURST | from APPROACH or PEEK; t0 = now | existing stand-off, gun and laser fire as now, P5 boost spending | burst done = (laser fired since t0, if held) and (gun ammo <= 2 or reloading, if held), or t - t0 >= 3.5 s -> COVER test |
| COVER test | burst done | go to COVER only if: `h50Cover`, not finishable (burst over 1.5 s < its hp and it is >= 25% hp), cycles < 3, `B.hide.state === 'found'` with dist <= 15 m and path <= 25 m | else stay in BURST (fight on, the measured-safe default) |
| COVER | from the test; tc = now; cycles++ | `mover.moveTo(hide, 1, 0.9)`; keep firing whatever is ready; `B.hidePhase = true`; force a reload while ammo < mag; `B.peekSoon = true` once the laser cooldown is <= 0.1 s, so the existing "expected" branch of firecontrol starts the charge behind cover | (charge >= 0.6 x full or no laser) and (reload left <= 0.5 s or no gun); or finishable; or it comes within 45 m; or t - tc >= 4 s -> PEEK |
| PEEK | from COVER | posEval 'fight' cell with a line within 12 m (`evalMaybe('fight')`), else walk at the target; laser keeps charging (half speed) | target `losOut` -> BURST (the beam leaves on the first aligned decision) |

Time per cycle, arithmetic [A]: beam at 0.75 s; cooldown 1.65 s + charge 0.75 s = next beam 2.4 s after the first;
reload 2.4 s after the 12th round (2.9 s of firing). A COVER stay is therefore about 1.5-2.5 s, a cycle about
5 s, and the target never reaches its 5 s regen delay. Our own regen does not start either (any hit dealt resets it).
The cycle pays only through the house first-shot delay at each peek; it costs the walk to cover. Hence the 15 m cap.

Cancels (no cycle, plain V1 fight): target under 25%; late zone (next radius <= 70 m: the zone owns the legs);
3 or fewer alive; last stand / doomed; a lightning rush.

### 1.6 Retreat, heal and mode priority under hunt50

`losing()` calls `huntLosing()` instead of `pulseLosing()`:
- second line: another non-NPC mech (not the target) within 200 m with tr.a >= 30 and a line on us
  (`'line'`: losIn now or hit us within 0.6 s; `'hit'`: hit us within 2 s);
- or our hp < 35%;
- and not when the target is finishable within 1.5 s, the late zone holds, 3 or fewer are alive, or no hide cell is
  found (then fight on, as P4);
- the retreat lasts 1.5 s after the last raw losing decision (P4 tail).
- After a < 35% retreat reaches cover: HEAL (existing state, holdFire only while quiet, as now) until 60% hp or a
  line on us while not losing. Under hunt50 `decideMode` uses healEnterHp 0.35, healExit 0.6, healAfterLoseHp 0.6
  in SQUAD (P4 switches HEAL off; hunt50 switches this narrow HEAL back on).

Mode priority (unchanged order, new content): ZONE > last stand > LOSING (huntLosing) > HEAL (< 35% only) > FIGHT
(D0 hostile, current target, or gate-passing prey) > DROP > LOOT (cubes, laser seek; crates and drones only within
60 m) > HOLD, where `holdLegs()` first calls `hunt.seekLegs()` (like `stance.idleLegs()` today) and roams only if it
returns false.

### 1.7 Hooks: what it reuses and what it replaces

| File / function | Change under `hunt50` (SQUAD posture only; `B.env === 'FFA'` -> exactly V1) |
|---|---|
| new `lib/hunt.js` `makeHunt(B, mover, econ)` | prey set and cost, seek goal, phase state, `burst3()`, `finishable15()`, `seekLegs()`, `fightLegs()` (COVER / PEEK legs) |
| `brain.js` assess stage | `hunt.update()` after `selectTarget(B)` (prey every 1 s, phase per decision) |
| `tactics.js selectTarget` candidate rule (`ok` expression) | replaces the band clause, `engaged()` and `unengaged` with `hunt.gate(tr)`; keeps `tr.hostile` and the current-target clause; the focus 'add' cost still ranks the candidates |
| `tactics.js burstDamage` | reused for "finishable" (unchanged); burst3 is a new 3 s variant |
| `tactics.js losing` | `if (P.hunt50 && B.env !== 'FFA') return huntLosing(B)` before the P4 line |
| `tactics.js decideMode` | HEAL on in SQUAD with the 35 / 60 numbers; nothing else |
| `brain.js fightLegs` | `if (P.hunt50 && !ffa && hunt.fightLegs()) return` right before `if (!tgt.losOut)` (after the D9 late-zone block, so the zone keeps the legs) |
| `brain.js holdLegs` | `if (P.hunt50 && B.env !== 'FFA' && hunt.seekLegs()) return` before `stance.idleLegs()` |
| `firecontrol.js` reload block | `if (B.huntCover && g.reload <= 0 && g.ammo < g.mag) out.reload = true` (one line); the pre-charge uses the existing `B.peekSoon` path |
| `economy.js chooseLoot` | crate / drone `maxPath` = 60 m while `hunt50` and a prey is known |
| reused unchanged | hideSearch (cover cell), posEval 'fight' (peek cell), retreatLegs, mover.moveTo / standoff / bulletDodge, P2 laser seek, P3 focus, P5 boost spending, P6, P7 |

Budget: no new A* (pathEst only; moveTo plans the chosen goal), about 40 distance tests per second for the prey set.

### 1.8 Tests (new group `h50` in tools/test_brain.js style; synthetic observations on the micro arena and the real map)

| # | Scenario | Pass |
|---|---|---|
| T1 | burst3 unit table: gun + laser full at 115 m vs 1400 hp; vs 1500 hp; gun only at 60 m vs 1400 and vs 900; same from the rear; lightning at 40 m with 60 energy | engage / no / no / yes / rear yes / yes; values equal to table 1.3 within 1% |
| T2 | no mech in view; one remembered 300 m away, seen 8 s ago | HOLD, legKind 'hunt', goal at its dead-reckoned position (or 100 m behind its last torso yaw) |
| T3 | nothing remembered; a gun sound 'mid' at bearing 1.0 rad 2 s ago | goal 120 m along 1.0 rad (inside the zone) |
| T4 | nothing at all | goal on the 0.41 nr ring; after arriving within 45 m the next goal is 30 deg further |
| T5 | two prey at 150 / 170 m path with 1400 / 700 hp | the 700 hp one; at 150 / 250 m the nearer one |
| T6 | gun only, fresh 1400 hp non-hostile at 80 m with a line | no target (no first shot); LOOT if a crate is within 150 m |
| T7 | same mech fires at us | answered at once (D0) |
| T8 | duel, laser released and magazine empty, hide cell 10 m | COVER within 0.2 s; reload ordered; laser charge starts behind cover; PEEK at charge >= 0.6; beam within 0.5 s of the line |
| T9 | same with the hide cell at 40 m | stays BURST (fight on) |
| T10 | target at 300 hp, burst over 1.5 s >= 300 | no COVER; kill |
| T11 | second mech gets a line (tr.a 50) | DISENGAGE if a hide cell is found, FIGHT after 1.5 s without it; with the target finishable: no retreat |
| T12 | hp 34% | DISENGAGE, then HEAL to 60%; a hit on us returns fire |
| T13 | late zone (nr 70) / 3 alive | no COVER, no seek outside the late leash, plain V1 fight |
| T14 | identity: `hunt: 'off'` vs V1 on the 14 recorded streams | byte-identical |
| T15 | FFA inert: env ffa, `hunt: 'h50'` vs V1, FFA streams + sim 411-414 | byte-identical |
| T16 | sim smoke, squad seeds 1-10 | 0 errors, 0 stuck, 0 zone deaths, 0 false latches; COVER 5-20% of FIGHT time; kill-to-next-damage gaps: fewer than V1's 7 of 20 at >= 9.8 s and a mean below V1's 5.8 s (section 2.0) |
| T17 | timing on one core | worst decision <= V1 + 3 ms; <= 1 A* per decision |

### 1.9 Estimate against R3a2 (real scorer)

- Seek: +0.1 to +0.3. V1 roams 16% of its life with no target and 7 of 20 kill-to-next-hit gaps are 10-17 s [S];
  the existing idlePull cannot fill them (it only walks to the last enemy fix, `B.lastEnemy`, and clears it on
  arrival; with `idlePullS` 3 s and 60% hp it changed 1 of 6 simulator matches: seed 2, same score, 44 target
  switches instead of 7). Against it: A12 and R11 (-0.37, -0.29) measured "go and fight idle mechs" at weaker bots.
- Gate: -0.1 to +0.2. With the gun only it is "hostile or damaged" (G02 +0.23, G01 +0.39 [M]); with a laser it
  hardly binds (100-130 m accepts any 0-cube bot). It removes R3a2's riskiest acquisition clauses (section 3, R3).
- Cover cycle: -0.4 to +0.1. Three cover-first bundles lost 0.6-0.94 [M]; the 15 m cap and "fight on without near
  cover" limit the cost; the peek exploit (house first shot 1.15 s after a line opens [R]) is real but unproven in
  squad play, where vision is shared and hunters keep tracking for 5 s.
- Second-line retreat: -0.3 to +0.1 ('line'); -0.15 to +0.15 ('hit'). From about 40 s on two lines are common;
  A06 (-0.60) measured exactly this rule at a 3.29 bot; our model says serialising lines is the biggest lever [A].
- **Total (not additive): hunt50 centre -0.1 (range -0.6 to +0.3); lite (no cover cycle) centre +0.05 (-0.3 to
  +0.35); lite with `h50Second: 'hit'` centre +0.1.** Probability that the literal hunt50 beats the best of
  V1-V4 on its first draw: about 20-25%. Because only the best score counts, that is still worth a slot.

### 1.10 Slots for it

Second hour (after V1-V4 are scored): `hunt: 'h50'` (owner's literal rule), `hunt: 'lite'`, `hunt: 'lite'` +
`h50Second: 'hit'`, and the best of V1-V4 with item I2 (laser in contact). Afterwards salts of whichever leads.
Each is one SELECT string on one code state, so one push serves all four.

## 2. Ten scenario-level improvements (where the bot wastes time, loses hp for nothing or misses kills)

### 2.0 What the simulator shows about V1 (behaviour only, squad seeds 1-6; `tools/panel_r4/out_v1.txt`, `out_v2.txt`)

| Mode / leg (V1) | share of life | hp lost per s | damage dealt per s |
|---|---:|---:|---:|
| FIGHT / standoff | 19.5% | 42 | 175 |
| HOLD / roam (no target) | 15.9% | 0 | 8 |
| LOOT / loot | 13.0% | 0 | 0 |
| FIGHT / isolate | 10.0% | **73** | 146 |
| DISENGAGE / hide (P4 pulse, walking to cover) | 9.4% | **72** | 113 |
| FIGHT / grab (mid-fight cubes) | 8.1% | 14 | 105 |
| ZONE | 5.4% | 20 | 38 |
| FIGHT / regain (no line to the target) | 5.0% | 8 | 33 |

Other V1 facts [S]: laser held in 1 of 6 matches (seed 1 at 28 s; 5.02 snapshot 2 of 6); in 3 matches no laser was
ever in view, in 2 a laser was seen (one 93 m away at 69 s, one as close as 6 m; reason not identified) and not
taken; kill-to-next-damage gaps 17.2, 15.6, 12.0, 13.7, 9.8, 17.0, 13.4 s (7 of 20 gaps; mean of all 20: 5.8 s); damage into mechs we never killed 2297, 1693, 187, 83,
1125, 1350 per match; laser hits 12 of 13 beams when we have one (accuracy is not the problem, availability is).
V2 (fightEarly off): score 4.00 vs 3.50, alive 100 s vs 75 s, kills per minute 2.19 vs 2.78.

Each item below is one preset on the R3a2 code state (old value = V1 byte for byte), with a test. Gains are
real-scorer guesses with the grade of their evidence. Ordered by expected value.

### I1. Laser in contact: a 130 m grab and a laser-first opening (gain +0.1 to +0.3) [T x3, S]
Problem: R3a2's P2 laser seek lives in `economy.chooseLoot`, which runs only when `t - B.lastContactT >= 3 && B.A === 0`
(13% of V1's life) and only on a laser already seen; in contact `chooseGrab` takes a laser only within 60 m
(`grabLaserR`). Result: gun only in 5 of 6 simulator matches (in 3 of them no laser was ever in view, so I1 must be
paired with I8 and with crates: half drop a weapon, a third of those a laser). The top bots hold gun + laser by 24-50 s
(kyoto 4 of 6) and make most kills with it (kyoto 23 of 36).
Spec (`laserGrab: { std: {}, wide: { grabLaserWide: true } }`, SQUAD posture, no laser held):
- `chooseGrab`: laser reach 60 -> 130 m path when hp >= 50%, at most one mech has a line on us (`B.nLos <= 1`) and
  the target is not finishable; `grabLegs(0.35)` keeps the strafe blend as now.
- `selectTarget`: while no laser is held, t < 90 s and a wanted laser pickup is known within 200 m path, the P1
  `engaged()` clause is false for non-hostile mechs (D0-hostile ones are still answered).
Test: 1v1 at 110 m, laser 90 m away -> grab within one decision, laser in hand; with two lines -> no grab; a hostile
mech during the laser-first window -> answered; laser held -> no change from V1 (identity on streams with a laser).

### I2. Seek after a kill instead of roaming (gain +0.05 to +0.25) [S, T]
Problem: HOLD / roam is 16% of V1's life; 7 of 20 kill-to-hit gaps are 10-17 s long. The existing
`idlePull` cannot help: `stance.idleLegs` walks to `B.lastEnemy`, which after a kill is the victim (cleared on
arrival), and it waits 20 s at 90% hp.
Spec: the seek of hunt50 (1.4 steps 2-4: loudest gun / laser / lightning sector of the last 3 s, last enemy fix,
then the 0.41 nr ring) without the gate, as `seek: { off: {}, on: { seekOn: true } }`, hp >= 60%, HOLD only, walking.
Hook: `brain.js holdLegs`, before `stance.idleLegs()`.
Test: after a kill with no mech listed and a 'mid' gun sound at bearing b 1 s ago -> legKind 'seek', goal 120 m along
b, within 1 decision; with nothing heard -> the ring point; hp 55% -> roam as V1.

### I3. "Isolate" only when it is near (gain +0.05 to +0.2) [S]
Problem: `fightLegs` moves to a posEval 'fight' cell whenever a second attacker has a line (`B.A - tgt.a > 20 &&
B.nLos >= 2`). In V1 that leg is 10% of life at 73 hp/s lost (stand-off: 42) and 146 damage/s dealt (175): the walk
to the cell is taken under two lines.
Spec (`isolate: { any: {}, near: { isoNear: 12 } }`): take the cell only if it is within 12 m and its exposure to the
non-target threats is 0 (`xOther === 0`, already computed in `makePosEval.evaluate`); otherwise stay in stand-off.
Test: two lines, best isolating cell at 25 m -> legKind 'standoff'; at 8 m with xOther 0 -> 'isolate'.

### I4. Pulse retreat only to near cover (gain +0.05 to +0.2) [S, M against long retreats]
Problem: P4 retreats to any hide cell the search finds (out to `hideMaxR` 120 m). Walking there under fire is the
other 72 hp/s leg (9.4% of V1's life; 16.8% of V2's).
Spec (`retreat: 'pulseNear'` = P4 + `plCoverR: 25`): DISENGAGE only when `B.hide.dist <= 25 m`; otherwise stay in
FIGHT, exactly as P4 already does with no cell at all.
Test: LOSING with the hide cell at 60 m -> FIGHT; at 20 m -> DISENGAGE, back to FIGHT 1.5 s after the last losing
decision.

### I5. Fight-or-flee by time-to-kill against time-to-die (gain 0 to +0.3) [M one team, A32 +0.34]
Problem: P4's thresholds ignore how close the kill is. The one measured fight-or-flee rule compares the two clocks.
Spec (`retreat: 'ttk'`): ttd = me.hp / max(30, B.A); ttk = target tau (tr.hp / tr.b, already in `assess`).
LOSING when n >= 1 and ttd < 0.8 x ttk and the target is not finishable within 1.5 s; also hp < 35% against a
healthier target (P4). Never when ttk < 2 s. P4 cancels (late zone, 3 alive, no cover) and tail unchanged.
Test: 1v1, ttk 4 s, ttd 10 s -> fight; second line makes ttd 3 s -> retreat; ttk 1.5 s -> fight.

### I6. Turn to rear attackers in SQUAD again, with the keep rule (gain 0 to +0.15) [A, checker finding 1]
Problem: under `focus: 'add'` the R2 rear pick runs only in FFA (`tactics.js` line 308), and the torso veto needs an
attacker of >= 60 dps more than 80 deg off. A house gun at 100-130 m lands 30-60 dps, so a second shooter behind us
often stays below 60 while its hits count x1.5 (rear). kyoto took 20% of its damage in the rear [S].
Spec (`rearPick: { ffa: {}, keep: { rearPickSquad: true, vetoRearDps: 35 } }`): run `B.scanner.rearPick` in SQUAD,
gated like the P3 veto keep rule (switch only when the target is >= 38% hp and we have not hit it for 2 s); an
attacker more than 100 deg off counts for the veto from 35 dps.
Test: target 50% hp, not hit for 3 s, rear attacker 40 dps at 150 deg -> pick switches; target 30% -> kept.

### I7. Last gasp by time-to-die (gain 0 to +0.15) [T: kyoto makes 1.7 kills inside its fatal fight]
Problem: `lastStand` needs hp < 25%, two attackers and no cover. kyoto's fatal fights start at 70-100% hp against 3-6
attackers [S]; by the time the 25% rule fires there is often < 1 s left and the laser is cooling.
Spec (`lastGasp: { off: {}, on: { gaspTtd: 2.5 } }`): doomed also when me.hp / B.A < 2.5 s and no hide cell within
10 m: target = the listed mech with the smallest tr.hp / burst3 (quickest kill), release any lethal partial beam
(existing killNow), ignore the lightning reserve, no retreat legs.
Test: hp 600, A 300 dps, cover 30 m -> FIGHT, target = the 350 hp mech, partial beam released at the first lethal
charge.

### I8. Kill-drop weapons (gain 0 to +0.1) [S, A]
Problem: a dead mech drops its non-gun weapons at the corpse (death_drop). Our kills happen 55-130 m away, beyond the
60 m in-contact laser grab, and by the time the corpse is in view the track is gone (the victim's loadout is not
kept; tools/panel_r4/laserprobe.js could not read it after the kill event).
Spec: in `senses.js` kill handling, store the victim's `hasLaser` / `hasLightning` with the kill drop
(`B.killDrops`, which R1 keeps for cubes); treat the corpse point as a laser pickup candidate for `chooseGrab` at
130 m (I1's gates) until it is seen empty within 40 m or 30 s pass. Preset `killDrop: 'weapons'`.
Test: kill a laser carrier at 110 m with one other line -> grab goal at the corpse; corpse seen empty -> dropped.

### I9. Upgrade order for kills (gain 0 to +0.15) [A, mechanics_deep section 7]
Problem: R3a2's order (plating, armor, servos, nanites, laser_damage, ...) has gun_damage 9th and gun_mag 14th (6th and
9th among the ids a gun-only bot can draw), although we fight gun-only most of the time, and puts laser_damage 5th although it turns a fresh 1400 hp mech from
5 beams into 4 (315 -> 372).
Spec (`upg: 'kill'`): with a laser held: laser_damage, plating, gun_mag, laser_charge, gun_damage, armor, servos,
nanites, then the old tail; gun only: plating, gun_mag, gun_damage, armor, servos, nanites, gun_velocity, then the
tail. Weapon ids are offered only for held weapons, so the list is read in order and skips absent ids (as now).
Test: offers [nanites, gun_mag, servos] gun-only -> gun_mag; [plating, laser_damage, armor] with a laser ->
laser_damage.

### I10. Hold a full charge to 1.9 s for alignment, FFA first (gain final +; practice 0 to +0.05) [S, A]
Problem: a full charge is forced out after `laserForceS` 1.5 s even when the aim gate is shut; the engine fires on
its own at 2.0 s. In the one FFA simulator match with a laser (seed 411) 5 of 15 beams were forced at 1.5 s (8 hits)
against 1 of 12 at 1.9 s (7 hits); in
squad play none were forced (12 of 13 hit) [S, `out_lh15.txt`, `out_lh19.txt`]. (The squad seed 1 score jump 4 -> 9 at
1.9 s is chaos, not this rule: zero forced releases either way.)
Spec: `laserForceS` 1.9 in the FFA posture only (`laserForceFfa: 1.9`; practice-inert, so it changes no practice
score and can ride in any build); a SQUAD copy is a separate one-number draw.
Test: full charge, gate opens 1.7 s after full -> beam at 1.7 s, not at 1.5 s; never later than 1.95 s.

Also seen, not ranked: drop supply-drop runs in SQUAD (synthesis 3.6; 0-0.2% of time here); R1 stealing off in SQUAD
as one draw (synthesis 3.5); the corner ambush (stance M2) never fires with nLos > 0, which is almost always after
20 s, so it is practice-inert in R3a2 (0.9% of life).

## 3. Review of R3a2 (build_spec_r3a2.md): what may backfire on the real scorer

R1. **The premise is our simulator's hunter schedule.** "All bots die at about 95 s, so caution buys nothing"
(synthesis section 0) was measured with `sim/house.js`, whose squad adds one hunter per dead member
(`huntersStart 1`, `huntersPerKill 1`, a guess; the real schedule is unknown, rules_audit A2). Even inside that
model it does not hold for our bot: V1 lives 75 s against 94 s (5.02), and V2 beats V1 in both independent runs
(4.00 vs 3.50 here; 3.80 vs 3.30 in checkR3a2). The real scorer may disagree, but the sign is the risk.
Action: none for the first hour (V2 is one of the four slots). Pick the salt leader by the official scores, not by
the synthesis's prior; if V2 >= V1, the next draws should keep openFarm on.

R2. **P4 counts every listed mech within 160 m, line or not** (`pulseLosing`, `tr.listed && tr.dist <= plR`).
Listed includes the 5 s memory, so three bots behind a wall make (n >= 3 and hp < 80%) true at 79% hp. Retreating at
72% measured -1.10 (A25); the old D3 counted `B.threats` (aim at us or hit us, with a line within 2 s).
Fix (practice-affecting, own draw): `plCount: 'line'` = count mechs with a line on us within 1 s or a hit within 3 s.
Test: three listed within 160 m, one with a line, hp 70% -> not LOSING.

R3. **P1's aim clause fires on the house torso sweep.** House bots sweep the torso +-46 deg every 4.8 s while walking
[R]; within 190 m the 0.22 rad cone (`engaged()`) is crossed on most sweeps, so we open on idle squad members. Opening
on idle mechs measured -0.37 / -0.29 / -0.18 (A12, R11, A23); hostile-only +0.23 (G02). The closing clause (> 3 m/s
within 180 m) also matches bots walking to the next circle past us.
Fix (own draw, or ride with hunt50 which replaces the clause): aim held for 3 consecutive decisions (the K2 dwell
counter `tr.aimN`, extended from 160 to 190 m), closing sustained for 1 s. The same sweep also makes idle bots
D0-hostile through `aimAtMe` within 160 m; the existing preset `aimDwell: 'on'` (SQUAD-affecting) already fixes that
part and should ride in the same draw. Test: a listed bot whose torso sweeps +-46 deg past us at 150 m for 10 s ->
never a candidate; one that holds its aim on us for 3 decisions -> candidate.

R4. **The laser economy is mostly inert** (I1): the 240 m seek runs only out of contact, which fighting from 20 s
removes. With the gun only, the mid band (P2) does not apply, our gun band is 55-95 m, where the house gun hits 58%
(40-80 m) instead of 31% (80-130 m) [R, measured_deltas S05]. Under R3a2 we will fight more of our fights gun-only at close range than
the synthesis assumes. Not a backfire of the code, a gap: I1 is the fix.

R5. **No HEAL in SQUAD (P4).** After each fight we carry the damage into the next; regen needs 5 s without dealing or
taking damage, which back-to-back fights never give. The 5.58 bot lost 0.41 when its low-hp hiding was removed (A05).
In the simulator the cost is small (V1 spends 0-4 s per match at < 55% hp against a fresh mech). Keep, watch V4.

R6. **P5 boost spending keeps the tank near 30.** Then the D4 laser-charge side-step (needs >= 25 and boosts only
from 6-9 m) and the retreat boost (needs >= 25) usually still fire, but the lightning reserve holder and the pocket
hop (jet) may find an empty tank. Stuck count 0 in 12 simulator matches, so low risk. Note that boosting does not
make us easier to hit: house aim fails on velocity changes, and a boosted reversal is a bigger change (0.67 s, 39 m/s
of delta) than a walked one.

R7. **The mid band also applies in FFA** (integration log: "the mid band is the existing preset, so it applies in FFA
too"). In a final, 70-120 m is exactly where kyoto-type bots are strongest (synthesis 4.1 item 5). The counter
module retunes the band per recognised opponent, but not for unrecognised ones. Practice-inert fix: `laserRangeFfa:
'far'` (FFA posture keeps 125-185 m). Changes the final only; the locked practice score is unaffected.

R8. **openFarm off also removes the pre-latch protection in a final** (checkR3a2 finding 4: FFA seed 412 died at 56 s
against 287 s). Our latch needs 3 foreign deaths; top bots latch 0.5 s after the first. Practice-inert fix: while
`B.foreignDeaths >= 1` and not yet latched, use the openFarm answer rule (answer only mechs that hit us within 100 m);
in practice house bots almost never die to anything but us, so SQUAD play is unchanged.

R9. **farmHp 50 also lowers R1's steal hp gate** (build_spec_r3 N4 note: steal.js lines 280 / 459): at 50-90% hp we
now walk into crates other mechs are shooting. Minor; covered by the R1-off draw.

R10. **Focus 'add' keeps the current target through cover** (-200 current, +240 no line): a fresh mech in the open
must be within 80 m + 0.1 x (hp difference) of cost to take over. That is intended; only noted because together with
the SQUAD rear-pick removal (I6) a rear shooter under 60 dps is never faced.

Not a backfire: P6 crates at 50% (crate hits did not reset regen on the old build); P7 servos third (low value either
way; drop first if time is short); the final-only items F1, Z5, Z8, Z9, Z10 (inert in SQUAD, verified 19/19).

## 4. Reproduction (P = project root; cores 2-3; about 60-90 s per 6 matches)

```
cd $P/tools/panel_r4
TAG=V1 taskset -c 2 $P/bun legshare.js 1 6                                   # out_v1.txt
TAG=V2 OVR='{"select":{"fightEarly":"off"}}' taskset -c 3 $P/bun legshare.js 1 6   # out_v2.txt
TAG=V1pull OVR='{"select":{"idlePull":"on"},"idlePullS":3,"idlePullHpf":0.6}' taskset -c 2 $P/bun legshare.js 1 6
taskset -c 2 $P/bun laserprobe.js 1 6                                        # out_laser.txt
taskset -c 2 $P/bun laserhits.js squad 1; taskset -c 2 $P/bun laserhits.js ffa 411,412,413
OVR='{"laserForceS":1.9}' taskset -c 3 $P/bun laserhits.js ffa 411,412,413
python3 burst_table.py
```
