// print resolved base values (5.38 file SELECT, default config anchoring) of the given keys
const lib = process.argv[2], keys = process.argv[3].split(',')
const { resolveParams, PARAMS, SQ_REFUSED } = await import(lib + '/params.js')
const P = resolveParams({})
for (const k of keys) console.log(k, JSON.stringify(P[k]), 'PARAMS', JSON.stringify(PARAMS[k]), k in SQ_REFUSED ? 'REFUSED' : 'accepted')
