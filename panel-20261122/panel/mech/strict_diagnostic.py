#!/usr/bin/env python3
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import time

ap = argparse.ArgumentParser()
ap.add_argument('--contact-stream', required=True)
args = ap.parse_args()
root = Path('/workspace/scratch/bde29dc281e6')
kit = root / 'handoff/.cache/ws/mechbot/kit'
runtime = root / 'tools/bun/bun-linux-x64/bun'
outdir = root / 'panel/mech/final-validation/strict-diagnostic'
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
expected = {
    'capture': 'db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1',
    'pressure-cycle': '609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797',
    'burst-cycle': 'deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d',
}
bundles = {name: root / f'experiments/mech-{name}/dist/bot.js' for name in expected}
for name,path in bundles.items(): assert digest(path) == expected[name], f'Frozen bundle changed: {name}'
contact = Path(args.contact_stream).resolve()
orders = [['burst-cycle', 'capture', 'pressure-cycle'], ['pressure-cycle', 'capture', 'burst-cycle']]
report = {'started_utc': stamp(), 'runtime': 'Bun 1.4.4', 'cpu_affinity': [0], 'runtime_flags': flags,
          'bundle_sha256': expected, 'contact_stream': str(contact), 'contact_sha256': digest(contact),
          'predetermined_round_orders': orders, 'planned_processes': 12,
          'context': 'Bounded two-round diagnostic after original burst checker had 2 late answers. Every result retained. Original official checker can internally retry a large late fraction; any such retry prevents strict acceptance even if its final pass improves. Contact fixture is counterfactual protocol input, not match ranking.',
          'runs': []}

def official_counts(output):
    matches = re.findall(r'observations:\s*(\d+)\s+answered in time:\s*(\d+)\s+missed the [^\n]*?budget:\s*(\d+)\s*\((\d+) came late\)', output)
    retry = re.findall(r'pass (\d+): (\d+) of (\d+) observations missed', output)
    if not matches: return {'parsed': False, 'strict_zero_late': False, 'retry_counts': retry}
    n, answered, missed, late = map(int, matches[-1])
    malformed = re.search(r'wrong tick:\s*(\d+)\s+bad lines:\s*(\d+)', output)
    clean = malformed is not None and tuple(map(int, malformed.groups())) == (0,0)
    peak = re.search(r'answer time ms:.*?max\s+([\d.]+)', output)
    return {'parsed': True, 'observations': n, 'in_time': answered, 'missed': missed, 'late': late,
            'max_ms': float(peak.group(1)) if peak else None, 'retry_counts': retry,
            'strict_zero_late': n == answered and missed == 0 and late == 0 and clean and not retry}

def run(cmd):
    start = time.perf_counter(); before = resource.getrusage(resource.RUSAGE_CHILDREN)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=45, env=env,
                           preexec_fn=lambda: os.sched_setaffinity(0,{0}))
        result = {'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr, 'timed_out': False}
    except subprocess.TimeoutExpired as e:
        decode = lambda b: b.decode(errors='replace') if isinstance(b,bytes) else b or ''
        result = {'exit': None, 'stdout': decode(e.stdout), 'stderr': decode(e.stderr), 'timed_out': True}
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    result.update(wall_s=time.perf_counter()-start, child_cpu_s=(after.ru_utime+after.ru_stime)-(before.ru_utime+before.ru_stime))
    return result

for round_no,order in enumerate(orders,1):
    for kind in ['official', 'contact']:
        for name in order:
            bundle = bundles[name]; stem = f'round{round_no}-{name}-{kind}'
            if kind == 'official':
                cmd = ['python',str(kit/'check/check.py'),'--map-dir',str(kit/'arena'),'--',str(runtime),str(bundle)]
            else:
                cmd = ['python',str(root/'panel/mech/drive_with_p95.py'),'--kit',str(kit),'--stream',str(contact),
                       '--map-dir',str(kit/'arena'),'--answers',str(outdir/f'{stem}-actions.jsonl'),
                       '--stderr',str(outdir/f'{stem}-bot.log'),'--',str(runtime),str(bundle)]
            result = run(cmd)
            result.update(round=round_no,candidate=name,kind=kind)
            if kind == 'official':
                result['counts'] = official_counts(result['stdout'])
                result['official_checker_accepts'] = result['exit'] == 0 and 'PASS' in result['stdout']
                result['strict_accepts'] = result['official_checker_accepts'] and result['counts']['strict_zero_late']
            else:
                try: stats = json.loads(result['stdout'])
                except (ValueError,TypeError): stats = {}
                result['stats'] = stats
                result['strict_accepts'] = (result['exit'] == 0 and stats.get('verdict') == 'PASS' and stats.get('late') == 0
                    and stats.get('answered') == stats.get('observations') and stats.get('wrong_tick') == 0 and stats.get('bad_lines') == 0)
            report['runs'].append(result)
            (outdir/f'{stem}.log').write_text(result['stdout']+'\nSTDERR\n'+result['stderr'])
            (outdir/'results.json').write_text(json.dumps(report,indent=2)+'\n')
            numbers = result.get('counts',result.get('stats',{}))
            print(json.dumps({'round':round_no,'candidate':name,'kind':kind,'strict_accepts':result['strict_accepts'],
                              **{k:numbers.get(k) for k in ['late','max_ms','p95_ms','p99_ms']}}),flush=True)
report['finished_utc'] = stamp()
report['all_planned_runs_completed'] = len(report['runs']) == report['planned_processes']
report['all_strict_accept'] = all(r['strict_accepts'] for r in report['runs'])
(outdir/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'complete':True,'all_strict_accept':report['all_strict_accept'],'file':str(outdir/'results.json')}),flush=True)
