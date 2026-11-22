// bun selcmp.mjs <libA> <libB>: SELECT key comparison and resolveParams({}) comparison (A = reference)
const [A, B] = process.argv.slice(2)
const a = await import(A + '/params.js'), b = await import(B + '/params.js')
const out = { selOnlyA: [], selDiff: [], selNewNotOld: [], pDiff: [], pOnlyA: [], pOnlyB: [] }
for (const k of Object.keys(a.SELECT)) { if (!(k in b.SELECT)) out.selOnlyA.push(k); else if (a.SELECT[k] !== b.SELECT[k]) out.selDiff.push(`${k}: ${a.SELECT[k]} -> ${b.SELECT[k]}`) }
for (const k of Object.keys(b.SELECT)) if (!(k in a.SELECT)) { const first = Object.keys(b.PRESETS[k] || {})[0]; if (b.SELECT[k] !== first) out.selNewNotOld.push(`${k}=${b.SELECT[k]} (old ${first})`) }
const pa = a.resolveParams({}), pb = b.resolveParams({})
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y)
for (const k of Object.keys(pa)) { if (k === 'selected') continue; if (!(k in pb)) out.pOnlyA.push(k); else if (!eq(pa[k], pb[k])) out.pDiff.push(`${k}: ${JSON.stringify(pa[k])} -> ${JSON.stringify(pb[k])}`) }
for (const k of Object.keys(pb)) if (!(k in pa)) out.pOnlyB.push(`${k}=${JSON.stringify(pb[k])}`)
console.log(JSON.stringify(out, null, 1))
