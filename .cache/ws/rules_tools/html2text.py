import sys, html
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.out=[]; self.skip=0
    def handle_starttag(self,t,a):
        if t in ('script','style','noscript','svg'): self.skip+=1
        if t in ('p','div','li','h1','h2','h3','h4','tr','br','section','td','th','dt','dd'): self.out.append('\n')
        if t=='a':
            for k,v in a:
                if k=='href': self.out.append(' [%s] '%v)
    def handle_endtag(self,t):
        if t in ('script','style','noscript','svg'): self.skip-=1
    def handle_data(self,d):
        if not self.skip: self.out.append(d)
p=P(); p.feed(open(sys.argv[1],encoding='utf-8',errors='replace').read())
txt=''.join(p.out)
import re
txt=re.sub(r'[ \t]+',' ',txt); txt=re.sub(r'\n\s*\n+','\n',txt)
print(txt)
