# Fable panel: moderator's synthesis between round 1 and round 2

Inputs: FABLE_BRIEF (incl. 00:45 update), FABLE_PLAN, BUILD_LOG, moderator_r1, r1_hackathon / r1_cyber / r1_math /
r1_game / r1_psych, tail of submissions.md, code read at r7work/ckpt_07_LG/lib (tactics.js, hunt.js, stance.js,
brain.js, params.js) and fable_work/bot/lib/params.js. One moderator, no simulator run, nothing built, pushed or
submitted. Tags: [M] official, [S] simulator (ranks nothing), [C] read in the code by me, [A] analysis.
Status of every build below: proposal, needs gates. Hackathon's section 7 (sim check) is empty: no data from it.

## 1. Where the five agree
1. Base is FSL10 s1 = 5.35 = 257 kills over 48 matches; one kill = 0.021. All six F bundles carry lcLowHpf 0.15 or
   0.23 and are stale: none is submitted as built; every build is remade with lcLowHpf 0.10 or lower (math R1).
2. F1 'oneHit' as built (cover 0, low 0.23) gets no slot: it moves a banked key back (0.25 -> 0.15 -> 0.10 gained
   +3 kills [M]). Four of five; the game designer would give it one slot for the owner. Ruled out by R1 (section 2, K8).
3. Steps inside the loseCover gate are the only family with a consistent official sign (5 of 5); each is 1-3 kills.
4. No fresh salt on salt 1's 5.35 while untested parameter values exist (math: P(higher) 0.08; hackathon agrees;
   cyber and game keep it only as the last slot).
5. Lightning target priority gets no slot (cyber C3 refuted locally; psych P5 is "measure first").
6. Keep rule: strictly above the current best; one change per slot; independent keys are submitted in parallel
   from the same base and merged later in one slot.
7. Final-safety: only keys behind hunt.firewall() or a SQUAD-only read; lose1/2/3Hpf, finishHpf, finishThreats,
   healAfterLoseS, wStick, keepTargetHpf, hostileDmgS are read in FFA and are not used.
8. The simulator's net column has never predicted an official sign; it is used for trigger counts and identity only.

## 2. Conflicts and how each is settled
K1. Is healEnterHp behind the firewall? Math says yes; cyber says no. [C] tactics.js 472:
    `me.hpf < P.healEnterHp || ... || (B.env === 'FFA' && me.hpf < 0.7)`. No firewall call. A value <= 0.7 is inert
    once env is FFA, but acts in SQUAD posture after a foreign death until the FFA latch (3 foreign deaths before
    200 s, params 114). hfExit (line 460) is the same class: read whenever env is not FFA, no firewall.
    SETTLED for cyber. Both heal keys pass T-F2 (forced FFA) but leak into the final's pre-latch seconds more than
    low10 does (low10 stops at the first foreign death). Needs the project moderator's ruling before a heal build
    is entered as the nominated build; a practice slot is allowed.
