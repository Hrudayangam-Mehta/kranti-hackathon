#!/usr/bin/env python3
"""Writes space.json: the decision-time parameter space of the tactics search (base = FNV_s1, official 5.38).
Each entry: name, group, base {key: value at the 5.38 build}, values [partial {key: value}], note.
A value is a partial dict merged over the base dict of the entry, so tied keys move together."""
import json, os
STD = ['plating','armor','nanites','laser_damage','laser_charge','lightning_efficiency','gun_damage','gun_rate','lightning_range','lightning_chain','gyros','servos','gun_mag','capacitor','reactor','jets','gun_velocity','sensors','mortar_damage','mortar_splash','mortar_rate','laser_pierce']
def order(first): return first + [u for u in STD if u not in first]
E = []
def add(name, group, base, values, note=''): E.append(dict(name=name, group=group, base=base, values=values, note=note))
# ---- range / position in the fight
add('laserBand', 'range', dict(rPrefLaser=150, laserLo=125, laserHi=185, laserBoostAway=90),
    [dict(rPrefLaser=115, laserLo=100, laserHi=130, laserBoostAway=70), dict(rPrefLaser=130, laserLo=110, laserHi=160, laserBoostAway=80),
     dict(rPrefLaser=170, laserLo=145, laserHi=195), dict(rPrefLaser=190, laserLo=160, laserHi=215, laserBoostAway=100)], 'stand-off band with a laser (m); mid = official preset')
add('gunBand', 'range', dict(rPrefGun=75, bandLo=55, bandHi=95),
    [dict(rPrefGun=55, bandLo=40, bandHi=75), dict(rPrefGun=65, bandLo=48, bandHi=85), dict(rPrefGun=90, bandLo=65, bandHi=110), dict(rPrefGun=105, bandLo=80, bandHi=125)], 'stand-off band gun / lightning only (m)')
add('gunBackStick', 'range', dict(gunBackStick=0.7), [dict(gunBackStick=0.4), dict(gunBackStick=1.0)], 'back-pedal strength inside the band')
add('rush', 'range', dict(rushR=28, rushHpf=0.5), [dict(rushHpf=2), dict(rushR=40), dict(rushHpf=0.3)], 'lightning rush without a laser; rushHpf 2 = never')
add('isoNear', 'range', dict(isoNear=0), [dict(isoNear=12), dict(isoNear=25)], 'isolate branch only near the goal cell (ISO)')
# ---- fire control
add('gunFlightMax', 'fire', dict(gunFlightMax=0.55), [dict(gunFlightMax=0.4), dict(gunFlightMax=0.7), dict(gunFlightMax=0.9)], 'longest bullet flight we shoot at (s)')
add('gateK', 'fire', dict(gateK=1.0), [dict(gateK=0.8), dict(gateK=1.25), dict(gateK=1.5)], 'gun aim gate width')
add('laserGateK', 'fire', dict(laserGateK=0.6), [dict(laserGateK=0.4), dict(laserGateK=0.8), dict(laserGateK=1.0)], 'laser release gate width')
add('laserForceS', 'fire', dict(laserForceS=1.5), [dict(laserForceS=0.5), dict(laserForceS=1.0), dict(laserForceS=2.5)], 'hold of a full charge before a forced release (s)')
add('reload', 'fire', dict(reloadAmmo=4, noReloadHp=300), [dict(reloadAmmo=2), dict(reloadAmmo=6), dict(noReloadHp=500)], 'early reload rule')
add('headAimGun', 'fire', dict(headAimGun=False), [dict(headAimGun=True)], 'gun at the highest clear body point')
# ---- movement / evasion
add('strafe', 'evade', dict(strafeLo=0.8, strafeHi=1.6), [dict(strafeLo=0.45, strafeHi=1.15), dict(strafeLo=0.6, strafeHi=1.3), dict(strafeLo=1.1, strafeHi=2.2)], 'jink period range (s); fast = official preset')
add('dodgeHorizon', 'evade', dict(dodgeHorizon=0.9), [dict(dodgeHorizon=0.6), dict(dodgeHorizon=1.2)], 'bullet dodge look-ahead (s)')
add('dodgeWeight', 'evade', dict(dodgeWeight=0.9), [dict(dodgeWeight=0.6), dict(dodgeWeight=1.0)], 'bullet dodge weight')
add('laserReactRad', 'evade', dict(laserReactRad=0.25), [dict(laserReactRad=0.15), dict(laserReactRad=0.4)], 'aim cone that counts as a laser charging at us')
add('laserHide', 'evade', dict(laserHideWalk=6, laserHideBoost=9), [dict(laserHideWalk=0, laserHideBoost=0), dict(laserHideWalk=10, laserHideBoost=15), dict(laserHideWalk=14, laserHideBoost=22)], 'reach of the beam-hide step (m); 0 = never hide from a charge')
add('boostSpend', 'evade', dict(boostSpend=True, bsEnergy=30, bsDodgeEnergy=25, bsHurtS=1.0),
    [dict(boostSpend=False), dict(bsEnergy=15, bsDodgeEnergy=10), dict(bsEnergy=50, bsDodgeEnergy=40), dict(bsHurtS=2.5)], 'boost in FIGHT while charging / dodging / under fire')
