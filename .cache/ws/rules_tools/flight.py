import sys,re,json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
# collect self.__next_f.push([1,"..."]) payloads
parts=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>',s,flags=re.S)
out=[]
for p in parts:
    try: out.append(json.loads('"'+p+'"'))
    except Exception as e: out.append(p)
print('\n'.join(out))
