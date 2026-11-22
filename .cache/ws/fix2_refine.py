import sys
d=sys.argv[1]
p=d+'/tactics.js'; s=open(p).read()
def rep(old,new):
    global s
    assert s.count(old)==1, old[:60]; s=s.replace(old,new)
rep('''  function start() {
    h.state = B.nav && B.world ? 'run' : 'none'
''','''  function start() {
    h.state = B.nav && B.world ? 'run' : 'none'
    h.refine = false
''')
rep('''  function run(rays) {
    if (h.state !== 'run') return''','''  function run(rays) {
    if (h.state !== 'run' && !h.refine) return''')
rep('''    if (h.cursor >= N) {
      if (h.bestCost < Infinity) { h.state = 'found';''','''    if (h.cursor >= N && h.refine) {
      // refine search finished: switch only to a clearly closer cell (1.14 "or a clearly better one exists")
      h.refine = false; h.ox = h.sox; h.oy = h.soy
      if (h.bestCost < Infinity && Math.hypot(h.bx - me.x, h.by - me.y) < h.dist - P.hideRefineGain) {
        h.x = h.bx; h.y = h.by; h.ox = me.x; h.oy = me.y; h.z = nav.levelAt(h.x, h.y); h.dist = Math.hypot(h.x - me.x, h.y - me.y); h.exposedSince = -1
        B.counters.hideRefines = (B.counters.hideRefines || 0) + 1
      }
      h.refT = me.t
      return
    }
    if (h.cursor >= N) {
      if (h.bestCost < Infinity) { h.state = 'found';''')
rep('''      if (stale || exposedLong || zoneSlack(B, h.x, h.y, t + 5) < 1) {''','''      if (h.refine && !heading) { h.refine = false; h.ox = h.sox; h.oy = h.soy }
      if (stale || exposedLong || zoneSlack(B, h.x, h.y, t + 5) < 1) {''')
rep('''      else h.dist = Math.hypot(h.x - me.x, h.y - me.y)
    }''','''      else {
        h.dist = Math.hypot(h.x - me.x, h.y - me.y)
        // while heading for a far cell, search again from here every hideRefineS (the legs keep the old cell)
        if (heading && hid && !h.refine && h.dist > P.hideRefineMin && t - Math.max(h.t, h.refT || -9) >= P.hideRefineS) {
          h.refine = true; h.sox = h.ox; h.soy = h.oy; h.ox = me.x; h.oy = me.y; h.cursor = 0; h.bestCost = Infinity; h.firstR = Infinity
          h.comp = B.nav.component(me.x, me.y)
        }
      }
    }''')
open(p,'w').write(s)
p=d+'/brain.js'; s=open(p).read()
rep('''        if (B.hide.state === 'run' && !fuse()) hideSearch.run(P.hideRays)''','''        if ((B.hide.state === 'run' || B.hide.refine) && !fuse()) hideSearch.run(P.hideRays)''')
open(p,'w').write(s)
p=d+'/params.js'; s=open(p).read()
rep("hideAwayCos: 0.5,","hideAwayCos: 0.5, hideRefineS: 1.0, hideRefineMin: 20, hideRefineGain: 8,")
open(p,'w').write(s)
