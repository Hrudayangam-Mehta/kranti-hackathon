# Owner requests (20:05-20:15 UTC Sat) — binding for the next Mech Royale builds (R5a / R6)

1. Full-heal disengage: when hurt, stop attacking and go back until completely healed before the next voluntary
   fight (preset; its own variant, since heal-to-70% measured +0.17 but leaving fights early at 72% cost others 1.1).
2. Zone escape: "go to the circle and take small damage instead of fighting when needed": when a losing fight
   can be avoided by crossing / skirting the zone edge at low zone dps (phases 1-3), do it within a budget.
3. Use the protocol's timing better (decision latency, outputs): see notes/panel_r6_io.md.
4. A table of rewards and action-to-reward ratios: notes/panel_r6_rewards.md; use it to rank actions.
5. Plan for a different map and random spawns in the final: no hard-coded map assumptions (notes/panel_r6_robustness.md).
6. DYNAMIC RISK FACTOR, time- and state-based: "plan as the game moves forward ... time-based actions, when to go
   for crates and push and be risky and change the risk factor". Specify one risk variable r in [0, 1] computed
   every decision from match time, zone phase, mechs alive, house bots remaining / hunters active, our hp, cubes,
   loadout and upgrades, and recent outcomes (kills, damage taken); it scales the existing thresholds (engage
   gate, retreat / heal thresholds, farming hp gate and radius, crate and drop detours, chase distance, boost
   spending) through explicit, monotone, bounded maps. Defaults must reproduce V4 exactly when the preset is off.
   Give the schedule in a table (e.g. early: farm and grab power; mid: push isolated hunters; late: survive to
   the collapse when few remain; FFA: conservative until the latch, then by alive count).
7. Tech stack: JavaScript stays for the Mech bot (measured p99 answer 1-3 ms, 0 late answers in 52,605
   decisions; a C++ / Rust port gains no points). Shopping Sessions is already Rust.
