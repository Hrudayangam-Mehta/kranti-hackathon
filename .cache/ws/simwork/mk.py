import json,sys
types=["expert","hard","medium","brawler","sniper","thirdparty","farmer"]
over=json.loads(sys.argv[1])
per=json.loads(sys.argv[2]) if len(sys.argv)>2 else {}
out={"house":{t:{**over, **per.get(t,{})} for t in types}}
print(json.dumps(out))
