# Mech Royale tactics specification v1 (panel chair)

Defaults are for `notes/hello_example.json`; code reads `hello.config`, `obs.self.stats`, `obs.self.weapons[i].stats` and keeps all numbers in `PARAMS` (G). Tags: [C] recomputed from the config (`tools/chair/verify.py`); [R] replay forensics converted by bullet flight time; [S] real-scorer reports in BRAIN_SPEC_V2 amendment V3 (single results are inside noise; used as a class only).

Notation. c=`self.cubes`; R=radius·(1+0.05c); s(c)=sqrt((R+0.3)/2.8). LOF: `world.shotClear`, muzzle to body. a_i: dps of mech i on us, 3 s mean of `events.damaged`, else 107·p_in(d), p_in=0.95/0.6/0.37/0.25/0.18 for d<75/100/126/151/230 m. A=Σa_i over mechs with LOF in the last 1 s. n: mechs with LOF in the last 2 s that aim within 12° of us or damaged us within 6 s. B_i: our dps on i, weapon dps×q(d) (q=0.95/0.8/0.6/0.45/0.3 in the same bands; measured `hit`/shots after 24 shots) ×1.5 from its rear arc, ×1.6 for a laser on a mortar holder. τ_i=hp_i/B_i. H=`self.hp`.

## A. Objective and game plan

Score = 16−place = mechs dead before us.

**Practice (ENV=SQUAD, default).** Maximise E[house bots dead before we die]; they die only to us, drones or the zone. Reported results are bimodal, 0–2 or 15 [S]: whoever reaches the radius-0 finale with the largest HP pool outlives all remaining house bots. Plan: (1) 0–60 s: cubes 1 and 3 (two upgrades) and a laser. (2) Fight each hunter at once at 75–110 m with every loaded round, finish it, walk over its cubes (each heals 4% of max HP). (3) Never hide or idle with a loaded weapon [S]; break line of fire only when LOSING (C8) and keep looting. (4) Take every reachable supply drop (95/165/235 s: full heal, +3 cubes). (5) Against three or more hunters fight from sight-capping cells. (6) From 375 s stand on `zone.next_center`.

**Final (ENV=FFA, latched).** Maximise expected place; every death elsewhere is +1. Loot uncontested ground, fire only under gate C9, never be the best target on offer, heal patiently, win the HP race on `next_center`.

**ENV latch.** In: `obs.alive`, `events.kill`, `obs.beams`, `obs.t`. FFA (latched) when 16−alive−ourKills≥3 before 200 s, or after 2 beams by another mech ending within 6 m of a third mech.

## B. Modes

One mode owns `move`, `boost`, `jump`. Overlays run every tick: FIRE (`aim`, `fire`, `reload`), DODGE (adjusts `move`), HANDS (`pick`, `take`, `drop`). The first mode whose entry holds wins; modes 1–3 pre-empt at once, others after 2 ticks and 0.6 s dwell. Boost only in ZONE, shell escape, breaking LOF when H/A<4 s, or a finishing chase; keep 35 energy.

|#|Mode|Entry|Legs|Exit|
|---|---|---|---|---|
|1|FINALE|`zone.next_radius==0`|`next_center` (E3)|none|
|2|ZONE|`!self.in_zone`, or slack=t_exit(pos)−t−1.3·path/v_walk<4 s (E1)|nearest passable point at 0.8·`next_radius`; boost if outside or slack<1.5 s|inside and slack≥8 s|
|3|LAST_STAND|n≥3 for 1 s, or H/A < time to cover|bastion (C10) if reachable before H/A, else FIGHT legs; never flee|n≤1 for 3 s|
|4|DROP|gate D5|ring centre, circling at r≤5 m|captured, gate false, clock frozen 3 s|
|5|RESET|LOSING (C8), hide cell reachable before H/A|SQUAD: boost to the hide cell, then loot on routes hidden from tracks, never stand. FFA: hide, hold fire|SQUAD: k*≥1 or H≥0.6·max_hp. FFA: H≥0.9·max_hp|
|6|FIGHT|target exists (C1)|range-keep (C2), strafe (C3), reload corner (C4), finish (C8)|no target 1 s|
|7|LOOT|A=0 for 2 s and an item of value (D2)|path to item|item gone, or FIGHT|
|8|POSITION|default|best post (C10) in the band (E2)|any other|

