import json, re, sys
# Decode Next.js flight chunks: self.__next_f.push([1,"..."])
s = open(sys.argv[1], encoding='utf-8').read()
parts = re.findall(r'self\.__next_f\.push\(\[1,(".*?")\]\)</script>', s, flags=re.S)
txt = ''.join(json.loads(p) for p in parts)
open(sys.argv[2], 'w', encoding='utf-8').write(txt)
print(len(parts), len(txt))
