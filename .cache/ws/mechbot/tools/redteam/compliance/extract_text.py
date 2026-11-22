import sys, re, html, json
from html.parser import HTMLParser
class T(HTMLParser):
    def __init__(self):
        super().__init__(); self.out=[]; self.skip=0; self.scripts=[]; self.cur=None
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','noscript'):
            self.skip+=1
            if tag=='script': self.cur=[]
        if tag in ('p','div','br','li','h1','h2','h3','h4','tr','section','td','th','a','button'): self.out.append('\n')
        if tag=='a':
            d=dict(attrs)
            if d.get('href'): self.out.append('[href='+d['href']+'] ')
    def handle_endtag(self, tag):
        if tag in ('script','style','noscript'):
            self.skip=max(0,self.skip-1)
            if tag=='script' and self.cur is not None:
                self.scripts.append(''.join(self.cur)); self.cur=None
    def handle_data(self, data):
        if self.skip:
            if self.cur is not None: self.cur.append(data)
        else: self.out.append(data)
p=T(); s=open(sys.argv[1],encoding='utf-8',errors='replace').read(); p.feed(s)
txt=''.join(p.out); txt=re.sub(r'[ \t]+',' ',txt); txt=re.sub(r'\n\s*\n+','\n',txt)
mode=sys.argv[2] if len(sys.argv)>2 else 'text'
if mode=='text': print(txt)
else:
    for i,sc in enumerate(p.scripts):
        print('--- script',i,len(sc)); print(sc[:int(sys.argv[3]) if len(sys.argv)>3 else 400])
