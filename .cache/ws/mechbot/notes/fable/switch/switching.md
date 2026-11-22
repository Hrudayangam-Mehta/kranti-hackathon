# switching.md — reward-based mode and target switching (Fable panel, designer 2 of 5)

Written Sun 22 Nov. One author; a design, not a build, and not independent review. Nothing was run: no simulator
batch, no identity run, no official slot. Tags: [M] official, [S] simulator (behaviour only), [C] read in the code
(ckpt_07_LG; line numbers are of that tree), [A] my arithmetic, [N] no evidence.
Base: FNV_s1 (5.38, loseCover 'never', aggr 'any70f', seek 'on', salt 1).

## 0. Verdict

1. The fixed priority list is not where the points are lost. `decideMode` [C tactics 447-501] already puts ZONE,
   last stand and LOSING first, and 'never' has removed nearly every retreat. Six official steps say leaving a fight
   loses [M]. So the utility selector must NOT own DISENGAGE. It prices it and logs it, and the base rule acts.
2. The points are in two decisions that are made before `decideMode` and are fixed constants today:
   - **when to fire the first shot on a mech that is not yet hostile** (today: hp >= 70%, at once, any k) and
   - **which mech to shoot when two or three have lines** (today: nearest x 1.3 stick, then a forced torso veto
     about 9.4 times per match [S]).
3. The rule that makes "pause" a real mechanic: regeneration needs 5 s **without dealing or taking** damage
   [protocol 291; mechanics_deep 102-115]. One hit on a far mech or a drone costs up to 225 hp. Walking and looting do
   not reset it. So a pause is "withhold the first shot", not "stand still". We may walk, loot and take a better
   position while the hp comes back.
4. Preset `util: off / tgt / wait / on`. `off` is byte-identical by construction. Three sites in tactics.js, one in
   brain.js, one new file lib/util.js (about 120 lines), params. All behind `P.util*` AND `B.env !== 'FFA'` AND
   `hunt.firewall()`.
5. Size, honestly: `tgt` and `wait` each touch most matches (a re-roll of salt 1, class H). My estimate is
   +0.1..+0.3 for `tgt` and -0.2..+0.6 for `wait` [A], signs unproven; the one official point near `wait` (healDoc
   'on', -0.21) is negative, and section 6 says how this differs. Neither reaches 9 alone. Section 7 gives the
   arithmetic of what 9 needs: it is the entry hp into the escalation fights, which is what `wait` moves.

## 1. Game facts the selector is built on

| Fact | Source | Used for |
|---|---|---|
| Point = a house death before ours; inside the firewall every such death is our kill | rules; [S 49/49] | k = `B.cfg.match.mechs - B.aliveN` = our kills |
| P(next fight has 2+ lines) = 0.34 / 0.53 / 0.66 / 0.75 / 0.82 at k = 0..4; fit Pm(k) = 1 - 0.66 x 0.72^k | [S RW] | price of hp |
| 2+ attacker fights: entry at 80-100% hp gives 2.43 kills, P(death) 0.55; entry at 60-80% gives 1.78, 0.78 (n 42 / 9) | [S RW] | 280 hp = 0.65 kills, so 0.0023 pt/hp in a multi-line fight |
| 1 attacker: entry hp above 40% changes nothing | [S RW] | hp is nearly free at k = 0 |
| Fresh hunter, one line: 1.14 pt in 15-20 s gun only (0.067 pt/s), 7-8 s with a laser (0.15 pt/s) | [A RW 2.1] | value of opening now |
| Regen 45 hp/s after 5 s with no damage dealt or taken; drone hits reset it, crate hits did not (old build) | protocol; [S][R] | value of waiting |
| Hunters arrive 13-35 s after our kill, from 150-400 m, on our true position (shared vision) | [A psych] | how long a wait can last |
| House gun: 12 rounds in 3.3 s, then 2.5 s silent; never reloads early; first shot 0.25-1.15 s after a line opens | [R 72/72, 77] | a silent attacker is worth 0 dps now |
| Last 9.7 s of life: 1450 damage dealt (one mech = 1400), 2.5 target changes, target at 46% hp at death | [S r1_game] | target switching |
| Leaving: LC on +0.06, low 0.25->0.15 +0.02, ->0.10 +0.04, 'never' +0.03, cover 2.0 -0.02, healDoc on -0.21, FHE40 -0.06 | [M] | DISENGAGE and HEAL thresholds stay with the base |

