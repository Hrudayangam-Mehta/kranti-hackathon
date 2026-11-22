#!/usr/bin/env python3
# Print every commit message of one repo from the combined dump (all_commits.txt). Data parsing only.
import sys
txt=open(sys.argv[1],errors='replace').read()
want=sys.argv[2]
lim=int(sys.argv[3]) if len(sys.argv)>3 else 1200
for b in txt.split('@@@ ')[1:]:
    head,_,rest=b.partition('\n')
    if head.split()[0]==want:
        print('###',head); print(rest.strip()[:lim]); print()
