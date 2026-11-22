const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const { makeContext } = await import(P + '/sim/run.js')
const ctx = makeContext({ quiet: true }), w = ctx.world, bd = w.bounds
let s = 12345; const r = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296 }
const pts = []
for (let i = 0; i < 4000; i++) { const x = bd.minX + 100 + r() * (bd.maxX - bd.minX - 200), y = bd.minY + 100 + r() * (bd.maxY - bd.minY - 200); const a = r() * 6.283, d = 60 + r() * 100; pts.push([x, y, w.ground(x, y) + 7, x + d * Math.cos(a), y + d * Math.sin(a), w.ground(x + d * Math.cos(a), y + d * Math.sin(a)) + 4.5]) }
for (let rep = 0; rep < 3; rep++) { let c = 0; const t0 = performance.now(); for (const p of pts) if (w.shotClear(p[0], p[1], p[2], p[3], p[4], p[5])) c++; const dt = performance.now() - t0; console.log(`shotClear 60-160 m: ${(1000 * dt / pts.length).toFixed(1)} us per ray (${c} clear of ${pts.length})`) }
