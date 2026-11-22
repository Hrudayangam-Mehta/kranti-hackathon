"""Current-build evidence from the kit conformance stream (300 real observations of one mech):
what does an enemy laser holder do while charging, and how often does it hit?"""
import gzip, json, sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
with gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt') as f:
    lines = [json.loads(l) for l in f]
obs = [l for l in lines if l.get('type') == 'obs']
ticks = [o['tick'] for o in obs]
gaps = [(a, b) for a, b in zip(ticks, ticks[1:]) if b - a != 2]
print('obs', len(obs), 'tick range', ticks[0], ticks[-1], 'gaps', gaps)
print('alive counts', sorted(collections.Counter(o['alive'] for o in obs).items()))
seen = collections.Counter()
for o in obs:
    for m in o['mechs']: seen[(m['id'], m['kind'], tuple(m.get('weapons', [])))] += 1
print('entities seen:', dict(seen))
print('\ncharging enemy trace (tick, id, pos, aim yaw/pitch, charging, bearing enemy->me, my lateral speed wrt enemy):')
prev_ch = False
for o in obs:
    me = o['self']
    for m in o['mechs']:
        if m['kind'] != 'mech': continue
        if m.get('charging') or prev_ch or any(b['kind'] == 'laser' for b in o['beams']):
            b = math.atan2(me['pos'][1] - m['pos'][1], me['pos'][0] - m['pos'][0])
            rel = (me['pos'][0] - m['pos'][0], me['pos'][1] - m['pos'][1]); rng = math.hypot(*rel)
            vl = (-me['vel'][0] * rel[1] + me['vel'][1] * rel[0]) / rng
            print('  t=%d id=%d rng=%.1f aim=(%.3f,%.3f) charging=%s bearing_to_me=%.3f aim-bearing=%+.2f deg my_vlat=%+.1f  beams=%s ev=%s' % (o['tick'], m['id'], rng, m['aim'][0], m['aim'][1], m.get('charging'), b, math.degrees(angdiff(m['aim'][0], b)), vl, [(bb['by'], bb['kind'], round(bb['age'], 2)) for bb in o['beams']], [(e['type'], e.get('weapon'), e.get('amount')) for e in o['events'] if e['type'] == 'damaged']))
        prev_ch = bool(m.get('charging'))
nb = sum(1 for o in obs for b in o['beams'] if b['kind'] == 'laser')
nd = sum(1 for o in obs for e in o['events'] if e['type'] == 'damaged' and e['weapon'] == 'laser')
print('\nlaser beams seen: %d ; laser damage events on me: %d' % (nb, nd))
print('sounds:', collections.Counter(s['kind'] for o in obs for s in o['sounds']))
last10 = None
for o in obs:
    for m in o['mechs']:
        if m['kind'] == 'mech' and m['id'] == 10: last10 = (o['tick'], m['pos'])
    for sd_ in o['sounds']:
        if sd_['kind'] in ('laser', 'laser_charge') and last10:
            me = o['self']['pos']; b = math.atan2(last10[1][1] - me[1], last10[1][0] - me[0])
            print('  t=%d sound %s bearing %.3f dist %s ; bearing to mech 10 (last seen t=%d) %.3f ; mech 10 visible now: %s ; laser damage this obs: %s' % (o['tick'], sd_['kind'], sd_['bearing'], sd_['dist'], last10[0], b, any(m['kind'] == 'mech' and m['id'] == 10 for m in o['mechs']), any(e['type'] == 'damaged' and e['weapon'] == 'laser' for e in o['events'])))
