const [a,b]=process.argv.slice(2)
const A=(await import(a+'/lib/params.js')).resolveParams({}),B=(await import(b+'/lib/params.js')).resolveParams({})
const d=[];for(const k of new Set([...Object.keys(A),...Object.keys(B)])) if(JSON.stringify(A[k])!==JSON.stringify(B[k])) d.push(k+': '+JSON.stringify(A[k])+' -> '+JSON.stringify(B[k]))
console.log(d.length?d.join('\n'):'resolved params identical')