K2. Math M5 (lastStandHpf 0.15) and the finishThreats 4 reserve. [C] line 476 (doomed) and line 402 (finishing) have
    no posture gate; line 404 uses `!finishing` in the FFA branch. SETTLED: both fail the brief's T-F2 hard rule;
    M5 is dropped. Consequence: a Fable stack must not carry finishThreats 3 even if Opus G10FT3 wins, unless the
    project moderator rules it in (Opus's own matter).
K3. 'never' first (hackathon, game) or rung by rung (cyber: c05 -> c0 -> never, no skipping; math: singles LOW0,
    c05, c0 first and 'never' as their merge)? [C] line 395 splits today's retreats into three exact classes:
    A = cell within 1.5 s and hp >= 10%; B = cell farther than 1.5 s and hp < 10%; C = both.
    Opus G10C10 removes part of A (1.0-1.5 s); G05 removes part of B (5-10%). LOW0 (1.5 / 0) removes B;
    c0l10 (0 / 0.10) removes A; 'never' removes A, B and C, and with them the 6 s after-retreat HEAL entry
    (line 464, healAfterLoseHp 0.9), which no single-axis value removes.
    Evidence for 'never' first: it is the only point Opus cannot reach; sim touched 9 of 36 on the old base, i.e.
    m about 12 of 48, inside math's best size band (8-16 at e = 0.27; yield 1.2 kills against 0.9 for m = 2-3);
    math's own rule 4 says far value first; a slot is worth one result, and both Opus half steps report before
    Fable's slot 3. Evidence against: if it loses, the axis at fault is unknown; R3 (best prefix of a walk).
    SETTLED provisionally: 'never' in slot 1; slot 3 is the single-axis value chosen by the table in section 3.
    Cyber's "no skipping" is not adopted (math section E: a four-value scan yields 0.38 kills per slot).
K4. Psych: "retreat less is nearly spent" (59 vetoes against 2 LOSING entries per match [S]) against four memos
    that put LC steps first. Both numbers are the same data (game: 2127 veto decisions in 36). Two entries per match
    still changed 7-9 of 36 matches when removed [S]. SETTLED: not spent as a ticket source, spent as a long ladder:
    at most three LC values in the six (never, one single-axis value, lcLate), then the hackathon stop-loss.
K5. Heal: first slot (cyber), fourth of six (math), one late ticket after hfExit 0.6 (hackathon), not at all (game).
    [C] The 5.35 build opens on unengaged mechs only at hp >= 0.7 (tactics 226-227, any70f) and seeks only at >= 0.7.
    So healEnterHp 0.40 changes only where we stand between 40% and 55% out of contact (HOLD / LOOT instead of
    hide and hold fire), and hfExit 0.6 only the 60-70% window. Neither starts a fight earlier. In healDoc 'on'
    (-10 kills) the exit 0.7 -> 0.8 did delay new fights from 70% to 80% (HEAL outranks FIGHT at line 484-487 without
    contact); the true mirror of that part is hfExit 0.6 WITH aggrHpf 0.6 (any60f), which is against the owner's
    70% doctrine and the R7 engage memo. NOT SETTLED on sign. Provisional: healEnterHp 0.40 in slot 2 (three memos,
    different key from slot 1, low divergence, T-F2 already passed for the value); one follow-up at most.
K6. New code now (game G2 / G5, psych P1-P4) or params only (math rule 7, hackathon)? History: five new-behaviour
    steps average -4.6 kills, P(higher) 1/5 [M]. Hackathon also says no params-only idea reaches +0.3. SETTLED
    provisionally: one tiny-code slot (slot 6), to be won in round 2 by the candidate with the best argued effect per
    touched match and a passed trigger-count gate. G5 lcLate is the front runner: one line, low divergence, and
    [C] hunt.js 31 confirms the veto is off at next radius <= 70 or <= 3 alive, where the raw 35/50/60% rules return.
K7. High-divergence builds "on a fresh salt" (psych P4, game G2)? [A] A change that touches nearly all 48 matches is
    a full re-roll on any salt; moving it to a new salt gains nothing and discards the 257. SETTLED: no fresh-salt
    slot in the six; high-divergence candidates compete for slot 6 only.
K8. Owner's "fight until one hit": literal F1 (game: one slot) against R1. SETTLED: no F1. The idea is carried by
    'never' and c0l10 (do not leave above one hit); the "leave at one hit" half is what scored lower three times.
K9. P1 / P2 depend on a reload sensor that fires 0.5 times per match [S, 8 seeds]. Not disputed. SETTLED: no slot
    for P1 / P2 in the six; magCarry is an engineering item, not a ticket.
K10. Firewall ratchet (cyber F-A: foreignDeaths never falls, stance.js 36). [C] confirmed. No change proposed by
    anyone; recorded as a condition on every LC result (untestable without the server).
K11. Expected value of the six: hackathon +0.02..+0.08, P(any win) 0.55-0.65; math +3.5 kills, P 0.88. Not settled;
    the three Opus merges are the test (math predicts 258 / 258 / 259).

## 3. Provisional six-slot plan (base B = FSL10 s1, salt 1; do not duplicate G10C10, G05, G10FT3, G10C10FT3)
Common to all: SELECT of B, salt 1, loseCoverNear true. G0 first: fable tree + low10 reproduces variants6/FSL10_s1
(resolved params, 24 sim seeds, kit stream in squad / auto / forced FFA). Per build: identity at the old value,
T-F2, bundle twice byte-identical, then the pusher's gates.
| slot | tag | exact preset value | condition |
|---|---|---|---|
| 1 | FNV | loseCover `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }` | as soon as G0 passes |
| 2 | FHE40 | healDoc `low: { healEnterHp: 0.40 }`, loseCover `low10: { loseCoverNear: true, lcLowHpf: 0.10 }` | parallel with slot 1; practice slot only until K1 is ruled |
| 3 | one LC single | never > best: no single, slot goes to lcLate on the new base. never <= 257 and G10C10 > 257 only: `c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 }`. G05 > 257 only: `low0: { loseCoverNear: true, lcCoverS: 1.5, lcLowHpf: 0 }`. Both > 257: `c05l05: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.05 }`. Neither: LC family closed, slot goes to the slot-4 build | after slot 1, G05 and G10C10 report |
| 4 | heal follow-up | FHE40 > best: `lowx: { healEnterHp: 0.40, hfExit: 0.55 }`. FHE40 lower by 1-2 kills or tie: `x60: { hfExit: 0.6 }` once. Lower by 3 or more: heal closed, slot goes to aggr `any60f: { aggrFw: true, aggrHpf: 0.6, aggrS: 0, h50SeekHpf: 0.6 }` | after slot 2 |
| 5 | stack | current best + every firewalled single from either line that beat its own base (no finishThreats, K2); predicted score = base + sum of gains | when two such singles exist; otherwise c05l10 `{ loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 }` |
| 6 | tiny code | round-2 winner among lcLate `on` (losing() line 393: `B.env !== 'FFA' && B.foreignDeaths < P.h50ForeignMax` in place of the firewall), lowKill `veto`, hostMem `10` (sqHostileDmgS 10). Needs identity, T-F2, trigger counter > 0 | last; if none passes its gates: any60f, or nothing |
Stop-loss: slots 1 and 3 both at or below base closes the LC gate for Fable. No slot for: F1 oneHit, F5 c075, F6 fresh
salt, lastStandHpf, finishThreats / finishHpf, lightning priority, vetoSilent / lcSilent, openPick.

## 4. Questions for round 2
Hackathon
1. Can G0 plus FNV and FHE40 be gated in 35 minutes, and which slot-3 and slot-4 branches do you pre-build?
2. Your section 7 is empty. Report the 24-seed result or withdraw it; and state the trigger counter for x60.
3. seekFrom '10' needs a final-safety ruling: is it behind h.seekOk = firewall (hunt.js 110) at every read?
Cyber
1. K1: how many seconds of the final are played in SQUAD posture after the first foreign death and before the latch,
   and what do healEnterHp 0.40 and hfExit 0.55 do in that window? Give a recommendation: enter or practice-only.
2. Your mechanism says every cut in line-breaking time pays. 'never' also removes the after-retreat HEAL. Name one
   observable that would show 'never' overshoots, and say whether lcLate (K6) reopens the F-A ratchet risk.
Math
1. With classes A, B, C exact (K3), is 'never' first or c0l10 + LOW0 in parallel then merge the better use of two
   slots? Give yield and P(higher) for both orders, using m about 12 for 'never'.
2. Rewrite rule 7 as a number: what trigger count per match and argued effect must lcLate or lowKill show to
   outrank a c05l10 filler at e = 0.27?
3. Replace M5 (not final-safe) and say what the three Opus merges must score for you to keep rule 3.
Game
1. K5: at 40-55% hp out of contact, what does the bot do in HOLD / LOOT that it does not do in HEAL, and is that
   better or worse under 15 hunters with shared vision? Is hfExit 0.6 + any60f the real mirror of healDoc 'on'?
2. Run the lcLate count gate (decisions changed over squad 1-36, fuse 0) and report it; under 20 means drop.
3. If 'never' is kept, is lowKill 'veto' still distinct from 'hp50', and which one do you want in slot 6?
Psych
1. Run the P3 first look properly (36 seeds, fuse 0, override hostileDmgS 10) and report the regain-death stop rule.
2. Which single house habit supports or contradicts 'never' inside 1.5 s of cover (class A): does a hunter that loses
   its line re-open with the 0.25-1.15 s first-shot delay, i.e. is a short peek behind cover worth anything?
3. Of P3 and lcLate, which leaks less into the final's opening, and why?
