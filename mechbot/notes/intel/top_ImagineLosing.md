# ImagineLosing (rank 12, 5.04): clean-room study and counters

Written 21 Nov 2026 (about 06:30-07:10 UTC). Candidate repository: prakash-218/buildathon-mech (Go, bot
announces itself as "osu-mech"). Everything below is our own prose; nothing from the repository was executed,
and no code, identifier or constant table was copied. Numbers are plain facts about behaviour, read with
`git show` from the read-only clone `intel/prakash-218__buildathon-mech`.

Evidence tags: [read] = read in the decision code of the named version; [official] = score on the practice
board; [their sim] = the team's own simulator, quoted from a commit message; [our sim] = our simulator with
the roster binary `prakash_v5_14b39db` (files `tools/redteam/out/*_top15.json`, `shim_noapproach.json`);
[our model] = small Monte Carlo models written for this note (`tools/top10/jitter_lead_mc.py`,
`tools/top10/reactive_dodger_mc.py`, `tools/top10/hulldown_scan.js`).

## 1. Identity: likely (raised from low), still without a text link

What was re-checked:

| Check | Result |
|---|---|
| Practice board | ImagineLosing has one best time only: 5.04 at 02:30:59 UTC. It never moved in the 04:25, 05:19 and 05:25 UTC snapshots. |
| Commit against that time | The commit titled "v5: weapon rush" is stamped 21:29:34 -05:00 = 02:29:34 UTC, 85 s earlier. Confirmed teams show 48-175 s between commit and board time, so 85 s is typical. ImagineLosing is the only top-50 team whose best time falls within 150 s after that commit (next: SaturdayNightLive 4.04 at +218 s, whyMiso at +402 s). |
| Second track, same owner | The owner also has a Blast Radius repository. Its second version was committed 03:18:24 UTC and pushed 03:18:41; ImagineLosing's Blast Radius best (206.6) is stamped 03:30:41, twelve minutes later. Only 11-12 of the 50 Mech teams are on the Blast top 50 at all, and only 7-9 of the 50 Blast rows sit within 15 minutes after one of the owner's three Blast commits; ImagineLosing is the only team that satisfies the Mech timing and the Blast timing together. |
| Track presence | ImagineLosing is listed on Mech and Blast Radius only. The owner's repositories are Mech, Blast, Sessions (slow enough to be outside that top 50) and an empty CAD repository. Consistent. |
| Later commits | v6 (04:03 UTC) is called "a real-board test"; v7 (04:53) switches its two features back off and builds on v5; v7 and v8 are described as ties with v5 against house bots. A best time frozen at the v5 submission fits. |
| On the real board at all | The v4 message quotes real scores for v1-v3 (3.98, 3.85, 3.27), so the repository was being submitted. |
| Text | No team name anywhere (README, commits, bot name, other repositories). "osu-mech" refers to the map (Ohio State campus), not to a team. |
| Alternative | Kyt0V0/Mech-Royale (Rust) pushed four experiments at 02:27:07-02:27:20 UTC, 219 s before the best time, has no other-track repository, and only made its "no hunting" experiment the standard at 04:21. It fits one track loosely; the prakash repository fits two tracks tightly. |

Verdict: **likely**. If it is wrong, the most probable alternative owner of this code is SaturdayNightLive
(4.04), in which case v5 is a 4.0-class bot. Either way the roster binary is a real opponent, and the public
head (v8) is what its authors call their candidate for the final.

Exact scored version: **v5, commit 14b39db** (02:29:34 UTC). Also read: the v5 to v7 difference (commit
3d405fc) and the v7 to v8 difference (commit 6cb7830, fetched read-only; it is the public head at 05:46 UTC).
v6 itself (f3e0fa0) is not in the clone; its two features are visible in the v7 difference.

Text aimed at AI agents: none found. Commits carry an AI co-author trailer; that is attribution only.

Lineage: original code. No file is shared with any other repository in `intel/` (checked against the shared
blob index). From v6 on the authors add two ideas "seen on the leaderboard #1" by watching it play (a full
torso scan while travelling, and ducking into cover to reload and charge).

## 2. How v5 plays [read]

