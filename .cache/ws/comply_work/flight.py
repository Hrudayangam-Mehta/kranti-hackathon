import re,sys,json
# decode next.js flight payload self.__next_f.push([1,"..."]) chunks
for p in sys.argv[1:-1]:
    h=open(p,encoding='utf-8',errors='replace').read()
    chunks=re.findall(r'self\.__next_f\.push\(\[\d+,(".*?")\]\)</script>',h,re.S)
    out=[]
    for c in chunks:
        try: out.append(json.loads(c))
        except Exception as e: out.append('<<undecodable>>')
    txt=''.join(out)
    name=p.rsplit('/',1)[1]
    open(sys.argv[-1]+'/'+name+'.flight.txt','w').write(txt)
    print(name,len(chunks),len(txt))
