"""Assemble P/notes/housebot_model.json from the forensic outputs (run run_all.py first).
Constants that are not read from out/*.json are measured values copied from out/logs/*.txt;
the log file is named next to each block."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
mv = json.load(open(os.path.join(OUT, 'movement.json')))
aim = json.load(open(os.path.join(OUT, 'aiming.json')))
tau = json.load(open(os.path.join(OUT, 'hit_vs_tau.json')))
_las = json.load(open(os.path.join(OUT, 'lasers.json')))
LASER_MED_RANGE = round(median([r['rng'] for r in _las if r.get('rng')]))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
WALK = 9.0   # replay-build walk speed (mech_move.txt); used to express speeds as fractions of walk speed
def r2(x, n=2):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(x, n)
types = {}
notes = {
    'expert': {'style': 'holds 70-100 m: closes when farther than 100 m, backs off when nearer than 70 m; strafes and hops a lot (42% of engaged time airborne); shoots drones at spawn',
               'secondary_seen': ['laser (1 of 3)', 'none (2 of 3)'], 'upgrades_seen': ['gun_damage', 'reactor', 'plating', 'reactor']},
    'hard': {'style': 'slow approach (+2 m/s) with strafing; shoots crates between fights',
             'secondary_seen': ['mortar', 'laser', 'none'], 'upgrades_seen': ['plating', 'plating', 'gun_mag', 'nanites']},
    'medium': {'style': 'approaches to about 45-65 m while strafing hard (67% of frames above 5 m/s lateral)',
               'secondary_seen': ['laser then swapped to mortar', 'none'], 'upgrades_seen': ['armor', 'reactor', 'laser_damage']},
    'brawler': {'style': 'rushes: closes at 5-8 m/s at every distance, least strafing; with lightning runs straight into 45 m and zaps until energy is empty',
                'secondary_seen': ['lightning', 'laser'], 'upgrades_seen': ['gun_damage', 'lightning_efficiency', 'gun_damage', 'lightning_efficiency', 'lightning_chain', 'gun_damage']},
    'sniper': {'style': 'long range (first shot median 126 m), stands still for 21% of engaged time, backs off inside 70 m, often picks a far target over a near one',
               'secondary_seen': ['laser (late)', 'none'], 'upgrades_seen': ['gyros', 'gyros', 'plating', 'plating']},
    'thirdparty': {'style': 'kites: opens distance at 3-6 m/s when the target is within 70 m, half of engaged time airborne; mortar from 40-140 m',
                   'secondary_seen': ['mortar', 'mortar'], 'upgrades_seen': ['mortar_splash', 'nanites']},
    'farmer': {'style': 'shoots crates (10 shots per minute alive, 28% of its gun shots), keeps about 100-135 m from enemies, swaps secondaries and ends on mortar',
               'secondary_seen': ['mortar', 'mortar'], 'upgrades_seen': ['mortar_reload']},
}
for ty in TYPES:
    m = mv[ty]; a = aim['by_type_hit'][ty]; hr = aim['hit_vs_range'][ty]; ld = aim['lead'][ty]; ae = aim['ang_err'][ty]
    ids = [i for i in R.ids if R.names[i] == ty]
    types[ty] = {
        'sample': {'mechs': len(ids), 'alive_s': r2(sum(R.death_tick.get(i, R.end_tick) for i in ids) * TICK, 1), 'engaged_s': r2(m['engaged_s'], 1), 'gun_shots_at_mechs': a['shots_at_mech'],
                   'places': [R.result[i]['place'] for i in ids], 'kills': [R.result[i]['kills'] for i in ids]},
        'gun': {'hit_pct_vs_mechs': r2(a['hit_pct'], 1), 'hit_by_range_replay_m': {k: {'n': v['n'], 'hits': v['hits']} for k, v in hr.items()},
                'lead_slope': r2(ld['slope']), 'aim_residual_sd_deg': r2(ld['resid_sd_deg']), 'signed_lead_error_m_vs_true_path': r2(ae['signed_lead_err_m'])},
        'engage_distance_m_replay': {'p10': r2(m['dist_p10_p50_p90'][0], 0), 'p50': r2(m['dist_p10_p50_p90'][1], 0), 'p90': r2(m['dist_p10_p50_p90'][2], 0)},
        'movement_engaged': {
            'mean_ground_speed_frac_of_walk': r2(m['mean_ground_speed'] / WALK), 'pct_standing': r2(m['pct_still'], 1), 'pct_airborne': r2(m['pct_airborne'], 1),
            'mean_abs_lateral_frac_of_walk': r2(m['mean_abs_lateral'] / WALK), 'mean_closing_frac_of_walk': r2(m['mean_radial_closing'] / WALK),
            'pct_frames_closing': r2(m['pct_approach'], 1), 'pct_frames_opening': r2(m['pct_retreat'], 1), 'pct_frames_strafing': r2(m['pct_strafe'], 1),
            'strafe_reversal_interval_s': {'p10': r2(m['strafe_interval_p10_p50_p90'][0]), 'p50': r2(m['strafe_interval_p10_p50_p90'][1]), 'p90': r2(m['strafe_interval_p10_p50_p90'][2])},
            'closing_speed_frac_of_walk_by_distance_m': {k: (r2(v['mean'] / WALK) if v['n'] >= 15 else None) for k, v in mv['closing_num'][ty].items()},
            'hops_per_min_engaged': r2(m['hops_per_min_engaged'], 1), 'hops_per_min_idle': r2(m['hops_per_min_idle'], 1)},
        'style': notes[ty]['style'], 'secondary_weapons_seen': notes[ty]['secondary_seen'], 'upgrades_seen': notes[ty]['upgrades_seen'],
    }
model = {
    'meta': {
        'source': 'P/replay/mech16.jsonl.gz (one 16 house-bot free-for-all, 209.65 s, seed 16) + P/kit/check/stream.jsonl.gz (300 observations of one mech on the current build)',
        'generated_by': 'P/tools/forensics/build_model.py',
        'caveats': [
            'ONE match: per-type numbers come from 2-3 mechs each and 50-140 s of engagement; treat per-type rows as indicative, ALL-type rows as solid.',
            'The replay was recorded on an OLDER balance build than P/notes/hello_example.json (see replay_build_vs_current). Behaviour is given in build-independent form where possible (fractions of walk speed, flight time, ticks).',
            'The replay is a free-for-all. Practice scoring uses a squad (easy/medium/hard/expert) that shares vision and hunts one bot; target selection, tunnel vision and third-party findings need not transfer. Type "easy" is not in the replay; brawler/sniper/thirdparty/farmer may not be in practice.',
            'The current-build cross-check (kit stream) confirms the gun aim model, the fire cadence rule, the 15 m hop and shows the laser being tracked during charge (unlike the replay).'],
    },
    'replay_build_vs_current': {
        'note': 'measured in the replay vs P/notes/hello_example.json; "same" = verified equal',
        'gun_speed': [140.0, 252], 'gun_cooldown_s': ['in (0.25, 0.35] (one shot per 8 ticks)', 0.24], 'gun_reload_s': ['2.4 (same; 50 ticks between last and next shot)', 2.4], 'gun_mag': [12, 12], 'gun_damage': [45, 45], 'gun_range': ['230 (same)', 230], 'gun_spread_deg': ['0.6 per axis (same)', 0.6],
        'walk_speed': [9.0, 11.7], 'boost_speed': [15.0, 19.5], 'ground_accel': [45, 58.5], 'charge_move_mult': [0.5, 0.5],
        'boost_drain_per_s': [26, 17], 'jet_drain_per_s': [20, 15], 'energy_regen_per_s': [18, 18], 'energy_regen_delay_s': [0.6, 0.6],
        'jump_speed': [11, 11], 'gravity': [22, 22], 'jet_climb_m_per_s': [8.9, '8.9 (max_rise 10 minus gravity*dt)'],
        'laser_damage': [420, 315], 'laser_charge_s': [0.65, 0.75], 'laser_cooldown_s': ['in (2.5, 2.6]', 1.65], 'laser_aim_during_charge': ['locked at charge start', 'free (charge_turn_mult 1); house bot tracks'],
        'mortar_speed': [72, 72], 'mortar_cooldown_s': ['in (2.65, 2.74]', 2.6], 'lightning_damage': [60, 60], 'lightning_energy_per_shot': [5.5, 3], 'lightning_cooldown_s': ['<= 0.25 (one zap per 6 ticks)', 0.25],
        'size_per_cube': ['0 (muzzle stays at 7.0 m, hit radius stays 2.8 m at 16 cubes)', 0.05], 'pickup_take_distance_m': ['bots take at <= 3.5 m', 4],
        'turn_rate': [4.0, 4], 'pitch_rate': [3.0, 3], 'hp': [1400, 1400], 'regen_per_s': [45, 45], 'regen_delay_s': [5, 5], 'rear_mult': [1.5, 1.5], 'npc_bullet_speed': [90, 90], 'npc_damage': [25, 25], 'crate_hp': [300, 300],
    },
    'mechanics_verified': {
        'tick_semantics': 'fire events only on odd ticks = first tick after a decision; action from obs at even tick E takes effect at E+1 (no extra latency: best-fit reference tick for aim is E, stale-obs hypothesis is worse: sd 1.35 vs 0.73 deg)',
        'bullet': {'inherits_shooter_velocity': False, 'speed_sd_m_s': 0.011, 'origin': 'feet + (0,0,muzzle_height) + 3.0 m along aim; at the end of the fire tick the bullet is already 3.0 + speed*0.05 m out', 'hit_radius_m': 2.8, 'expires_after_m': 230, 'amt_is_clamped_to_remaining_hp': True},
        'damage_formula': 'base * (1 + 0.04*min(cubes,10)) * 1.15^gun_damage_ups * (1.5 if rear) * (1 - 0.08*armor_ups) * (1.6 laser cook-off vs mortar holder); 573 of 604 gun hits exact to 0.01, the rest are clamps or cube changes in flight',
        'max_hp': '1400 * (1 + 0.04*min(cubes,10)) * 1.15^plating',
        'hp_regen': {'rate_per_s': 45, 'with_nanites': 72, 'delay_s': 5.0, 'delay_with_nanites': 3.5, 'reset_by': ['taking any damage', 'dealing damage to a mech', 'dealing damage to a drone'], 'not_reset_by': ['dealing damage to a crate (150 regen frames inside the window vs 8 without)'], 'no_regen_outside_zone': True},
        'energy': {'regen_per_s': 18, 'reactor_mult': 1.3, 'regen_delay_s': 0.6},
        'jump': {'v0': 11, 'apex_m': 2.5}, 'jet': {'climb_m_per_s': 8.9},
        'ground_accel_note': 'velocity changes by accel*0.05 per tick: full reversal of walk velocity takes 2*walk/accel = 0.40 s in both builds',
        'mortar': {'direct_hit_base': 200, 'splash_base': 160, 'falloff': 'f = 1 - 0.7*d/R, d = distance from blast to the mech body surface (axis distance minus 2.5 m); rms error 0.04 on 17 events', 'concussion': 'v_horizontal = 16 f, v_up = 9 f, energy drain = min(45 f, energy left)', 'origin_height_above_feet_m': 9.5},
        'lightning': {'origin': 'mech axis at 7.0 m, no forward offset', 'max_hit_distance_seen_m': 42.1, 'chains_seen': 0},
        'laser': {'origin': '3.0 m along aim at 7.0 m', 'max_beam_m': 280.0},
        'npc': {'speed_wander': 3.0, 'speed_chase': 5.0, 'bullet_speed': 90.0, 'cooldown_ticks': 20, 'max_distance_from_home_seen_m': 29.9, 'proximity_aggro_first_shot_at_m': [39.8, 41.8, 40.6, 46.7], 'retaliates_at_up_to_m': 84.7, 'hit_rate_vs_mechs_pct': 66},
        'zone_dps_seen': {'110-195s': 35, 'after_195s': 60}, 'supply_drop': '+3 cubes, HP to new maximum, 4.0 s capture',
        'turn_rate_rad_s': {'base': 4.0, 'with_gyros': 5.2}, 'pitch_rate_rad_s': 3.0, 'pitch_range_rad': [-0.7, 1.3],
    },
    'fire_control': {
        'gun': {
            'aim_model': 'first-order intercept: aim at target_centre(z + 4.5) + velocity * time_of_flight, solved with the gun projectile speed, from the latest observation; no shooter-velocity compensation needed (bullets do not inherit it)',
            'lead_slope_all_types': 0.97, 'residual_sd_deg': 0.73, 'residual_sd_deg_constant_velocity_targets': '0.5-0.7 (= weapon spread 0.6; no extra aim noise for any type)',
            'vertical_model_airborne_target': 'ballistic: z + vz*t - 0.5*22*t^2, clamped at the ground under the predicted point (median |residual| 0.52 deg, n=301)',
            'current_build_check': 'kit stream: own aim vs 252 m/s intercept residual sd 0.02 deg, slope 1.00 (n=141)',
            'trigger': 'fires only with a clear muzzle line to the target (848 of 851 shots); fires on the first decision whose observation shows cooldown 0 -> one shot per 8 ticks in the replay, per 6 ticks (0.30 s) on the current build; 12 shots then 50 ticks to the next shot',
            'trigger_duty_while_engaged': 0.75, 'opens_fire_at_up_to_m': 197, 'first_shot_delay_after_clear_line_s': {'p10': 0.25, 'p25': 0.65, 'p50': 1.15, 'p75': 3.05, 'min': 0.15},
            'hit_rate_vs_flight_time': [{'tau_s': [t['tau_lo'], t['tau_hi']], 'range_m_at_252': [round(t['tau_lo'] * 252), round(t['tau_hi'] * 252)], 'n': t['n'], 'hit': t['hit'], 'n_grounded_unblocked': t['n_grounded_unblocked'], 'hit_grounded_unblocked': t['hit_grounded_unblocked']} for t in tau],
            'hit_rate_by_target_manoeuvre_tau_0.3_1.0': {'kept_velocity': [47, 56], 'turned_25_60_or_speed_change': [70, 133], 'turned_60_120': [18, 76], 'reversed': [17, 77], 'stopped': [6, 13], 'started_moving': [6, 15]},
            'airborne_targets_are_easier': {'tau_0.4_0.5': {'grounded': [25, 44], 'airborne': [58, 63]}, 'tau_0.5_0.6': {'grounded': [15, 47], 'airborne': [33, 43]}},
            'missed_bullets': 'at 80+ m 52% pass ahead of the target by > 2.8 m, 10-16% behind'},
        'laser': {
            'replay_build': {'charge_ticks': 13, 'aim': 'direction fixed at charge start = linear prediction of the target 0.65 s ahead; torso does not turn during the charge', 'beams': 39, 'hits': 11, 'hit_pct': 28, 'median_range_m': LASER_MED_RANGE, 'median_range_hits_m': 82, 'median_range_misses_m': 114, 'victim_lateral_speed_median_hits_vs_misses': [3.6, 6.7]},
            'current_build_from_kit_stream': {'aim': 'torso keeps tracking during the charge (gun-style lead while the gun fires, direct bearing on the release decision)', 'charge_frames': 8, 'laser_shots': 6, 'hits': 4, 'misses': 'one fired as line of sight was lost, one released early during its own hop', 'range_m': '56-151', 'shortest_gap_between_beams_ticks': 54, 'releases_early_when_target_lost': 'one beam released after about 0.2 s with the aim swung 22 deg away'},
            'cookoff_seen': 6, 'victims_do_not_react_to_charge': 'direction flips / jumps / boost starts during the charge: 21% / 5% / 44% vs 33% / 10% / 52% in ordinary 0.7 s windows under gun fire'},
        'mortar': {'aim_model': 'linear lead to a ground point (median boom-to-lead-point 2.2 m vs 11.0 m to the target position at fire)', 'shells': 57, 'damaging': 18, 'direct': 4, 'range_m': {'min': 34, 'p10': 51, 'p50': 72, 'p90': 141, 'max': 182},
                   'damaging_by_range_m': {'40-80': [13, 31], '80-130': [4, 14], '130-240': [0, 8]}, 'needs_los': '46 of 54 fired with a clear line', 'self_damage_incidents': 0, 'cadence_ticks': 56},
        'lightning': {'zaps': 47, 'zaps_without_target': 0, 'cadence_ticks': 6, 'burst': 'zaps until energy is exhausted (11 zaps 43->1 energy, 18 zaps 78->2)', 'holder_closing_speed_frac_of_walk': 0.59, 'time_within_45m_of_enemy_s': 18.0, 'held_s': 199},
    },
    'perception_and_reaction': {
        'new_attacker_inside_fov': {'n': 49, 'returns_fire_pct': 94, 'median_s_to_first_return_shot': {'attacker_was_already_my_target_n38': 0.35, 'attacker_in_view_but_not_my_target_n11': 0.95}, 'damage_taken_before_first_return_shot_median': 61, 'mean': 110},
        'new_attacker_outside_fov': {'n': 32, 'turned_within_10s_pct': 50, 'median_turn_delay_s': 1.58, 'returned_fire_pct': 44, 'damage_taken_before_first_return_shot_median': 189, 'mean': 383, 'sustained_attacks_ge6_hits': {'n': 9, 'turned': 8, 'median_s': 2.25, 'max_s': 9.65}},
        'travel_scan': {'aim_offset_from_heading_deg': {'p50': 20, 'p90': 73}, 'sweep_amplitude_deg': 46, 'sweep_period_s': 4.7, 'share_of_time_direct_rear_is_in_view_pct': 1, 'share_at_90_120_deg_pct': 12},
        'reaction_to_first_hit': 'no speed change (8.3 -> 8.1 m/s), airborne share 29% -> 38%',
    },
    'target_selection': {'new_target_decisions_with_2plus_candidates': 45, 'chose_nearest_pct': 67, 'chose_lowest_hp_pct': 42, 'random_baseline_pct': 44, 'chose_last_attacker_pct': 50,
                         'run_on_same_target': {'median_shots': 4, 'median_s': 1.9, 'p90_s': 11.5}, 'switch_reasons': {'out_of_sight': 22, 'to_drone_or_crate': 18, 'closer_target': 15, 'target_died': 14, 'farther_target': 14}},
    'movement_common': {
        'hop': {'description': 'jump then jet for 1.5 s, coast: apex 14.9 m above take-off, 3.1 s airborne; energy cost = 1.5 s of jet drain (30 in replay, 22.5 on current build)', 'share_of_all_airborne_segments': '93 of 206 are this exact hop',
                'obstacle_ahead_pct': 25, 'obstacle_baseline_pct': 28, 'started_within_1s_of_being_hit_pct': 22, 'lands_on_roof_pct': 7},
        'strafe': {'reversal_interval_s': {'p10': 0.4, 'p25': 0.6, 'p50': 1.1, 'p75': 1.8, 'p90': 2.7}, 'reversals_per_min': 31, 'current_build_stream_median_s': 0.6},
        'engaged_all_types': {'mean_ground_speed_frac_of_walk': 0.85, 'pct_airborne': 31.8, 'pct_standing': 4.0, 'distance_m': {'p10': 43, 'p50': 90, 'p90': 152}},
        'not_engaged': {'mean_speed_frac_of_walk': 0.88, 'pct_standing': 3.0, 'pct_heading_within_45deg_of_next_zone_centre': 35},
        'retreat': 'none: at HP < 20% they still fire in 77% of frames and mean closing speed is +0.5 m/s; no hide-and-heal (during the 5 s before regeneration started they moved at 8.8 m/s and were out of every enemy line only 41% of the time)',
        'roof_time_pct': 2.2, 'max_roof_height_visited_m': 14.0,
    },
    'types': types,
    'loot': {'took_a_secondary_within_11s': '10 of 16 (nearest ground pickup 24-103 m from spawn)', 'never_took_one': 5, 'roof_pickups_taken': [0, 10], 'roof_crates_destroyed': [2, 9], 'ground_pickups_taken': [11, 30], 'ground_crates_destroyed': [14, 27],
             'crate_shooting_range_m': {'p10': 18, 'p50': 56, 'p90': 170}, 'cube_pickup': {'crate': {'picked': [14, 16], 'median_delay_s': 3.3}, 'drone': {'picked': [16, 18], 'median_delay_s': 5.1}, 'dead_mech': {'picked': [18, 53], 'median_delay_s': 12.3}},
             'upgrades_taken': {'plating': 5, 'gun_damage': 4, 'reactor': 3, 'gyros': 2, 'nanites': 2, 'lightning_efficiency': 2, 'gun_mag': 1, 'mortar_splash': 1, 'mortar_reload': 1, 'armor': 1, 'laser_damage': 1, 'lightning_chain': 1}},
    'drones': {'killed': [9, 12], 'killed_in_first_60s': 8, 'kill_duration_s': {'min': 2.6, 'median': 2.9, 'max': 16.2}, 'damage_taken_by_killer': [0, 238], 'hits_on_mechs_that_had_not_attacked_them': [8, 35]},
    'supply_drops': {'captured': [2, 2], 'contested': 1, 'mechs_entering_ring': [2, 1], 'alive_at_call': [11, 5], 'note': 'the nearest 1-2 bots walk in; one stood in the ring 9 s before landing and was killed there'},
    'zone': {'r_over_R': {'p10': 0.22, 'p50': 0.41, 'p90': 0.71}, 'starts_rotating': 'at announcement (previous shrink_end)', 'inside_next_circle_before_shrink_start_s': [33, 58], 'zone_damage_total': 1456, 'zone_deaths': 1,
             'trap': 'mech 2 hopped around the stadium bowl (x -190..-260, y 48..83) for 80 s with empty energy and died to the zone'},
    'deaths': {'n': 15, 'killing_weapon': {'gun': 9, 'laser': 3, 'mortar': 1, 'lightning': 1, 'zone': 1}, 'damage_share_last_10s_pct': {'gun': 59, 'lightning': 21, 'laser': 12, 'mortar': 4, 'zone': 4}, 'two_attackers': 7, 'never_shot_back_at_one_attacker': 7,
               'rear_damage_share_pct': 27, 'median_distance_to_main_attacker_m': 62, 'died_in_open_gt20m_from_wall': [9, 15], 'median_fight_duration_s': 11.4},
}
os.makedirs(os.path.join(P, 'notes'), exist_ok=True)
with open(os.path.join(P, 'notes', 'housebot_model.json'), 'w') as f:
    json.dump(model, f, indent=1)
print('wrote', os.path.join(P, 'notes', 'housebot_model.json'), os.path.getsize(os.path.join(P, 'notes', 'housebot_model.json')), 'bytes')
for ty in TYPES: print(ty, json.dumps(types[ty]['movement_engaged']), types[ty]['gun']['hit_pct_vs_mechs'], types[ty]['engage_distance_m_replay'])
