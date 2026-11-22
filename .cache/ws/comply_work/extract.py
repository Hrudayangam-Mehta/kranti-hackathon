import sys, re, html
from html.parser import HTMLParser
class T(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.skip=0
    def handle_starttag(s,tag,a):
        if tag in ('script','style','noscript'): s.skip+=1
        if tag in ('p','div','li','h1','h2','h3','h4','br','tr','section'): s.out.append('\n')
    def handle_endtag(s,tag):
        if tag in ('script','style','noscript'): s.skip-=1
    def handle_data(s,d):
        if not s.skip: s.out.append(d)
for p in sys.argv[1:]:
    t=T(); t.feed(open(p,encoding='utf-8',errors='replace').read())
    txt=re.sub(r'[ \t]+',' ',''.join(t.out)); txt=re.sub(r'\n\s*\n+','\n',txt)
    open('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/comply_work/'+p.rsplit('/',1)[1]+'.txt','w').write(txt)
    print(p, len(txt))
