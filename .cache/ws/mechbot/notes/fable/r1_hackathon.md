# Fable panel, round 1 — expert 1: hackathon and prototype lead (00:40-01:00 UTC Sun)

Lens: what can ship in 30-60 minutes, in which order, and what to do after each result.
Tags: [M] official score, [S] simulator (behaviour only, ranks nothing), [A] my analysis. Nothing here was submitted,
pushed or gated; every build below is a proposal (status: needs-review).

## 1. Facts that drive the schedule
- Base B = FSL10 s1, commit 3aacfa3, 5.35 [M] = 257 kills over 48 matches (score x 48 is an integer: 5.35 = 257,
  5.33 = 256, 5.31 = 255, 5.29 = 254, 5.27 = 253, 5.25 = 252) [A]. Every climb step since 5.29 moved the total by
  1 to 3 kills. A "+0.02" is one kill in one match.
- The retreat (loseCover) family measured so far on salt 1 [M], as (lcLowHpf, lcCoverS) -> kills:
  (0.25, 2.0) 253; (0.25, 1.5) 254; (0.15, 1.5) 255; (0.15, 1.0) 256; (0.10, 1.5) 257. Monotone on both axes:
  retreating less has gained one or two kills per step, five times out of five.
- Opus already pushed four points next to the base (submissions.md line 329-333): G10C10 (0.10, 1.0), G05 (0.05, 1.5),
  G10FT3, G10C10FT3. The Fable line must not buy the same points.
- Code check [A] (tactics.js losing(), line 393-396): with loseCover on, a LOSING retreat happens only if a hide cell is
  found AND (travel time <= lcCoverS OR hp < lcLowHpf). Both keys sit behind hunt.firewall() (SQUAD, no foreign death,
  zone not late, more than 3 alive), so new values are final-safe in the same sense as the entered build.
- hfExit (tactics.js line 460) is a SQUAD-only heal-exit key that already exists; healExit itself is read in FFA.
- Local cost [S]: one sim match takes 4 s on a quiet core and 8-12 s tonight (load average 23). A 24-seed check of one
  variant is 2-4 minutes; a rebuild through mkvar.py plus bundle is about 5 minutes (BUILD_LOG).

## 2. Critique of the solo plan F1-F6 (built on 5.31, not 5.35)
| build | verdict on the 5.35 base | reason |
|---|---|---|
| F1 oneHit (cover 0, low 0.23) | REPLACE | On the new base it raises lcLowHpf 0.10 -> 0.23, against three official results in a row (0.25 -> 0.15 -> 0.10 each higher), and the Opus one-hit reading scored lower (5.29). It also changes two things at once, so its result cannot be read. Replacement: C0L10 = cover 0, low 0.10 (one change against B). |
| F2 never (cover 0, low 0) | KEEP, but late (slot 5) | The corner of both monotone axes, and the only point Opus cannot reach with its pending four. But on the low10 base it changes 16 of 24 local matches (section 7): close to a full re-roll of a lucky base, so it is a high-divergence ticket, not a first step. |
| F3 healEnterHp 0.40 | KEEP as one late ticket | Only support is "opposite of healDoc on (-0.21)"; healDoc on changed two keys, so the sign of this one alone is unknown. Sim -5 on 3 matches. One slot, never a second. |
| F4 any60f | DEMOTE to filler | 0 of 24 local matches differ; expected value about one kill times a small chance. Use only if a slot would otherwise go empty. |
| F5 c075 | DROP | Between Opus G10C10 (cover 1.0) and C0L10 (cover 0); it adds no point the two lines will not already bracket. |
| F6 fresh salt 11 | DROP from the Fable six | A fresh draw has the same expected gain as a neutral step (about +0.017 per slot at a base 0.2 above its mean [A]) but teaches nothing, and the Opus rule already spends one fresh salt per window. |
Process faults in the plan [A]:
1. Strictly sequential "submit, wait, rebuild on the winner" stalls: a result takes 10-20 minutes and Fable has a slot
   about every 20 minutes. With independent keys, submit singles from the same base B in parallel and spend one later
   slot on the stack of the winners (this is what Opus does with G10C10FT3).
