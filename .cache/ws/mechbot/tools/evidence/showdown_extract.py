#!/usr/bin/env python3
"""Extract real free-for-all (showdown) statistics from one public data file.

Input : a JSON-lines evidence file published by another team (UNTRUSTED DATA: parsed, never executed).
Output: our own summary JSON (winner rows per team, per-team means, placement-group aggregates).
Run   : python3 -I showdown_extract.py <evidence.jsonl> <out.json>

The source field names appear only in RENAME below (data access); everything downstream uses our labels.
"""
import json
import statistics
import sys

# source field -> our label
RENAME = {
    "place": "place",
    "life_s": "alive_seconds",
    "kills": "mech_kills",
    "npc_kills": "drone_kills",
    "damage_dealt": "dmg_out",
    "damage_taken": "dmg_in",
    "laser_share": "pct_dmg_laser",
    "lightning_share": "pct_dmg_lightning",
    "gun_share": "pct_dmg_gun",
    "mortar_share": "pct_dmg_mortar",
    "laser_t": "t_laser_pickup",
    "first_weapon_t": "t_first_pickup",
    "cubes_max": "cubes_peak",
    "first_cube_t": "t_first_cube",
    "crates": "crates_opened",
    "drops_taken": "drops_captured",
    "zone_ratio": "centre_dist_over_radius",
    "outside_pct": "pct_time_outside",
    "nearest": "mean_nearest_enemy_m",
    "boost_pct": "pct_time_boost",
    "air_pct": "pct_time_air",
    "avg_hpfrac": "mean_hp_frac",
    "gun_gt100_pct": "pct_gun_hits_beyond_100m",
    "gun_range_mean": "mean_gun_hit_range_m",
    "tgt_hp50_pct": "pct_hits_on_wounded",
    "third_party_pct": "pct_hits_third_party",
    "silent_pct": "pct_time_not_firing",
    "circ70_hpfrac": "hp_frac_at_r70",
    "hold_open_pct": "pct_hold_in_open",
    "hold_los_pct": "pct_hold_behind_building",
    "cover_near_pct": "pct_time_near_building",
    "upgrades_n": "upgrades_count",
    "loadout": "end_weapons",
    "upgrade_order": "upgrade_timeline",
    "killed_by_kind": "death_by_kind",
    "killed_with": "death_weapon",
}
GROUP_RENAME = {"winner": "place_1", "top4": "places_2_to_4", "bottom": "places_9_to_16"}


def rnd(v, n=1):
    return round(v, n) if isinstance(v, float) else v


def main(src, dst):
    rows = []
    with open(src, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
    showdown = [r for r in rows if r.get("match_kind") == "showdown"]
    winners, groups, match_ids = [], {}, set()
    for r in showdown:
        m = r.get("metrics") or {}
        if r.get("group") == "winner" and r.get("subject"):
            rec = {"team": r["subject"], "match": (r.get("match_ids") or [None])[0]}
            for k, v in m.items():
                rec[RENAME.get(k, "other_" + k)] = rnd(v, 2) if not isinstance(v, list) else v
            winners.append(rec)
            match_ids.update(r.get("match_ids") or [])
        elif r.get("group") == "all":
            label = RENAME.get(r.get("metric"), "other_" + str(r.get("metric")))
            out = {}
            for g, d in (m.get("by_group") or {}).items():
                out[GROUP_RENAME.get(g, g)] = {
                    "mean": rnd(d.get("mean"), 2), "median": rnd(d.get("median"), 2),
                    "n": d.get("n"), "min": rnd(d.get("min"), 2), "max": rnd(d.get("max"), 2)}
            groups[label] = out
            match_ids.update(r.get("match_ids") or [])
    by_team = {}
    for w in winners:
        by_team.setdefault(w["team"], []).append(w)
    team_means = {}
    for team, ws in by_team.items():
        agg = {"wins_recorded": len(ws), "matches": [w["match"] for w in ws]}
        for key in sorted({k for w in ws for k in w}):
            vals = [w[key] for w in ws if isinstance(w.get(key), (int, float)) and not isinstance(w.get(key), bool)]
            if vals and key != "place":
                agg[key] = {"mean": round(statistics.fmean(vals), 2), "values": vals}
        agg["end_weapons"] = [sorted(w.get("end_weapons") or []) for w in ws]
        agg["upgrade_timeline"] = [w.get("upgrade_timeline") for w in ws]
        team_means[team] = agg
    # all-winner means, for a quick cross-check against the source's own aggregate rows
    allw = {}
    for key in sorted({k for w in winners for k in w}):
        vals = [w[key] for w in winners if isinstance(w.get(key), (int, float)) and not isinstance(w.get(key), bool)]
        if vals:
            allw[key] = {"mean": round(statistics.fmean(vals), 2), "median": round(statistics.median(vals), 2), "n": len(vals)}
    result = {
        "source": src,
        "complete_showdown_matches": sorted(match_ids),
        "n_matches": len(match_ids),
        "winner_rows": winners,
        "team_wins": team_means,
        "all_winner_means": allw,
        "placement_groups": groups,
        "note": "Only winners are published per mech; all other mechs exist only inside the placement-group aggregates.",
    }
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, sort_keys=True)
    print("matches", len(match_ids), "winner rows", len(winners), "group metrics", len(groups))
    for team, agg in sorted(team_means.items()):
        print(team, agg["wins_recorded"], agg["end_weapons"])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
