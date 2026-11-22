import sys,re,collections
t=open(sys.argv[1],encoding='utf-8').read()
lits=re.findall(r'"((?:[^"\\\n]|\\.){3,})"|`((?:[^`\\]|\\.){3,})`', t)
c=collections.Counter(a or b for a,b in lits)
for s,n in sorted(c.items(), key=lambda x:(-len(x[0]),x[0])):
    print(n, repr(s[:200]))
