import json, random
sp = json.load(open('space.json')); by = {e['name']: e for e in sp}
out = []
for e in sp:
    for i, v in enumerate(e['values']):
        out.append(dict(desc='%s#%d' % (e['name'], i + 1), ov=dict(v), kind='oat'))
def V(name, i): return by[name]['values'][i - 1]
def bundle(desc, *parts):
    ov = {}
    for n, i in parts: ov.update(V(n, i))
    out.append(dict(desc='B:' + desc + ' = ' + '+'.join('%s#%d' % p for p in parts), ov=ov, kind='theme'))
# hand-designed large moves (themes)
bundle('kiter', ('laserBand',4),('gunBand',4),('gunBackStick',2),('laserHide',3),('boostSpend',2),('strafe',1),('dodgeHorizon',2))
bundle('kiter-mid', ('laserBand',3),('gunBand',3),('gunBackStick',2),('laserHide',2),('strafe',2))
bundle('brawler', ('laserBand',1),('gunBand',1),('gunBackStick',1),('rush',2),('aggr',1),('earlyOpenS',1),('wFinish',3))
bundle('brawler-mid', ('laserBand',2),('gunBand',2),('rush',2),('aggr',2),('earlyOpenS',2))
bundle('survivor', ('lcGate',4),('loseThr',2),('healEnterHp',3),('healExit',3),('lastStand',2),('farmHp',2))
bundle('survivor-lite', ('lcGate',3),('loseThr',2),('healExit',2),('laserHide',2))
bundle('econ', ('farmHp',1),('grab',2),('grabLaserWide',1),('upgradeOrder',1),('aggr',3),('earlyOpenS',3))
bundle('glass', ('upgradeOrder',2),('aggr',1),('wFinish',3),('killSecureHits',2),('finTtk',1),('chase',2))
bundle('regen', ('upgradeOrder',3),('healEnterHp',3),('healExit',3),('farmHp',2))
bundle('gunner', ('upgradeOrder',4),('gunBand',1),('gunFlightMax',2),('gateK',2),('headAimGun',1),('reload',1))
bundle('sniper', ('laserBand',4),('laserGateK',1),('laserForceS',3),('laserHide',3),('upgradeOrder',2))
bundle('snap', ('laserGateK',3),('laserForceS',1),('gateK',3),('gunFlightMax',3))
bundle('finisher', ('wFinish',3),('keepTargetHpf',2),('killSecureHits',2),('chase',2),('finTtk',1),('finish',3))
bundle('antiattacker', ('wAttacker',2),('wNoLos',1),('focusAdd',1),('lastStand',3))
bundle('passive', ('aggr',3),('seek',1),('earlyOpenS',3),('eng',1),('farmHp',2),('healEnterHp',3))
bundle('hunter', ('aggr',1),('seek',2),('earlyOpenS',1),('eng',2),('chase',2))
bundle('evader', ('strafe',1),('dodgeHorizon',2),('dodgeWeight',2),('laserReactRad',2),('laserHide',3),('boostSpend',2))
bundle('noevade', ('laserHide',1),('boostSpend',1),('dodgeWeight',1),('strafe',3))
bundle('kiter+regen', ('laserBand',4),('gunBand',4),('gunBackStick',2),('laserHide',3),('upgradeOrder',3),('healEnterHp',3),('healExit',3))
bundle('kiter+survivor', ('laserBand',4),('gunBand',4),('gunBackStick',2),('lcGate',4),('loseThr',2),('healExit',2))
rng = random.Random(909); seen = set()
while sum(1 for c in out if c['kind'] == 'rand') < 22:
    k = rng.randint(4, 8); ov = {}; parts = []
    for e in rng.sample(sp, k):
        i = rng.randrange(len(e['values'])); ov.update(e['values'][i]); parts.append('%s#%d' % (e['name'], i + 1))
    key = json.dumps(ov, sort_keys=True)
    if key in seen: continue
    seen.add(key); out.append(dict(desc='R:' + '+'.join(parts), ov=ov, kind='rand'))
json.dump(out, open('diag_cands.json', 'w'), indent=0); print(len(out))