Structure: one Go program, about 1300 lines of decision code plus a map raster (1 m solids, 2 m walk grid,
A* with at most 10 000 expansions, replanned every 2.5 s). Decisions take about 0.5 ms; a crash in a decision
repeats the previous action without firing. Randomness comes from the hello seed only. A rooftop module
exists but is switched off.

**Target.** Every mech in the observation is a candidate from the first second (no opening truce, no
"hostile only" filter). Score = target hp + 4 x distance, +600 when its body centre is not in line of fire,
-250 for the current target; lowest wins. Who is shooting at it plays no part. Drones are shot only when no
mech is listed, within 110 m, at own hp above 45%. Crates are shot from where it stands, out to 140 m, when
nothing has damaged it for 3 s.

**Line of fire.** One ray from its muzzle to the target's body centre (height scaled by cubes). That single
test gates the gun, the start of a laser charge, the laser release and the lightning. There is no second aim
point (top, edge).

**Range by loadout.** Gun only: wants 80 m, walks at the target when beyond 115 m or when the centre ray is
blocked, backs away inside 50 m, otherwise pure sideways strafe. Gun + laser: wants 130 m, band 100-165 m.
Lightning without laser: wants 28 m but only approaches beyond 63 m and never backs away. No boost in a
fight.

**Strafe.** Perpendicular to the line to its target, direction reversed at random intervals of 0.35-1.15 s
(mean 0.75 s; 0.4-1.2 s as seen on the 0.1 s decision grid). With the acceleration limit, a reversal brings
it back to the reversal point after 0.4 s, so a typical leg displaces it 4-5 m and the longest about 9 m. It never jumps in a fight; the only hop is an
unstick move (jump plus 0.7 s of jet after 0.8 s without progress).

**Dodging.** (a) Bullets it can see that would pass within 4.5 m in the next 1.2 s: sidestep at walk speed,
perpendicular to the bullet, away from the passing point; this outweighs the strafe. (b) A mech with the
charging flag whose aim line passes within 8 m of it: sideways boost for as long as the flag is up,
direction tied to the strafe timer; no cover is sought; boost is suppressed while its own laser charges.
(c) Mortar shells landing within 12 m: boost away.

**Gun.** First-order intercept on the instantaneous velocity with 0.05 s allowance, gravity arc for airborne
targets. Fires whenever the magazine is loaded, the centre ray and the ray to the lead point are clear, the
range is under 230 m, and the torso is within 0.9 radius + 0.4% of range of the lead point. No long-range
gate. Tops the magazine up (2.4 s) the moment it has no target and no crate to shoot.

**Laser.** Starts a charge only with a clear centre ray inside 270 m. Aims with the gun lead until 0.25 s
before full, then straight at the body. Releases only at full charge (within 0.02 s), with a clear ray and
the torso within 0.8 radius. If the ray is lost it keeps holding; the server fires the beam 2 s after full.
No partial or finishing shots. No reaction to being shorted by lightning.

**Lightning, mortar.** Lightning inside 95% of range, within 12 degrees of its aim, with 11 energy in hand.
Mortar only when the gun is busy and the laser is not charging, beyond 25 m, high arc when the ray is
blocked, linear lead.

**Retreat.** Only below 15% hp against a target with more than 1.5 times its hp: then the nearest ring cell
(12-48 m) hidden from the target. In effect it fights to the death. No heal state.

**Economy.** Second slot wanted in the order laser, lightning, mortar; the gun is never dropped. The v5
change: whenever the second slot is empty (or holds something worse than a remembered laser/lightning), it
walks to the nearest remembered laser or lightning within 140 m (memory 90 s, laser favoured by 20 m), even
in the middle of a fight, as long as hp is above 20% and the zone is not urgent. During that walk it does not
strafe and does not boost, and keeps firing at its target. Out of contact: weapons within 90 m (laser 162 m),
cubes within 90 m; with a mech listed those radii drop to 30 m (laser 54 m). Supply drops within 220 m when
no mech is listed (40 m otherwise): it walks to the ring centre as soon as the drop is called and stands
there, spinning its torso, up to 25 s before the landing. No roof loot.

