# Panel R7: moderator's running notes (round 1 intake)

Owner doctrine (21:31 UTC): do not over-code or over-strategise; always search for and go after the maximum reward when hp
>= 70% and no single volley can kill us; otherwise heal. Experts for rounds 2-3 run on Fable with roles, guided reasoning,
current papers, research assistants and their own sub-agents (owner's request).

Official since the brief: KS 5.19 (new best, entered in the final), S salt 1 4.92. Pushed for 21:44: KB (any70) s0/s1,
KS s1-s5.

## Round 1 intake
### game (memo panel_r7_r1_game.md)
- Practice is a phase-1 match: we die at about 18-24% of the schedule to the hunters (2-7 assigned, median 4); the
  later zone phases and "few remain" are never reached [S, A].
- In the sim every house death before ours is our own kill: the score is our kill count before we die [S].
- Points are lost in the escalation fight (after 3 kills, about 3 attackers, entered at 44-64% hp) and in gun-only play
  (82-85% of decisions before the 3rd kill) [S].
- Ranks for practice: FIN > LC (keep its < 25% clause) > LG > AVO / ISO > risk. Risk schedule mostly pays in the final.
- Vetoes: zone-rotation tweaks for practice; any map that leaves fights earlier; longer drop reach; opening fights beyond
  x1.15 at high r.
- KB is the g(hp) step of the risk proposal without q.

### stats (memo panel_r7_r1_stats.md)
- The 14 draws (before KS 5.19) fit one build: per-draw sigma 0.17 (0.13-0.21); every item effect within +-0.06
  (tau about 0.04). V4's true mean 4.93 +- 0.06; its 5.15 was luck [M, A].
- Salts of V4 alone: P(> 5.6) = 0.03, P(> 5.8) = 0 over 96 draws. Qualifying needs a true mean of about 5.3 (cut 5.6)
  or 5.5 (cut 5.8). Cut forecast near 5.5 by a saturating fit, 5.6-5.8 expected.
- Policy: until 09:00 every slot is a new arm on the current stack or an arm's 2nd draw; salts only as fillers.
  First slot on new code: V4 s0 must re-score exactly 5.15 (identity of the port, P0).
- Reward table: kill about +0.9..+1.0; survival 0.03 / 0.06 / 0.10 pt per s at 0-20 / 20-40 / 40-110 s; hp 0.0005
  pt (one attacker) / 0.004 pt (2+ attackers).
- Final entry: any of our commits may be nominated if its own score clears the cut; salts and ports allowed; seed
  fingerprinting is not.
- Question for the panel: what structural change is worth +0.4 or more?

### eng (memo panel_r7_r1_eng.md)
- Audit clean: 0 zone deaths, 0 stuck >= 2 s; p99 8 ms. Wall shots are misses into the backdrop, not blocked lines.
- LX `loseExit` (losing() exits on one dip of the threat count): preset, sim on-off-on 7 > 0, +0.03 (-0.05..+0.10).
- IO8 into every build: a kill lost in a skipped observation counts as a foreign death (closes the firewall, three
  latch FFA). Amendments to RB2/RB3/RB6/LG/AVO/ZE listed. Engineer told (IO7, IO8, LX added).

### research: exploit (panel_r7_sota_exploit.md, Fable)
- No new mechanism worth code tonight. Defeat in detail (Lanchester: n lines at once cost n(n+1)/2, one at a time n):
  rank ISO first of R5a; heal breaks and early fighting are the same effect.
- Smith's rule targeting (shortest time-to-kill first, no switch before the kill) = focus mult + finish ttk.
- Keep laserRange far. Optional 3-line rear-arc prey bonus (+0.03, -0.10..+0.15). Final only: ffaWoundTgt 0.5 -> 0.35.
- Vetoes: peek/cover fighting (A17 -0.71), strafe fast, reload-window laser holding, online opponent modelling.
### research: risk (panel_r7_sota_risk.md, Fable)
- The doctrine is the textbook form (maximise reward under a hard no-one-volley constraint plus a margin).
- Practice: nobody dies unless we kill them, so waiting earns nothing: risk appetite should rise with time.
- Final: play tighter while many are alive (`risk ffa`, zero practice cost) — first; `risk late` one slot at most.
- "Every practice effect here is below one draw's sd. Do not spend more than one slot on it."

### psych (memo panel_r7_r1_psych.md)
- House habits [R]: first shot 0.25-1.15 s after a line opens; 3.3 s of fire then 2.5 s reload silence; laser out 2.4 s
  after each beam; hit from outside its view it turns after 1.6 s and answers after 2.6 s; never retreats. Shared vision:
  hiding sheds nobody (ten hide-first tests by other teams lost 0.3-1.75 [M]): exploit timing, not information.
- Practice: PRE precharge 'line' (+0.03..+0.10, 60-90 min); `calm: 'rear'` band-clause pick only for hostile / engaged /
  rear-facing mechs with nothing else on us and hp >= 80%. Queue view: FIN > ISO/LC > AVO > LG > SYNC > HN > ZE.
  Says keep hunt and seek off (contradicted by KS 5.19 [M] — one draw).
- Final: F1 62 m bubble (`ffaProx` [62, 62, 75]) +0.1..+0.5 per match [A, L]; veto `ffaHunt`; F3 build `ffaOpenGuard`
  and an earlier beam-clue FFA latch; prove the final-only bundle inert in practice with one identity draw.
### research: bestof (panel_r7_sota_bestof.md, Fable)
- Leader family true mean about 5.03; expected best of 100 draws about mean + 0.60 = 5.6; P(5.8) 0.06 by salts.
- Knob flips so far moved the mean by about 0; only behaviour-level arms can carry +0.3.
- Max objective: exploration is nearly free. PI rule with shrunk means; always a fresh salt (identical build + salt
  repeats exactly). New arm >= 4.95 earns a 2nd draw; < 4.75 dropped. >= 2 leader salts per hour while under the cut.
  Last 2 hours: all slots on the single best mean. Pre-push 6 filler salts each hour.
### research: engage (panel_r7_sota_engage.md, Fable)
- Lanchester triangular cost: a two-line fight costs about 63% of hp; the owner's 70% is the entry hp that pays for it
  (entry 80-100%: 2.43 kills; 60-80%: 1.78 [S]). The 70% gate belongs on STARTING and SEEKING fights, never on leaving.
- One-volley guard almost never binds at 70% (needs 3-4 lasers at once): a safety rail for the final.
- Smith ratio targeting = AVO; fix its priors to measured house values (laser +35, not +78). Veto more kiting work.
- Parameter-only test: `h50CrowdR` 60 -> 120 in the seek prey choice (+0.03).

### stress (memo panel_r7_r1_stress.md)
- Clean bill on randomness and maps [S]: 528 sim matches + 46 conformance runs, 0 errors / crashes / lates / fuse
  trips; 11 transformed maps and 4 renamed layouts PASS; squad never latched FFA (168/168); 36/36 pocket starts escaped;
  worst decision 16.4 ms.
- Final-only: ZG1 late-zone centre inside a building pins the bot until it dies in the zone (2 of 72 late starts;
  4.5-4.9% of late centres unreachable), ~25 min; ZG2 zone-blind A* to the late anchor (2 of 72), ~35 min; F3 final
  goals lack a passability check (31.6% of final points on a prism) -> fold into ZG1. HB1 hello budget, F5 fuse from
  tick budget. Practice value about 0 (no squad sim match lived past 161 s): final insurance behind presets only.
- No veto on RB2-RB6 or IO; RB4 never needed.

## Official news before round 3
- KB s0 = 5.19 = KS s0 exactly: any70 changed no decision in 48 official matches, and the server is deterministic
  (an identical build + salt repeats exactly). KB s1 = 5.23 (best, entered), KB s2 = 4.98. KB ~ KS officially.
- Hill-climb (aieng): a low-divergence arm on the best salt re-rolls only the matches it touches; keep it if it scores
  higher. Base for arms is now salt 1 (5.23). KBH s1 (healDoc on) pushed as the first such step.

## Round 2 intake (Fable)
### designer (panel_r7_r2_designer.md)
- FIN = "never give up a kill we can finish before we die": +0.12 (-0.10..+0.35); then FIN + LC + LX as one "commit" arm.
- LG + spawn look-around (scan sweep) +0.10 (-0.20..+0.40), the widest ticket.
- Doctrine as four rules: gate to start/seek at hp >= 70% (hostiles always answered); target = cheapest kill (focus mult
  + finish ttk; crowd-aware prey); leave only by losing() at d3 lines with no finishable target (LC/LX); heal out of
  contact below 70% up to 80%. Vetoes: PRE, risk in practice, kiting/peek, solo single-number flips, any rule where the
  70% gate ends a fight.
### aieng (panel_r7_r2_aieng.md)
- P0 = KS s0 on the R7 tree must read exactly 5.19. Draw low-divergence arms on the leader's own salt (hill climb).
- RB3 clamp defect; IO8 not built; aggr line missing in the engineer's tree (all sent to the engineer).
- KB side effect: FIGHT pre-empts DROP/LOOT. Readiness: LC/LX by 22:40, ISO + FIN(a) by 23:40, FIN(b) + LG by 00:40,
  AVO last. Owner question: an event-triggered second salt would give unlimited climb steps (pure noise selection).
### decision (panel_r7_r2_decision.md)
- Slot picker: identity slot per code generation; first draws of gated behaviour arms (max 4 per window); 2nd draw if
  first >= b - 0.05; stack salts; parked arms; fresh stack salts. Drop at first <= b - 0.25 or 2-draw mean < b; adopt at
  2-draw mean >= b. New code stops 09:00; last two hours 12 fresh salts of the best stack.
- P(best > 5.5 / 5.6 / 5.8) at close about 0.65 / 0.45 / 0.12 (leans high).
### redteam (panel_r7_r2_redteam.md)
- KB is a KS salt (sim: 51 of 60 matches identical) — confirmed officially.
- Do not draw: h70/h70g, AVO as specified (swaps mult->add; prior +78 vs +35), ZE/zone fixes in practice, risk/PRE
  tonight, a literal "leave a fight below 70% to heal" arm. Highest harm: LC (a no-retreat bundle lost 0.41 officially)
  and LG (turns off early engagement until 90 s). ISO is mislabelled (reduces isolating walks).
- FINAL: in the sim, KS with the FFA latch DISABLED placed 1.33 +- 0.40 better than latched KS (48 seeds, 26 / 6).
  Add no FFA strategy code; ship only ZG1 behind a preset.
### final (panel_r7_r2_final.md)
- Final bundle FB = three numbers: ffaProx [70,70,80], ffaHealExit 1.0, optional ffaLatchDeaths 2; ZG1 if time.
- Firewall test T-F2 for every practice preset: any70 unfirewalled would attack a calm field all final (-1..-3 per
  match [A]). Nominate only RB-code entries; identity draw = port draw. Freeze 12:30 UTC Sun.
- Note the conflict with redteam point 8 (latch disabled better in sim): round 3 must decide.

## 22:10 UTC: identity port missed
- R7P s1 (KS SELECT, salt 1, R7 checkpoint-02 code) = 5.13, expected 5.23. Either any70 mattered at salt 1, or the R7 code
  diverges officially. Prime suspect if R7: IO8 (ioMerge) acting after a late decision — the engineer saw a 43.7 ms
  worst decision under machine load (budget 50 ms), so official late answers are plausible. Second suspect: RB2-RB5
  anchoring if the official config differs from the kit's default balance.
- Bisect queued: KS s1 on old code (5898265). 5.23 -> R7 diverges (next: R7 with ioMerge off, salt 1); 5.13 -> any70
  mattered at salt 1, R7 identical.
- If late answers happen officially, decision latency on the 1-CPU scorer is itself a lever (skipped observations =
  slower reactions and aim).
- Engineer at checkpoint 03 (aggr + healDoc + RB3 clamp + ioMerge / pocketCfg switches); LC + LX next.

## 22:45 UTC state
- Determinism proven twice; R7 tree = old code officially; any70 acted at salt 1 (+5 kills); healDoc acts officially
  and cost 10 kills at salt 1 (dropped). Local divergence does NOT predict official divergence.
- Engineer finished checkpoints 01-07 (RB, IO, aggr/healDoc, LX/LC, FIN/ISO/CR/HF, firewalls + FB + T-F2, LG).
- Climb queue on salt 1 (base KB s1 5.23): KF (FINa), then LG, LC, LX on whichever base wins; one fresh R7 salt per
  window; final-safe port K6f s1 (any70f) if nothing beats 5.23. ISO held back (sim down, mislabelled).

## 01:30 UTC: Fable line (proper panel: 5 Fable experts x 2 rounds + Fable moderator, atlas skills)
- Round 1 memos r1_*.md, moderator synthesis moderator_r1b.md, round 2 memos r2_*.md, binding plan FABLE_PLAN2.md.
- Slots 1-2 pushed by me: FNV (loseCover never) 4ffa6f23, FHE40 (healEnterHp 0.40 on low10) 5e45b8e2.
- Slots 3-6 conditional on FNV (N), FHE40 (H) and Opus G10C10 (C) / G05 (L): c0l10 or low0 single; healEnterHp 0.30
  if H wins; stack across keys only after an exact hit among Opus merges (math predicts C 258, G10FT3 258, G10C10FT3 259);
  one code change only for a firewalled heal entry (healEnterFw) if a heal build wins.
- Final-safety findings for BOTH lines: finishThreats / finishHpf / lastStandHpf / healEnterHp are not firewalled
  (read in FFA or in the pre-latch window). An Opus winner carrying finishThreats 3 needs a firewalled twin before it
  can be nominated. Nomination = highest official score among firewalled builds.