# ---- targeting
add('wFinish', 'target', dict(wFinish=2.0), [dict(wFinish=1.3), dict(wFinish=3.0), dict(wFinish=4.0)], 'weight of a finishable target')
add('wAttacker', 'target', dict(wAttacker=1.6), [dict(wAttacker=1.0), dict(wAttacker=2.4)], 'weight of the mech hitting us')
add('wNoLos', 'target', dict(wNoLos=0.5), [dict(wNoLos=0.25), dict(wNoLos=0.8)], 'weight of a target without a line')
add('keepTargetHpf', 'target', dict(keepTargetHpf=0.25), [dict(keepTargetHpf=0.15), dict(keepTargetHpf=0.4)], 'stay on a target under this hp fraction')
add('killSecureHits', 'target', dict(killSecureHits=3), [dict(killSecureHits=2), dict(killSecureHits=5)], 'finishable = hp within this many gun hits')
add('focusAdd', 'target', dict(focusAdd=False), [dict(focusAdd=True)], 'additive focus cost (official preset focus add)')
add('chase', 'target', dict(chaseHpf=0.5, chaseS=6), [dict(chaseHpf=0.3, chaseS=3), dict(chaseHpf=0.7, chaseS=10)], 'chase a target that broke the line')
add('finTtk', 'target', dict(finTtk=False), [dict(finTtk=True)], 'FINa: finish by time-to-kill (official preset finish ttk)')
# ---- when a fight starts
add('aggr', 'engage', dict(aggrHpf=0.7, h50SeekHpf=0.7), [dict(aggrHpf=0.5, h50SeekHpf=0.5), dict(aggrHpf=0.6, h50SeekHpf=0.6), dict(aggrHpf=0.85, h50SeekHpf=0.85)], 'start / seek fights from this hp fraction (any70f)')
add('earlyOpenS', 'engage', dict(earlyOpenS=20), [dict(earlyOpenS=0), dict(earlyOpenS=10), dict(earlyOpenS=35)], 'opening guard (s)')
add('eng', 'engage', dict(engNearR=60, engAimR=190), [dict(engNearR=40), dict(engNearR=90), dict(engAimR=120), dict(engAimR=240)], 'engaged-candidate clause radii (m)')
add('seek', 'engage', dict(seekOn=True, h50CrowdR=60, h50SeekFromS=20, h50ArriveLaser=125, h50ArriveGun=90),
    [dict(seekOn=False), dict(h50CrowdR=120), dict(h50SeekFromS=40), dict(h50ArriveLaser=150, h50ArriveGun=110)], 'prey seek')
add('farmHp', 'engage', dict(farmHp=0.9), [dict(farmHp=0.5), dict(farmHp=0.7)], 'farm crates / drones above this hp fraction')
# ---- survive the escalation fight
add('lcGate', 'survive', dict(lcCoverS=0, lcLowHpf=0), [dict(lcLowHpf=0.10), dict(lcCoverS=1.0, lcLowHpf=0.05), dict(lcCoverS=1.5, lcLowHpf=0.10), dict(lcCoverS=1.5, lcLowHpf=0.25)],
    'LOSING retreat gate; base = never. Values 3, 4 = official FSL10 (5.35) and FSLC (5.29)')
add('loseThr', 'survive', dict(lose1Hpf=0.35, lose2Hpf=0.5, lose3Hpf=0.6), [dict(lose1Hpf=0.2, lose2Hpf=0.25, lose3Hpf=0.3), dict(lose1Hpf=0.45, lose2Hpf=0.65, lose3Hpf=0.8)],
    'LOSING thresholds; INERT at the base (lcGate never): live only together with an lcGate value')
add('finish', 'survive', dict(finishHpf=0.2, finishThreats=2), [dict(finishHpf=0.3), dict(finishThreats=3), dict(finishHpf=0.35, finishThreats=4)], 'finish override of LOSING; mostly inert at the base')
add('lastStand', 'survive', dict(lastStandHpf=0.25, lastStandAttackers=2), [dict(lastStandHpf=0.35), dict(lastStandHpf=0.15), dict(lastStandAttackers=1)], 'doomed -> FIGHT rule')
add('healEnterHp', 'survive', dict(healEnterHp=0.55), [dict(healEnterHp=0.3), dict(healEnterHp=0.4), dict(healEnterHp=0.7)], 'HEAL out of contact below this; 0.40 = official FHE40 (5.29)')
add('healExit', 'survive', dict(healExit=0.7), [dict(healExit=0.55), dict(healExit=0.85), dict(healExit=1.0)], 'leave HEAL at this hp fraction')
# ---- economy that feeds the fight
add('grab', 'econ', dict(grabCubeHi=70, grabCubeLo=40, grabHpf=0.5), [dict(grabCubeHi=40, grabCubeLo=20), dict(grabCubeHi=110, grabCubeLo=70)], 'cube grab radius in a fight (m)')
add('grabLaserWide', 'econ', dict(grabLaserWide=False), [dict(grabLaserWide=True)], 'LG wide (official K7LG: -9 kills)')
add('upgradeOrder', 'econ', dict(upgradeOrder=STD),
    [dict(upgradeOrder=order(['plating','armor','servos','nanites','laser_damage','laser_charge','jets'])), dict(upgradeOrder=order(['laser_damage','laser_charge','gun_damage','gun_rate','plating','armor','nanites'])),
     dict(upgradeOrder=order(['nanites','plating','armor'])), dict(upgradeOrder=order(['gun_damage','gun_rate','plating','armor','nanites']))], 'upgrade pick order: speed (official preset), damage first, regen first, gun first')
json.dump(E, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'space.json'), 'w'), indent=1)
print(len(E), 'params,', sum(len(e['values']) for e in E), 'one-change candidates,', sum(len(e['base']) for e in E), 'brain keys')
