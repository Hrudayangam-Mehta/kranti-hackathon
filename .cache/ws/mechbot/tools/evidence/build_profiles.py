#!/usr/bin/env python3
"""Build notes/showdown_profiles.json: per-team free-for-all profiles from public evidence.

Numbers for recorded winners come from out/showdown_stats.json (made by showdown_extract.py).
Everything else is hand-entered from the cited files (paths relative to P/intel) in our own words.
Run: python3 -I build_profiles.py <showdown_stats.json> <leaderboard.json> <out.json>
"""
import json
import sys

S1 = "dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl"
S2 = "dmclaughlin-bit__mech-bot/coord/learnings.md"
S3 = "dmclaughlin-bit__mech-bot/research/intake/diego-match-data-1129.md"
S4 = "Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md"
S5 = "moonriver0922__wgsrobot/experiments/README.md"
S5b = "moonriver0922__wgsrobot/experiments/official-runs.md"
S6 = "_triage/raw/bd_docs_RESULTS.md"
S7 = "_triage/readme/devakchow_team-kanyaraasi-mech-royale.md"
S8 = "LanceHuang245__mech-royale/README.md"
S8b = ("LanceHuang245__mech-royale/bot.py (switch defaults line 21; dodge about lines 470-500; target choice 762-784; movement 912-1000); "
       "same thresholds in moonriver0922__wgsrobot/bot.py lines 504, 784, 926-932, 998-1010, which is pinned to the older commit")
S9 = "varchaskukreja__TTUN/mech-royale/bot/bot.ts (main branch: lines 113-127, 403-417, 698-706)"
S9b = "varchaskukreja__TTUN__branches/b7e9a6d_bot.ts (5.19 entry: target choice about lines 182-200, fight movement 350-400)"
S10 = "VivekRnx__bob-the-builder-2026/README.md"
S11 = "_triage/readme/Th3r0n_mech-royale-bot.md"

