# Panel R7, round 2: aieng (combat AI programmer and integration lead)

Written 21:47-22:15 UTC Sat. Tags: [M] official, [T] top bot, [S] our simulator (behaviour only), [A] arithmetic or
model, [N] no evidence. Read: brief, moderator digest, all five round-1 memos (stress included; it appeared at 21:50),
the four research memos (through the moderator's digest plus the sections I cite), the engineer's log and the full
diff of `scratchpad/r7work/bot` against `r7work/ref_bot` (checkpoint 01 plus the IO-A / IO7 work in progress at 21:47).
Scratch: `tools/panel_r7/r2_aieng/climb.py` (one Monte-Carlo, 20 CPU-seconds on core 2). No sub-agents used.

## Step 1. The objective in numbers

- Best 5.19 (KS salt 0). Cut now about 5.4, forecast 5.6-5.8 at Sun 16:00. About 105 slots, 6 per hour.
- The leader family's true mean is about 5.03, per-draw sd 0.17-0.24 [M, A]. Fresh salts alone give
  P(> 5.6) about 0.03-0.19 and P(> 5.8) about 0 over the remaining slots [A: stats, bestof, my rerun].
- So we need either a true mean of 5.3-5.5 (no arm so far moved the mean by more than 0.06 [M]) or a better way to
  use the draws than independent salts.
- The final needs: one nominated commit whose own practice score clears the cut, with the final-only items
  (FFA posture, zone-goal fixes, config anchoring) inside it and proven inert in practice.

## Step 2. Claims that matter for integration

| # | Claim | Steelman | Refutation attempt | Verdict |
|---|---|---|---|---|
| C1 | First slot on new code must re-score V4 s0 = 5.15 exactly (stats P0) | An identical (build, salt) repeats exactly [M], so one slot proves the whole port | V4 s0 does not run the K0 items or seek, which every later stack uses. KS s0 covers V4's path plus those | **Keep, but draw KS s0 (must read 5.19), not V4 s0** [M, A] |
| C2 | RB2-RB6 are practice-identical | 12/14 + 14/14 streams identical under four SELECTs; long23p identical once 16 keys are pinned [S] | RB4 `pocketCfg` is default **on** and RB6 changes the warm-up call. The proof for RB4 is "0 nulls in 88 sim matches", not the 48 official seeds. IO8 will be on in every build and acts whenever an observation is skipped, which no stream contains | **Identical in the streams; not proven officially.** P0 settles it. Keep `pocketCfg` and IO8 behind switches so a P0 miss can be bisected in two slots |
| C3 | `aggr: 'h70'` is a candidate arm | The owner's rule with the 8 s no-contact wait | Its values (0.7, 8 s, seek 0.7) are exactly KA, which changed no decision on the kit stream or in 8 sim matches (submissions.md, 21:31) | **Drop h70: a known no-op** [S] |
| C4 | `h70g` (one-volley guard) is a separate arm | It is the owner's wording | At 70% hp one volley needs 3-4 lasers at once (engage memo [A]); `unengaged` carries `!ffa`, so `aggr` is already off in the final | **No official slot.** Build only as a clause inside any70 if it costs under 10 lines; draw nothing unless its sim divergence from KB is above zero |
| C5 | KB any70 implements the doctrine | `unengaged` becomes "hp >= 70%, past the opening, squad" (tactics.js:185); the keep clause (`tr === B.target && lastDmgOut < 5 s`) means the gate is on starting, never on leaving, as the engage memo asks | Side effects: with any listed mech a target, `decideMode` picks FIGHT before DROP / LOOT, so above 70% the bot stops walking to crates and drops, and `seekLegs` (HOLD only) goes dead. The "otherwise heal" half is not implemented: between 55% and 70% out of contact the bot roams or loots; HEAL starts only under 55% | **Half the doctrine.** The other half is a params-only preset (R2 below) |
| C6 | LX is a bug fix worth +0.03 | Traced, 7 > 0 flips, identity 24/24 at off [S] | Divergence is 3 of 24 sim seeds, so a fresh-salt draw cannot see it | **Build; draw it only on the leader's own salt** (C8) |
| C7 | Arms should be drawn on fresh salts (stats rule 3, bestof) | Fresh salts maximise the spread of each draw | Model run below: keeping the best (build, salt) and redrawing only the matches an arm touches beats independent salts by a wide margin | **Reverse it for every arm that acts in under half of the matches** [A] |
| C8 | "Only behaviour-level arms can carry +0.3" (bestof) | True for the mean | The scored quantity is the maximum over submissions, not the mean | **True but not the binding fact**; see Step 3.4 |
| C9 | RB3 needs a clamp (eng) | A 4- or 5-phase schedule maps `scanLateR` to the first radius | The built code has no clamp (`ph[L-2]`, `ph[L-3]` raw); the tests cover 0.7x / 1.3x radii only | **Open defect, final only; 3 lines** |
| C10 | RB2 needs a snap to factor 1 (eng) | 414.9999 would move 210 | `set()` rounds to 3 decimals, so 210 x 0.9999999 = 210.000 | **Already satisfied by the rounding** [code read] |
| C11 | RB6 may leave a warm-up nav cache (eng) | nav is shared with the live brain | All identity streams pass with the new warm-up point | **Closed** [S] |

## Step 3. The open question

### 3.1 Review of what the engineer has built so far (diff read 21:47)

- **RB2 `anchorToConfig` (brain.js):** correct on the default config. A1 present (`P[k] !== PARAMS[k]`), A2 present.
  The 3-decimal rounding makes the snap amendment unnecessary. No defect.
- **RB3:** no clamp. With `phases.length` 4 or 5, L-3 is phase 0 or 1, so `scanLateR` and `zoneLateR` become early
  radii: the late-zone logic (`lateZ`, the pulse cancel, the R5 firewall) would be on from the start of a short
  final. Fix: clamp `zoneLateR` to [40, 120] and `scanLateR` to [90, 220] (the engineer's own zs070 test expects 98,
  so the floor is 90, not 100), and skip RB3 when `phases.length < 5`. Default 70 / 140 is untouched.
- **RB4 `hopPlanCfg` (mover.js):** correct. Default on; identity rests on a zero count in the sim.
- **RB5:** exact on the default numbers (test 18/18). `magReloadS = reload + 0.1` and the dps scalings are fine.
- **RB6 warm-up:** an O(n) scan plus one `hopPlan` at hello time, inside try/catch. Fine (conformance in time).
- **IO7 `chargeHold`:** correct and bounded (the hold ends when the charge is full). No defect.
- **IO-A (firecontrol.js):** four booleans, all false by default; each new expression collapses to the old one when
  false. `ioReload` lets `gunReady` be true with `reload > 0`; harmless if the server ignores a trigger during reload,
  but unverified [N]. Keep `io: 'all'` out of leader stacks until it has its own same-salt draw.
- **IO8:** not built yet (bot.js is unchanged). Smallest form: in `handle()` (bot.js:158), when a newer observation
  replaces a queued one, append the older one's `events`, `sounds` and `beams` to the newest. About 8 lines.
  Put it behind `ioMerge` (default on) so P0 can be bisected.
- **Integration gap:** `r7work/ref_bot` was frozen at 21:24 and has no `aggr` preset; KB was pushed from
  `variants6/KB_s0`, which differs from `mechbot/bot` by the preset line and SELECT only. The engineer must copy that
  line verbatim (`any70: { unengagedHpf: 0.7, unengagedS: 0, h50SeekHpf: 0.7 }`) and add KB to the identity SELECTs.

### 3.2 Smallest correct implementation per arm

| Arm | Site | Lines | Identity risk | Decision cost | Ready |
|---|---|---|---|---|---|
| P0 port (RB + IO at off + IO7 + IO8 + presets) | as built; IO8 in bot.js `handle()` | +8 | medium until P0 is drawn (RB4 on, IO8 on) | 0 | 22:40 |
| KB any70 on new code | params.js preset line | 1 | none (`off: {}`) | 0 | 22:40 |
| **H70 `heal: 'd70'`** (new, R2) | params.js: `heal: { d3: {}, d70: { healEnterHp: 0.70 } }` | 1 | none | 0 | 22:40 |
| LX `loseExit` | tactics.js `losing()` wrapper (code in `tools/panel_r7/eng/ibot/lib/tactics.js:343-354`) | 12 | low; one new state field `B.loseOffT` | O(1) | 22:40 |
| LC `loseCover: 'near'` | tactics.js last line of `losing()` | 4 | low | O(1) | 22:40 (move it ahead of FIN) |
| ISO `isolate: 'near'` | brain.js `fightLegs()` line 465-468: add `dist <= isoNear && xOther === 0` | 3 | low; needs `xOther` exported by posEval | O(1) | 23:40 |
| FIN `finish: 'ttk'` | (a) tactics.js `losing()` line 333 `finishing ||= nearKill`; (b) `decideMode()` afterLose term; hunt.js `ttk()` reused | (a) 12, (b) 15 | medium: hunt.js is documented inert unless hunt/seek is on, and FIN calls `ttk()` from there, which reads `h.IN` / `B.gunStat` | one 40-60 step loop, about 5 us | (a) alone 23:40; (b) 00:40 |
| LG `laserGrab: 'wide'` | economy.js `chooseGrab()` line 207 reach; tactics.js `selectTarget()` engaged clause | 12 | medium: one more A* per grab choice (F8 outliers are A* in grab) | up to one `pathExpand` 25000 A*, 8-26 ms worst | 00:40 |
| AVO `focus: 'av'` | tactics.js `selectTarget()` after the cost loop | 60-80 | high: new target order, flicker (F3) | 120 x 5 steps per 0.3 s, about 0.1 ms | 00:40 at the earliest; likely later |
| h70 | preset | 1 | none | 0 | drop (no-op, C3) |
| h70g | tactics.js:185 extra clause | 6 | low | O(tracks) | fold into any70 or drop (C4) |

FIN split: half (a) is the Smith "no switch before the kill" rule and is local. Half (b) changes mode priority and
`selectTarget` candidates; build it second and only if (a) reads at or above the leader.

### 3.3 What the release gate must add

1. **P0 official identity draw:** KS salt 0 on the final tree, every new preset off. It must read exactly 5.19.
   On a miss: redraw with `ioMerge: off`, then with `pocketCfg: off`. No new arm is pushed on a tree that failed P0.
2. **Local identity under the leaders:** the 28 streams under KS and KB (not only DEF / V4 / K0), each arm at off.
3. **Divergence report (phi) per arm:** share of sim matches 1-40 whose action stream differs from the base at the
   same salt. phi = 0 means no slot (this would have caught KA and catches h70). phi also sets the draw design (3.4).
4. **Decision time:** the bot's own `worst=` line within base + 3 ms and p99 within base + 1 ms on conformance,
   measured per arm, for LG and AVO in particular.
5. **Final-only bundle inert in practice:** FFA-inert set 14/14 for every practice arm on, and squad streams 14/14
   for every final-only item on. One official same-salt draw of the nominated commit's final bundle.
6. **Bundle check:** the pushed `bot.js` sha256 equals the gated one; preset names in SELECT all exist in PRESETS
   (a misspelt option must throw at build time, not fall back silently).

### 3.4 The integration fact the plan is missing: climb from the best draw [A]

Because an identical (build, salt) repeats exactly [M], an arm drawn on the leader's own salt changes only the
matches in which it acts. The other matches keep their scores. So a low-phi arm on KS s0 is a partial redraw of
5.19, and "keep it if better" is a hill climb on the scored quantity.

Model (`tools/panel_r7/r2_aieng/climb.py`): 48 independent matches, per-match sd 1.39 (so a 48-mean has sd 0.20),
mean 5.03, zero-effect arms, start at 5.19, each step redraws m matches and is kept only if the total rises.

| Slots | Best of fresh salts | Climb, m = 6 | Climb, m = 12 | Climb, m = 24 |
|---|---|---|---|---|
| 30 | mean 5.43, P(> 5.6) 0.05 | 5.71, 0.78 | 5.67, 0.67 | 5.58, 0.39 |
| 60 | 5.50, 0.14 | 5.93, 0.99 | 5.84, 0.98 | 5.69, 0.82 |
| 90 | 5.53, 0.19; P(> 5.8) 0.00 | 6.07; P(> 5.8) 0.99 | 5.93; 0.88 | 5.75; 0.29 |

What this does and does not show:
- It is a model, not a measurement. It assumes redrawn matches are independent of their old values and that we
  have enough distinct low-phi arms. Real arms redraw only the part of a match after they first act, so the
  per-step spread is smaller than modelled; I would halve the gains before planning on them.
- It needs no new mechanism: LX, LC, ISO, FIN (a), H70 are all low-phi arms. The rule is only "draw each on the
  current best (build, salt), stack the ones that score higher, and never change the salt of the best".
- It is why P0 is a hard gate: if the new tree does not reproduce 5.19 at salt 0, the base of the climb is gone
  and the arms must be built on the old tree instead.
- It raises the practice score by selection on the 48 fixed seeds. It says nothing about strength in the final.
- An explicit version (a second salt that takes effect from an in-game event, about 6 lines in brain.js) would
  supply unlimited steps. It reads no seed, but its only purpose is noise selection. That is the owner's call and
  the rules expert's; I do not recommend building it without both.

## Step 4. Recommendations, ranked

**R1. P0 identity draw, then draw every low-phi arm on the best (build, salt).**
- Site: no code beyond making IO8 (`ioMerge`) and `pocketCfg` switchable. Policy change in the slot plan.
- Change: slot 1 of the 22:44 window is KS s0 on the new tree (expect 5.19 exactly). After it passes, LX, LC, ISO,
  FIN (a) and H70 are each drawn as KS s0 + that arm; any that reads above 5.19 becomes the new base and the next
  arms stack on it. High-phi arms (KB, LG, AVO) keep the fresh-salt rule.
- Expected: P(> 5.6) from about 0.1 to 0.4-0.8 over 30-60 slots [A, model halved to full]. Engineering 10 minutes.
- Failure mode: P0 misses (then bisect, 2 slots); or arms have phi near 1 and the climb degenerates to salts.
- Test: 22:44 slot 1, KS s0.

**R2. H70 `heal: 'd70'`: the "otherwise heal" half of the doctrine, params only.**
- Site: params.js preset `heal: { d3: {}, d70: { healEnterHp: 0.70 } }`; SELECT default 'd3'.
- Change: out of contact for 1.5 s and under 70% (today 55%), go to cover and regenerate; leave at 70% (`healExit`
  unchanged) or at once when a mech has a line on us. It never leaves a fight (entry needs `quietS >= 1.5`).
- Expected: +0.03 (-0.10..+0.15). Basis: fights entered at 80-100% hp give 2.43 kills against 1.78 at 60-80% [S],
  and the death fight is entered at 44-64% [S]; against it, heal breaks read 0.00 +- 0.28 pooled [M] and hunters
  find us anyway. Engineering 5 minutes. Decision cost 0.
- Failure mode: 3-6 s spent in cover per match with no kill gained.
- Test: 22:44, on KS s0 (same-salt). If KB reads above KS, also on KB's best salt.

**R3. LX and LC as same-salt arms at 22:44; FIN (a) and ISO at 23:44.**
- Sites: tactics.js `losing()` (LX wrapper, LC last line), `losing()` line 333 (FIN a), brain.js:465 (ISO).
- Expected each: +0.03 (-0.08..+0.12) on the mean [A]; as climb steps each has roughly a 0.3-0.45 chance of
  raising the best. Engineering 15 / 15 / 30 / 15 minutes.
- Failure mode: FIN (a) reading hunt.js state that is stale when hunt and seek are off; test with `seek: off`.
- Test: KS s0 + arm, one slot each.

**R4. Drop h70 and h70g from the queue; put AVO last and behind the timing gate; fix RB3.**
- h70 equals KA (no-op). h70g cannot bind at 70% and `aggr` is squad-only. Saves about 30 engineer minutes, 2 slots.
- AVO is 60-80 lines in the most identity-sensitive function, for +0.05. Build it only after FIN (b) and LG.
- RB3: clamp plus `phases.length >= 5` (3 lines, final only, practice-identical).

**R5. LG with the grab-yield amendment, fresh-salt draw at 00:44.**
- Site: economy.js `chooseGrab()` line 207; `grabLegs` yields when `B.topAttacker !== B.target` hit us within 1 s.
- Expected +0.05 (-0.15..+0.25). 40 minutes. Failure: an A* outlier in grab; gate on `worst=`.
- Note the conflict with KB: above 70% hp any70 keeps the bot in FIGHT, so LG acts only through fight grabs.

## Step 5. Self-critique

- R1 is wrong if arms are not low-phi (then same-salt draws are just correlated salts and nothing is lost but the
  fresh-salt spread), or if the official run is not exactly repeatable for a rebuilt bundle (timing-dependent
  skipped observations). Cheapest check: the P0 slot itself. A second check costs nothing: the engineer's phi
  report on sim seeds 1-40 for LX, LC, H70 before 22:40.
- The model's independence assumption overstates the gain; the direction (partial redraws beat full redraws for a
  maximum) does not depend on it.