## 2. The utilities (points per second)

Shared numbers, computed once per decision in `util.pre()` (after `assess`, before `selectTarget`):

```
k     = max(0, B.cfg.match.mechs - B.aliveN)            // our kills while the firewall holds
Pm    = B.nLos >= 2 ? 1 : 1 - 0.66 * 0.72^k
lam   = me.hpf < 0.40 ? P.uLamLow (0.0036) : Pm * P.uLamMid (0.0023)      // pt per hp
IN    = max(B.A, IN_prev * (1 - dt / 3))                // incoming dps, peak held for about 3 s
Td    = me.hp / max(IN, 20)                             // seconds we have left at this rate
quiet = t - max(me.lastHurtT, lastDmgOutT)              // lastDmgOutT = max of tr.lastDmgOutT, kept by util
regenIn = max(0, 5 - quiet)                             // seconds until regen runs (0 = running)
```

**FIGHT a given mech `tr`** (current or another):

```
T     = ttk(tr) < 99 ? ttk(tr) : tr.tau                 // hunt.ttk caps at 8 s; tr.tau = hp / our dps [C tactics 83]
T    += tr === B.target ? 0 : slewTime(torso -> tr)     // aim.js slewTime, me.turnRate
T    += tr.losOut ? 0 : P.uRegainS (1.0)
pK    = clamp((Td / T - 0.6) / 0.8, 0, 1)               // kill finished before we die: 1 at Td >= 1.4 T, 0 at Td <= 0.6 T
aNow  = silent(tr) ? 0 : tr.a                           // silent: magN >= magSize and last bullet < magReloadS - 0.8 ago,
                                                        //         and no laser that has been quiet for > 1.4 s
relief= lam * aNow * min(P.uReliefS (4), Td)            // hp its death saves us, in points
U_F(tr) = pK * (P.uKill (1.14) + relief) / T
```
This is the ratio rule for "most jobs finished before a deadline": the shortest remaining kill first, weighted by the
dps it removes. Sunk damage needs no extra term: it is inside `tr.hp`, so the mech we have already hurt has the short T.

**WAIT (withhold the first shot; HOLD or LOOT legs keep running)**, only out of contact:

```
W     = regenIn + (hpTop - me.hp) / 45,  hpTop = P.uWaitTop (0.95) * maxHp
U_W   = me.hp >= hpTop ? -0.003 : lam * 45 * (W - regenIn) / W        // 0.035 / 0.054 / 0.068 / 0.078 / 0.085 pt/s at k = 0..4 when regen runs
```
**OPEN on a non-hostile mech** = `U_F(tr)` with pK = 1 (nothing is hitting us), x `rearMult` when `tr.rearOn && !tr.aimAtMe`.

**SEEK**: `U_S = U_F(prey) * T / (T + walkS)`. Walking does not reset regen, so SEEK and WAIT are not rivals: we may
walk to the prey while waiting. The only change to seek is its arrival distance (section 3, W1).

**HEAL**: `U_H = lam * 45 * (W - regenIn) / W` with hpTop = healExit; it differs from WAIT only in the legs (hide cell,
fire held). The base entry predicate stays (hp < 55%, quiet 1.5 s), because both moves of it lost officially.

**LOOT / DROP**: `U_L = value / (pathS + 0.5)`; value 0.10 per cube (1-5), 0.06 (6-9), 0.01 (10+), 0.5 for a floor laser
while gun only, 0.14 for a kill drop inside 8 s [RW]. `U_D = 0.005` (measured chases -0.21 / -0.08 / +0.02 [M]).