## C. Combat rules

**C1 Target.** In: `obs.mechs`, `events.damaged`, `events.hit`. Out: target id. SQUAD candidates: mechs that damaged us within 3 s, aim within 12° of us, or are within 150 m. FFA: gate C9. Index I_i=V_i/τ_i, V_i=1+min(2, H·a_i/(A·(A−a_i+1)·τ_median)), V=1 when A=0. Kill-secure (overrides): hp_i≤damage·(ammo·q+[laser charged]). Switch only if I_new≥1.3·I_cur, the target died, or it had no LOF for 1 s. Drones only after damaging us or when farmed.

**C2 Range.** In: target `pos`, `weapons`. Out: radial `move`=clamp(0.5·(d−R*)/v_walk,−1,1), zero within ±15 m; remainder lateral.

|us \ target|gun|+lightning|+laser|+mortar|
|---|---|---|---|---|
|gun|R*=90·s(c), clamped 75–110|≥67 m|as gun, C6|as gun, C7|
|gun+laser|110·s(c), clamped 95–140|≥67 m; no charge inside 57 m|corner within 6 m|first target (504 per beam)|
|gun+lightning|90; rush to 36 m iff n≤1, energy≥3·ceil(hp_t/107)+10, no other mech tracked within 120 m|rush only if H≥1.3·hp_t|rush (a zap shorts it 2 s)|no rush|

Measured gun hit rate below 0.5 over 24 shots: R* −10 m (floor 65).

**C3 Strafe and jink (DODGE).** In: `obs.projectiles`, shooter bearing. Out: lateral `move`. d<75·s(c): no dodge exists (41/41 house hits under 0.3 s flight [R]); run to the goal cell. 75–100·s(c): seeded reversals every U(0.5,1.0) s, 20% replaced by a 0.3 s stop; reverse early when `nav.walkLine` 5 m ahead fails. Beyond 100·s(c): for each enemy gun bullet arriving within 1 s choose the lateral command in {+1,0,−1} (8 directions with two shooters) maximising the minimum miss distance; no bullet in flight: seeded jink. Never jump to dodge; never reverse faster than 0.5 s.

**C4 Reload corner.** In: `weapons[0].ammo`, `reload`; hide cell (C10). Only with a hide cell within 4 m (0.44 s step): at ammo≤2 walk in, still firing; `reload` when LOF breaks or ammo=0; step out when reload left ≤0.55 s. No corner: reload strafing in the open. SQUAD never waits hidden with a loaded gun. FFA also goes in on damage taken ≥max(135, dealt/3), a second mech's LOF, or 3.2 s exposed.

**C5 Fire rules (FIRE).** Out: `aim`, `fire[slot]`, `reload`.
- Gun: exact intercept (`lib/aim.js`) with latency tl=0.05·ceil(cooldown/0.05) clamped to 0.05–0.10 s, aimed at half the target's scaled height; airborne targets (27% of house-bot time [R]) get vertical vz·t−11·t² clamped to the ground. `fire[0]`=true when cooldown≤0.1 s, ammo>0, the aim the torso will actually have is within yaw max(0.004,(r_t+0.3)/d−0.0105) and pitch max(0.004,(0.5·height_t+0.3)/d−0.0105) rad, and `shotClear`; if the centre is blocked try +2 m, then +3.6 m (scaled by size). Hold the trigger: waiting for an observed cooldown of 0 fires every 0.30 s, not 0.24 s.
- Laser: full charge only (131 dps; a tap gives 84 [C]). `fire[slot]` true on every tick of the charge; aim directly at the position tl ahead; release at charge≥0.97·full with aim error ≤0.6·R_t/d and `shotClear`; earlier only for a kill; forced 1.75 s after full. With a hide cell within 4 m: press hidden, step out so sight opens as the charge completes (0.73 s for 4 m), release, return. No charging in ZONE or within 57 m of a lightning holder.
- Lightning: fire when the nearest object in the cone is a mech, d≤0.92·range, yaw error ≤cone/2−3°, energy≥15.
- Mortar: never carried (D3).
- Reload: at ammo 0; early at ammo≤4 after 0.4 s without enemy LOF; never with a kill-secure target in sight.