2. All six F bundles are stale: they carry low15. None can be submitted as built.
3. No base-reproduction gate was planned for a rebased tree. Needed before any slot (section 4, gate G0).

## 3. Candidate builds on B (all params-only: new preset VALUES on existing keys; no code)
Add to PRESETS in fable_work/bot/lib/params.js (old values untouched):
- loseCover: `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` (verbatim from variants6/FSL10_s1, the base),
  `never10` is not needed: reuse `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }`;
  `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }`; `c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }`
- healDoc: `x60: { hfExit: 0.6 }` (leave HEAL at 60% in SQUAD only; today 70%), `low: { healEnterHp: 0.40 }` (exists)
- seek start: `seekFrom: { '20': {}, '10': { h50SeekFromS: 10 } }` (new preset key on an existing parameter; the old
  value is the empty set, identical by construction)

| tag | SELECT change against B | what it means in play | build time | final-safe? |
|---|---|---|---|---|
| H1 FNV | loseCover 'never' | never leave a fight for cover (still leaves when standing on the hide cell; zone, HEAL out of contact, lastStand unchanged) | 5 min (F2 exists; reselect) | yes (firewall) |
| H2 FC0 | loseCover 'c0l10' | cover distance no longer triggers a retreat; leave only under 10% hp | 5 min | yes |
| H3 FX60 | healDoc 'x60' | come out of HEAL at 60% instead of 70% | 10 min (new value + T-F2 case) | yes (hfExit is SQUAD-only) |
| H4 FHE40 | healDoc 'low' | enter HEAL out of contact under 40% instead of 55% | 5 min (F3 exists) | T-F2 passed on the 5.31 tree |
| H5 FSK10 | seekFrom '10' | start seeking fights at 10 s instead of 20 s | 15 min (new key + T-F2 + gate) | needs a ruling: forced FFA identical (seekLegs is firewalled), but it acts in the final's opening before an FFA latch |
| H6 stack | every Fable and Opus single that beat its own base | - | 5 min | as its parts |
| filler | aggr 'any60f' (F4) or c05l10 | - | 5 min | yes |
Sim check on the low10 base, 24 squad seeds, salt 1 (fable_work/r1_hackathon/sim, summary by summ.py there): see
section 7; it was still running when this memo was first written.

## 4. Gates (shippability; about 35 minutes for the first three bundles, one engineer)
- G0 base reproduction, once: fable tree + low10 SELECT + salt 1 against variants6/FSL10_s1: resolved params
  identical, sim 24/24 identical, kit stream identical in squad / auto / forced FFA. No slot before G0 passes; a
  climb step on a base that is not the 5.35 build is a fresh lottery ticket by mistake.
- Per build: identity of the tree with the new values unselected (84/84 as in BUILD_LOG); T-F2 with the new value
  (acts in SQUAD, identical in forced FFA); conformance; bundle built twice, byte-identical; then the pusher's release
  gate and fresh-clone hash.
- Pre-build both branches of anything that depends on a pending result (5 minutes each), so that no slot waits for an
  engineer: e.g. H2 on B and H2 is skipped if H1 wins; H3 on B and on B + H1.