**DISENGAGE**: `U_X = -lam * IN * 1.7 * min(tCover, 4) / 4 + lam * 45 * 0.5` (walking to cover takes 72 against 42 hp/s
[S]). Logged in `counters.uX*` only. The action stays with `losing()`: 'never' is the best official value.

### Thresholds this gives (where WAIT beats OPEN, margin 1.25)

| loadout | U_open | k = 0 | 1 | 2 | 3 | 4+ |
|---|---|---|---|---|---|---|
| gun only | 0.067 | open (0.035) | open (0.054) | tie (0.068) | **wait** (0.078), if no margin is asked | **wait** (0.085), also with the 1.25 margin |
| laser held | 0.15 | open | open | open | open | open |

Note: the prices put the gun-only line between k = 2 and k = 4, which is inside their error. So the line is one
integer key, `uWaitK` (default 3): from k >= uWaitK a gun-only bot waits when U_W > U_open (no margin), a laser holder
only when U_W > 1.25 x U_open (never, at these prices). A mech that shows its rear and is not aiming at us has
U_open x 1.5 = 0.10 and is opened on at every k. The two values worth a slot are 3 and 2.

## 3. Wait types (the owner's "pause when needed, then move")

Each has an entry test, what the legs do, the interrupts, and a time limit. None is a new mode: W1 and W4 are a gate
in `selectTarget` plus HOLD legs; W2 and W3 already exist and are listed so nobody adds them twice.

| Type | Entry | While waiting | Ends at once when | Limit |
|---|---|---|---|---|
| W1 regen wait | out of contact (no hostile, `B.nLos` 0, not hurt for 1 s), k >= uWaitK, hp < 95%, U_W > U_open of every withheld mech (x 1.25 with a laser) | non-hostile mechs are not candidates; no drone farming; loot and kill-drop pickup go on; legs: `uWaitLegs` (below); torso on the nearest withheld mech | any mech turns hostile; a mech has a line inside 70 m; hp >= 95%; a withheld mech becomes finishable; zone urgent | 14 s, then 6 s lock-out |
| W4 let it come | W1 holds, or laser held, and the withheld mech closes at > 1 m/s inside 240 m | stand at the cell, do not walk toward it (house bots close on us: 66% of laser fight time is inside 100 m [S]) | it enters our band (`bandFor().hi`), or stops closing for 2 s | 8 s |
| W5 after a kill | our kill inside 8 s and `B.nLos` <= 1 | LOOT the drop first (0.14), W1 rules for opening | as W1 | 8 s |
| W2 own reload (exists) | brain 459 close-in rule | unchanged | | |
| W3 beam (exists) | `chargeHold`, laserRange band | unchanged | | |

`uWaitLegs` (in `holdLegs`, before `hunt.seekLegs()`): if `B.hide.state === 'found'` and the cell is within 2.5 s,
walk to it and stop; else stand still. If seek has a prey, walk to it but stop at `arrive + 60` m (stay outside its
45 m all-round vision and its aim clause) until the wait ends. `B.legKind = 'uwait'`.

## 4. Hysteresis and dwell

| Switch | Rule | Bypass |
|---|---|---|
| target (tgt) | change only if U_F(new) > 1.3 x U_F(cur) on two decisions in a row AND `t - B.targetSince >= 1.5` | cur dead, cur out of line for > keepNoLosS, new one is finishable and cur is not, U_F(cur) = 0 |
| WAIT on | margin 1.25, stays at least 2 s | the interrupts of W1 |
| WAIT off -> on again | not for 6 s after a timeout or an interrupt by damage | none |
| mode (tail of decideMode) | today's `modeHold` 0.6 s and `urgent` list, unchanged | unchanged |

The 1.3 equals today's `wStick`; the 1.5 s is three times the slew it protects (0.4-0.8 s). The existing rules "never
leave a target under 25%" and "finishable kept for vetoKeepS" stay in front of the utility pick.

## 5. Exact code sites and pseudocode (about 60 minutes)

