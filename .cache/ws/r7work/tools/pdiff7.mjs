// resolved-params diff of two bot trees under named SELECTs: bun pdiff7.mjs <botA> <botB> [extraSelJSON for B]
import { pathToFileURL } from 'node:url'
const [A, Bd, ex] = process.argv.slice(2)
const pa = await import(pathToFileURL(A + '/lib/params.js').href), pb = await import(pathToFileURL(Bd + '/lib/params.js').href)
const KS = { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std', seek: 'on' }
const SELS = { DEF: {}, V4: { retreat: 'd3' }, K0: { retreat: 'd3', laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std' }, KS, KB: { ...KS, aggr: 'any70' } }
const extra = ex ? JSON.parse(ex) : {}
for (const [n, sel] of Object.entries(SELS)) {
  const a = pa.resolveParams({ select: sel }), b = pb.resolveParams({ select: { ...sel, ...extra } })
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]); keys.delete('selected')
  const ch = [], add = []
  for (const k of keys) { if (!(k in a)) add.push(k); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) ch.push(`${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`) }
  console.log(`${n}: ${ch.length} changed${ch.length ? ' (' + ch.join('; ') + ')' : ''}, ${add.length} added${add.length ? ' (' + add.join(', ') + ')' : ''}`)
}
