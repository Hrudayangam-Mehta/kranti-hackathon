# R7 moderator ruling (22:20 UTC Sat) — binding

Binding = notes/build_spec_r7.md (chair, round 3, Fable) + every REQUIRED amendment in notes/build_spec_r7_critic.md.
Where they conflict, the critic's amendment wins. The owner's doctrine stands: no over-coding; go for the maximum
reward at hp >= 70% unless one volley can kill us; otherwise heal. The literal "leave a fight below 70% to heal" is
not drawn: other teams' leave-early tests lost 0.60 and 1.10 [M]. It is one params-only slot (lose1/2/3Hpf 0.70) if
the owner asks.

## State
- Best overall 5.23 = KB s1 (old code, any70 unfirewalled, entered). R7-tree best (BP) = R7P s1 5.13 (checkpoint 02).
- Server determinism: strong evidence (KB s0 = KS s0 = 5.19 exactly), not yet a direct repeat on the R7 tree.

## Decision tree for the next slots (critic amendments 2-4, 6-7)
1. KS s1 on the old code (5898265c) — submitted next with KBH s1 (6b038a94).
   - 5.23: any70 is a no-op at salt 1 too; the R7 code diverges officially. Next slot: R7m s1 (c959cc23, ioMerge
     off). If R7m s1 = 5.23, IO8 is the cause: the server skips our late answers (latency becomes a lever), and BP
     moves to R7m s1 (5.23); climb arms go on the R7 tree with ioMerge off at salt 1. Else try pocketCfg off.
   - 5.13: any70 acted at salt 1 (+5 kills); R7 is identical. Next: KB-firewalled (any70f) on the R7 tree at salt 1,
     expected exactly 5.23, which becomes BP; then the climb.
   - anything else: resubmit the identical KB s1 hash d4518215 once; if it does not read 5.23, drop the climb and use
     fresh salts plus two-draw means.
2. No climb slot until one official exact repeat exists on the R7 tree (amendment 3).

## Arms (engineer order) and draw rule
LX (firewalled), LC, FINa, ISO, CR (h50CrowdR 120), HF (healDoc full), FB (final bundle, off until its identity
slot), LG (fresh salt), FINb only if FINa is kept. Dropped: AVO, h70g, PRE, risk, calm rear, ESC, zoneEsc, SYNC, CM.
Every arm is drawn first on BP's salt (amendment 11): higher -> new BP, entered; tie -> retired on that salt; lower ->
off until BP's salt changes. Every fresh-salt and filler draw is on the R7 tree, checkpoint 03 or later (amendment 10).
At least one fresh R7 salt per window. The final entry is not re-picked while every entry is below the cut
(amendment 9). Record the board's 32nd at the top of every window (amendment 21).