**params.js** (PARAMS, PRESETS, SELECT line 283-290):
```
utilTgt: false, utilWait: false, uWaitK: 3, uWaitTop: 0.95, uWaitMaxS: 14, uWaitRearmS: 6, uWaitNearR: 70, uMargin: 1.25,
uTgtHys: 1.3, uTgtDwellS: 1.5, uKill: 1.14, uLamMid: 0.0023, uLamLow: 0.0036, uReliefS: 4, uRegainS: 1.0, uSilentPadS: 0.8, uSilentBeamS: 1.4,
PRESETS.util = { off: {}, tgt: { utilTgt: true }, wait: { utilWait: true }, on: { utilTgt: true, utilWait: true } }
SELECT: util: 'off'
```

**lib/util.js** (new): `makeUtil(B, hunt)` returns `{ pre, uFight, pickTarget, gateOpen, waitLegs }`.
```
pre():   on = (P.utilTgt || P.utilWait) && B.env !== 'FFA' && hunt.firewall(); if (!on) { B.uWait = false; return }
         compute k, Pm, lam, IN, Td, quiet, regenIn (section 2); bestOpen = 0
         waitOk = P.utilWait && k >= P.uWaitK && me.hpf < P.uWaitTop && B.nLos === 0 && t - me.lastHurtT > 1
                  && t >= rearmT && (!waiting || t - waitT0 < P.uWaitMaxS)
         if (waiting && !waitOk) { rearmT = t + P.uWaitRearmS; waiting = false }
gateOpen(tr): // called for a mech that is a candidate only through a non-hostile clause
         if (!on || !waitOk) return true
         if (tr.finishable || (tr.losIn && tr.dist <= P.uWaitNearR)) return true
         u = uFight(tr, true); if (u > bestOpen) bestOpen = u
         enter = U_W > u * (me.laser ? P.uMargin : 1)          // gun only: the uWaitK line is the margin
         stay  = waiting && U_W * P.uMargin > u                // once waiting, leave only when opening wins by the margin
         if (enter || stay) { withheld = tr (nearest); counters.uHold++; return false }
         return true
         // after the candidate loop: waiting = withheld != null (set waitT0 on the rising edge); B.uWait = waiting
pickTarget(pick, cur): // called once, at "let pick = best"
         if (!on || !P.utilTgt || !pick || pick.npc || B.nLos < 2) return pick
         best = argmax U_F over candBuf mechs with losOut or losIn inside 1 s (at most 6, nearest first)
         if (cur is such a mech) { if (U_F(best) > P.uTgtHys * U_F(cur)) n2++; else n2 = 0
                                   return (n2 >= 2 && t - B.targetSince >= P.uTgtDwellS) || U_F(cur) === 0 ? best : cur }
         return all U_F === 0 ? pick : best
```

**tactics.js selectTarget**, three edits:
1. line 245-251, after `if (gate && !ofAnswer(B, tr, t)) ok = false`:
   `if (ok && !tr.hostile && B.util && !B.util.gateOpen(tr)) ok = false`
   (hostile mechs, the commit, FIN-armed kills and the current target hit within 5 s are never withheld: test
   `!tr.hostile && !(tr === B.target && t - tr.lastDmgOutT < 5)`).
2. line 334, after the keep-target block (336-339): `const uP = B.util ? B.util.pickTarget(pick, cur) : pick; const uOwn = uP !== pick || (B.util && B.util.owns()); pick = uP`
3. line 353: `if (!keep && !uOwn && (candBuf.includes(att) || ...)) pick = att`. With `utilTgt` and 2+ lines the
   utility already weighed the attacker (its `relief` term), so the forced 80-degree switch is skipped; `aimVetoes`
   still counts. With `B.nLos < 2` `owns()` is false and the veto is today's.

**tactics.js decideMode**, one edit at line 491: nothing in the chain moves. `B.uWait` needs no branch: with the
candidates withheld `tgt` is null and the chain falls to DROP / LOOT / HOLD as today. Add only, after line 500:
`if (B.uWait) B.farmHold = true` and have economy's farm pick read it (no drone farming in a wait: a drone hit resets
regen). If that economy edit costs more than 10 minutes, skip it: `farmHp` '90' already blocks farming under 90%.

