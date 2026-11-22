#!/usr/bin/env python3
"""Three frozen bundles, official stream conformance, and two one-core latency replays."""
import argparse
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

ap = argparse.ArgumentParser()
ap.add_argument('--enabled-stream', required=True)
args = ap.parse_args()
root = Path('/workspace/scratch/bde29dc281e6')
kit = root / 'handoff/.cache/ws/mechbot/kit'
runtime = root / 'tools/bun/bun-linux-x64/bun'
outdir = root / 'panel/mech/final-validation'
outdir.mkdir(exist_ok=True)
flags = {
    'BUN_JSC_useFTLJIT': '0', 'BUN_JSC_useConcurrentJIT': '1', 'BUN_JSC_useConcurrentGC': '0',
    'BUN_JSC_numberOfGCMarkers': '1', 'BUN_JSC_numberOfBaselineCompilerThreads': '1',
    'BUN_JSC_numberOfDFGCompilerThreads': '1', 'BUN_JSC_numberOfFTLCompilerThreads': '1',
    'BUN_JSC_minNumberOfWorklistThreads': '1', 'BUN_JSC_maxNumberOfWorklistThreads': '1',
}
env = {**os.environ, **flags}
stamp = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
bundles = {name: root / f'experiments/mech-{name}/dist/bot.js' for name in ['capture', 'pressure-cycle', 'burst-cycle']}
expected = {
    'capture': 'db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1',
    'pressure-cycle': '609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797',
    'burst-cycle': 'deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d',
}
for name, path in bundles.items():
    assert digest(path) == expected[name], f'Frozen bundle changed: {name}'
streams = {'official': kit / 'check/stream.jsonl.gz', 'enabled': Path(args.enabled_stream).resolve()}
report = {'started_utc': stamp(), 'cpu_affinity': [0], 'runtime_flags': flags,
          'runtime': subprocess.check_output([str(runtime), '--version'], text=True).strip(),
          'context': 'Root-coordinated quiet agent window. One CPU affinity, real arena, normal bundled warmup and fuse. Recorded/scenario observations are nonreactive; this is protocol/latency evidence, not match ranking. No Docker/cgroup/read-only-sandbox claim.',
          'bundles': {k: {'path': str(p), 'sha256': digest(p), 'bytes': p.stat().st_size} for k,p in bundles.items()},
          'streams': {k: {'path': str(p), 'sha256': digest(p)} for k,p in streams.items()},
          'protocol': [], 'latency': [], 'action_comparisons': []}

def run(cmd):
    t = time.perf_counter()
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=40, env=env,
                       preexec_fn=lambda: os.sched_setaffinity(0, {0}))
    return r, time.perf_counter() - t

for name, bundle in bundles.items():
    cmd = ['python', str(kit / 'check/check.py'), '--map-dir', str(kit / 'arena'), '--', str(runtime), str(bundle)]
    r, wall = run(cmd)
    counts = re.findall(r'observations:\s*(\d+)\s+answered in time:\s*(\d+)\s+missed the [^\n]*?budget:\s*(\d+)\s*\((\d+) came late\)', r.stdout)
    parsed = tuple(map(int, counts[-1])) if counts else None
    strict = parsed is not None and parsed[0] == parsed[1] and parsed[2:] == (0, 0) and not re.search(r'pass \d+: \d+ of \d+ observations missed', r.stdout)
    record = {'candidate': name, 'exit': r.returncode, 'wall_s': wall, 'output': r.stdout, 'stderr': r.stderr,
              'parsed_timeliness_counts': parsed, 'strict_zero_late': strict}
    report['protocol'].append(record)
    (outdir / f'{name}-protocol.log').write_text(r.stdout + '\nSTDERR\n' + r.stderr)
    if r.returncode != 0 or 'PASS' not in r.stdout or not strict:
        (outdir / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        raise RuntimeError(f'Official protocol gate failed: {name}')
    print(json.dumps({'stage': 'official_protocol', 'candidate': name, 'passed': True}), flush=True)

for label, stream in streams.items():
    actions = {}
    opener = gzip.open if str(stream).endswith('.gz') else open
    with opener(stream, 'rt') as f:
        observations = [m for line in f if line.strip() for m in [json.loads(line)] if m.get('type') == 'obs']
    for name, bundle in bundles.items():
        answers = outdir / f'{name}-{label}-actions.jsonl'
        stderr = outdir / f'{name}-{label}-stderr.log'
        cmd = ['python', str(root / 'panel/mech/drive_with_p95.py'), '--kit', str(kit), '--stream', str(stream),
               '--map-dir', str(kit / 'arena'), '--answers', str(answers), '--stderr', str(stderr), '--', str(runtime), str(bundle)]
        r, wall = run(cmd)
        if r.returncode != 0:
            raise RuntimeError(f'Lockstep process failed: {name}/{label}: {r.stdout} {r.stderr}')
        stats = json.loads(r.stdout)
        record = {'candidate': name, 'stream': label, 'wall_s': wall, 'stats': stats}
        report['latency'].append(record)
        (outdir / f'{name}-{label}-latency.json').write_text(json.dumps(stats, indent=2) + '\n')
        if stats['verdict'] != 'PASS' or stats['late'] != 0:
            (outdir / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
            raise RuntimeError(f'Lockstep schema/deadline gate failed: {name}/{label}')
        actions[name] = [json.loads(line) for line in answers.read_text().splitlines()]
        assert len(actions[name]) == len(observations)
        print(json.dumps({'stage': 'latency', 'candidate': name, 'stream': label, 'passed': True,
                          'p95_ms': stats['p95_ms'], 'p99_ms': stats['p99_ms'], 'max_ms': stats['max_ms']}), flush=True)
    reference = actions['capture']
    for name in ['pressure-cycle', 'burst-cycle']:
        current = actions[name]
        diff = [i for i, (a,b) in enumerate(zip(reference,current)) if a != b]
        fields = {field: sum(a.get(field) != b.get(field) for a,b in zip(reference,current))
                  for field in ['move','boost','aim','fire','reload','pick','take','drop']}
        report['action_comparisons'].append({'candidate': name, 'stream': label,
          'decisions': len(current), 'changed_decisions': len(diff), 'changed_fields': fields,
          'examples': [{'index': i, 'tick': observations[i]['tick'], 't': observations[i].get('t'),
                        'capture': reference[i], 'candidate': current[i]} for i in diff[:6]]})

report['finished_utc'] = stamp()
(outdir / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'complete': True, 'report': str(outdir / 'results.json'), 'finished_utc': report['finished_utc']}), flush=True)