**Upgrades.** plating, armor, laser damage, nanites, gun damage, laser charge, gun rate, then the rest.

**Zone.** Moves when it is outside (next radius minus a margin of 30% of that radius, 4-35 m) and the trip
at walk speed leaves less than 12 s of slack, or when it is within 8 m of the moving edge; boosts when
outside or above 50 energy. With nothing to do it creeps silently (stick 0.42) to a point 45% of the next
radius (at most 60 m) from the next centre, on its own side. In the last circle it stands on the centre in
the open and strafes.

**Looking around without a target.** Faces the last damage bearing for 3 s, a sound for 2.5 s, the last
track for 4 s; otherwise, while moving, 2 s ahead, 1 s about 90 degrees left, 1 s about 90 degrees right
(a 56 degree rear sector is never looked at); standing still it spins a full turn every 1.6 s.

## 3. What changed after the scored version [read]

- v7 (their "free-for-all candidate"): flee is on. When two or more mechs damaged it in the last 3 s and hp
  is below 70%, or hp is below 35% against a target with more than 1.1 times its hp, it boosts (above 15
  energy) in a straight line directly away from the average position of the mechs it can see, 35 m at a
  time, bending toward the zone if needed. No cover, no strafe, still firing at its target.
- v8 (public head): "duel cover" is on as well. In a fight with a clear ray, beyond 25 m, when the magazine
  is empty or reloading and the laser is neither ready nor charging, it walks to the nearest cell within 5,
  9 or 13 m that the target cannot see, may start its laser charge there without a ray, waits until the gun
  is loaded and the laser full (at most 5 s), then walks back to the exact spot it left (gives up after 9 s
  in total). It does not strafe during either walk and does not re-check the hide cell if the target moves.
- There is no free-for-all detector in any version: the behaviour is fixed at build time. Other new
  switches (cube grabs in contact, drops in contact, two special weapons, laser-carrier priority, full scan)
  exist but are off.

## 4. Why it scores

1. **A second weapon almost every match.** Authors' note for v5: before, it "never got a second weapon" in
   half of their simulated matches; with the mid-fight weapon walk their simulator gave +1.73 +/- 0.45 over
   v4 on 64 paired seeds, kills per match 4.0 to 5.6 [their sim]. On the board, if the identity holds, the
   v1 base scored 3.98 and v5 5.04: **+1.06 [official, a bundle of three changes:** weapon walk, retreat
   threshold lowered from 30% to 15%, laser search radius x1.8**]**. In our simulated free-for-alls the same
   binary finished 6.3rd on average when it ended with a laser (n = 54) and 11.6th with the gun only
   (n = 27) [our sim; survivorship inflates the gap].
2. **It stopped being careful.** Their own official A/Bs: more retreat, resting between fights and
   multi-threat cover 3.98 to 3.85 (-0.13); cover spots, hiding from charging lasers, peeking and charging
   behind cover 3.98 to 3.27 (-0.71). v4 went back to the aggressive base [official, multi-change].
3. **Clean basics.** Exact map ray with 0.5 m steps, iterated gun lead, a clear-path test to the lead point,
   trigger held on the gate, full-charge laser discipline, bullet sidestep, zone timing with 12 s slack,
   tank-first upgrades, 0.5 ms decisions with crash recovery (never late).
4. **Mid ranges.** 80 m with the gun, 130 m with the laser, inside the bands our doctrine already uses.

## 5. Free-for-all behaviour

- Detector: none. Posture: identical to practice in v5; v7/v8 add flee and duel cover as fixed defaults.
- Habits that matter in a field of teams: fires at anything it sees from the first second; prefers wounded
  and near mechs; never turns to a new attacker while it has a target; walks straight at a tracked target it
  cannot see; fights to the death (v5) or runs in a straight boosted line (v7/v8); stands in drop rings.
- Recorded real free-for-alls: none (ImagineLosing does not appear in any showdown record).
- Our simulator, v5 binary in 16-bot fields of the strongest public bots, four runs of 24 seeds (same seeds,
  our own bot in different postures, so not independent): mean place 8.1 to 9.2 (score 6.8 to 7.9), mean
  survival 75-93 s, median death at 55 s, 27% dead inside 30 s, 8 wins in 96. Deaths: 48% laser, 36% gun,
  7% lightning. About 60% of its kills are made with the laser. It killed our bot in 7 or 8 of the 96 matches.
  Simulator grade only.