**brain.js**: create `B.util = makeUtil(B, hunt)` after line 252 only when `P.utilTgt || P.utilWait` (else `B.util`
stays undefined and every site short-circuits: this is the byte-identity argument); call `B.util.pre()` between
`hunt.pre(obs)` (649) and `selectTarget(B)` (650); in `holdLegs` (350), first line:
`if (B.util && B.uWait && B.util.waitLegs()) return`.

Cost: at most 6 `hunt.ttk` calls (160 steps each) per decision, about 0.05 ms. No ray casts. The 50 ms budget is not
touched (decisions 1-8 ms today; the 'wait X ms' on the result page is queue time, not ours).

## 6. Why `wait` is not healDoc 'on' again

healDoc 'on' (enter HEAL at 70%, leave at 80%) lost 10 kills [M, one draw; a full re-roll has sd about 0.2].
Differences: (a) `wait` starts at k >= 3, healDoc acted from k = 0, where hp is nearly free and time is not (V1-V2
+0.38 for fighting 27 s earlier [M]); (b) HEAL walks to a hide cell, holds fire and drops targets; `wait` withholds
only the first shot on a mech that is not attacking, and any hostile mech ends it on that decision; (c) healDoc left
at 80%, which buys 2 s; `wait` goes to 95% or 14 s; (d) with a laser `wait` does not act. If `wait` loses officially
too, the conclusion is that hunters arrive before the hp does [A psych: 13-35 s], and the idea is closed.

## 7. The five death patterns, before and after

The notes hold no single numbered list of five; these are the five recurring ones I read in panel_r7_r1_game,
r1_game section 3, r1_psych and panel_r6_rewards. Numbers in the "util" column are arithmetic on section 2, not runs.

| # | Pattern [source] | Today | With util |
|---|---|---|---|
| D1 | Escalation fight at k = 3, about 3.1 attackers, entered at 44-64% hp, 18.6 s, 1.7 kills [S game 1.1] | at 70% hp and k = 3 `any70f` opens on the nearest mech at once; 88% of these fights get 2+ lines | W1: gun only at k >= 3 the opening is held up to 14 s; from 70% that is 5 + 7.8 s to 95%. Entry 80-100% instead of 60-80%: 2.43 kills / P(death) 0.55 against 1.78 / 0.78 [S, n 42 / 9] |
| D2 | Last 9.7 s: 1450 damage over 2.5 targets; target at 46% at death [S r1_game 3] | nearest x 1.3 stick; a new attacker 80 deg off takes the torso | hp 770, IN 102 -> Td 7.5 s. A (420 hp, T 4.7 s): pK 1, U 0.34. B (fresh, T 16.2 s): Td / T 0.46, pK 0, U 0. Stay on A until it dies; then the one with the shortest T. One kill is finished instead of two halves |
| D3 | Torso veto 9.4 times per match toward an attacker that may be reloading [S psych] | forced switch, 0.4-0.8 s of slew with no damage out | a silent attacker has aNow 0, so no relief term; a fresh one has pK 0 when Td is short. The veto is skipped while 2+ lines and utilTgt; we turn when its U_F wins by 1.3 for two decisions |
| D4 | Third hunter walks in 13-35 s after a kill while we open on a passer-by or farm a drone at 60-75% [A psych; S game 1.2: 23 of 49 kills were not hunters] | `engaged()` and `unengaged` admit it; the hit resets regen for 5 s (up to 225 hp) | W5 then W1: take the kill drop, withhold the shot, regen runs while we walk to the cell; the hunter that arrives is hostile and is fought at once, at higher hp |
| D5 | Lightning carrier closes to 45 m (240 dps; 8 of 36 deaths [S]) or a laser hunter out-trades a gun-only bot (U -0.56..-1.26 [A RW]) while we shoot another | score is distance and stickiness; its dps is not in the pick | its `tr.a` enters `relief` (0.0023 x 240 x 4 = 2.2 pt at k >= 3, twice a kill), so it wins the pick as soon as it hits us and a kill is reachable; before it hits, tgt does nothing (a known gap: psych P5 `lightFirst` covers it) |