## 5. Ranked six-slot plan and the rule after each result
Keep rule everywhere: strictly above the current best -> entered and becomes the base; equal or lower -> off.
Order = low divergence first (they keep the luck banked in the 5.35 draw), high divergence last. Section 7 gives the
local divergence counts that set this order; the first draft of this memo had 'never' in slot 1 and the sim moved it.
| slot | build | submit when | after the result |
|---|---|---|---|
| 1 | H2 FC0 (loseCover 'c0l10': cover 0, low 10%) on B | as soon as G0 + gates pass | > 5.35: new base; 'never' (slot 5) is then one key away from it. <= 5.35: off. If it loses by 2 kills or more AND Opus G10C10 (cover 1.0) also loses, the cover axis has turned at 1.5 s: drop 'never' too. |
| 2 | H3 FX60 (healDoc 'x60': heal exit 60%) on B | next Fable slot, without waiting for slot 1 (different key) | > 5.35: keep; it joins the stack. <= 5.35: off. If it loses by 3 kills or more, drop H4 as well (heal axis closed both ways, with healDoc on at -0.21). |
| 3 | H6 stack if slots 1 and 2 both won (or one of them plus an Opus winner on another key: G05 / FT3); otherwise H4 FHE40 on the current best | after slots 1-2 and the Opus four are known | stack > best: entered. H4: one slot, never repeated. |
| 4 | H4 FHE40 if not yet used; otherwise the filler (aggr 'any60f', or 'c05l10' if G10C10 won and slot 1 lost) | after slot 3 | keep only if strictly higher. |
| 5 | H1 FNV (loseCover 'never') on the current best | only if at least one of slot 1 / Opus G05 / Opus G10C10 beat 5.35 | high-divergence ticket. If none of the three won, give this slot to H5 or a fresh salt instead. |
| 6 | H5 FSK10 (seek from 10 s) on the current best if the project moderator rules it final-safe; otherwise one fresh salt of the best SELECT | last | re-rolls nearly every match; keep only if strictly higher. |
Parallelism: slots 1 and 2 go out back to back from the same base (different keys); nothing waits on them except
slot 3. Pre-build slot 3's two branches (stack, and H4 on B) while slots 1-2 are in flight.
Stop-loss: if slots 1 and 2 and all four Opus points come in at or below 5.35, the "fight on" family is exhausted at
the one-kill level: skip slot 5 and spend slots 5-6 on H5 and one fresh salt.
Do not submit: F1 oneHit as built, F5 c075, any bundle still carrying low15, anything using lose1/2/3Hpf, finishHpf or
healAfterLoseS (read in FFA).

## 6. Honest expectation [A]
Single steps are worth one or two kills in 48 matches and the sign is mostly luck (five gains in the retreat family is
the only pattern with any length). Six slots of this kind are worth about +0.02 to +0.08 in total, with roughly a
55-65% chance of at least one strict improvement. That does not reach a 5.6-5.8 cut. No params-only idea I found in
20 minutes is a +0.3 change; round 2 should ask the other lenses for one behaviour change of that size and accept a
tiny-code build for it, with slots 5-6 as its budget.

## 7. Sim check on the low10 base [S] (behaviour only; it ranks nothing)
Tree r7work/ckpt_07_LG (read only), plain overrides on KS SELECT + any70f + fb on + loseCover near + lcLowHpf 0.10,
salt 1, squad seeds from 1, core 2. Data: fable_work/r1_hackathon/sim/<tag>/sq<seed>.meta.json; summary: summ.py there.
The sweep was cut short by time and machine load (8-17 s per match), so the seed counts differ per row.
| tag | override on B | seeds run | matches that differ | up / down | net kills |
|---|---|---|---|---|---|
| NEVER | lcCoverS 0, lcLowHpf 0 | 24 | 16 | 3 / 6 | -4 |
| C0L10 | lcCoverS 0 | 24 | 9 | 3 / 2 | +1 |
| HF60 | hfExit 0.6 | 12 | 4 | 1 / 0 | +1 |
| HE40 | healEnterHp 0.40 | 12 | 2 | 0 / 0 | 0 |
| C05L10 | lcCoverS 0.5 | 5 | 2 | 0 / 0 | 0 |
| SK10 | h50SeekFromS 10 | 4 | 4 | 2 / 2 | -2 |
Reading [A]: 'never' touches two thirds of the matches (the under-10% retreat is used often), so it behaves like a
fresh draw; C0L10 touches about a third and HF60 about a third; HE40 and c05 are near-inert; SK10 changed every match
it ran in. Each variant shows it acts; none of these numbers predicts the official sign. Not checked here: the T-F2 /
identity gates for the new values, and whether hfExit 0.6 interacts with the 70% seek gate (worth one T-F2 scene).
