#!/usr/bin/env python3
"""Validate stored integration observations against the unmodified official schema."""
from pathlib import Path
from collections import Counter
from jsonschema import Draft7Validator
import sys,json,hashlib,datetime,gzip
root=Path('/workspace/scratch/bde29dc281e6')
schema_path=root/'handoff/.cache/ws/mechbot/kit/mechfight.schema.json'
schema=json.loads(schema_path.read_text()); validator=Draft7Validator(schema)
failed=False
for arg in sys.argv[1:]:
 receipt=Path(arg); data=json.loads(receipt.read_text())
 observations=receipt.with_suffix('.observations.jsonl')
 count=0; errors=[]
 for index,line in enumerate(observations.read_text().splitlines()):
  value=json.loads(line);count+=1
  for error in validator.iter_errors(value):errors.append({'observation':index,'path':list(error.path),'message':error.message})
 out={'checked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate':data.get('candidate'),'source_receipt_sha256':hashlib.sha256(receipt.read_bytes()).hexdigest(),'schema_sha256':hashlib.sha256(schema_path.read_bytes()).hexdigest(),'observations_sha256':hashlib.sha256(observations.read_bytes()).hexdigest(),'observations':count,'errors':errors,'claim':'Schema check only; geometry and state invariants are separately checked by the JS fixture harness.'}
 receipt.with_suffix('.schema.json').write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'receipt':str(receipt),'observations':count,'schema_errors':len(errors)}));failed|=bool(errors)
 # A runtime fixture is a complete protocol conversation, unlike individual
 # observation cases. Check hello/end and ordering as well as observation shape.
 if data.get('input','').endswith('.jsonl.gz'):
  input_path=Path(data['input']); compressed=input_path.read_bytes(); raw=gzip.decompress(compressed)
  messages=[json.loads(line) for line in raw.splitlines()]; protocol_errors=[]
  for index,message in enumerate(messages):
   for error in validator.iter_errors(message):protocol_errors.append({'line':index+1,'path':list(error.path),'message':error.message})
  counts=dict(Counter(message.get('type') for message in messages))
  if not messages or messages[0].get('type')!='hello' or messages[-1].get('type')!='end' or counts.get('hello')!=1 or counts.get('end')!=1 or any(message.get('type')!='obs' for message in messages[1:-1]):
   protocol_errors.append({'message':'Expected exactly hello, observations, terminal end.'})
  obs=[message for message in messages if message.get('type')=='obs']
  if any(a['t']>=b['t'] or a['tick']>=b['tick'] for a,b in zip(obs,obs[1:])):protocol_errors.append({'message':'Observation times/ticks must increase.'})
  protocol={'checked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'input':str(input_path),'gzip_sha256':hashlib.sha256(compressed).hexdigest(),'jsonl_sha256':hashlib.sha256(raw).hexdigest(),'schema_sha256':hashlib.sha256(schema_path.read_bytes()).hexdigest(),'messages':len(messages),'counts':counts,'errors':protocol_errors,'claim':'Entire hello/observations/end schema and ordering check. Synthetic end fields do not represent a score.'}
  receipt.with_suffix('.protocol-schema.json').write_text(json.dumps(protocol,indent=2)+'\n')
  print(json.dumps({'receipt':str(receipt),'protocol_messages':len(messages),'protocol_errors':len(protocol_errors)}));failed|=bool(protocol_errors)
sys.exit(1 if failed else 0)
