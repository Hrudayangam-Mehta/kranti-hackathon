import sys, re, html
from html.parser import HTMLParser
class T(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','noscript','svg'): self.skip+=1
        if tag in ('p','div','br','li','tr','h1','h2','h3','h4','h5','section','td','th','dt','dd','summary','details','table'): self.out.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script','style','noscript','svg') and self.skip: self.skip-=1
        if tag in ('p','div','li','tr','h1','h2','h3','h4','h5','section','table'): self.out.append('\n')
    def handle_data(self, d):
        if not self.skip: self.out.append(d)
src=open(sys.argv[1],encoding='utf-8',errors='replace').read()
p=T(); p.feed(src)
txt=''.join(p.out)
txt=re.sub(r'[ \t\r\f\v]+',' ',txt)
txt=re.sub(r'\n\s*\n+','\n',txt)
open(sys.argv[2],'w',encoding='utf-8').write(txt)
print(sys.argv[1], len(src), '->', len(txt))
