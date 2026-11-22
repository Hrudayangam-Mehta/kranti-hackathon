# Tweak candidates for the SQUAD-only climb (checkpoint 08 TW layer) on the 5.38 base

Mech bot engineer (Opus sub-agent), Sun 22 Nov {{DATE}} UTC. Companion of `build_r7a_log.md` section "Checkpoint 08".
Nothing here was submitted or pushed; the sims are behaviour only.

## Base, mechanism, what is excluded

- **Base**: variants6/FNV_s1 = 5.38 official (258 kills over 48 matches, one kill = 0.021), SELECT = KS + aggr 'any70f' +
  fb 'on' + loseCover 'never', salt 1. A climb ticket = that tree plus **one** `tw` value carrying **one** sqOverrides key
  (recipe in the build log). The layer writes the key only in the SQUAD posture while hunt.js firewall() is open, so the
  FFA final after its first foreign death plays exactly as 5.38; before that death (the final's opening) the move does act.
- **Under 'never' LOSING is off in the SQUAD posture with the gate open**, so these keys are dead and are not candidates:
  lose1Hpf, lose1Margin, lose2Hpf, lose3Hpf, lose6, loseHys, loseMinS, finishHpf, finishThreats (B.finishing feeds only LX /
  FFA lines), healAfterLoseHp, healAfterLoseS, lcCoverS, lcLowHpf, pulse pl*, hunt50 commit / pulse keys (hunt off), fc*
  (focus 'mult'), finTtk keys, isoNear, lg* (laserGrab std).
- **Excluded as tested officially**: lcLowHpf, lcCoverS, finishHpf, finishThreats, lastStandHpf (and lastStandAttackers, the
  same doomed rule), lose1/2/3Hpf, healEnterHp, healExit (and hfExit, the same exit), the aggr numbers (aggrHpf, aggrS,
  h50SeekHpf, unengagedHpf, unengagedS). **In flight** (pushed 01:27, not reported yet): NA60b any60f (aggr numbers), NCR
  h50CrowdR, NISO isoNear, NFB finTtk / finB. **Refused** by the layer: the 27 SQ_REFUSED keys. **Inert**: FFA-only keys.
- **Seek keys rank low**: KB s0 was byte-for-byte KS s0 officially ("we are always in contact"), so h50Prey* / h50Arrive* /
  h50SeekFromS / h50Sound* rarely decide anything on the server; earlyOpenS is the exception (the opening is not contact).
- **Ranking** (plausibility of more kills before death against a hunting squad, in contact): kill conversion and damage
  output first, then damage taken, then economy; read against the official lessons of this line: fighting on paid in four
  steps (KB 5.23 -> K6LC 5.29 -> FSLCL15 5.31 -> FSL10 5.35 -> FNV 5.38), boost spending about +0.15 (V1 - V3), heal breaks about +0.17 (V4 vs pulse), healing less -0.06
  (FHE40), fighting early about +0.38 (V1 - V2), reaching farther for a laser -0.19 (K7LG), FINa -0.10.
- **"read"** = share of the gate-open decisions in which the key was read at all, and in how many of 12 traced sim seeds
  (tw_scratch/trace_reach.mjs, 5.38 tree, salt 1): an upper bound for how often the key can matter, not a measure of change.
  The gate was open in 94.7% of the 8953 traced decisions (seed 10: a death not caused by us at 27 s closed it).
- **"expected divergence"**: few = the move can only act in a few matches (rare trigger), many = it acts in most matches and
  is a re-roll of them (official std of a full re-roll: about 0.2 = 10 kills, e.g. V4 salts 5.15 / 4.69 / 5.06). For the top
  12 the 24-seed sim count is given: about twice that many of the 48 official matches would be touched.
- **"FFA-final exposure"**: where the move acts in an FFA final (only before its first foreign death).

## The 30 candidates, ranked
