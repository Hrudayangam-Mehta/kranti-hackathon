import sys, re
pat=re.compile(sys.argv[1], re.I)
for fn in sys.argv[2:]:
    s=open(fn,encoding='utf-8',errors='replace').read()
    seen=0
    for m in pat.finditer(s):
        a=max(0,m.start()-200); b=min(len(s),m.end()+300)
        print('---',fn.split('/')[-1],m.start()); print(s[a:b].replace('\n',' '))
        seen+=1
        if seen>=6: break
