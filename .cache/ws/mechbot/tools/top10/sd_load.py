#!/usr/bin/env python3
"""Loader for the public showdown recordings published in another team's board repository
(intel/shaunkar1__proj1-agentboard/recordings). DATA ONLY: this reads a JSON array; nothing from
that repository is executed or imported."""
import gzip, json, os
REC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'intel',
                   'shaunkar1__proj1-agentboard', 'recordings', 'showdowns-2026-11-20-9pm-11pm.json.gz')
def load():
    with gzip.open(REC, 'rt', encoding='utf-8') as f:
        return json.load(f)
def name_of(r, i):
    return str(r['hdr']['mechs'][i].get('name'))
def idx(r, exact):
    for i, m in enumerate(r['hdr']['mechs']):
        if str(m.get('name')).strip().lower() == exact.lower(): return i
    return -1