- R2 may be a no-op in practice if the bot is rarely out of contact between 55% and 70%. The phi report shows
  that before a slot is spent.
- I did not run the simulator on any arm; every behavioural number here is from round-1 memos.

## Summary for the moderator

1. **P0 is KS s0 on the new tree and must read exactly 5.19** (not V4 s0: KS also runs the K0 items and seek).
   Make IO8 (`ioMerge`) and RB4 (`pocketCfg`) switchable so a miss can be bisected in two slots.
2. **New integration finding [A]:** identical (build, salt) repeats exactly, so a low-phi arm drawn on the leader's
   own salt redraws only the matches it touches. Keep-if-better on that is a hill climb on the best score. Model
   (zero-effect arms, 60 slots): fresh salts P(> 5.6) 0.14; climb with 6-12 matches redrawn per step 0.98. Halve
   it for realism; it still dominates. Rule: low-phi arms (LX, LC, ISO, FIN a, H70) go on KS s0 and stack when they
   score higher; only high-phi arms (KB, LG, AVO) get fresh salts. This reverses stats rule 3 for those arms.
3. **New params-only arm H70** `heal: 'd70'` (`healEnterHp` 0.55 -> 0.70): the "otherwise heal" half of the
   doctrine, which KB does not implement. 5 minutes, zero identity risk, +0.03 (-0.10..+0.15).
