#!/usr/bin/env python3
"""Frozen 14-process gate: two organizer checks, then twelve strict replays.

The independent driver imports the organizer's schema and never retries a bot.
All planned attempts, logs, actions and outliers are retained.
"""
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import time

ROOT = Path('/workspace/scratch/bde29dc281e6')
KIT = ROOT / 'handoff/.cache/ws/mechbot/kit'
RUNTIME = ROOT / 'tools/bun/bun-linux-x64/bun'
OUT = ROOT / 'panel/mech/adaptive-final-validation'
EXPECTED = {
    'capture': 'db1062d364d7984a8dff42a06ff0e6522fbaba4b83be7d3113feec92b1f9f3e1',
    'adaptive': 'a372e8a3a8b6ac19faf58b3e227440b594b25238ef9d02f31be3728323a6c45d',
    'adaptive-weapons': '0f49821cae2ea53dcbe7d4eccf6ca9b2a6c29fb509c78d19cec7d89e1b3b51e5',
}
BUNDLES = {name: ROOT / f'experiments/mech-{name}/dist/bot.js' for name in EXPECTED}
STREAMS = {'official': KIT / 'check/stream.jsonl.gz', 'active': ROOT / 'panel/mech/adaptive-contact-stream.jsonl.gz'}
ACTIVE_SHA = '2db53d3edff1c4170796a4069bfb67316477ff7f6aa2e13ed1edfe1a9fc54ff8'
FLAGS = {
    'BUN_JSC_useFTLJIT': '0', 'BUN_JSC_useConcurrentJIT': '1', 'BUN_JSC_useConcurrentGC': '0',
    'BUN_JSC_numberOfGCMarkers': '1', 'BUN_JSC_numberOfBaselineCompilerThreads': '1',
    'BUN_JSC_numberOfDFGCompilerThreads': '1', 'BUN_JSC_numberOfFTLCompilerThreads': '1',
    'BUN_JSC_minNumberOfWorklistThreads': '1', 'BUN_JSC_maxNumberOfWorklistThreads': '1',
}
ENV = {**os.environ, **FLAGS}
stamp = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((ROOT / 'panel/mech/adaptive-builds.json').read_text())
source_sets = {r['candidate']: r['source_sha256'] for r in manifest['candidates']}


def assert_frozen():
    for name, path in BUNDLES.items():
        assert digest(path) == EXPECTED[name], f'Bundle changed: {name}'
    for name, files in source_sets.items():
        for rel, sha in files.items():
            path = ROOT / 'experiments' / name / 'bot' / rel
            assert digest(path) == sha, f'Source changed: {name}/{rel}'


assert_frozen()
assert digest(STREAMS['active']) == ACTIVE_SHA, 'Active input changed'
assert 0 in os.sched_getaffinity(0), 'Recorded CPU0 affinity is unavailable'
version = subprocess.check_output([str(RUNTIME), '--version'], text=True).strip()
assert version == '1.4.4'
inputs = {}
for name, path in STREAMS.items():
    with gzip.open(path, 'rt') as f:
        messages = [json.loads(line) for line in f if line.strip()]
    observations = [m for m in messages if m.get('type') == 'obs']
    assert len(observations) == 300
    assert len({m['tick'] for m in observations}) == 300
    inputs[name] = {'path': str(path), 'sha256': digest(path), 'observations': observations,
                    'hello_budget_ms': messages[0]['config']['bot']['hello_budget_ms'],
                    'decision_budget_ms': messages[0]['config']['bot']['tick_budget_ms']}
OUT.mkdir(parents=True, exist_ok=False)
rounds = [
    {'order': ['capture', 'adaptive', 'adaptive-weapons'], 'streams': ['official', 'active']},
    {'order': ['adaptive-weapons', 'adaptive', 'capture'], 'streams': ['active', 'official']},
]
report = {
    'started_utc': stamp(), 'runtime_version': version, 'cpu_affinity': [0], 'runtime_flags': FLAGS,
    'baseline_commit': '099e7e392a863346575d7ef45bb9af3432544329',
    'bundles': {n: {'path': str(p), 'sha256': EXPECTED[n], 'bytes': p.stat().st_size} for n, p in BUNDLES.items()},
    'source_sha256': source_sets,
    'inputs': {n: {k: v for k, v in item.items() if k != 'observations'} for n, item in inputs.items()},
    'planned_organizer_checks': ['adaptive', 'adaptive-weapons'], 'predetermined_rounds': rounds,
    'planned_processes': 14,
    'scope': 'Root-coordinated quiet window, one CPU affinity, normal frozen bundles and real arena. Organizer checker runs twice. Twelve independent lockstep replays use the exact kit schema with no internal retry. Active input is a stitched, individually constrained counterfactual stream, not a simulated reactive match. No Docker, cgroup limit, or placement guarantee is claimed.',
    'runs': [], 'action_comparisons': [], 'repeat_action_comparisons': [],
}


