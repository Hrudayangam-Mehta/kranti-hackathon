#!/usr/bin/env python3
"""Conformance-edge streams from the kit's recorded stream (hello + 300 obs + end): changed map.files, changed clock,
budget and mech count in hello.config. usage: python3 -I mkstreams.py <kit stream> <out dir>"""
import gzip, json, sys, os
src, out = sys.argv[1], sys.argv[2]
msgs = [json.loads(l) for l in gzip.open(src, 'rt') if l.strip()]
def write(name, fh):
    m = [json.loads(json.dumps(x)) for x in msgs]
    fh(m[0])
    with gzip.open(os.path.join(out, name + '.jsonl.gz'), 'wt') as f:
        for x in m: f.write(json.dumps(x, separators=(',', ':')) + '\n')
write('files_v3', lambda h: h['map'].update(files=['v3/world.json', 'v3/terrain.i16']))
write('files_level', lambda h: h['map'].update(files=['level/world.json', 'level/height.i16']))
write('files_flat', lambda h: h['map'].update(files=['world.json', 'terrain.i16']))
write('files_none', lambda h: h['map'].pop('files', None))
write('hz30', lambda h: h['config']['match'].update(tick_hz=30, decide_every=3))
write('dec1', lambda h: h['config']['match'].update(tick_hz=20, decide_every=1))
write('budget20', lambda h: h['config']['bot'].update(tick_budget_ms=20))
write('budget12', lambda h: h['config']['bot'].update(tick_budget_ms=12))
write('hello3s', lambda h: h['config']['bot'].update(hello_budget_ms=3000))
write('mechs24', lambda h: h['config']['match'].update(mechs=24))
print('ok', len(msgs))
