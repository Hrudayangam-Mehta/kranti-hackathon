import sys, re, html
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.out=[]; self.skip=0; self.scripts=[]; self.cur=None
    def handle_starttag(self, t, a):
        if t in ('script','style'): self.skip+=1; self.cur=[]
        if t in ('p','div','li','h1','h2','h3','h4','tr','br','section'): self.out.append('\n')
    def handle_endtag(self, t):
        if t in ('script','style'):
            self.skip-=1
            if self.cur is not None: self.scripts.append(''.join(self.cur)); self.cur=None
    def handle_data(self, d):
        if self.skip:
            if self.cur is not None: self.cur.append(d)
        else: self.out.append(d)
src=open(sys.argv[1],encoding='utf-8',errors='replace').read()
p=P(); p.feed(src)
txt=re.sub(r'\n\s*\n+','\n',''.join(p.out))
mode=sys.argv[2] if len(sys.argv)>2 else 'text'
if mode=='text': print(txt)
else:
    # page data: next.js push chunks
    for s in p.scripts:
        if 'self.__next_f' in s or '__NEXT_DATA__' in s:
            for m in re.finditer(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', s, re.S):
                try: chunk=m.group(1).encode().decode('unicode_escape',errors='replace')
                except Exception: chunk=m.group(1)
                print(chunk)
