import { mergeParams } from '../tree/sim/house.js'
const m = mergeParams(null)
console.log(JSON.stringify({ house: m.house, squad: m.squad }, null, 1))
