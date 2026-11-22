import { createBrain, hello, ctxNone, mkObs } from './common.js'
for (const [li, t0] of [[20, 50], [10, 50], [4, 50], [4, 100], [2, 50]]) {
  const b = createBrain(hello, ctxNone, { warmup: false })
  let st
  for (let k = 0; k < 8; k++) { b.act(mkObs({ t: t0 + k * 0.1, drops: [{ id: 20000, pos: [30, 0, 0], radius: 8, lands_in: li, capture_s: 4, progress: 0, holder: null }] }), performance.now() + 27); st = b.debugState() }
  console.log('lands_in', li, 't', t0, 'mode', st.mode, 'dropTask', JSON.stringify(b._B.dropTask), 'drops', JSON.stringify(b._B.drops))
}
