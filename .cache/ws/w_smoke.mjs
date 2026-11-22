import { World } from './mechbot/bot/lib/world.js'
const P = new URL('./mechbot/', import.meta.url).pathname
let t = performance.now()
const w = World.loadSync(P + 'kit/arena')
console.log('load ms', (performance.now() - t).toFixed(1), 'prisms', w.prisms.length, 'trees', w.trees.length, 'grid', w._gnx, w._gny)
console.log('ground(0,0)', w.ground(0, 0), 'surfaceZ', w.surfaceZ(0, 0))
console.log(w.rayShot(0, 0, 8, 100, 0, 8), w.raySight(0, 0, 8, 100, 0, 8), w.canSee(0, 0, 8, 100, 0, 8), w.canopyChord(0, 0, 8, 100, 0, 8))
