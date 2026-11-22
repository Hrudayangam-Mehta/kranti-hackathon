#!/usr/bin/env python3
"""Write a long synthetic, schema-valid mechfight/1 stream (hello, N obs, end) built on the kit stream.

usage: gen_long.py <kit dir> <out.jsonl.gz> [N=4800] [seed=7]
Every observation is validated against kit/mechfight.schema.json (Observation) before it is written.
"""
import copy, gzip, importlib.util, json, math, random, sys

kit, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 4800
rng = random.Random(int(sys.argv[4]) if len(sys.argv) > 4 else 7)
spec = importlib.util.spec_from_file_location("kitcheck", kit + "/check/check.py")
kc = importlib.util.module_from_spec(spec); spec.loader.exec_module(kc)
schema = kc.Schema(kit + "/mechfight.schema.json")
msgs = [json.loads(l) for l in gzip.open(kit + "/check/stream.jsonl.gz", "rt") if l.strip()]
hello, base_obs = msgs[0], [m for m in msgs if m.get("type") == "obs"]
cfg = hello["config"]
hello = copy.deepcopy(hello)
hello["future_hello_field"] = {"note": "unknown fields must be ignored", "n": 1}
hello["config"]["future_config_block"] = {"x": 1}
me_id = hello["slot"]
ups = cfg["upgrades"]
zc = cfg["zone"]

# zone schedule: phase k = (start, shrink_start, shrink_end, r_from, r_to, c_from, c_to, dps)
phases, t0, c, r = [], 0.0, list(zc["start_center"]), zc["start_radius"]
for ph in zc["phases"]:
    room = max(0.0, r - ph["radius"])
    a = rng.uniform(-math.pi, math.pi); d = rng.uniform(0, room * 0.9)
    nc = [c[0] + d * math.cos(a), c[1] + d * math.sin(a)]
    ss, se = t0 + ph["hold_s"], t0 + ph["hold_s"] + ph["shrink_s"]
    phases.append((t0, ss, se, r, ph["radius"], list(c), nc, ph["dps"]))
    t0, c, r = se, nc, ph["radius"]

def zone_at(t):
    for (st, ss, se, rf, rt, cf, ct, dps) in phases:
        if t < se:
            f = 0.0 if t <= ss else (t - ss) / (se - ss)
            cc = [cf[0] + (ct[0] - cf[0]) * f, cf[1] + (ct[1] - cf[1]) * f]
            return {"center": [round(cc[0], 2), round(cc[1], 2)], "radius": round(rf + (rt - rf) * f, 2),
                    "next_center": [round(ct[0], 2), round(ct[1], 2)], "next_radius": rt,
                    "shrink_start": ss, "shrink_end": se, "dps": dps}
    st, ss, se, rf, rt, cf, ct, dps = phases[-1]
    return {"center": [round(ct[0], 2), round(ct[1], 2)], "radius": 0, "next_center": [round(ct[0], 2), round(ct[1], 2)],
            "next_radius": 0, "shrink_start": ss, "shrink_end": se, "dps": dps}

def wstats(kind):
    return {k: v for k, v in cfg["weapons"][kind].items() if isinstance(v, (int, float)) and not isinstance(v, bool)}

def weapon(kind):
    w = {"kind": kind, "cooldown": round(rng.choice([0, 0, 0.05, 0.3, 1.2]), 2), "stats": wstats(kind)}
    if kind == "gun":
        mag = cfg["weapons"]["gun"].get("mag", 12)
        w["ammo"] = rng.choice([mag, mag - 1, 5, 1, 0])
        w["reload"] = round(rng.uniform(0.1, 2.0), 2) if w["ammo"] == 0 else 0
    if kind == "laser":
        w["charge"] = rng.choice([0, 0, 0.2, 0.6, 1.1])
    return w

def near(p, lo, hi, dz=3.0):
    a, d = rng.uniform(-math.pi, math.pi), rng.uniform(lo, hi)
    return [round(p[0] + d * math.cos(a), 2), round(p[1] + d * math.sin(a), 2), round(p[2] + rng.uniform(-dz, dz), 2)]

def v3(s):
    return [round(rng.uniform(-s, s), 2), round(rng.uniform(-s, s), 2), round(rng.uniform(-1, 1), 2)]

