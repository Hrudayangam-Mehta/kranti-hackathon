# Owner requests (07:40 UTC Nov 21) — binding for integration pass 2

R1. Smart crate shooting and LOOT STEALING (owner: "not never shooting, but smartly; add stealing loots").
  - Crates and drones are never shot when that shot would be our first shot of an engagement while a mech is
    tracked or heard nearby, never take the torso from a mech, and never reset a regen we need (D6 gates
    stay: full hp, out of contact, t < 210 s in SQUAD).
  - Stealing: let others spend time, ammunition, regen and position on loot, then take the reward.
    a) A crate or drone that another mech is shooting (its hp falls without our hits; beams or bullets aimed
       at it) is a steal target: move to cover close to it (we want to be the closest mech within the cube
       pickup radius when it breaks: cubes go to the closest mech; a crate's weapon lands as a pickup that
       anyone within 4 m can take), arrive just before it breaks, take cube and weapon, leave.
    b) Kill drops in FFA: a mech that dies drops its cubes and every non-gun weapon. Watch duels from
       cover; when one dies, rush its drops if we reach them first (path time vs the survivor's), else
       third-party the survivor (playbook M5).
    c) House bots leave 66% of death cubes on the ground (replay forensics): remember them and collect.
    d) Pickups that others are walking toward: if we reach them first by path time and the route is safe,
       take them (deny lasers to opponents).
    e) Supply drops: never contest a capture in progress; take a drop only when unheld and reachable first.
  - Every steal is gated by safety: hp, threats with a line of fire, zone margin.
R2. Late-game scanning: check and fix the torso scan in the late game (all hunters active in practice; few
    alive in FFA; final circles). No blind rear for more than about 3 s when no target is engaged; sweep
    biased to the last damage bearings, sound bearings, the approaches to our position and the zone
    interior; use the 45 m all-round sense and the 120 deg / 200 m wedge efficiently. When engaged, keep the
    target but turn to face any attacker hitting our rear.
R3. Laser aimed at the head, with calibration. Aim the laser at the highest part of the target body that has
    a clear line (about 0.8 of its height, scaled by its cubes) so the beam clears low cover and terrain
    lips; fall back down the body if the top is not clear. Calibrate online: our own beams appear in
    obs.beams (path from our muzzle to where the beam stopped): measure the miss vector of each beam against
    the target's body at release, keep a running estimate of systematic vertical / lateral / latency error,
    and correct the aim point and lead (bounded, decays back to zero). Same ladder for the gun.
R4. Study the game mechanics further (protocol text, config, kit stream, official replay, the public game
    client as reference only) and turn every exploitable detail into a rule or a parameter.