ARCH = {
    "laser_standoff_farmer": {
        "members_seen": ["AT", "Mustikas", "BackwardsDeployeds", "TigerTown27 (gun+laser variant)"],
        "members_inferred_from_repo": ["Kanyaraasi", "Wolverines and r1ver once they hold a laser"],
        "signature": "laser in weapon list by 4-15 s (worst case 60 s); charging flag cycles about every 2.4 s; speed at or below walk; "
                     "keeps 150-250 m from others; cube count 6+ by 100 s and 15-35 late",
        "counter_rule": "If a visible mech is charging and its aim yaw is within 0.25 rad of the bearing to us, sidestep at boost to the nearest "
                        "building edge; never stop in open sight of a laser carrier; fight it only from a corner, inside 40 m with lightning "
                        "(2 s laser short), or as a third party when it is below half HP. When we fire a laser at one, charge with the aim "
                        "0.3 rad off the target, then swing on and release within one decision (the public bots dodge only while the aim is on them).",
        "risk_if_wrong": "Low: over-avoiding a harmless mech costs farming time only.",
    },
    "lightning_closer": {
        "members_seen": ["404 Competition Not Found"],
        "members_inferred_from_repo": ["Wolverines and r1ver whenever they hold lightning", "Kanyaraasi and BackwardsDeployeds inside 60 m"],
        "signature": "lightning in weapon list and range to us shrinking below 60 m; max_hp well above 1400 early (hull upgrades); "
                     "late first pickup (about 60 s)",
        "counter_rule": "Hold more than 50 m (60 m if its max_hp shows many upgrades) and back along cover while firing laser or gun; "
                        "never let a lightning carrier inside 45 m unless we also hold lightning and more HP.",
        "risk_if_wrong": "Medium: backing away can push us into a third mech or the zone edge; check the retreat lane first.",
    },
    "sight_triggered_brawler": {
        "members_seen": ["Wolverines", "BobBuildIt (placement only)"],
        "members_inferred_from_repo": ["r1ver", "Kanyaraasi and BackwardsDeployeds before they hold a laser"],
        "signature": "torso turns to us and gun fire starts as soon as we are mutually visible, at any range to 230 m; strafes sideways with "
                     "direction flips (every 0.35-1.05 s in one public family, 1.0-2.6 s in the other); settles near 70-85 m with gun, "
                     "110 m with laser, 28 m with lightning; walks to cubes mid-fight",
        "counter_rule": "Do not trade in the open: break line of sight for 5 s (target memory is 4 s in one family) and it returns to looting; "
                        "punish from a corner when it walks to a cube or when another mech engages it; it runs to cover below 35-38% HP.",
        "risk_if_wrong": "Low: if it is actually a free-for-all-aware build it will not shoot first and nothing is lost.",
    },
    "boost_rusher": {
        "members_seen": ["314159265"],
        "members_inferred_from_repo": [],
        "signature": "ground speed near 19.5 m/s for a third or more of the time, closing on a mech, gun only during the first 30 s",
        "counter_rule": "Stay behind a corner facing its approach and burst it on arrival (it arrives with little energy); never flee across "
                        "open ground; collect its cubes only if nobody else is within 150 m.",
        "risk_if_wrong": "High if it carries lightning (240 damage/s inside 45 m): read the weapon list first and keep 50 m if lightning is shown.",
    },
    "quiet_hider": {
        "members_seen": ["Bob the builder (not top 16 now)"],
        "members_inferred_from_repo": ["Wolverines main-branch build", "BingBU"],
        "signature": "stationary or under 5 m/s behind a building at 0.5-0.6 of the next circle radius; holds fire; fewer than 10 cubes at 3 minutes",
        "counter_rule": "Leave it alone and out-farm it; pass at more than 55 m with torso facing it, HP above 55% and no laser charging "
                        "(the public restraint rules trigger inside 35-55 m, on targets under 45-55% HP, on chargers and on turned backs); "
                        "kill it when the circle forces it to move and we lead by 10+ cubes.",
        "risk_if_wrong": "Medium: a motionless mech may be a laser carrier waiting; the charging rule above covers that case.",
    },
    "expert_house_bot": {
        "members_seen": ["House 2 (organiser bot that fills empty seats)"],
        "members_inferred_from_repo": [],
        "signature": "not identifiable from the observation alone; behaves like a competent mid-range fighter that farms (17 cubes)",
        "counter_rule": "Treat like a sight-triggered brawler: no open trades, break sight, third-party only.",
        "risk_if_wrong": "Low.",
    },
}


def team(rank, score, best_utc, archetype, n_matches, places, mean_place, loadout, habits, limitations, signature, counter, risk,
         evidence, sources, staleness):
    return {"practice_rank": rank, "practice_score": score, "best_entry_utc": best_utc, "archetype": archetype,
            "n_matches": n_matches, "places": places, "mean_place": mean_place, "loadout": loadout, "habits": habits,
            "limitations": limitations, "signature": signature, "counter": counter, "risk_if_read_wrong": risk,
            "evidence_level": evidence, "sources": sources, "version_staleness": staleness}