kinds = ["gun", "mortar", "laser", "lightning"]
tick, cubes, mine_ups, offer, offer_left, offer_id = 0, 0, [], None, 0, 0
thresholds = cfg["cubes"].get("upgrade_thresholds", [1, 3, 6, 10, 15, 21])
lines = [json.dumps(hello, separators=(",", ":"))]
bad = 0
for i in range(N):
    o = copy.deepcopy(base_obs[i % len(base_obs)])
    tick += 2
    if i in (900, 2500): tick += 128          # recorded streams have long gaps too
    if i % 97 == 50: tick += rng.choice([2, 4, 6])
    t = tick / 20
    o["tick"], o["t"] = tick, round(t, 2)
    o["alive"] = max(2, 16 - int(14 * i / N))
    s = o["self"]
    s["id"] = me_id
    s["max_hp"] = s["stats"]["hp"] = round(1400 * (1.15 ** mine_ups.count("plating")), 1)
    s["hp"] = round(max(1, s["max_hp"] * abs(math.sin(i / 37.0))), 1) if i % 211 else 1
    s["energy"] = round(rng.choice([0, 3, 20, 55, s["max_energy"]]), 1)
    s["grounded"] = (i % 13) != 0
    slot1 = [None, "laser", "mortar", "lightning", "laser"][(i // 120) % 5]
    slot0 = "gun" if (i // 700) % 3 else rng.choice(["gun", "gun", "mortar"])
    s["weapons"] = [weapon(slot0), weapon(slot1) if slot1 else None]
    if (i // 120) % 5 == 4: s["weapons"] = [weapon("laser"), weapon("lightning")]
    z = zone_at(t)
    o["zone"] = z
    s["in_zone"] = math.hypot(s["pos"][0] - z["center"][0], s["pos"][1] - z["center"][1]) < z["radius"]
    # loot, enemies, threats
    others = [k for k in range(16) if k != me_id]
    rng.shuffle(others)
    mechs = [m for m in o["mechs"] if m["kind"] == "npc" or m["id"] != me_id]
    for k in others[: rng.choice([0, 0, 1, 2, 3, 5, 8])]:
        mechs.append({"id": k, "kind": "mech", "pos": near(s["pos"], 6, 320), "vel": v3(19), "aim": [round(rng.uniform(-3.1, 3.1), 3), round(rng.uniform(-0.3, 0.3), 3)],
                      "hp": round(rng.uniform(1, 1400), 1), "max_hp": 1400, "cubes": rng.choice([0, 1, 4, 11]),
                      "weapons": ["gun"] + rng.sample(kinds[1:], rng.choice([0, 1, 1, 2])), "charging": rng.random() < 0.15})
    for k in range(rng.choice([0, 0, 1, 3])):
        mechs.append({"id": 100 + rng.randrange(40), "kind": "npc", "pos": near(s["pos"], 10, 200), "vel": v3(4), "aim": [0.1, 0], "hp": 350, "max_hp": 350})
    seen = set(); o["mechs"] = [m for m in mechs if not (m["id"] in seen or seen.add(m["id"]))]
    o["projectiles"] = o["projectiles"] + [{"id": 300 + rng.randrange(10000), "kind": rng.choice(["gun", "mortar", "npc"]), "pos": near(s["pos"], 5, 120), "vel": v3(200)} for _ in range(rng.choice([0, 0, 2, 6]))]
    o["crates"] = o["crates"] + [{"id": 1000 + rng.randrange(80), "pos": near(s["pos"], 5, 150), "hp": rng.choice([300, 120, 5])} for _ in range(rng.choice([0, 1, 2]))]
    o["cubes"] = o["cubes"] + [{"id": 5000 + rng.randrange(500), "pos": near(s["pos"], 1, 90)} for _ in range(rng.choice([0, 0, 1, 4]))]
    o["pickups"] = o["pickups"] + [{"id": 8000 + rng.randrange(200), "kind": rng.choice(kinds), "pos": near(s["pos"], 1, 120)} for _ in range(rng.choice([0, 1, 2]))]
    dd = {}
    for m in o["crates"] + o["cubes"] + o["pickups"] + o["projectiles"]:
        dd[(id(m))] = m
    for key in ("crates", "cubes", "pickups", "projectiles"):
        u = set(); o[key] = [m for m in o[key] if not (m["id"] in u or u.add(m["id"]))]
    o["sounds"] = o["sounds"] + [{"kind": rng.choice(kinds + ["step", "boom", "jet"]), "bearing": round(rng.uniform(-3.14, 3.14), 3), "dist": rng.choice(["near", "mid", "far"]), "age": round(rng.uniform(0, 0.1), 2)} for _ in range(rng.choice([0, 0, 1, 3]))]
    enemy_ids = [m["id"] for m in o["mechs"] if m["kind"] == "mech"] or [others[0]]
    if rng.random() < 0.1:
        e = rng.choice(enemy_ids)
        o["beams"] = o["beams"] + [{"by": e, "kind": rng.choice(["laser", "lightning"]), "path": [near(s["pos"], 20, 150), near(s["pos"], 0, 10), near(s["pos"], 0, 30)][: rng.choice([2, 3])], "age": 0.05}]
    ev = list(o["events"])
    r = rng.random()
    if r < 0.15: ev.append({"type": "damaged", "amount": rng.choice([45, 90, 200]), "weapon": rng.choice(kinds), "bearing": round(rng.uniform(-3.1, 3.1), 3), "by": rng.choice(enemy_ids), "rear": rng.random() < 0.3})
    elif r < 0.2: ev.append({"type": "damaged", "amount": z["dps"] / 10, "weapon": "zone", "bearing": None, "by": None})
    elif r < 0.27: ev.append({"type": "hit", "target": rng.choice(enemy_ids + [1003, 104]), "amount": 45, "weapon": rng.choice(kinds), **({"effect": rng.choice(["cookoff", "short", "concuss"])} if rng.random() < 0.2 else {}), "rear": rng.random() < 0.2})
    elif r < 0.29: ev.append({"type": "effect", "effect": rng.choice(["cookoff", "short", "concuss"]), "by": rng.choice(enemy_ids)})
    elif r < 0.30: ev.append({"type": "kill", "target": rng.choice(enemy_ids)})
    elif r < 0.31: ev.append({"type": "took", "id": 8000 + rng.randrange(200), "kind": rng.choice(kinds[1:]), "slot": 1})
    elif r < 0.32: ev.append({"type": "dropped", "id": 8000 + rng.randrange(200), "kind": rng.choice(kinds), "slot": rng.choice([0, 1])})
    elif r < 0.33: ev.append({"type": "take_failed", "id": 8000 + rng.randrange(200), "reason": rng.choice(["gone", "range", "have", "full", "busy"])})
    elif r < 0.34:
        cubes += 1; ev.append({"type": "pickup", "cubes": cubes})
    elif r < 0.345:
        cubes += 3; ev.append({"type": "drop", "id": 20000 + rng.randrange(3), "cubes": cubes})
    s["cubes"] = cubes
    if offer is None and any(th <= cubes for th in thresholds[len(mine_ups):len(mine_ups) + 1]):
        offer_id += 1
        ch = rng.sample(ups, 3)
        offer = {"id": offer_id, "expires": round(t + 5, 2), "choices": [{"id": u["id"], "name": u["name"], "desc": u["desc"]} for u in ch]}
        offer_left = rng.choice([1, 3, 10, 50])
    if offer is not None:
        offer_left -= 1
        if offer_left <= 0:
            pick = offer["choices"][0]["id"]; mine_ups.append(pick); ev.append({"type": "upgrade", "id": pick}); offer = None
    o["offer"] = offer
    s["upgrades"] = list(mine_ups)
    o["events"] = ev
    drops = []
    for k, at in enumerate(cfg["drops"]["times"]):
        if t >= at and t < at + cfg["drops"]["fall_s"] + 40:
            lands = max(0.0, at + cfg["drops"]["fall_s"] - t)
            holder = None if lands > 0 else rng.choice([None, None, me_id, enemy_ids[0]])
            drops.append({"id": 20000 + k, "pos": near(s["pos"], 30, 300), "radius": cfg["drops"]["radius"], "lands_in": round(lands, 2),
                          "capture_s": cfg["drops"]["capture_s"], "progress": round(rng.uniform(0, 3.9), 2) if holder is not None else 0, "holder": holder})
    o["drops"] = drops
    if i % 50 == 7:
        o["future_obs_field"] = {"anything": [1, 2, 3]}
        s["future_self_field"] = "x"
        for m in o["mechs"]: m["future_actor_field"] = True
    if i % 333 == 100:   # an empty view
        for key in ("mechs", "projectiles", "crates", "cubes", "pickups", "sounds", "beams", "events"): o[key] = []
    errs = schema.errors(o, "Observation")
    if errs:
        bad += 1
        if bad < 5: print("invalid synthetic obs", i, errs, file=sys.stderr)
        continue
    lines.append(json.dumps(o, separators=(",", ":")))
lines.append(json.dumps({"type": "end", "place": 2, "kills": 3}))
with gzip.open(out, "wt") as f:
    f.write("\n".join(lines) + "\n")
print(f"wrote {len(lines) - 2} observations (+hello, end), {bad} rejected by the schema, last t={t:.1f}s, max line {max(len(l) for l in lines)} bytes")
