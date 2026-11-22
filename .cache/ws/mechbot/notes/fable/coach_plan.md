# Fable gamer coach: aggressive plan (03:25 UTC Sun), verbatim summary for the redesign panel
Coach's read: every bot dies ~95 s when the squad piles up; score = kills/min x life + instant hp. Kyoto 3.8 kills/min vs ours 1.9 (sim):
laser by 6-14 s, kills under 5 s, on the corpse cubes within 8 s. House bots never retreat, hide, reload early (12 rounds then 2.5 s
silent), release a partial laser, or add noise to their lead; aim at body centre, walk straight at us, median 1.15 s to fire after a line
opens; 200 m / 120 deg cone + 45 m all round; shared vision. We waste 82-85% of decisions gun-only before kill 3, 44% of time travelling,
farm only at 90% hp, leave ~1 kill of damage in live mechs at death, never use the 95 s drop, reload only at <= 4 rounds.
"Heal" = instant hp: cubes (+56 each), plating (+210), the drop (full). Hide-and-heal lost every official test.
Ranked rules (coach's arithmetic): 1 kill conversion (+0.30): target = dist + 0.1 hp, -200 if hp <= 30%, -200 if our target in last 2 s,
-40 if it hit us in 4 s; partial laser release when 0.7 x est dmg >= hp; walk-in finish at 20 m when target < 38%, we > 42%, <= 2 lines.
2 laser by 15 s (+0.30): 360 deg sweep at t=0, boost to nearest ground laser within 240 m path, shoot crates within 45 m en route, stop at
25 s or first damage from < 100 m; never mortar; lightning only if laser-less at 40 s. 3 drop 1 as second life (+0.40, high variance):
pull toward the ring from the 70 s call, DROP > FIGHT from 88 s if ring <= 8 s away and hp > 4 s x intake + 100; stand 4 s firing.
4 kill-cube snowball (+0.25): after our kill boost to the corpse if path <= 120 m and <= 3 lines; take its laser if none.
5 mid laser band 100-130 m + boost while charging under fire (energy > 30) (+0.20). 6 alpha strike / magazine rhythm (+0.15): reload to
full when no line 0.4 s; open only with full mag + full charge at <= 130 m, prefer targets facing away; push during their 2.5 s reload.
7 line discipline (+0.15): pauseMove, keep attackers in our front 180 deg, strafe reversal per bullet flight beyond 75 m, peek with cover.
8 farm in passing (+0.10): farmHp 50, crates within 80 m, upgrade order plating, armor, laser_damage, laser_charge, plating, nanites,
gun_rate, gun_damage; fix mortar ids. Keep loseCover never, aggr any70f, seek on, fightEarly on, healDoc off.
