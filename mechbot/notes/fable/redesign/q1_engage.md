# Q1 ENGAGEMENT questioner: variant spec 'd' (Fable panel, Sun 22 Nov)

One author, no independent review, nothing here is measured. All numbers are derived from the rules bible and our
[M] house measurements; read live values from `hello`. Base: FNV s1 (5.38).

## Derivation numbers used
- Our output: gun 105/s sustained x hit (about 0.9 at 110-150 m on a straight walker), laser 131/s flat to 280 m. Gun + laser about 220/s: a 1400 hp kill in 6.4 s.
- House intake on us [M]: gun 51 / 51 / 27 / 11 per s at 40 / 75 / 110 / 150 m, laser +35 flat. Flat inside 75 m. A velocity reversal within bullet flight cuts their hit rate 84% -> 22% beyond 75 m only.
- Exchange rate [M]: 390 hp taken per kill (1400 dealt), so 1 hp of ours is worth 3.6 hp of theirs.
- Regen (45/s after 5 s with no damage either way) never starts under a hunter with a line; a retreat buys 0 hp for 5 s. Instant hp is cubes only (+56 hp, +4% damage, cap 10).
- Escalation is kill-driven (squad_model: about 1 score point per 0.5 hunters-per-kill); 0.7 of a kill is left in live mechs at our death.
- Noise: sd 0.17 per draw, so a single rule under +0.35 cannot be read from one draw. Test D1 alone, the rest as one bundle, two salts each.

## Their mechanics questioned
| Mechanic | Verdict | Our number |
|---|---|---|
| Opening gate (10 cubes or 75 s) | Sound: kill 1 starts the escalation, a lone hunter at 100-150 m costs 11-62 hp/s, a crate beam pays +56 hp +4%. But ours lost 0.38 with a gate that also broke lines. 10 cubes is too many: offers come at 1/3/6, cubes 7-10 are +4% each with no offer | laser held and 6 cubes, or 60 s; no hiding |
| Attack on sight 220 m, hp > 35% | An hp gate on firing is wrong in SQUAD: hunters come anyway, hp at death is worth 0. Only walking toward a fight needs a gate (aggr 60% lost 8 kills) | fire: no hp gate, 280 m laser / 205 m gun; seek: hp >= 70% |
| Time-to-kill vs time-to-die, 1.5x margin | Their model puts intake at 141/s at 100 m; we measure about 70. As a retreat trigger it contradicts "never leave" (official best) and "isolate" (-24 kills) | no retreat; use the same two times to pick the target (D5) |
| Finishing override 1.6 s | Fine, but one laser cycle is the natural unit | hp <= 470 x dmgMult (one beam + 4 bullets, 2.4 s) |
| Target score (hp 1 : 2.5 per m) | Overweights hp. 1 m costs about 0.06 s (gun falloff + corpse reach at 19.5 m/s) = 13 hp, so 1 hp = 0.08 m | keep ours (dist + 0.1 hp); cut stickiness when doomed |
| Range by own - 1.15 x incoming | 1.15 undervalues our hp (3.6 by exchange rate): at 75 / 110 / 150 m the 3.6-weighted balance is -90 / -8 / +39. Limit is corpse reach: one boost tank = 115 m | D2, D3 |
| Boost back at 25 m inside hold, energy > 30 | Right idea; the real boundary is 75 m (flat maximum, reversal useless inside) | D4 |
| Spacing (dislike inside 60 m) | Same boundary | 70 m in, 95 m out |

## Variant 'd' rules
| # | Trigger -> action | Hypothesis | Sign | Scope |
|---|---|---|---|---|
| D1 | kills = 0, no foreign death, and not (laser held and cubes >= 6), t < 60 s -> no mech is a target; farm crates/cubes/laser. Exceptions: a mech that hit us from < 100 m in the last 4 s; 2+ shooters; no cube gained for 15 s. `ofBreak` off (never break lines or hide). | Escalation is kill-driven; pre-kill cubes are cheap | + (0.2-0.4); conflicts with our +0.38 for fighting early, so alone, two salts | SQUAD |
| D2 | Gun only -> band 120-150 m, hold 135 (now 55-95, hold 75), strafe reversal every 0.5 s | 75 m sits on their maximum (51/s); at 135 m intake is about 15/s for about 10% less output; 82-85% of early decisions are gun-only | + | both |
| D3 | Laser held: target hp > 630 x dmgMult (over 2 beams) -> hold 150 (130-170). At or under 2 beams and <= 2 shooters -> stop backing, let it walk in, floor 90 m. Lightning carrier: floor 55 m always | Far while it costs hp, near when the corpse cubes (+112 hp, 66% uncollected) must be reached in one boost | + | SQUAD |
| D4 | Any shooter inside 70 m, energy >= 35, not finishing -> boost directly away in 1 s pulses until >= 95 m; allowed while charging (17 energy per pulse against 18/s regen is sustainable) | Inside 75 m intake is maximal and dodging fails | + small | both |
| D5 | Replace FB1/FB2 retreat logic. tDie = hp / max(2 s measured intake, 30). If tDie < tKill(current): switch to the lined target with the smallest tKill if that is < tDie; current-target bonus 200 -> 60. Never leave the fight | Recover part of the 0.7 kill left at death | + (0.1-0.3) | SQUAD |
| D6 | After the gate: fire at any lined mech inside 280 m (laser) / 205 m (gun) at any hp; walk toward a mech only at hp >= 70%; isolate and FB2 reposition off | Firing is free, walking and line-cutting are not (official -8, -24 kills) | + small / protects | SQUAD |

## Contrarian rule C (against both bots)
hp < 35% with 3+ shooters (tDie under about 5 s) -> stop holding range: boost at the smallest-tKill target without lightning to 25-30 m and stay on its corpse spot.
Why: house gun intake is flat from 75 m to 40 m, so closing costs nothing extra; our gun goes to near 100% hit; corpse cubes land within 5 m and heal +112 hp or more at once, the only heal that works under fire. Both bots kite when weak. Sign unknown, high variance; SQUAD only, test last and alone.