**C6 Enemy laser.** In: `mechs[i].charging`, `aim`. House lasers now track during the charge (4 of 4 hits with sight [R]); strafing does not dodge. If its aim is within 10° of us: go to a hide cell reachable before the charge ends (6 m walking, 9 m boosting); else zap it if in lightning range; else face it and keep firing.

**C7 Shell escape.** In: mortar `projectiles`. Predict the impact ballistically (`world.surfaceZ`); if within 1.3·splash_radius+R+1.5 m of our predicted position, take the cheapest of 8 directions, walking or boosting, that clears it. Overrides all but ZONE.

**C8 Disengage, finish, regeneration.** In: H, a_i, τ_i, `obs.alive`. H_esc=A·(t_cover+1)+150 (t_cover 3 s if unknown). k*: largest k with Σ_{j≤k} τ_j·(A−Σ_{l<j} a_l) ≤ H−H_esc, targets ordered by I. LOSING: k*=0, not FINISHING, and (n≥2 or our missing HP exceeds the target's by more than 135). FINISHING: kill-secure, or p_fin≥V/(1+V), with p_fin=clamp(2·(1−τ_t·A/H),0,1) and V=clamp(max((240−t)/C_kill, 0.5·(alive−1)·[t≥300]),0.2,5), C_kill the kill-cycle average (35 s): close in, boost allowed, stop after 6 s without LOF. While ahead, hit a damaged target every regen_delay−1=4 s. SQUAD never heals standing still; regeneration is a by-product of RESET and LOOT.

**C9 FFA gate.** Fire first only if (a) the mech is aware of us (aims within 20° for 0.3 s, or damaged us within 3 s) and within 120 m; (b) kill-secure; or (c) P=H·B/(hp_t·a_t)≥1.85/1.6/1.35/1.2/1.0 at alive 16/8/4/3/2 and no third mech is tracked within 120 m. Dominated-target rule: for each visible non-target E require another visible X with dist(E,X)<dist(E,us)−10 m or hpFrac(X)<hpFrac(us)−0.1; otherwise break sight to E. H<0.6·max_hp with a mech tracked within 200 m: RESET.

**C10 Several enemies, posts, last stand.** At init build a 16-sector free-ray table (cap 120 m) for cells with `nav.wallDist`≤8 m. POST: ≥10 sectors blocked within 25 m, ≥1 open beyond 80 m. BASTION: ≥12 blocked, open arc ≤90°, wall within 4 m behind, longest ray ≤60 m, inside the next circle. n=2: ρ=(H−H_esc)·B/(hp_mean·a_mean); fight both if ρ≥3, otherwise the position score isolates one. n≥3 or cornered: LAST_STAND, target the smallest τ_i; leave a bastion only after 2 shells within 7 m or with its zone exit under 8 s away.

Position score in HP (every 3 ticks, cells within 24 m, top 4 threats): S=5·(w_B·B·q·L−w_X·X·(1−0.45·P))−X_here·t_move+0.04·max_hp·[cube, c<10]−60·[drone within 45 m]; cells outside the zone at arrival+10 s are excluded. X=Σa_i·conf_i·[LOF_i], conf_i=exp(−(t−lastSeen_i)/4); L: our LOF to the target; P: hide cell within 4 m. (w_B,w_X)=(1,1.5) in FIGHT, (0,3) in RESET; goal changes need a gain above 60.

**C11 Torso.** Out: `aim`. Target in LOF: the lead solution. Several attackers: the yaw keeping the largest Σa_i within ±90° (rear ×1.5). `damaged` with `rear`, or `by`≠target: face its `bearing` the same tick and reselect. No target: last attacker (3 s), then the lost target's last position (4 s), then scan 12 sectors by open·(t−lastLooked)+3·heard; 360° at least every 5 s.

## D. Economy

**D1 Opening (0–60 s, zone static).** One 360° torso sweep (1.6 s) while moving; LOOT by value/path time inside the next circle until a mech is tracked within 150 m. Goal at 60 s: 3 cubes and a laser.

**D2 Loot values.** In: `obs.pickups`, `crates`, `cubes`, npc `mechs`. Laser 10 (detour ≤150 m); lightning 6 (≤80 m; 0 with a laser); drone 4 (only at H≥0.9·max_hp with no mech tracked within 150 m; from 60–80 m, strafing); crate 2 (shoot from ≤80 m while walking); cube 1. Crate hits do not reset regeneration [R]; if `hp` stops rising after one, set `crateResetsRegen` and stop below 0.9. Kill drops: collect at once if A=0 or A·t_path<0.04·max_hp·cubes.

**D3 Weapons (HANDS).** Out: `take`, `drop`. Slot 0 gun, kept. Slot 1: laser, else lightning, else empty; never a mortar (+60% beam damage taken; three dead upgrades in the offer pool). Swap lightning for laser only after 3 s without LOF. `dropGunForPair`: hold laser+lightning only if our measured gun hit rate is below 0.45 over 36 shots. When `next_radius`≤70, prefer lightning to laser if a pickup is within 25 m.

**D4 Cubes and growth.** Detour ≤40 m while c<10, ≤20 m for 10≤c<21, only when A=0. SQUAD stops at 21 (two more upgrades; walkable cells fall only 5% from 10 cubes [C]). FFA stops at 10 until 300 s, except to reach 15 within 30 m. `nav.setBody` on every `pickup`.

**D5 Supply drop.** In: `obs.drops`. Value test: G=((max_hp−H)/regen_per_s+regen_delay)/C_kill+0.04·min(3,10−c)·3 must exceed L=3·p_die+t_detour/C_kill. Coded gate: path≤v_walk·(lands_in+6 s), and (H<0.8·max_hp or c<15), and H>A·(t_approach+capture_s)+200, and `holder` null or us; FFA also: no other mech tracked within 150 m of the ring. Damage does not stop a capture: shoot a capturer only if its hp≤187·q·t_left+315·[laser charged].

**D6 Upgrades.** Out: `pick`, the argmax value of the next stack, resent every tick while `obs.offer` is not null; ties to the lower index.

|id|SQUAD value by stack|FFA|
|---|---|---|
|plating|30, 28, 26 (+10 after 300 s)|30|
|nanites|24, 18; 5 if regeneration ran under 10% of the last 60 s (t>90 s); 0 after 300 s|12, 10|
|armor|16, 17, 18|14, 15, 17|
|lightning_efficiency/lightning_range/lightning_chain|15/12/4|18/12/6|
|laser_damage|14 (+6 if it removes a beam-to-kill)|10|
|gun_mag|12, 5 (gun only 26, 11)|6, 3|
|gun_damage|8 (gun only 14)|6|
|laser_charge/servos/gun_velocity|6/6/5|5/8/5|
|reactor/capacitor/jets|3 (with lightning 10/8/3)|3|
|gun_rate/gyros/sensors/laser_pierce/mortar_*|2/2/2/1/0|2/2/5/1/0|

## E. Zone and endgame

**E1 Exit time.** In: `obs.zone`. During a shrink, point p leaves at t_exit=shrink_end−w·(shrink_end−max(t,shrink_start)); q=p−next_center, v=center−next_center, dR=radius−next_radius, a=dR²−|v|², b=next_radius·dR+q·v, c=|q|²−next_radius²; w=0 if c≤0, else min(1,(−b+sqrt(b²+a·c))/a) (a=0: min(1,c/2b)). Every goal cell needs t_exit≥arrival+10 s. Never outside by choice once `zone.dps`≥60 (195 s).

**E2 Band.** While `next_radius`>70: stand at 0.55–0.85·next_radius from `next_center`, on the side away from the centroid of tracked mechs, inside the next circle before `shrink_start`. From `next_radius`≤70 (295 s): within 0.5·radius of `next_center`, at a bastion when one exists.

**E3 Finale.** From `next_radius==0` (375 s) go to `next_center`: the only point inside until 415 s; a metre off costs 140–1,300 HP depending on the side. If pushed off, stand on the side toward `zone.center`. E_i=hp_i−260·(415−t_exit(p_i)). SQUAD: double I_i for mechs with E_i≥E_us. FFA: shoot the smallest positive E_i−E_us, never E_i<E_us unless it is our top damage source; with lightning, no boost after 380 s. After 415 s life is hp/260: 5.4 s at 1,400 HP, 11.5 s at 2,981 [C].

## F. Robustness of our own bot

1. One PRNG seeded `hello.seed` XOR BUILD_SALT XOR hash(first `self.pos`, `zone.next_center`) draws every interval and side. No `Math.random`, no clock.
2. Never below 5 m/s for over 0.5 s while an aware mech has LOF, except on the finale point.
3. Exploits need measured evidence and a safe default: `crateResetsRegen`, gun hit rate, laser hit rate (under 60% over 10 beams ranks lightning first), a_i.
4. Every stage runs in try/catch with its last good output; `Number.isFinite` on every action field; budgets are counts (2,500 rays, one A* of 8,000 expansions per tick).
5. dt from `obs.t` (ticks skip); resend `pick` and `take` until confirmed; warm up 300 synthetic ticks before `ready`.
6. With bimodal outcomes the standard error of a 48-match mean is about 1.0 [C]: accept a tactic only on three consistent submissions or a same-sign class of six.

## G. Tunable parameters

|PARAM|default|sweep|
|---|---|---|
|standoffGun, standoffLaser (×s(c))|90, 110 m|70–120, 95–150|
|standoffBand|±15 m|10–25|
|noDodgeRange, reactiveRange (×s(c))|75, 100 m|60–90, 90–125|
|jinkInterval, stopShare|U(0.5,1.0) s, 0.2|0.45–1.2, 0–0.4|
|latency fallback, gateSigma|0.10 s, 0.0105 rad|0.05–0.15, 0.008–0.014|
|laserGateK, laserHoldMax|0.6, 1.75 s|0.4–0.8, 1.0–1.9|
|reloadCornerMax (0 = off), earlyReloadAmmo|4 m, 4|0–6, 2–6|
|engageRadius, targetHysteresis|150 m, 1.3|100–220, 1.1–1.6|
|hEscReserve, deficitMargin|150, 135 HP|50–400, 45–270|
|reengageHp|0.6|0.45–0.8|
|rhoTwo, lastStandN|3, 3|2–4|
|bastionRay, bastionBlocked|60 m, 12|40–120, 10–14|
|postBlocked, postOpen|10, 80 m|8–12, 60–100|
|tEsc, cKill|240 s, 35 s|180–300, 20–45|
|wX (FIGHT), goalSwitch, evalRadius|1.5, 60 HP, 24 m|1–3, 30–120, 16–30|
|cubeDetour (c<10, c≥10), cubeStopSquad|40, 20 m, 21|20–70, 0–40, 10–28|
|laserDetour, lightningDetour|150, 80 m|80–240, 40–120|
|dropWindow, dropReserve|6 s, 200 HP|3–10, 100–400|
|zoneSlack, zoneBand|4 s, 0.55–0.85|3–6, 0.4–0.9|
|ffaDeaths, ffaHealHp|3, 0.6|2–4, 0.45–0.7|
|dropGunHitRate, energyReserve|0.45, 35|0–0.6, 20–50|
|upgrade values (D6)|table|±30%|

## H. Cut-lines

Not in v1: sound fusion and belief maps; threat heatmaps; roof navigation; any mortar use; virtual guns; the frozen-laser-line dodge and bait (obsolete on the current build); rear-arc openers on squad members that are not hunting; drone drag; utility arithmetic (replaced by the priority list in B); the offline 72-ray bastion precompute; drop overwatch; stuck-pursuer punish; third-party attacks.

v2, by expected gain:
1. Enemy ammo clocks (12 shots, then 2.4 s dead) to time exposure.
2. Emergence-point ambush of a lone pursuer with a pre-charged laser.
3. Per-band accuracy calibration of R*.
4. Laser + lightning pair and lightning-rush tuning.
5. FFA third-party strike on a weakened winner; drop overwatch.
6. Virtual guns against jinking finalists.
7. Roof resets and jet line-of-sight breaks.
8. Perpendicular boost against no-lead laser releases.
