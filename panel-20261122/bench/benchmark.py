#!/usr/bin/env python3
"""Interleaved, fresh-process measurements; no score extrapolation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import statistics
import subprocess
import time


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--binary', action='append', required=True, help='LABEL=PATH')
    p.add_argument('--data', required=True)
    p.add_argument('--threads', type=int, default=8)
    p.add_argument('--rounds', type=int, default=5)
    p.add_argument('--label', required=True)
    p.add_argument('--trace', action='store_true')
    p.add_argument('--keep-going', action='store_true')
    p.add_argument('--release-output-cache', action='store_true')
    p.add_argument('--preserve-rounds', action='store_true')
    p.add_argument('--output-root', default=str(Path(__file__).resolve().parent))
    args = p.parse_args()
    root = Path(args.output_root).resolve()
    logs = root / 'logs' / args.label
    results = root / 'results'
    outputs = root / 'outputs'
    for x in (logs, results, outputs):
        x.mkdir(parents=True, exist_ok=True)
    bins = [(label, Path(path).resolve()) for label, path in (s.split('=', 1) for s in args.binary)]
    cpus = sorted(os.sched_getaffinity(0))[:args.threads]
    data = Path(args.data).resolve()
    record = {
        'label': args.label, 'data': str(data), 'threads': args.threads,
        'rounds': args.rounds, 'trace': args.trace, 'started_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'manifest': json.loads((data / 'manifest.json').read_text()),
        'binaries': {label: {'path': str(path), 'sha256': digest(path)} for label, path in bins},
        'runs': [], 'cache_policy': 'OS-managed page cache; no privileged cache flush; rotating interleaving',
        'affinity': cpus,
        'release_output_cache_after_measurement': args.release_output_cache,
        'preserve_round_outputs': args.preserve_rounds,
    }
    for r in range(args.rounds):
        order = bins[r % len(bins):] + bins[:r % len(bins)]
        if (r // len(bins)) % 2:
            order = list(reversed(order))
        for label, binary in order:
            suffix = f'-r{r:02}' if args.preserve_rounds else ''
            out = outputs / f'{args.label}-{label}{suffix}'
            if out.exists():
                shutil.rmtree(out)
            out.mkdir()
            env = {**os.environ, 'DATA_DIR': str(data), 'OUTPUT_DIR': str(out), 'NCPU': str(args.threads)}
            env.pop('SESSIONS_TRACE', None)
            env.pop('SESSIONS_PATH', None)
            env.pop('SESSIONS_SCALAR', None)
            if args.trace:
                env['SESSIONS_TRACE'] = '1'
            prefix = logs / f'{r:02}-{label}'
            with prefix.with_suffix('.stdout').open('wb') as stdout, prefix.with_suffix('.stderr').open('wb') as stderr:
                start = time.perf_counter()
                proc = subprocess.Popen(['taskset', '-c', ','.join(map(str, cpus)), str(binary)], env=env, stdout=stdout, stderr=stderr)
                _, status, usage = os.wait4(proc.pid, 0)
                wall = time.perf_counter() - start
                proc.returncode = os.waitstatus_to_exitcode(status)
            run = {
                'round': r, 'binary': label, 'exit': proc.returncode, 'wall_s': wall,
                'user_s': usage.ru_utime, 'sys_s': usage.ru_stime, 'cpu_s': usage.ru_utime + usage.ru_stime,
                'maxrss_kib': usage.ru_maxrss, 'minor_faults': usage.ru_minflt, 'major_faults': usage.ru_majflt,
                'stdout_bytes': prefix.with_suffix('.stdout').stat().st_size, 'output': str(out),
            }
            record['runs'].append(run)
            print(json.dumps(run), flush=True)
            (results / f'{args.label}.json').write_text(json.dumps(record, indent=2) + '\n')
            if (proc.returncode != 0 or run['stdout_bytes']) and not args.keep_going:
                raise SystemExit(f'Run failed: {label}, see {prefix}')
            if args.release_output_cache:
                for path in out.rglob('*'):
                    if path.is_file():
                        with path.open('rb') as f:
                            os.fsync(f.fileno())
                            os.posix_fadvise(f.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
    record['summary'] = {}
    for label, _ in bins:
        rs = [x for x in record['runs'] if x['binary'] == label and x['exit'] == 0 and x['stdout_bytes'] == 0]
        record['summary'][label] = {k: statistics.median(x[k] for x in rs) for k in ('wall_s', 'cpu_s', 'user_s', 'sys_s', 'maxrss_kib')} if rs else {}
        record['summary'][label]['successful_runs'] = len(rs)
        record['summary'][label]['failed_runs'] = args.rounds - len(rs)
    (results / f'{args.label}.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'summary': record['summary']}), flush=True)


if __name__ == '__main__':
    main()