What 9 needs [A, from the same n 42 / 9 table, so weak]: if each escalation fight is survived with probability s and
yields κ kills, the life yields about 3 easy kills + κ / (1 - s). Entry 60-80%: 3 + 1.78 / 0.78 = 5.3 (we score
5.38). Entry 80-100%: 3 + 2.43 / 0.55 = 7.4. A 9 needs about s 0.6 at κ 2.4. So entry hp is worth about +2 if the
table holds and the hunters let us wait, and target discipline has to supply the rest. This is the reason `wait` is
the larger ticket despite its risk.

## 8. Tests

| Id | Test | Pass |
|---|---|---|
| T-U0 | identity harness, `util: 'off'`, FNV SELECT | 84/84 equal to the FNV hashes; `B.util` undefined |
| T-U1 (T-F2 form) | forced FFA, and SQUAD after one foreign death, each of tgt / wait / on | actions identical to off; all `counters.u*` 0 |
| T-U2 | scene: hp 55%, A 30% hp firing at 0 deg, B 100% firing at 120 deg, `tr.a` 51 each | off: veto turns to B when `B.a > A.a`; tgt: stays on A |
| T-U3 | T-U2 with B at `magN` 12, last bullet 0.5 s ago | tgt: A kept; with last bullet 1.9 s ago and A at 90%: B may win only after 2 decisions and 1.5 s |
| T-U4 | hp 20%, three fresh attackers (all pK 0) | tgt returns the base pick (no change from off) |
| T-U5 | gun only, k 3, hp 72%, no line, calm mech at 120 m | off: target = that mech; wait: target null, `uHold` > 0, legKind 'uwait' or loot |
| T-U6 | T-U5 then the mech hits us | wait ends on that decision, FIGHT, fire not held |
| T-U7 | T-U5 with k 1, with a laser, with hp 96%, with the mech finishable, with a line inside 70 m | each: same as off |
| T-U8 | T-U5 held for 14 s with hp pinned | wait ends; not re-entered for 6 s |
| T-U9 | timing: 2,000 decisions, 6 mechs in view | util adds < 0.3 ms mean, worst decision < 20 ms |
| S1 | simulator (nice -n 19, 2 jobs), 36 squad seeds, each value: matches that differ, `uHold`, `uTgtKeep`, `uTgtSwitch`, wait seconds per match, entry hp of each fight by k, deaths within 3 s of a kept target, deaths during a wait | report only. Stop: `uHold` or `uTgt*` under 20 in total (no trigger: drop); a death during a wait with nobody hostile in more than 2 of 36; mean entry hp at k >= 3 not higher than base |

Official order (each a labelled re-roll of salt 1, not a climb step): `wait` first (larger stake), `tgt` second, `on`
only if both beat 5.38. If only one slot: `wait` with `uWaitK` 3.

## 9. Not verified, and limits

- Nothing here ran. The hp prices come from simulator episodes (n 42 and 9); the simulator has had official signs
  wrong six times. The thresholds in section 2 follow those prices.
- I did not check whether `B.cfg.match.mechs` is the field name in the live hello (brain.js 46 shows it in the default
  config), or that `tr.magN` fires often enough: psych measured the reload sensor at 0.5 firings per match [S], so T-U3's
  silent term may be nearly inert until psych's `magCarry` fix lands. `tgt` does not depend on it.
- Whether crate hits reset regen on the current server is unverified [mechanics_deep 105].
- The firewall holds only until the first foreign death; in the final all of this is inert after that death, and
  acts in the opening seconds before it (at k < 3 `wait` cannot act; `tgt` needs 2 lines).
- DISENGAGE, HEAL entry and LOOT/DROP order are priced but left to the base. A utility that also owned those would be
  a rewrite of `decideMode`, not a 60-minute change, and the official record is against its first effect.
