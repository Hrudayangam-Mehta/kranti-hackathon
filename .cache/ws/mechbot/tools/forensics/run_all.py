"""Run every forensic script in dependency order; stdout of each goes to out/logs/<name>.txt.

    python3 -I tools/forensics/run_all.py

Scripts (all stdlib, read P/replay/mech16.jsonl.gz, P/kit/arena/v2, P/kit/check/stream.jsonl.gz):
  common.py            loader (Replay), terrain/prism geometry (World), small stats helpers
  shots.py             projectile id -> fire event mapping (gun / mortar / drone bullets)
  bullet_kinematics.py bullet speed, muzzle offset, velocity inheritance
  cadence.py           fire cadence, bursts, reload gaps
  take_timing.py       weapon take timing (reaction latency test)
  laser_events.py      charge/beam pairing and laser hit amounts
  mech_move.py         walk/boost speed, accel, jump, jet, energy            -> out/mech_move.json
  mech_dmg.py          damage formula, max HP, regen rate, crates, zone
  mech_regen.py        which events reset the HP regen timer
  mech_weapons.py      mortar ballistics/splash/concussion, lightning, laser, drones, turn rates
  mech_splash.py       splash falloff distance definition
  gunshots.py          per gun shot record with inferred target             -> out/gunshots.json
  aiming.py aiming2.py aiming3.py   lead model, spread, hit rates, vertical model
  targeting.py targeting2.py        target selection, stickiness, switching
  movement.py          strafing, range keeping, hops                         -> out/movement.json
  reactions.py         reaction to hits, retreat by HP, regen episodes      -> out/reactions.json
  lasers.py lasers2.py laser accuracy and aim lock                          -> out/lasers.json
  mortar_lightning.py  mortar lead / hit rate, lightning bursts
  roofs.py loot.py zone.py deaths.py scan.py extras.py extras2.py
  stream_dump.py stream_laser.py stream_check.py   current-build cross-checks from the kit stream
"""
import os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
LOGS = os.path.join(HERE, 'out', 'logs')
os.makedirs(LOGS, exist_ok=True)
ORDER = ['bullet_kinematics', 'cadence', 'take_timing', 'laser_events', 'shots', 'mech_move', 'mech_dmg', 'mech_regen', 'mech_weapons', 'mech_splash',
         'gunshots', 'aiming', 'aiming2', 'aiming3', 'targeting', 'targeting2', 'movement', 'engage_time', 'reactions', 'lasers', 'lasers2', 'mortar_lightning',
         'lasers3', 'roofs', 'loot', 'zone', 'deaths', 'scan', 'extras', 'extras2', 'stream_laser', 'stream_check']
ok = True
for name in ORDER:
    t0 = time.time()
    args = [sys.executable, '-I', os.path.join(HERE, name + '.py')]
    r = subprocess.run(args, capture_output=True, text=True)
    open(os.path.join(LOGS, name + '.txt'), 'w').write(r.stdout + (('\n[stderr]\n' + r.stderr) if r.stderr else ''))
    print('%-20s rc=%d %.1fs %d lines' % (name, r.returncode, time.time() - t0, r.stdout.count('\n')))
    ok = ok and r.returncode == 0
r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'stream_dump.py'), os.path.join(P, 'kit', 'check', 'stream.jsonl.gz')], capture_output=True, text=True)
open(os.path.join(LOGS, 'stream_dump.txt'), 'w').write(r.stdout)
sys.exit(0 if ok else 1)
