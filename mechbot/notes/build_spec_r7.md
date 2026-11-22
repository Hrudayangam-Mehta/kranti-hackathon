# Build spec R7 (binding) — panel chair, round 3, written Sat 21 Nov 22:05-22:20 UTC

Read: brief, moderator digest, the five round-2 memos in full, round-1 summaries (the four research memos through the
moderator's digest), submissions.md to the 22:04 push, build_r7a_log.md to checkpoint 03. No sub-agent, no simulator
run, no web search: every number is quoted from those notes or is arithmetic on them.
Tags: [M] official, [T] top bot, [S] simulator (behaviour only), [A] arithmetic / model, [N] no evidence, [C] code read.

## 0. Hashes to submit now (owner's request, 22:15 UTC), in this order

| # | build | commit | expectation / purpose |
|---|---|---|---|
| 1 | R7P s1 | 8e724cac7c23f80958791a686f408e8d1043226e | must read exactly 5.23: proves the R7 code and that any70 is not needed at salt 1; final-safe |
| 2 | KBH s1 | 6b038a9428ec9dbb2d87da15026e21b38209ce3c | first climb step (doctrine heal 70% -> 80%) on the best salt; keep if > 5.23 |
| 3 | KS s3 | 82aaa51eb42092bcae2364924e98ccbc401e6ffd | fresh salt |
| 4 | KS s4 | dc2cedddd9f7a231388508f10013c6e786cb6689 | fresh salt |
| 5 | KS s5 | 03d0b946799d2d03bbff6c9f2bcb42362921831e | fresh salt |
| 6 | KS s6 | 0f82fa869630044021137e859d080756776c22a6 | fresh salt |
| 7 | KS s7 | cb77a26a0533f235bf83c4d33ba0f2df8f3719f4 | fresh salt |

Do not submit: KS s1 5898265c and KS s2 692325a0 (repeat 5.23 / 4.98), KB s3 d7d88e24 (same draw as KS s3),
R7P s0 989fa9ba (only on a miss of #1, see 3.6). K0 s1 d8f6e646 and S s2 c4f015f9 are last-resort fillers only.

## 1. The objective in numbers

- Best 5.23 = 251 kills / 48 matches (KB s1, entered). One score step = 1/48 = 0.021 [M].
- Cut: about 5.4 now (260/48 = 5.42 clears it: +9 kills); forecast 5.6-5.8 at Sun 16:00. Plan for 5.6
  (269/48 = 5.60: +18 kills on the best); 5.8 needs 279/48 (+28) [A].
- Family true mean about 5.05 +- 0.10, per-draw sd 0.17-0.20 (KS-select salts 0/1/2: 5.19 / 5.23 / 4.98) [M, A]. For
  fresh salts to do it alone the true mean must be 5.3 (cut 5.6) or 5.45-5.5 (cut 5.8). No item has moved the mean by
  more than 0.06 in 19 draws [M].
- Slots: 66 from 22:25 to 09:25 (11 windows of 6); about 101 to the last safe slot at 15:15 Sun.
- Final: 32 entries; 16 qualifying 16-mech free-for-all matches on new seeds (top 16 by mean of 16 - place advance,
  s.e. about 1.1), then a 64-match series. The nominated commit must itself score above the cut, and that same commit
  plays the final; map folder, balance and zone schedule may change.
- Honest estimate under this spec [A]: P(best > 5.5 / 5.6 / 5.8) at close about 0.55 / 0.40 / 0.10.

## 2. Conflicts resolved

**(a) Fresh salts (stats, bestof, decision) versus the same-salt hill climb (aieng). Ruling: both, by measured
divergence; the climb gets priority while it has steps.**
- Deciding evidence: KB s0 scored exactly KS s0's 5.19 [M]. So an identical (decisions, salt) repeats exactly, and an
  arm drawn on the best pair re-rolls only the matches it touches; the rest of the 251 kills are kept.
- aieng's model (zero-effect arms, 30 slots): fresh salts reach 5.43 on average, P(> 5.6) 0.05; a climb re-rolling
  6-12 matches a step 0.67-0.78. Halved, as its author asks, it still dominates [A].
- What the stats side keeps: fresh salts remain the only ticket for high-divergence arms, and they refill the base
  (P(a fresh salt beats 5.23) about 0.18 each [A]). The decision memo's b / 2-draw-mean adoption is replaced for climb
  arms by "keep if strictly higher at the same salt" (the score is banked; no mean needs estimating).
- Limit: a climb step exists only per distinct acting arm or value. An arm that lost on a base loses again on any
  later base that differs only in other matches (deterministic), so it is not retried on the same salt.
- aieng's event-triggered second salt: NOT built. It is pure noise selection and new code; owner's and rules call.

**(b) Which arms climb, which take a fresh salt.** phi = share of sim squad seeds 1-40 whose action stream differs
from the base at the same salt (engineer's report, behaviour only; mandatory per arm).
- phi = 0: no slot. 0 < phi <= 0.5: climb step on the best pair. phi > 0.5: fresh-salt draw.
- Expected low: healDoc, LX (3 of 24 [S]), LC, FIN (a), ISO, seekCrowd, heal / cover / ttk value variants.
- Expected high: LG, `io: 'all'` (moves 75% of aimed decisions [S]), FIN (b), AVO.
- any70: officially 0 score change in 48 matches at salt 0 [M]: it is neither; no more slots.

**(c) LC and LG: red team (highest harm) versus designer (FIN + LC + LX commit arm; LG the widest ticket).**
- Evidence against LC: a no-retreat bundle -0.41 and A05 -0.41 [M, other teams, one draw each]. For finishing: G01
  +0.39, A32 +0.34 [M, other teams]. None is ours.
- Ruling: under keep-if-higher on a deterministic server a harmful arm costs one slot and cannot enter the base
  unless its score is really higher. So LC is drawn, but solo, with its `hpf < 0.25` clause, after LX and FIN (a).
  The designer's bundle gets one slot only after the three solos are read (3.2, CM). The red team's adoption worry is
  met by 3.4: single-salt arms never go onto fresh salts.
- LG: one fresh-salt draw (it is the wide ticket and best-of pays for width). Red team's guard is binding: the
  engineer reports the share of pre-death decisions in which LG suppresses the engaged clause; above 30% the build
  uses a 45 s cap instead of 90 s. The designer's spawn look-around is NOT built unless LG's draw is >= 5.05.

**(d) ISO.** The red team's reading is correct [C, spec R5 3.1]: `isolate: 'near'` allows the isolating walk only
within 12 m with `xOther === 0`, otherwise stand-off. It means "fewer isolating legs" (73 against 42 hp/s [S]). The
exploit memo's "ISO first by Lanchester" read it backwards. ISO is a normal climb arm, fourth in line.

**(e) Free-for-all latch: red team (latch disabled placed 1.33 +- 0.40 better in the sim) versus the final
strategist's bundle.**
- The sim field is house bots that shoot on sight, not finalists; the red team itself says the result supports "add
  no FFA code", not "turn the posture off". Showdown logs are the only real-field data: practice ranks 1-4 placed
  6th-12th; deaths per minute 0.36 with nobody within 60 m, 2.02 with one [T, L].
- Ruling: the latch stays exactly as it is (3 foreign deaths before 200 s). No disable, no fallback latch, no
  `ffaLatchDeaths: 2` (the only bundle item that can act in practice, and it pushes towards the posture the one sim
  reading questions). No new FFA code. The bundle is two numbers plus one bug fix (3.7).

**(f) any70: firewall or leave out. Ruling: leave it out of the nominated build; write no firewall code.**
- KB s0 = KS s0 exactly [M]; the red team's 51 of 60 identical sim matches agrees [S]. KS's own `engaged()` and band
  clauses already start fights at hp >= 70%, so the doctrine gate is met without the preset.
- R7P s1 (KS SELECT, no any70) reading 5.23 closes it. Only if R7P s1 misses while R7P s0 reads 5.19 did any70 act
  at salt 1: then, and only then, the engineer adds `foreignDeaths === 0` to the any70 clause (reuse `hunt.js`
  `firewall()`) and that build is drawn once at salt 1.

## 3. The binding R7 spec

### 3.1 Adopted rules (the doctrine in exact params)

Base SELECT "KS" = V4 (`retreat: 'd3'`) + `laserEcon: 'off'`, `laserRange: 'far'`, `focus: 'mult'`, `farmHp: 90`,
`upg: 'std'`, `seek: 'on'`; on the R7 tree also `pocketCfg: 'on'`, `ioMerge: 'on'`, `io: 'v4'`, `aggr: 'off'`.

| Rule | Exact form | Status |
|---|---|---|
| D1 go for the reward at hp >= 70% | KS as is (seek on, `h50SeekFromS` 20; hostile mechs answered at any hp). `aggr: 'any70'` = 0.7 / 0 / 0.7 is officially the same play | in the base |
| D2 no single volley can kill us | true by arithmetic at 70% hp in practice (needs 3-4 lasers at once [A]); `aggr` is squad-only | no code, no slot |
| D3 target = cheapest kill | `focus: 'mult'`; plus `finish: 'ttk'` if its climb step is kept | base + arm |
| D4 the 70% line never ends a fight | leave only by `losing()` at the d3 lines (`lose1Hpf` 0.35, `lose2Hpf` 0.50, `lose3Hpf` 0.60) | in the base |
| D5 otherwise heal | `healDoc: 'on'` = `healEnterHp` 0.70, `healExit` 0.80, out of contact only | KBH s1; on when it scores >= the base |

If KBH s1 is below 5.23, D5 stays at the base values (enter 55%, exit 70%) on the salt-1 line and the moderator
reports the measured cost to the owner.

### 3.2 Arms, in priority order

Best pair BP = the (SELECT, salt) with our highest official score; now (KS, salt 1) = 5.23. Fresh salts come from one
counter starting at 8. All arms are built on the R7 tree (checkpoint 03 or later), default off.

| # | Name | Preset and values | Type | Base | Guard before the slot |
|---|---|---|---|---|---|
| 1 | R7P | none (port) | identity | KS, salt 1 | pushed |
| 2 | HD | `healDoc: 'on'` (0.70 / 0.80) | climb | BP (KBH s1, pushed) | none |
| 3 | LX | `loseExit: 'on'` | climb | BP | phi > 0 |
| 4 | FINa | `finish: 'ttk'`, `losing()` half only, `finTtkS` 3.0 | climb | BP | 20 sim matches: deaths within 3 s of an armed near-kill; if more than 2, `finTtkS` 2.0 |
| 5 | LC | `loseCover: 'near'`, `lcCoverS` 1.5, keeps `hpf < 0.25` | climb, solo | BP | phi > 0 |
| 6 | ISO | `isolate: 'near'` (12 m, `xOther === 0`) | climb | BP | phi > 0 |
| 7 | IOA | `io: 'all'` | fresh salt | KS | built (checkpoint 02) |
| 8 | LG | `laserGrab: 'wide'` (`grabLaserR` 130 with no laser, `nLos <= 1`, grab yields to a new attacker) | fresh salt | KS | suppression share report (2c); bot `worst=` within base + 3 ms |
| 9 | CR | new one-line preset `seekCrowd: { std: {}, wide: { h50CrowdR: 120 } }` | climb | BP | phi > 0 |
| 10 | HF | `healDoc: 'full'` = { `healEnterHp` 0.70, `healExit` 1.0 } (owner's full-heal request) | climb | BP | phi > 0 |
| 11 | CM | the solos of LX, FINa, LC that were not kept, as one SELECT | climb, one slot | BP | only after all three solos are read; skipped if two of them scored below base - 0.10 |
| 12 | FINb | `finish: 'ttk'` mode-priority half | fresh salt | KS | built only if FINa was kept |
| 13 | value variants | one value of a kept or tied arm: `lcCoverS` 1.0 / 2.5, `finTtkS` 2.0 / 4.0, `healExit` 0.9, `h50CrowdR` 90 | climb | BP | at most 2 per window; params only |

Cut from the build: AVO (60-80 lines in the most identity-sensitive function for about 0; confounded as specified),
h70, h70g, PRE, `risk` schedule, `calm: 'rear'`, ESC, zoneEsc in practice, the LG look-around (unless 2c), SYNC.
Engineer order from now: LX, LC, FINa, ISO, CR + HF (2 lines), phi report, LG, final bundle (3.7), then FINb if earned.

### 3.3 Slot picker, 22:25 Sat to 09:25 Sun

Picker **P** (take the first line that has a gated build):
1. Identity or port slot that is due (3.6).
2. Stack slot: two arms were kept in parallel on the same base -> their combination on that salt.
3. Climb step: next gated climb arm on BP, in the order of 3.2.
4. First draw of a gated fresh-salt arm (IOA, LG, FINb).
5. Fresh salt of the fresh-salt SELECT (3.4) on the R7 tree.
6. Pushed fillers: KS s3, s4, s5, s6, s7; then K0 s1, S s2.
Caps: at most 4 arm slots (lines 2-4) per window; at least 1 fresh salt per window; at least 2 if the previous window
had two or more exact ties. Never an identical (decisions, salt); never an arm with phi = 0.

| Window (UTC) | Slot 1 | Slot 2 | Slot 3 | Slot 4 | Slot 5 | Slot 6 |
|---|---|---|---|---|---|---|
| W1 22:25 | R7P s1 (if not yet scored) | KBH s1 | LX on BP (else KS s3) | LC on BP (else KS s4) | IOA s8 (else KS s5) | KS s3 or next filler |
| W2 23:25 | FINa on BP | ISO on BP | CR on BP | stack slot if due, else HF | fresh s9 on R7 | filler |
| W3 00:25 | LG s10 | CM or stack slot | HF (if not drawn) | P | fresh salt | filler |
| W4 01:25 | FINb s11 if earned, else P | value variant | value variant | P | fresh salt | fresh salt |
| W5 02:25 | P | P | P | P | fresh salt | fresh salt |
| W6 03:25 - W11 08:25 | P | P | P | P | fresh salt | fresh salt (or the R7F port when due) |

Late code: every arm slot falls back to line 5, then line 6. An arm that gates late takes the next free arm slot in
3.2 order; nothing waits for it.
**03:00 checkpoint (5 minutes, no slot):** write down best, BP, kept arms, ties, the board's 32nd.
- Best >= 5.40: carry on.
- Best < 5.40 and no arm kept: the queue is acting too rarely. From W6: 3 fresh salts per window, variants up to 3
  per window, and the engineer builds the LG look-around (the one structural ticket left) instead of FINb.
**After 09:00:** no new code. 09:25-13:15: P with variants and fresh salts. 13:15-15:15: remaining climb steps on
BP first, then fresh salts of the fresh-salt SELECT.

### 3.4 Adopt, drop, stack

- Climb arm on BP: score > BP's score -> kept; the new build is BP and the owner enters it. Equal -> a tie: arm
  retired on this salt (HD alone stays on after a tie, as doctrine, if T-F2 passes). Lower -> off on this salt;
  retried only after BP moves to a different salt.
- Parallel keeps on one base: draw the stack once (expected = base + both gains when they touch different matches);
  BP = the highest of the three.
- Fresh-salt arm (IOA, LG, FINb): first draw >= 5.05 earns a second fresh salt; two-draw mean >= 5.10 puts it into
  the fresh-salt SELECT; first draw < 4.85 dropped. Any single draw above BP becomes BP as it stands.
- Fresh-salt SELECT = KS plus only arms kept on two different salts or adopted by the line above. An arm kept on
  one salt never goes onto fresh salts.
- A fresh salt that beats BP becomes BP; all climb arms may then be drawn on it again, in 3.2 order.

### 3.5 Final entry

- The owner enters every new best at once (as now).
- Nominee = our highest-scoring commit that (i) is on the R7 tree, (ii) has `aggr: 'off'` or a firewalled any70,
  (iii) passed T-F2 for every practice preset in its SELECT: forced FFA on against off byte-identical on the 14
  FFA-inert streams, and no non-hostile candidate once `foreignDeaths >= 1`. `io: 'all'` is exempt from (iii) by
  design (a fire-timing fix in both postures) but then needs the owner's yes.
- If R7P s1 reads 5.23, the owner picks R7P s1 as the final entry instead of KB s1 while we are below the cut. Once
  the cut is in play: a port ties the original but is later, so nominate a port only if its score is at least 1/48
  above the 32nd; otherwise the original.
- 15:20-15:40 Sun: nominate the eligible entry with the highest score above the 32nd + max(1/48, the 32nd's rise
  over the last 2 hours). If nothing clears, leave the best entered.

### 3.6 Ports and identity

- R7P s1 = 5.23: the R7 tree and the KS-without-any70 base are proven; BP is (KS, 1) on R7 code.
- R7P s1 != 5.23: next slot R7P s0 (must be 5.19).
  - 5.19: the port is sound and any70 acted at salt 1 -> KB SELECT on the R7 tree at salt 1 (must read 5.23), then
    the firewalled form of 2f.
  - not 5.19: the R7 tree changed practice play. Bisect with `ioMerge: 'off'`, then `pocketCfg: 'off'` (one slot
    each, salt 0). No arm is pushed on a tree that failed; the fillers and KBH run meanwhile.
- One port slot each time: BP was scored on a non-eligible build (old code, or with unfirewalled any70: KBH s1 if it
  becomes best -> KS + healDoc, salt 1, R7 tree); and once for the final bundle (R7F, 3.7).

### 3.7 Final-only bundle and freeze

- FB1 `ffaProx: [70, 70, 80]` (was [45, 60, 75]); FB2 `ffaHealExit: 1.0` (was 0.9). Both are read only when
  `B.env === 'FFA'`; squad streams must stay byte-identical (24 of 24 sim squad matches identical [S]).
- ZG1 (reachable late-zone goal in `mover.js` `zoneGoal`, preset `zoneGoalFix`, test seeds 3009 and 5022): 25
  minutes, only if done by 09:00; otherwise dropped. RB2-RB6 with the RB3 clamp, IO7 and IO8 ride as built.
- Not in the bundle: `ffaLatchDeaths` 2, `ffaWoundTgt`, `risk: 'ffa'`, `ffaOpenGuard`, beam clue, `ffaHunt`, ZG2.
- Timing: FB1 + FB2 go into the next checkpoint tonight (2 numbers), so every later R7 draw already carries them.
  Code freeze 09:00 Sun. R7F = BP's SELECT and salt on the frozen tree, one slot at the first window after the
  freeze, must equal BP's score exactly. Latest port 12:30 Sun. Nomination 15:20-15:40.

### 3.8 What we stop doing

- Solo draws of knob flips on fresh salts; 2-draw-mean adoption for climb arms; re-submitting a known (decisions,
  salt); KS s1 / s2 / KB s3; more any70, h70, h70g work or slots.
- Ranking or sizing any arm by the simulator (phi, counts and failure modes only).
- AVO, PRE, the risk schedule, kiting / peek work, zone work in practice, new FFA strategy code, a second strategy
  for the final, the event-triggered salt.
- Putting an arm kept on one salt onto fresh salts; nominating old-code or unfirewalled-any70 commits when an equal
  eligible port exists; waiting on late code (fillers are always pushed).

## 4. Self-critique

1. **The climb finds no steps.** Arms may act in few or no official matches (any70 changed nothing in 48; healDoc
   changed 0 decisions on 28 local sources), so slots return exact ties; and the sim's phi has been wrong before. Then
   the plan is slower than plain salts by the tied slots. Guards: phi = 0 gets no slot; a tie retires the arm on that
   salt; at least 1-2 fresh salts every window; value variants give extra steps without code; the 03:00 checkpoint
   moves slots to fresh salts and the one structural ticket if the best is under 5.40.
2. **The best score sits on a commit we should not or cannot nominate**, or the base is not what we think. Cases:
   the R7 port does not reproduce 5.23; the best carries unfirewalled any70; a stack of noise-selected squad arms
   misbehaves in the free-for-all. Guards: R7P s1 first with the two-slot bisect; one port slot for any non-eligible
   best; T-F2 on every preset in the nominated SELECT; the original stays entered until an eligible port scores
   exactly the same; code freeze 09:00 with the last port by 12:30.
Residual risk, stated plainly: the climb raises the practice score by selection on 48 fixed seeds and says nothing
about strength in the final; and if the cut closes at 5.8 this plan has about a one-in-ten chance.
