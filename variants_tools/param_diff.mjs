const S = process.argv[2], P = process.argv[3]
const load = async p => (await import(p + '/lib/params.js'))
const base = await load(P + '/bot')
const ref = base.resolveParams({})
const r502 = base.resolveParams({ select: base.SELECT_502 })
const off = base.resolveParams({ select: { r3a2: 'off' } })
const ser = v => JSON.stringify(v)
const diff = (a, b) => { const ks = new Set([...Object.keys(a), ...Object.keys(b)]); const o = []; for (const k of ks) if (k !== 'selected' && ser(a[k]) !== ser(b[k])) o.push(k); return o }
console.log('bot/ SELECT_502 vs r3a2 off: param diffs', diff(r502, off))
const V1 = (await load(S + '/variants/V1/bot')).resolveParams({})
console.log('V1 vs bot/ default:', diff(V1, ref))
for (const v of ['V2', 'V3', 'V4']) {
  const p = (await load(S + '/variants/' + v + '/bot')).resolveParams({})
  const d = diff(p, V1)
  console.log(v, 'vs V1:', d.map(k => `${k}: ${ser(V1[k])} -> ${ser(p[k])}`).join('; '), '| equal to 5.02 on these:', d.every(k => ser(p[k]) === ser(r502[k])))
}
