# Fable line: moderator's record (00:25 UTC Sun)

## Status of the panel: NOT CONVENED (blocked)
The task asked for five expert sub-agents (model "fable") over two rounds. This moderator session has no sub-agent
tool (no Agent / Task spawner among its tools, checked with the tool search), so no expert was spawned, no
r1_<role>.md / r2_<role>.md file exists, and there was no second round. I did not work around the limit by starting
other sessions. What follows is ONE Fable agent (the moderator) working through the five lenses alone, plus a
behaviour-only simulator sweep. It is a single-agent baseline, not independent expert review; treat agreement between
"lenses" as one opinion.

## Evidence used
[M] official scores (notes/submissions.md), [S] simulator (behaviour only; it ranks nothing), [A] analysis.
Sweep [S]: 36 squad seeds, salt 1, base = the 5.31 build (final-safe SELECT + loseCover near + lcLowHpf 0.15), tree
ckpt_07_LG, plain overrides. Files: scratchpad/fable_work/sim/<tag>/sq<seed>.meta.json, summary by fable_work/summ.py.

| tag | override on the base | matches that differ | up / down | net kills |
|---|---|---|---|---|
| OH (Opus pending) | lose1/2/3Hpf 0.20/0.25/0.30 | 4 | 0 / 1 | -1 |
| NR | lose1/2/3Hpf 0, lose6 99 (never LOSING) | 10 | 0 / 1 | -1 |
| NRLC | lcCoverS 0, lcLowHpf 0 (never LOSING, firewalled form) | 9 | 0 / 1 | -1 |
| OHLC | lcCoverS 0, lcLowHpf 0.23 (retreat only under one laser hit) | 13 | 3 / 1 | +4 |
| LOW0 | lcLowHpf 0 (retreat only with cover within 1.5 s) | 7 | 0 / 0 | 0 |
| HE40 | healEnterHp 0.40 | 3 | 0 / 2 | -5 |
| HL | healEnterHp 0.40, healAfterLoseS 0 | 3 | 0 / 2 | -5 |
| A50 / A60 | aggrHpf + h50SeekHpf 0.5 / 0.6 | 4 / 3 | 0 / 2, 0 / 1 | -2 / -1 |
| FH | finishHpf 0.35, finishThreats 3 (acts in FFA: not final-safe) | 1 | 0 / 1 | -1 |
| NRLC + A50, NRLC + HE40 | combinations | 13 / 12 | 0 / 3 | -3 / -6 |
Base mean 4.06 kills, 71 s alive; time shares FIGHT 60%, HOLD 16%, ZONE 11%, LOOT 9%, DISENGAGE 3%, HEAL 1%.

## Lens notes
- Mathematician [A]. Per-match sd of our kills from the salt is about 0.2 x sqrt(48) = 1.4. A step that touches m of
  the 48 matches on a base that sits e above its config mean has delta ~ N(effect - e m/48, 0.029 sqrt(m)); kept only
  if > 0. With no real effect the expected gain per slot is about 0.02-0.026 at e = 0.16 for any m (flat), but at
  e = 0.35 (a 5.5 base) it is 0.011 for m = 3-12 and 0.003 for a full re-roll. So: the higher the base, the more the
  line must prefer LOW-divergence steps; fresh salts stop paying. A neutral climb from 5.31 to 5.6 needs on the order
  of 20-30 slots; only a real effect shortens it. Observed climb deltas (-0.10, -0.19, -0.04, -0.21, +0.06, -0.02,
  +0.02) fit m about 12 with a mean near -0.07, i.e. mostly lottery.
- "Fight until one hit" (owner). A kill is +1 and death ends the count, so leaving pays only if we survive, regenerate
  (5 s untouched, then 45 hp/s) and return; against 15 hunters with shared vision that rarely happens. Official trend
  agrees (LC +0.06, low15 +0.02, cover 2.0 -0.02, healDoc -0.21). Two readings exist: (a) Opus FSOH lowers the d3
  thresholds (still leaves when cover is near); (b) literal: ignore cover distance, leave only under one laser hit
  (315 / 1400 = 22.5%) = OHLC. (b) is the only variant with a positive sim net; (c) never leave (NRLC) is the limit.
- Red team (own code). lose1/2/3Hpf, finishHpf and healAfterLoseS are read in FFA too (tactics.js losingRaw /
  decideMode): variants built from them are not final-safe. lcCoverS / lcLowHpf sit behind hunt.firewall() and
  aggrHpf behind foreignDeaths === 0: the Fable builds use only those.
- Game designer. The heal-less and seek-earlier-by-hp directions are negative in the sim (and the R7 engage memo
  measured entry 80-100% hp 2.43 kills vs 60-80% 1.78): the 70% gate on STARTING fights stays; only LEAVING changes.
- Opponent modeller. No new house habit was derived tonight; the R7 psych list stands (never retreats, 2.5 s reload
  silence, 2.4 s laser gap). Nothing in the plan depends on a new habit.

## Open questions I could not put to anyone
1. Does the official scorer reward OHLC's extra retreats under 23% (sim DISENGAGE 3% -> 5%) or punish them like every
   other "retreat more" step? Only a slot answers it; NRLC is the hedge in the opposite direction.
2. h50SeekFromS 20 -> 5 (seek earlier) diverges in most matches (6 of the first 7): a full re-roll, poor on a lucky base.
