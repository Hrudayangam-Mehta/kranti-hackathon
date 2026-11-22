#!/usr/bin/env python3
"""Exactly six active-stream rechecks after the documented missing-end fix."""
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
ap.add_argument('--stream', required=True)
ap.add_argument('--sha256', required=True)
ap.add_argument('--original-stream', required=True)
args = ap.parse_args()
root = Path('/workspace/scratch/bde29dc281e6')
kit = root / 'handoff/.cache/ws/mechbot/kit'
runtime = root / 'tools/bun/bun-linux-x64/bun'
out = root / 'panel/mech/adaptive-final-validation/corrected-active'
original = json.loads((out.parent / 'results.json').read_text())
stream = Path(args.stream).resolve()
old_stream = Path(args.original_stream).resolve()
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
stamp = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
def messages(path):
    with gzip.open(path, 'rt') as f:
        return [json.loads(line) for line in f if line.strip()]
old_messages, complete_messages = messages(old_stream), messages(stream)
assert digest(old_stream) == original['inputs']['active']['sha256']
assert digest(stream) == args.sha256
assert complete_messages[:-1] == old_messages, 'The correction changed more than the terminal message'
assert complete_messages[0]['type'] == 'hello' and complete_messages[-1]['type'] == 'end'
obs = [x for x in complete_messages if x['type'] == 'obs']
assert len(obs) == 300 and len({x['tick'] for x in obs}) == 300
assert subprocess.check_output([str(runtime), '--version'], text=True).strip() == original['runtime_version'] == '1.4.4'
def frozen():
    for name, info in original['bundles'].items():
        assert digest(Path(info['path'])) == info['sha256'], f'Changed bundle: {name}'
    for name, files in original['source_sha256'].items():
        for rel, sha in files.items():
            assert digest(root / 'experiments' / name / 'bot' / rel) == sha, f'Changed source: {name}/{rel}'
frozen()
out.mkdir(parents=True, exist_ok=False)
env = {**os.environ, **original['runtime_flags']}
orders = [['capture', 'adaptive', 'adaptive-weapons'], ['adaptive-weapons', 'adaptive', 'capture']]
report = {'started_utc': stamp(), 'planned_processes': 6, 'predetermined_round_orders': orders,
          'source_batch': str(out.parent / 'results.json'), 'original_input_sha256': digest(old_stream),
          'corrected_input': str(stream), 'corrected_input_sha256': digest(stream),
          'only_appended_terminal_message': True, 'source_sha256': original['source_sha256'],
          'bundles': original['bundles'], 'runtime_version': '1.4.4', 'cpu_affinity': [0], 'runtime_flags': original['runtime_flags'],
          'scope': 'Bounded correction for the missing terminal end in the original active fixture. All earlier failures are preserved. These six processes repeat only the affected active input; no ranking or reactive-gameplay claim.',
          'runs': [], 'action_comparisons': [], 'repeat_action_comparisons': []}
def save():
    (out / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
actions = {}
for round_no, order in enumerate(orders, 1):
    for name in order:
        stem = f'round{round_no}-{name}-active'
        answers, log = out / f'{stem}-actions.jsonl', out / f'{stem}-bot.log'
        command = ['python', str(root / 'panel/mech/drive_with_p95.py'), '--kit', str(kit), '--stream', str(stream),
                   '--map-dir', str(kit / 'arena'), '--budget-ms', str(complete_messages[0]['config']['bot']['tick_budget_ms']),
                   '--answers', str(answers), '--stderr', str(log), '--', str(runtime), original['bundles'][name]['path']]
        start, began = time.perf_counter(), stamp()
        try:
            p = subprocess.run(command, capture_output=True, text=True, timeout=45, env=env,
                               preexec_fn=lambda: os.sched_setaffinity(0, {0}))
            r = {'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr, 'timed_out': False}
        except subprocess.TimeoutExpired as e:
            dec = lambda x: x.decode(errors='replace') if isinstance(x, bytes) else x or ''
            r = {'exit': None, 'stdout': dec(e.stdout), 'stderr': dec(e.stderr), 'timed_out': True}
        try:
            stats = json.loads(r['stdout'])
        except (ValueError, TypeError):
            stats = {}
        logs = log.read_text() if log.exists() else ''
        errors = [int(x) for x in re.findall(r'end [^\n]*?errors=(\d+)', logs)]
        zero = ['late', 'no_answer', 'wrong_tick', 'bad_lines', 'schema_errors', 'debug_actions', 'stale_answers', 'unsolicited']
        accept = (r['exit'] == 0 and stats.get('verdict') == 'PASS' and stats.get('exit_code') == 0
                  and stats.get('observations') == stats.get('answered') == 300 and all(stats.get(k) == 0 for k in zero)
                  and isinstance(stats.get('ready_ms'), (int, float)) and stats['ready_ms'] <= complete_messages[0]['config']['bot']['hello_budget_ms']
                  and bool(errors) and all(x == 0 for x in errors) and not re.search(r'brain stage [^\n]* failed|brain rehearsal failed', logs))
        r.update(round=round_no, candidate=name, stream='active', stats=stats, internal_end_errors=errors, strict_accepts=bool(accept),
                 started_utc=began, finished_utc=stamp(), wall_s=time.perf_counter() - start)
        if answers.exists():
            try:
                actions[round_no, name] = [json.loads(line) for line in answers.read_text().splitlines()]
            except ValueError:
                r['strict_accepts'] = False
        report['runs'].append(r)
        (out / f'{stem}.log').write_text(r['stdout'] + '\nSTDERR\n' + r['stderr'])
        save()
        print(json.dumps({'round': round_no, 'candidate': name, 'strict_accepts': r['strict_accepts'],
                          **{k: stats.get(k) for k in ['answered', 'late', 'ready_ms', 'p95_ms', 'p99_ms', 'max_ms']}}), flush=True)
def compare(a, b):
    if len(a) != 300 or len(b) != 300:
        return {'complete': False, 'lengths': [len(a), len(b)]}
    changed = [i for i, (x, y) in enumerate(zip(a, b)) if x != y]
    return {'complete': True, 'decisions': 300, 'changed_decisions': len(changed),
            'changed_fields': {k: sum(x.get(k) != y.get(k) for x, y in zip(a, b)) for k in ['move', 'boost', 'aim', 'fire', 'reload', 'pick', 'take', 'drop']},
            'examples': [{'index': i, 't': obs[i]['t'], 'tick': obs[i]['tick'], 'reference': a[i], 'candidate': b[i]} for i in changed[:6]]}
for round_no in [1, 2]:
    for name in ['adaptive', 'adaptive-weapons']:
        report['action_comparisons'].append({'round': round_no, 'candidate': name, **compare(actions.get((round_no, 'capture'), []), actions.get((round_no, name), []))})
for name in original['bundles']:
    report['repeat_action_comparisons'].append({'candidate': name, **compare(actions.get((1, name), []), actions.get((2, name), []))})
frozen()
report['source_and_bundles_unchanged'] = True
report['finished_utc'] = stamp()
report['strict_passes'] = sum(bool(r['strict_accepts']) for r in report['runs'])
report['corrected_active_gate_passed'] = len(report['runs']) == report['strict_passes'] == 6
save()
print(json.dumps({'complete': True, 'strict_passes': report['strict_passes'], 'gate_passed': report['corrected_active_gate_passed'], 'file': str(out / 'results.json')}), flush=True)