def save():
    (OUT / 'results.json').write_text(json.dumps(report, indent=2) + '\n')


def execute(command):
    started = stamp()
    start = time.perf_counter()
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    try:
        p = subprocess.run(command, capture_output=True, text=True, timeout=45, env=ENV,
                           preexec_fn=lambda: os.sched_setaffinity(0, {0}))
        result = {'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr, 'timed_out': False}
    except subprocess.TimeoutExpired as e:
        decode = lambda b: b.decode(errors='replace') if isinstance(b, bytes) else b or ''
        result = {'exit': None, 'stdout': decode(e.stdout), 'stderr': decode(e.stderr), 'timed_out': True}
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    result.update(started_utc=started, finished_utc=stamp(), wall_s=time.perf_counter() - start,
                  child_cpu_s=(after.ru_utime + after.ru_stime) - (before.ru_utime + before.ru_stime))
    return result


def end_errors(log):
    matches = re.findall(r'end [^\n]*?errors=(\d+)', log)
    stage_failures = re.findall(r'brain stage [^\n]* failed|brain rehearsal failed', log)
    return {'parsed': bool(matches), 'end_error_counts': [int(x) for x in matches], 'stage_failures': stage_failures,
            'clean': bool(matches) and all(int(x) == 0 for x in matches) and not stage_failures}


def organizer_counts(output):
    values = re.findall(r'observations:\s*(\d+)\s+answered in time:\s*(\d+)\s+missed the [^\n]*?budget:\s*(\d+)\s*\((\d+) came late\)', output)
    attempts = [dict(zip(['observations', 'in_time', 'missed', 'late'], map(int, x))) for x in values]
    retries = re.findall(r'pass (\d+): (\d+) of (\d+) observations missed', output)
    malformed = re.findall(r'wrong tick:\s*(\d+)\s+bad lines:\s*(\d+)', output)
    ready = re.search(r'ready in\s+([\d.]+)\s+ms', output)
    maximum = re.findall(r'answer time ms:.*?max\s+([\d.]+)', output)
    clean = bool(attempts) and all(x == {'observations': 300, 'in_time': 300, 'missed': 0, 'late': 0} for x in attempts)
    clean = clean and bool(malformed) and all(tuple(map(int, x)) == (0, 0) for x in malformed) and not retries
    ready_ms = float(ready.group(1)) if ready else None
    clean = clean and ready_ms is not None and ready_ms <= inputs['official']['hello_budget_ms']
    return {'attempts': attempts, 'internal_retries': retries, 'wrong_tick_bad_lines': malformed, 'ready_ms': ready_ms,
            'max_ms': [float(x) for x in maximum], 'strict_counts_accept': bool(clean)}


for name in report['planned_organizer_checks']:
    stem = f'organizer-{name}'
    result = execute(['python', str(KIT / 'check/check.py'), '--map-dir', str(KIT / 'arena'), '--', str(RUNTIME), str(BUNDLES[name])])
    result.update(stage='organizer', candidate=name, stream='official')
    result['counts'] = organizer_counts(result['stdout'])
    result['internal_errors'] = end_errors(result['stderr'])
    result['organizer_accepts'] = result['exit'] == 0 and 'PASS' in result['stdout']
    result['strict_accepts'] = result['organizer_accepts'] and result['counts']['strict_counts_accept'] and result['internal_errors']['clean']
    report['runs'].append(result)
    (OUT / f'{stem}.log').write_text(result['stdout'] + '\nSTDERR\n' + result['stderr'])
    save()
    print(json.dumps({'stage': 'organizer', 'candidate': name, 'strict_accepts': result['strict_accepts'], 'counts': result['counts']}), flush=True)

actions = {}
for round_no, order in enumerate(rounds, 1):
    for stream in order['streams']:
        for name in order['order']:
            stem = f'round{round_no}-{name}-{stream}'
            answers = OUT / f'{stem}-actions.jsonl'
            bot_log = OUT / f'{stem}-bot.log'
            result = execute(['python', str(ROOT / 'panel/mech/drive_with_p95.py'), '--kit', str(KIT), '--stream', str(STREAMS[stream]),
                              '--map-dir', str(KIT / 'arena'), '--budget-ms', str(inputs[stream]['decision_budget_ms']),
                              '--answers', str(answers), '--stderr', str(bot_log), '--', str(RUNTIME), str(BUNDLES[name])])
            try:
                stats = json.loads(result['stdout'])
            except (ValueError, TypeError):
                stats = {}
            result.update(stage='strict_driver', round=round_no, candidate=name, stream=stream, stats=stats)
            result['internal_errors'] = end_errors(bot_log.read_text() if bot_log.exists() else '')
            zero_fields = ['late', 'no_answer', 'wrong_tick', 'bad_lines', 'schema_errors', 'debug_actions', 'stale_answers', 'unsolicited']
            result['strict_accepts'] = bool(result['exit'] == 0 and stats.get('verdict') == 'PASS' and stats.get('exit_code') == 0
                and stats.get('observations') == 300 and stats.get('answered') == 300
                and all(stats.get(k) == 0 for k in zero_fields)
                and isinstance(stats.get('ready_ms'), (float, int)) and stats['ready_ms'] <= inputs[stream]['hello_budget_ms']
                and result['internal_errors']['clean'])
            if answers.exists():
                try:
                    actions[round_no, stream, name] = [json.loads(line) for line in answers.read_text().splitlines()]
                except ValueError:
                    result['strict_accepts'] = False
            report['runs'].append(result)
            (OUT / f'{stem}.log').write_text(result['stdout'] + '\nSTDERR\n' + result['stderr'])
            save()
            print(json.dumps({'stage': 'strict_driver', 'round': round_no, 'candidate': name, 'stream': stream,
                              'strict_accepts': result['strict_accepts'], **{k: stats.get(k) for k in ['answered', 'late', 'ready_ms', 'p95_ms', 'p99_ms', 'max_ms']}}), flush=True)


def comparison(a, b, observations):
    if len(a) != 300 or len(b) != 300:
        return {'complete': False, 'lengths': [len(a), len(b)]}
    changed = [i for i, (x, y) in enumerate(zip(a, b)) if x != y]
    fields = ['move', 'boost', 'aim', 'fire', 'reload', 'pick', 'take', 'drop']
    return {'complete': True, 'decisions': 300, 'changed_decisions': len(changed),
            'changed_fields': {k: sum(x.get(k) != y.get(k) for x, y in zip(a, b)) for k in fields},
            'examples': [{'index': i, 't': observations[i]['t'], 'tick': observations[i]['tick'], 'reference': a[i], 'candidate': b[i]} for i in changed[:6]]}


for round_no in [1, 2]:
    for stream in STREAMS:
        for name in ['adaptive', 'adaptive-weapons']:
            c = comparison(actions.get((round_no, stream, 'capture'), []), actions.get((round_no, stream, name), []), inputs[stream]['observations'])
            report['action_comparisons'].append({'round': round_no, 'stream': stream, 'candidate': name, **c})
for stream in STREAMS:
    for name in BUNDLES:
        c = comparison(actions.get((1, stream, name), []), actions.get((2, stream, name), []), inputs[stream]['observations'])
        report['repeat_action_comparisons'].append({'stream': stream, 'candidate': name, **c})
try:
    assert_frozen()
    report['source_and_bundles_unchanged'] = True
except AssertionError as e:
    report['source_and_bundles_unchanged'] = False
    report['freeze_error'] = str(e)
report['finished_utc'] = stamp()
report['all_planned_runs_completed'] = len(report['runs']) == 14
report['strict_passes'] = sum(bool(x['strict_accepts']) for x in report['runs'])
report['release_gate_passed'] = report['all_planned_runs_completed'] and report['strict_passes'] == 14 and report['source_and_bundles_unchanged']
save()
print(json.dumps({'complete': True, 'strict_passes': report['strict_passes'], 'planned': 14, 'release_gate_passed': report['release_gate_passed'], 'file': str(OUT / 'results.json')}), flush=True)
