#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

root = Path('/workspace/scratch/bde29dc281e6')
kit = root / 'handoff/.cache/ws/mechbot/kit'
runtime = root / 'tools/bun/bun-linux-x64/bun'
flags = {
    'BUN_JSC_useFTLJIT': '0', 'BUN_JSC_useConcurrentJIT': '1', 'BUN_JSC_useConcurrentGC': '0',
    'BUN_JSC_numberOfGCMarkers': '1', 'BUN_JSC_numberOfBaselineCompilerThreads': '1',
    'BUN_JSC_numberOfDFGCompilerThreads': '1', 'BUN_JSC_numberOfFTLCompilerThreads': '1',
    'BUN_JSC_minNumberOfWorklistThreads': '1', 'BUN_JSC_maxNumberOfWorklistThreads': '1',
}
stamp = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
report = {'started_utc': stamp(), 'runtime': 'Bun 1.4.4', 'cpu_affinity': [0], 'runtime_flags': flags,
          'context': 'Official recorded-stream conformance, actual arena, no game simulation. Other panel CPU work was permitted; timing is not an isolated performance comparison.', 'results': []}
for name in ['cycle-ready', 'cycle-varied']:
    bundle = root / f'experiments/mech-{name}/dist/bot.js'
    cmd = ['python', str(kit / 'check/check.py'), '--map-dir', str(kit / 'arena'), '--', str(runtime), str(bundle)]
    started = time.perf_counter()
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=40, env={**os.environ, **flags},
                            preexec_fn=lambda: os.sched_setaffinity(0, {0}))
    record = {'candidate': name, 'bundle_sha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
              'exit': result.returncode, 'wall_s': time.perf_counter() - started,
              'output': result.stdout, 'stderr': result.stderr}
    report['results'].append(record)
    (root / f'panel/mech/{name}-protocol.log').write_text(result.stdout + '\nSTDERR\n' + result.stderr)
    print(json.dumps({'candidate': name, 'passed': result.returncode == 0 and 'PASS' in result.stdout,
                      'sha256': record['bundle_sha256'], 'wall_s': record['wall_s']}), flush=True)
report['finished_utc'] = stamp()
(root / 'panel/mech/weapon-protocol-results.json').write_text(json.dumps(report, indent=2) + '\n')
assert all(r['exit'] == 0 and 'PASS' in r['output'] for r in report['results'])
