import json,sys
for line in sys.stdin:
    if not line.startswith('{'): print(line.strip()); continue
    d=json.loads(line)
    f=lambda v: '-' if v is None or v!=v else (f'{v:.0f}' if abs(v)>=100 else f'{v:.1f}')
    print(f"{d['name']:8s} wall {d['wall_med']:.3f} (min {d['wall_min']:.3f}) user {d['user_med']:.2f} sys {d['sys_med']:.2f} cpu {d['cpu_med']:.2f} rss {d['rss_med']:.0f}MB flt {d['minflt_med']:.0f} | wall ms setup/parse/dedup/people {'/'.join(f(d.get('d_'+k)) for k in ('setup','parse','dedup','people'))} | cpu ms {'/'.join(f(d.get('c_'+k)) for k in ('setup','parse','dedup','people'))} | links {f(d.get('lap_links_ms'))} tear {f(d.get('d_teardown'))} tail {f(d.get('tail_ms_med'))}")