4. **Drops:** h70 (identical to KA, a proven no-op); h70g as a drawn arm (cannot bind at 70%, `aggr` is squad-only).
5. **Engineer's build so far:** RB2 fine (rounding already gives the snap), RB6 fine (streams pass), RB4 / RB5 /
   IO7 / IO-A fine at off. **Defect: RB3 has no clamp** (4-5 phase schedules map late radii to early phases): add
   clamps [40, 120] / [90, 220] and `phases.length >= 5`. IO8 not built yet. The `aggr` preset line is missing
   from the engineer's tree and must be copied verbatim from `variants6/KB_s0`.
6. **KB side effect to watch:** above 70% hp any listed mech is a target, so FIGHT pre-empts DROP / LOOT and seek
   goes dead. If KB reads low, that is the likely cause, not the 70% rule itself.
7. **Ready by 22:40:** P0 port, KB port, H70, LX, LC. **By 23:40:** ISO, FIN (a) (the `losing()` half only).
   **By 00:40:** FIN (b), LG (with grab yield). **AVO last**, after 00:40, behind a `worst=` + 3 ms gate.
8. **Gate additions:** P0 draw; identity under KS and KB; phi report per arm (phi 0 = no slot); `worst=` per arm;
   final-only bundle inert in practice; SELECT option names validated at build time.
9. **Owner / rules question:** an event-triggered second salt (6 lines) would give unlimited climb steps. It reads
   no seed but exists only to select on noise. Not recommended without the owner's and the rules expert's yes.

Memo: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r2_aieng.md
