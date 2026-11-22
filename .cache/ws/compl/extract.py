import sys, re, html
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in ('script','style'): s.skip+=1
        if t in ('p','div','li','h1','h2','h3','h4','br','tr','section'): s.out.append('\n')
    def handle_endtag(s,t):
        if t in ('script','style'): s.skip-=1
    def handle_data(s,d):
        if not s.skip: s.out.append(d)
src=open(sys.argv[1],encoding='utf-8',errors='replace').read()
p=P(); p.feed(src)
txt=''.join(p.out)
txt=re.sub(r'[ \t]+',' ',txt); txt=re.sub(r'\n\s*\n+','\n',txt)
open(sys.argv[2],'w').write(txt)
# script data
scripts=re.findall(r'<script[^>]*>(.*?)</script>',src,re.S)
open(sys.argv[3],'w').write('\n\n=====SCRIPT=====\n'.join(scripts))
print(len(txt), len(scripts), sum(len(x) for x in scripts))