def main(stats_path, lb_path, out_path):
    stats = json.load(open(stats_path, encoding="utf-8"))
    lb = {row[1]: row for row in json.load(open(lb_path, encoding="utf-8"))}
    wins = stats["team_wins"]

    def rk(name):
        r = lb.get(name)
        return (r[0], r[2], r[3][:19] + "Z") if r else (None, None, None)

    def w(name):
        return wins.get(name, {})

    none_seen = "No recorded free-for-all match and no identified public repository."
    teams = {}

    r = rk("AT")
    teams["AT"] = team(*r, "laser_standoff_farmer",
        {"winner_rows_in_7_recorded_matches": 2, "showdowns_summarised_by_second_source": 11}, [1, 1], 9.0,
        "laser + lightning (both wins); laser 84-85% of damage",
        ["takes a laser fast when one is near (4 s) but still won with a 63 s laser",
         "fires almost all the time (not firing only 3% and 13% of the match): shoots drones, crates and far targets",
         "stays 159-176 m from the nearest mech, boosts 9-11% of the time, never holds still in the open",
         "54-57% of its hits land on mechs already below half HP; 43% of hits were third-party in one win",
         "farms hard: 24 and 35 cubes, 2 and 4 drones, no supply drops; both wins were over in 141-149 s",
         "boom or bust: 2 wins but about 9th on average over up to 11 showdowns"],
        ["constant firing gives its position away (laser shot carries 380 m, gun 320 m)",
         "its laser is telegraphed by the charging flag and blocked by buildings",
         "early deaths are common when the opening goes wrong (mean about 9th despite two wins)",
         "no supply drops taken, so a drop holder can out-heal it"],
        "laser (+lightning) carrier firing continuously from 150+ m, low speed, cube count climbing fast (10-15 per minute in its wins)",
        "Use its noise to keep a building between us; apply the charging-laser rule; in the first 90 s do nothing that draws its fire; "
        "late, close through cover to under 40 m with lightning or leave it to others.",
        "If it is a newer, quieter build the noise cue disappears; the charging rule still applies.",
        "match-observed (2 wins) + second-hand average",
        [S1, S2, S4], "Recorded wins are from the 02:00 and 03:00 UTC showdowns; its best entry is from 03:43 UTC, so today's bot is newer.")

    r = rk("TigerTown27")
    teams["TigerTown27"] = team(*r, "laser_standoff_farmer",
        {"winner_rows_in_7_recorded_matches": 1}, [1], None,
        "gun + laser (laser 66%, gun 34% of damage)",
        ["laser at 8 s, first cube at 7 s", "stays very far: 248 m mean to the nearest mech; mean gun-hit range 116 m, half beyond 100 m",
         "only 13% of the time near a building, airborne 7%", "armour first (x2), then gun damage and energy; 23 cubes; 1 drop; 4 kills in 238 s"],
        ["spends most time away from buildings, so a peeking laser from cover out-trades it",
         "no lightning: nothing to stop a lightning carrier that gets inside 45 m", "single match: could be an outlier"],
        "gun+laser carrier at 200+ m, in open ground, occasional jumps",
        "Fight only from a corner (peek, fire, hide); or close under cover with lightning; otherwise stay out of its sight lines.",
        "If it actually uses cover well, peeking duels are even; disengage when HP drops below 55%.",
        "match-observed (1 win)", [S1],
        "Recorded win is from the 03:00 UTC showdown; best entry is from 05:04 UTC, so today's bot is newer.")

    r = rk("BackwardsDeployeds")
    teams["BackwardsDeployeds"] = team(*r, "laser_standoff_farmer",
        {"winner_rows_in_7_recorded_matches": 1}, [1], None,
        "laser + lightning (laser 73%, lightning 27%, gun 0%)",
        ["first pickup at 5 s, laser at 12 s", "hugs buildings (75% of the time within 12 m of one), 97% of holds behind a building",
         "takes the most damage of all recorded winners (4776) and has the lowest mean HP (77%): it trades and regenerates",
         "hull upgrades first (x2), 19 cubes, 2 supply drops, 3 kills in 277 s",
         "at that time it most likely ran a public Python controller with every optional switch off (its 4.75 entry): that controller "
         "targets any mech it can see (nearest, weakest and current target preferred), fights near 110 m with a laser, closes to "
         "28 m when it holds lightning and the target is inside 60 m, and strafes with a possible direction flip only every 1.0-2.6 s",
         "that controller runs to cover below 38% HP, with three mechs threatening (two if below 60% HP), under more than 110 damage/s, "
         "when hit by an unseen mech, or when it has no laser and sees a laser carrier 70-240 m away"],
        ["shoots everything it sees, so it trades HP and gives its position away",
         "slow strafe rhythm makes gun lead easy",
         "sidesteps a charging laser only when the aim line passes within about 7 m plus 3% of the range: charge off-axis, then swing on",
         "while it has no laser, any visible laser carrier 70-240 m away sends it to cover (with no cover and above half HP it "
         "instead rushes that carrier to about 22 m)"],
        "laser+lightning carrier hugging walls about 110 m from its target, strafing in long arcs, charging flag often on",
        "Never trade with it across open ground; fight from a corner with the off-axis laser charge, stay beyond 60 m unless we want the "
        "lightning brawl, and third-party it when it is trading; do not carry a mortar near it.",
        "The current entry is a compiled payload we cannot read; if its behaviour changed, the range numbers no longer hold, so keep cover anyway.",
        "match-observed (1 win) + repo-inferred",
        [S1, S6, S8, S8b], "Recorded win is from the 03:00 UTC showdown (4.75 entry of 02:45 UTC); best entry is now 5.06 from 04:17 UTC.")

    r = rk("404 Competition Not Found")
    teams["404 Competition Not Found"] = team(*r, "lightning_closer",
        {"winner_rows_in_7_recorded_matches": 1}, [1], None,
        "laser + lightning (lightning 53%, laser 32%, gun 16%)",
        ["slow start: first cube at 36 s, first pickup at 60 s, laser at 67 s", "three hull upgrades first, then laser damage and armour x3",
         "soaks damage (4216 taken) behind cover (69% near buildings) and wins late (295 s) with 31 cubes and 1 drop",
         "not firing 60% of the time"],
        ["gun-only and cube-less for the first minute", "must get inside 45 m to do most of its damage", "single match"],
        "mech with max_hp far above the cube-count norm (stacked hull), lightning in the list, closing through cover",
        "Kite it: stay beyond 50 m, hit with laser as it crosses gaps, give ground along cover; it is weakest before 60 s.",
        "If the read is wrong and it is a pure laser user, backing away in the open is the worst move: back only along cover.",
        "match-observed (1 win)", [S1],
        "Recorded win is from the 04:00 UTC showdown; best entry is from 04:28 UTC, so today's bot may be newer.")

    r = rk("Wolverines")
    teams["Wolverines"] = team(*r, "sight_triggered_brawler",
        {"showdowns_summarised_by_second_source": 11}, [], 6.0,
        "prefers laser, then lightning; never drops the gun (public source)",
        ["about 6th on average: best of the then top-4 practice teams",
         "the 5.19 entry has no free-for-all mode: any mech seen in the last 4 s is a target (nearest, weaker and whoever hit it preferred)",
         "holds about 70 m with gun and 110 m with laser, but closes to 28 m whenever it holds lightning; random strafe flips every 0.35-1.05 s",
         "retreats to cover when below 35% HP against a healthier target, or below 55% with two mechs inside 160 m, or below 80% with three",
         "keeps a laser charged until aligned; walks to cubes within 70 m even mid-fight when above half HP; heals standing still out of sight",
         "a newer main-branch build adds a free-for-all mode: hides from mechs it will not fight, fights only when hit in the last 4 s, "
         "inside 35 m, with 4 or fewer alive, or against targets under 45% HP inside 120 m"],
        ["the best-scoring entry fights everything it sees, so it bleeds HP to every passer-by",
         "loses a target after 4 s without sight", "cube detours are predictable", "hull-first upgrades leave damage low"],
        "opens fire on first sight at long range, strafes with short random flips, drifts toward cubes during a fight",
        "Break sight for 5 s instead of trading; ambush from a corner on its cube path; third-party when it is below 55% with two mechs near "
        "(it is about to run); never show under 45% HP within 120 m of the newer build.",
        "If the team switches its final entry to the hiding build, treat it as a quiet hider.",
        "second-hand average + repo-inferred", [S4, S5, S9, S9b],
        "Best entry is from 00:57 UTC, before every recorded showdown, so recorded behaviour should match the current entry.")

    r = rk("r1ver")
    teams["r1ver"] = team(*r, "sight_triggered_brawler", {"recorded": 0}, [], None,
        "same family as Wolverines (laser, then lightning)",
        ["its 5.10 entry is a derivative of the Wolverines 5.19 source with a different cube-pile choice and a ground-path check",
         "its own local free-for-all tests showed no gain over the base (swapped-spawn means equal or slightly lower)"],
        ["inherits every limitation of the Wolverines 5.19 entry, including no free-for-all mode"],
        "as Wolverines", "As Wolverines.", "As Wolverines.", "repo-inferred only", [S5, S5b, S9b],
        "Never seen in a recorded showdown.")

    r = rk("Kanyaraasi")
    teams["Kanyaraasi"] = team(*r, "laser_standoff_farmer", {"recorded": 0}, [], None,
        "laser + lightning preferred, gun fallback, never mortar (public source)",
        ["packages the same public Python controller as the recorded BackwardsDeployeds winner with every optional switch off, plus one "
         "change: when below 38% HP with lightning and a healthy mech inside 40 m it keeps retreating instead of standing to fight"],
        ["same as BackwardsDeployeds: shoots on sight, slow strafe rhythm, narrow laser sidestep, driven to cover by a far laser when it has none"],
        "as BackwardsDeployeds", "As BackwardsDeployeds.", "Its 05:05 UTC entry may differ from the published description.",
        "repo-inferred only", [S7, S8, S8b], "Never seen in a recorded showdown; README describes an unscored hypothesis.")

    r = rk("BobBuildIt")
    teams["BobBuildIt"] = team(*r, "sight_triggered_brawler", {"showdowns_summarised_by_second_source": 11}, [], 8.0,
        "unknown",
        ["was practice number 1 at the time yet averaged about 8th in showdowns, close to the 8.5 of a random mech"],
        ["practice strength did not carry over to free-for-all"],
        "unknown; assumed to shoot on sight like other practice-tuned bots",
        "Default rules: no open trades, break sight, third-party only.",
        "Archetype is a guess from placement alone.", "second-hand average only", [S4],
        "Best entry is from 03:03 UTC; no public repository identified.")

    r = rk("314159265")
    teams["314159265"] = team(*r, "boost_rusher", {"showdowns_summarised_by_second_source": 11}, [], 12.0,
        "unknown (dies before a loadout forms)",
        ["boosts 41% of the time", "lives about 36 s on average", "about 12th on average"],
        ["out of energy on arrival", "starting gun only", "dies in the opening"],
        "mech at boost speed for long stretches heading straight for another mech in the first 30 s",
        "Corner ambush; do not run; take the two-plus cubes it drops only if nobody else is near.",
        "If it holds lightning, keep 50 m and use cover instead.", "second-hand summary", [S4],
        "Best entry is from 02:10 UTC, so the summary probably describes the current bot.")

    for name, note in (("A-bot LLC", none_seen), ("scorpion", none_seen), ("tigerbyte", none_seen), ("Mahalas", none_seen),
                       ("ImagineLosing", none_seen), ("RN SUS", none_seen)):
        r = rk(name)
        teams[name] = team(*r, "unknown", {"recorded": 0}, [], None, "unknown", [], [note], "none",
                           "Default rules (opening survival, charging-laser rule, wounded rule).", "n/a", "none", [],
                           "Not covered by any evidence in the intel folder.")
    r = rk("not even close")
    teams["not even close"] = team(*r, "unknown", {"recorded": 0}, [], None, "unknown", [],
        ["only a five-line README is available"], "none", "Default rules.", "n/a", "none", [S11],
        "Not seen in a recorded showdown.")

    extras = {
        "Mustikas": team(*rk("Mustikas"), "laser_standoff_farmer",
            {"winner_rows_in_7_recorded_matches": 2}, [1, 1], None,
            "laser + lightning (laser 72-76%, gun 22-24%, lightning 0-6%)",
            ["laser at 3-12 s", "long win (327 s): all three supply drops, 34 cubes, quiet 68% of the time, 64% near buildings, 97.5% HP at the 70 m circle",
             "short win (135 s): fired almost constantly, 216 m from the nearest mech, gun hits at 131 m mean", "5 kills in each win"],
            ["no information on its losses", "depends on finding a laser in the first seconds"],
            "laser carrier within 15 s, far from everyone, walks to every supply drop",
            "Do not contest a drop it is already holding unless it is below half HP; apply the charging rule.",
            "n/a", "match-observed (2 wins)", [S1, S2],
            "Best entry is from 01:23 UTC, before both recorded wins: recorded behaviour should be current. Now rank 21, outside the top 16."),
        "Bob the builder": team(None, None, None, "quiet_hider",
            {"showdowns_summarised_by_second_source": 11}, [], 4.8, "unknown; a likely public source prefers laser, then mortar, then lightning",
            ["stands still 74% of the time", "lives about 3 minutes", "about 4.8th on average with only 9.5 cubes"],
            ["under-farmed for the final duels", "standing targets are easy for a charged laser once found"],
            "motionless mech behind cover with few cubes", "Leave alone early; out-farm; finish late.", "n/a",
            "second-hand summary; repo link unverified", [S4, S10], "Team name not on the current top-50 list under this spelling."),
        "House 2 (expert house bot)": team(None, None, None, "expert_house_bot",
            {"showdowns_summarised_by_second_source": 11}, [], 4.2, "unknown",
            ["about 4.2th on average with 17 cubes; such bots fill empty seats in the final"], [], "not identifiable",
            "Default rules.", "n/a", "second-hand summary", [S4], "n/a"),
    }

    out = {
        "generated_from": {"showdown_stats": stats_path, "leaderboard": lb_path},
        "sources_relative_to_intel": [S1, S2, S3, S4, S5, S5b, S6, S7, S8, S8b, S9, S9b, S10, S11],
        "sample_sizes": {
            "complete_showdowns_with_winner_rows": stats["n_matches"],
            "mech_rows_inside_group_aggregates": 84,
            "showdowns_in_second_source": 11,
            "matches_in_csv_summary": {"total": 13, "showdown": 8, "public": 5},
            "per_mech_rows_published_for_non_winners": 0,
        },
        "winner_rows": stats["winner_rows"],
        "placement_groups": stats["placement_groups"],
        "archetypes": ARCH,
        "teams_top16": teams,
        "teams_other_seen": extras,
        "counter_rules": [
            "Opening: for the first 90 s start no fight, keep every mech beyond 60 m (aim for 150 m), boost only to break sight.",
            "Charging laser: charging flag plus aim within 0.25 rad of our bearing means sidestep at boost to a building edge; inside 40 m with lightning, zap instead.",
            "Economy: farm only with the nearest known mech beyond 150 m; pace about 7 cubes a minute (6 by 60 s, 15 by 150 s, 25 by 250 s); take a drop only uncontested.",
            "Wounded rule: never be visible below 55% HP; shoot first only at targets below 50% HP that someone else is already fighting.",
            "Read the weapon list: lightning closing means keep 50 m; gun-only booster means corner ambush; shoot-on-sight means break sight for 5 s; motionless quiet mech means pass beyond 55 m facing it.",
            "Our own laser: charge with the aim 0.3 rad off the target, swing on and release inside one decision; public bots dodge only while a charging aim points at them.",
        ],
        "not_covered": [
            "No per-mech data for anyone except the 7 recorded winners; places 5-8 are missing even from the aggregates.",
            "No per-team cause of death, killer, range or attacker count in any showdown record.",
            "Never seen: A-bot LLC, scorpion, tigerbyte, Kanyaraasi, r1ver, Mahalas, ImagineLosing, not even close, RN SUS.",
            "AT, TigerTown27, BackwardsDeployeds, 404 Competition Not Found and BobBuildIt have best entries newer than their recorded matches.",
            "Showdowns were top-16-of-the-hour exhibitions; qualifier and final seeds, seat fill and expert house bots may differ.",
        ],
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print("teams", len(teams), "extras", len(extras))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