## 6. Lessons for our practice bot (compare Doctrine V4)

1. **Laser pickup radius in contact: 140 m here against our 60 m (D6).** Their step to 5.04 rests on walking
   up to 140 m to a remembered laser or lightning in mid-fight, firing on the way, hp above 20%. Grade:
   [1 team, official +1.06 for a three-change bundle, identity likely; their sim +1.73]. D6 allows 60 m for
   a laser and 35 m for other weapons and warns against long detours (three small negatives elsewhere).
   Disagrees in size, agrees in direction. Action: make the in-contact laser radius a preset (60 / 100 /
   140 m) and extend weapon memory to 90 s; test 140 m on the real scorer before trusting it.
2. **Hide/peek cycles lose in practice: -0.71 [official, 1 team, 4 changes].** Agrees with D3 ("do not hide
   when not LOSING") and D11 (peek cycles are free-for-all tools). The losing bundle included "hide from
   charging lasers", which is exactly the D4 laser cover step. Keep that step at 6 m (9 m boosting) and give
   it a preset that turns it off in SQUAD.
3. **Almost no retreat still reaches 5.04.** Retreat only below 15% hp and a 1.5 times healthier target; no
   heal state. Their "more retreat" variant cost 0.13 (inside noise). Grade [1, contested]: the 5.58 bot
   lost 0.41 without its low-health retreat. Keep D3 thresholds (35 / 50 / 60%), do not raise them.
4. **Strafe interval: 0.35-1.15 s here (and 0.35-1.05 s in the 5.19 bot) against our U(0.8, 1.6) s with
   "never faster than 0.8 s" (D4).** Two bots at 5.0+ use the fast interval. Our model: a first-order-lead
   shooter (how house bots aim) hits the fast strafer 63 / 41 / 33 / 20% of the time at 50 / 80 / 100 /
   130 m, the slow one 76 / 60 / 52 / 36% [our model, no spread]. The single official negative for fast
   reversals (-0.69) has no published values. Disagrees with D4. Action: add a preset U(0.35, 1.15) and
   test it; never go below 0.35 s (a reversal needs 0.4 s to produce any displacement).
5. **Range bands agree with D2.** Gun 80 m (50-115), laser 130 m (100-165): between our `mid` (115 m) and
   `far` (150 m) presets. Grade [1]. No change; 130 m is a third point for the laser-range decision.
6. **Bullet sidestep trigger: 4.5 m and 1.2 s here against 3.7 m and 0.9 s in D4.** Same idea, wider gate,
   no measurement. Agrees with D4; keep ours.
7. **Shoot-on-sight targeting reached 5.04**, against D5/D0 (hostile first, opening guard). In practice every
   opponent hunts us anyway, so the two rules rarely differ; three official negatives for starting fights
   stand. No change.
8. **Upgrades**: plating, armor, laser damage, nanites. Same head as D7 (ours has nanites before laser
   damage). Agrees, [1, no A/B].
9. **Drop rings**: it waits in the ring before the landing; D6 forbids that. No measurement here; keep D6.
10. **Engineering**: fixed work per decision, seed-only randomness, sub-millisecond answers, crash recovery
    that repeats the last action without fire. Agrees with D10.
11. **Their simulator against their board**: +1.73 predicted for a step that was at most +1.06 on the board;
    v6 was "a tie" in the simulator and did not beat v5 on the board. Same caution as our own notes: sign
    usually right for economy changes, size too large.

## 7. Limitations (checkable)

1. Single-ray line of fire to the body centre gates every weapon; no edge or top aim point. A target whose
   centre is masked cannot be fired at, and the bot walks toward it instead.
2. No reaction to attackers that are not its target: the damage bearing is used only when it has no target.
   With a 120 degree view it does not even list a mech that is outside the wedge and beyond 45 m.
3. Bullet sidestep needs to see the bullet: from outside its view wedge a bullet becomes visible at 45 m,
   0.18 s before impact, too late to move a metre.
4. Its strafe is perpendicular to its own target; seen from 90-120 degrees off its aim the motion is mostly
   radial (lateral share 0-50%), so it stays inside its own radius for a shooter there.
5. Laser dodge is a sideways boost, useless against a tracked hitscan beam, and costs it 17 energy per
   second of our charge. It is switched off while it charges its own laser, when it also moves at half speed.
6. Laser: full charge only, charge start needs the centre ray (v5), a lost ray means up to 2 s of holding and
   a beam into the wall, then 1.65 s of cooldown. No finisher with a partial charge. No handling of
   lightning shorts and no extra distance to lightning carriers.
7. Gun lead is first order on the instantaneous velocity; no gate on flight time: it fires out to 230 m.
8. Fights to the death in v5 (15% rule); in v7/v8 it flees in a straight boosted line without cover and for
   at most about 5 s of boost (97 m). No heal state in any version; shooting crates and drones keeps
   resetting its own repair timer.
9. Weapon walk: straight path, no strafe, no boost, in the open, from 21% hp upward; destination is the
   nearest remembered laser or lightning within 140 m, so it is predictable.
10. Gun-only variant is weak (our sim: place 11.6); 27% of its simulated free-for-alls end inside 30 s
    because it opens fire on everything.
11. With lightning and no laser it lingers at 43-63 m, outside its own arc range, without closing.
12. Tops up the magazine the moment it has no target: a 2.4 s window without a gun starting 5.0 s after a
    clean sight break (if it fired at all and no other mech, drone or crate is in view).
13. Walks at a tracked target it cannot see, at about 10 m/s, laser not charging (v5), for up to 5 s after
    the last sight; then forgets the mech completely.
14. Stands still in drop rings (from the call) and on the final centre; rear sector unwatched while
    travelling; mortar use is a slow high arc with linear lead; carrying a mortar gives our laser +60%.
15. v8 only: reload hide cell chosen once and not re-checked; it stands still there for 2.4-5 s and returns
    to the same spot.
16. Zone slack is computed on straight-line distance, not path length: it can be late around buildings.

Measured and rejected: "hull-down" cells (our muzzle sees its centre, its muzzle does not see ours) would
shut this bot out completely, but our scan of the real map finds one within 20 m of a duel position in only
0-2.4% of duels at 60-150 m [our model]. Not worth building.

## 8. How to recognise it (mechs are anonymous)

1. Sideways jitter perpendicular to its own aim, walk speed, no jumping, no boost while fighting. Timer
   reversals come 0.4-1.2 s apart as seen on decision ticks (never a leg longer than 1.2 s); extra
   reversals appear only when it sidesteps a bullet it can see.
2. Distance keeping: gun only, stops approaching at 115 m and backs off inside 50 m; with a laser, 165 m
   and 100 m. With lightning and no laser it stays anywhere inside 63 m.
3. Charging flag only appears while it has a clear line; the beam always comes 0.75 s after the flag, never
   earlier; if we step behind cover the flag stays up until a beam hits the cover up to 2.75 s after the
   flag appeared; its torso keeps following us through the wall.
4. While our own laser charges with our aim within 8 m of it, it sprints sideways (about 19.5 m/s) for
   exactly as long as our flag is up.
5. It reverses within about 0.2 s of a bullet being fired at its lead point when it can see us.
6. It keeps its torso on its current target while a third mech hits it; it fires at mechs at any distance up
   to 230 m from the first second of the match.
7. A gun-only (or gun + mortar, gun + lightning) mech that stops strafing and walks in a straight line, not
   boosting, still firing, to a laser or lightning pickup up to 140 m away.
8. When our centre is masked it stops firing at once and walks straight toward us.
9. Without a target: 4 s head cycle while moving (2 s ahead, 1 s left, 1 s right), full spin every 1.6 s
   when standing; silent creep at about 4.9 m/s to 45% of the next radius; stands in a drop ring from the
   call; shoots crates from up to 140 m.
10. max_hp steps: plating first, so 1400 x 1.04 per cube x 1.15 per plating (1674 after the first cube when
    plating was offered).
11. Never retreats above 15% hp (v5). v7/v8: below 35% hp, or below 70% with two attackers, a straight
    boosted run away from the mechs it sees. v8: after its twelfth shot it steps 5-13 m behind cover and
    returns to the same spot 2.4-5 s later with a charged laser.

## 9. Counters, ordered by expected gain in a free-for-all

"General" says whether the rule is safe against any bot with the same signature.

**C1. Rear-quarter third party and the hand-off (largest gain; general: yes, with the abort rule).**
Trigger: a mech whose torso stays on another mech (aim more than 60 degrees off our bearing, firing or
strafing around its target), or our own attacker when a second mech is in its view. Action: (a) hand-off:
step behind cover for at least 0.2 s; its hidden-target penalty is worth 87 m of distance, so it switches to
any other visible mech of similar hp within about our distance + 85 m, and its aim swings away (the server
keeps listing it at its true position for 5 s; if the aim field of a tracked mech turns out to be stale,
wait until it is seen firing at the other mech). (b) Place ourselves 50-150 m from it at 100-120 degrees off
its aim: outside its view wedge, in its rear arc (x1.5), its strafe mostly radial for us. For the first 5 s
after it last saw us we are still on its list, so also keep (our hp + 4 x our distance) above (its target's
hp + 4 x its target's distance) - 250: in practice be healthier and farther away than its target. After 5 s
unseen it does not list us at all. (c) Fire
with zero lead at the centre of its oscillation: 12 gun hits and two full beams in 3.2 s are 1755 raw damage
with the rear multiplier (about 1330 after three armor upgrades). Abort when its aim comes within 60 degrees
of our bearing, when a second mech aims at us inside 160 m, or when our hp is under 55%.
Doctrine: this extends D11's third-party rule; its "under half hp" condition can be dropped when the angle
and score conditions hold. Exploits: limitations 2, 3, 4. Backfire: a hostile-first bot turns within 0.4-0.8 s (100-120 degrees at
4 rad/s); we have then dealt the opening damage and step back to cover; the loss is bounded by the abort
rule. v7/v8 run away in a straight line once under 70% with two attackers: keep the beam on it, do not chase.

**C2. Corner play against its laser (general: yes; this is D4/D11 with this bot's exact timings).**
Trigger: gun + laser mech holding 100-165 m with the full-charge-only signature. Action: fight only from a
cell with a hide cell within 6 m (9 m boosting). Expose for at most 0.6 s per peek and release our own full
charge during the peek. Once its flag has been seen, stay hidden until its beam is heard or 2.9 s have
passed, then peek again inside the 2.4 s in which it cannot fire a beam (1.65 s cooldown + 0.75 s charge):
one 315 beam from us per 2.9 s against stray bullets. It walks toward us while we are hidden (5 m/s while it
holds a charge, 10 m/s otherwise): relocate to the next corner when it is inside 40 m, or finish it there.
Exploits: limitations 6, 13. Backfire: a bot that releases partial charges or pre-charges out of sight (v8
can, during its reload hide) hits a peek; bound by the 0.6 s exposure and by never re-peeking at the same
cell twice against a mech whose flag was already up when it appeared.

**C3. Kill it before the second weapon (general: yes for the straight-line walker).**
Trigger: weapon list shows no laser, and it walks a straight line without strafing or boosting (often toward
a pickup we can see, up to 140 m from it). Action: prefer it as a target while we hold a laser; keep
115-150 m (it stops approaching at 115 m; its bullets need 0.46 s or more, which our bullet-aware dodge
beats); treat its path as a straight line to the pickup for the gun lead; put the beam on it as it reaches
the pickup (it must come within 4 m, and a weapon it takes cannot fire for 1.65 s if it is a laser, 1 s if
it is lightning). Expected exchange at
120 m (our estimate, not measured): about 155 dps from us (laser 125, gun 30) against 25-45 from its gun.
Exploits: limitations 9, 10, 7. Backfire: a third party arrives; standard LOSING thresholds apply. A
different bot may boost along the same line: the laser still lands, the gun lead must use its real velocity.

**C4. Gun aim rule against the bullet-sidestepping jitter (specific; not a general rule).**
Trigger: the target can see us and reverses within 0.2 s of our shot at least three times in a magazine, or
our hit rate over the last 12 shots is under 30%. Action: replace the time-of-flight lead by a fixed lead of
2 m in the direction it is currently being driven when inside 90 m, 3 m at 90-110 m; hold the gun beyond
110 m unless it is charging (half speed) or cannot see the bullets. Our model, target as described, hit
rates at 60 / 80 / 100 / 130 m: first-order lead 61 / 31 / 20 / 9%; fixed 2 m 87 / 73 / 40 / 22%; fixed
3 m 65 / 69 / 49 / 33% [our model, 0.6 degree spread]. Against the same strafe without the sidestep, a
motion model that integrates the acceleration limit toward the observed drive direction scores 91 / 80 / 69 /
53% against 56 / 45 / 34 / 24% for first-order lead.
Exploits: its sidestep is "away from the passing point", so a bullet just ahead of it forces a reversal
that takes 0.4 s to leave the spot. Backfire: against a steady mover a 2 m lead misses (it needs 6 m at
80 m); bound by the trigger and by reverting when the hit rate over 12 shots does not improve.

**C5. Strike in its reload window after a 5 s sight break (specific).**
Trigger: we broke sight for 5 s, it had fired, and no other mech is near it. Action: prefer to reappear
5.1-6.5 s after the break with a full charge: its gun is in a 2.4 s top-up and its laser needs 0.75 s from
first sight. Worth one beam plus 4-8 bullets unanswered. Exploits: limitation 12. Backfire: no window if
it had a full magazine or another target; cost is nil because we only shift the timing of a re-engagement
we wanted anyway.

**C6. Pull it round a corner; edge aim first (edge aim general: yes; the pull: specific).**
Trigger: it is our attacker and loses its ray to us. Action: it walks to our true position at about
10 m/s for up to 5 s (refresh its track with a 0.3 s peek every 4.5 s to keep it coming). Wait behind the
corner with a held full charge (start charging when its path distance is under 25 m; a full charge can be
held 2 s). Add two lateral aim points at three quarters of the radius to our aim ladder: its leading edge
is hittable 0.25-0.6 s before its centre clears the corner, and it cannot fire until then. If we hold
lightning, stay inside 42 m afterwards: every arc keeps its laser offline for 2 s, it has no rule against
that and backs away at only 10 m/s. Exploits: limitations 1, 13, 6. Backfire: a bot that pre-charges out of
sight arrives with a beam ready: release and step back in the same decision; never wait in the open.

**C7. v8 reload hide (specific to the public head).**
Trigger: after its twelfth shot it walks 5-13 m out of sight beyond 25 m range. Action: do not stay in
sight of the spot it left (it returns there with a full charge and releases on the first clear ray).
Use the 2.4-5 s to move 25-45 m around until its hide cell is visible: it stands still there with an empty
magazine. One beam and 6-8 zero-lead bullets, about 630 damage, for at most one beam back.
Exploits: limitation 15. Backfire: a bot that re-evaluates its cover moves again; we have lost nothing but
position, so only do it toward our own next cover cell.

**C8. Places where it stands still (general: yes, low gain).**
Final circle: it stands on the centre in the open; take the hard-cover cell nearest the centre early
instead of the centre itself. Drop ring: from the call it stands within 2 m of the ring centre and spins;
a full beam from 150-200 m out of cover is free once, and a fight near the ring freezes its capture. Idle
point: 45% of the next radius from the next centre, creeping silently. Below 35% hp it never recovers
(v5 stays in its band; v7/v8 run straight): commit to the finish, two beams end a fleeing one.
Backfire: drop rings attract third parties; keep D6's rule of never entering a contested ring.

## 10. What could not be established

- No text ties the repository to the team; the link is timing on two tracks.
- Which build they will field in the final is unknown; the public head is v8 (flee + reload hide).
- No real free-for-all record of this bot exists; all match statistics are from our simulator.
- The official effect of the weapon walk alone is not isolated (three changes between 3.98 and 5.04).
