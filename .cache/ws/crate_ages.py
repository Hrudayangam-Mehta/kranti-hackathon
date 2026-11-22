import re, json, urllib.request, sys
lock = open(sys.argv[1]).read()
pkgs = re.findall(r'name = "([^"]+)"\nversion = "([^"]+)"\nsource', lock)
for name, ver in pkgs:
    req = urllib.request.Request(f"https://crates.io/api/v1/crates/{name}/{ver}", headers={"User-Agent": "generic-client"})
    d = json.load(urllib.request.urlopen(req))
    created = d["version"]["created_at"][:10]
    flag = "RECENT" if created >= "2026-11-07" else ""
    print(name, ver, created, flag)
