import re,sys,json
# Parse embedded leaderboard rows (escaped-quote JSON) from a saved page.
def rows(path):
    s=open(path,encoding='utf-8',errors='replace').read()
    s2=s.replace('\\"','"')
    out=[]
    for m in re.finditer(r'\{"at":"([^"]+)","rank":(\d+),"team":"((?:[^"\\]|\\.)*)","score":([0-9.]+)\}',s2):
        out.append((int(m.group(2)),m.group(3),float(m.group(4)),m.group(1)))
    return out
if __name__=='__main__':
    for p in sys.argv[1:]:
        r=rows(p)
        print('#',p,len(r))
        seen=set()
        for x in r:
            if x in seen: continue
            seen.add(x)
            print('\t'.join(map(str,x)))
