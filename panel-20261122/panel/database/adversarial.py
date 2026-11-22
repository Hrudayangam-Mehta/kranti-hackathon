#!/usr/bin/env python3
"""Behavioral integration cases checked against the handoff's plain reference.

Uses no production Rust routines. The reference was independently written in the
prior handoff; this harness intercepts its row writer and compares typed Parquet
values, column sets, row multiplicity, DATE types, stdout, and repeat execution.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import random
import subprocess
import sys
import time
from collections import Counter

ROOT = Path(__file__).resolve().parent
WS = "2028-02-25T00:00:00Z"
WE = "2028-03-10T00:00:00Z"
DAY = 86_400_000
WEEK = 7 * DAY
START = int(dt.datetime(2028, 2, 25, tzinfo=dt.timezone.utc).timestamp() * 1000)
HEADERS = {
    "events": b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents",
    "clicks": b"click_id,user_id,campaign_id,ts",
    "links": b"user_id_a,user_id_b",
}


def stamp(ms):
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def row(*fields, quoted=False):
    values = [str(f).encode() if not isinstance(f, bytes) else f for f in fields]
    return b",".join(b'"' + f + b'"' if quoted else f for f in values)


def event(eid, user, at=0, kind="view", price="", product="p1", ingest=None, quoted=False):
    when = START + at if isinstance(at, int) else at
    ing = stamp(START + at) if ingest is None and isinstance(at, int) else ingest or WS
    return row(eid, user, when, ing, kind, product, price, quoted=quoted)


def click(cid, user, campaign="c_a", at=0, quoted=False):
    return row(cid, user, campaign, START + at if isinstance(at, int) else at, quoted=quoted)


def case(name, events=(), clicks=(), links=(), **kw):
    return {"name": name, "events": list(events), "clicks": list(clicks), "links": list(links), **kw}


def cases():
    out = [case("empty")]
    out.append(case("dedup_before_validation", [
        event("same", "u1", "bad"), event("same", "u2", 1_000, ingest=stamp(START+2_000)),
        event("quoted", "u1", 0, "purchase", "0250", quoted=True),
        event("quoted", "u9", 1_000, "purchase", "9999", ingest=stamp(START+3_000)),
        b'"broken,u1,bad,2028-02-25T00:00:00Z,view,p1,',
        event("broken", "u1", 2_000),
        event("late", "u1", 3_000, ingest=stamp(START+3_000+DAY)),
        event("too_late", "u1", 4_000, ingest=stamp(START+4_000+DAY+1_000)),
        event("early_ingest", "u1", 5_000, ingest=stamp(START-DAY)),
    ]))
    out.append(case("csv_and_nulls", [
        event("valid", " u1", 0, "cart", "bad\r"),
        event("v2", "u1 ", 0, "purchase", "100\r"),
        event("v3", "u1\r", 0), event("v4", "u1", 0, "view", "arbitrary", quoted=True),
        event("", "u1", 0), event("empty_user", "", 0), event("empty_product", "u1", 0, product=""),
        event("bad_ts", "u1", WS+"\r"), event("bad_type", "u1", 0, "View"),
        b'bad_quote,u1,1,2028-02-25T00:00:00Z,vi"ew,p1,', b"", b"too,few",
        event("price", "u2", 0, "purchase", "٢٥٠"),
    ], [click("", " u1"), click("x", " u1", ""), click("y", " u1", at=WS+"\r"), click("z", " u1")],
        [row("", " u1"), row("u1", ""), row(" U1", " u1", quoted=True)]))
    out.append(case("session_boundaries", [
        event("a", "u1", 0, "purchase", 100), event("b", "u1", 1_800_000),
        event("c", "u1", 1_800_000), event("d", "u1", 3_600_001),
        event("e", "u2", DAY-1_000, "purchase", 50), event("f", "u2", DAY+1_000, "purchase", 100),
    ]))
    out.append(case("seven_day_clicks", [event("a", "u1", 0, "purchase", 100), event("b", "u1", 1_800_001)], [
        click("old", "u1", "c_c", -WEEK-1), click("edge", "u1", "c_b", -WEEK),
        click("z", "u1", "c_b", 0), click("a", "u1", "c_a", 0),
        click("a", "u1", "c_a", 0, quoted=True), click("future", "u1", "c_c", 1),
        click("bad_campaign", "u1", "C_A", 0),
    ]))
    out.append(case("mixed_shape_tie_ids", [event("e", "u1", 0)], [
        click("a"*32, "u1", "c_b"), click("a", "u1", "c_c"), click("a0", "u1", "c_b"),
        click("a"+"0"*31, "u1", "c_c"), click(" A", "u1", "c_a"), click("é", "u1", "c_b"),
        click("0"*32, "u1", "c_c"), click("f"*32, "u1", "c_b"),
    ]))
    ids = ["x"+str(i) for i in range(512)]
    out.append(case("long_link_chain", [event("e0", ids[-1], 0), event("e1", "u2", 1_000)],
        [click("a", ids[100], at=0)],
        [row(ids[i], ids[i+1]) for i in range(len(ids)-1)] + [row(ids[-1], " A"), row("u2", ids[0]), row(ids[0], ids[0]), row(ids[1], ids[0])]))
    out.append(case("category_order_and_unknown", [
        event("e1", "u1", 0, "purchase", 200, "p1"), event("e2", "u1", 0, "purchase", 200, "p2"),
        event("e3", "u2", 0, "purchase", 300, "absent"), event("e4", "u2", 0, "purchase", 300, "p1"),
        event("e5", "u3", 0),
    ], products=[("p1", "z"), ("p2", "A")]))
    out.append(case("leap_offsets", [
        event("e1", "u1", "2028-02-29T00:00:00Z", ingest="2028-02-29T00:00:00Z"),
        event("e2", "u1", "2028-02-28T23:00:00-01:00", ingest="2028-02-29T00:00:00Z"),
        event("e3", "u1", "2028-02-29T23:59:00+23:59", ingest="2028-02-29T00:00:00Z"),
        event("e4", "u1", "2028-02-29T00:00:00-00:00", ingest="2028-02-29T00:00:00Z"),
        event("bad1", "u1", "2027-02-29T00:00:00Z"), event("bad2", "u1", "2028-02-29T24:00:00Z"),
        event("bad3", "u1", "2028-02-29T00:00:00+24:00"),
    ]))
    out.append(case("one_session_three_days", [event("e"+str(i), "u1", i*1_800_000, "purchase", 1) for i in range(110)]))
    out.append(case("long_lines_and_zero_digits", [
        event("eid"+"x"*9000, "uid"+"é"*4500, 0, "purchase", "0"*5000+"250"),
        event("e2", "u1", "0"*5000+str(START), "view", ""),
        event("e3", "u1", "9"*5000), event("e4", "u1", 1000, "purchase", "9"*5000),
    ], [click("k"*9000, "uid"+"é"*4500)]))
    out.append(case("all_input_filenames", [event("normal", "u1", 0)], [click("normal", "u1", "c_b")],
        hidden={"events": [event("hidden", "u2", 0, "purchase", 500)],
                "clicks": [click("hidden", "u2", "c_a")], "links": [row("u2", " A")] }))
    out.append(case("category_fallback", [event("e"+str(i), "u1", i, "purchase", 1, "p"+str(i)) for i in range(270)],
        products=[("p"+str(i), "c"+str(i)) for i in range(270)]))
    out.append(case("window_fallback", [event("e1", "u1", 0)], window_end="2028-05-10T00:00:00Z"))
    out.append(case("page_boundary_end", [event("e1", "u1", 0)], pad_to_page=True))
    for seed in (17, 31, 53, 101, 2028):
        r = random.Random(seed)
        users = ["0", "00", "a", "a0", "abc123", "a"*32, "0"*32, "f"*32, "user-id", " U1", "u1 ", "é", "用户", "p"*100]
        links = [row(users[i], users[i+1]) for i in range(0, 6, 2)] + [row("A-unused", users[2])]
        ev = []
        for i in range(500):
            at = r.randrange(14*DAY)
            ing = stamp(START + at + r.choice((-1000, 0, DAY, DAY+2000)))
            user = r.choice(users + [""])
            typ = r.choice(("view", "cart", "purchase", "purchase", "Purchase"))
            price = r.choice(("1", "0250", "10000000", "10000001", "0", "-1", "２５０", "abc", ""))
            eid = "e"+str(i) if i%8 else "e"+format(i, "032x")
            ts = at if i%17 else "bad"
            ev.append(event(eid, user, ts, typ, price, r.choice(("p1", "p2", "p3", "missing", "")), ing, i%3==0))
            if i%13==0:
                ev.append(event(eid, r.choice(users), ts, typ, price, "p1", stamp(START+at+2*DAY), False))
        ck=[]
        for i in range(350):
            cid = "k"+str(i) if i%8 else "k"+format(i, "032x")
            user=r.choice(users+[""])
            campaign=r.choice(("c_a", "c_b", "c_c", "", "unknown"))
            at=r.randrange(-WEEK, 14*DAY)
            ck.append(click(cid,user,campaign,at,i%3==0))
            if i%11==0:
                ck.append(click(cid,user,campaign,at,i%3!=0))
        r.shuffle(ev); r.shuffle(ck); r.shuffle(links)
        out.append(case("random_"+str(seed),ev,ck,links))
    return out


def bin_cases():
    gap=1_800_000
    ev=[]; ck=[]
    patterns=[
        [0,gap-1,gap,2*gap+1],
        [gap-1,2*gap],
        [0,gap,2*gap,3*gap],
        [0,1,gap-1,gap+1,2*gap-1,2*gap+1],
        [DAY-1,DAY,DAY+1,DAY+gap+2],
        [0,0,0,gap+1,gap+1,gap+1],
    ]
    for who,pattern in enumerate(patterns):
        user=f"bin-{who}"
        for repeat in range(5):
            for j,at in enumerate(reversed(pattern)):
                ev.append(event(f"bin-{who}-{repeat}-{j}",user,at,"purchase",1+repeat,"p1" if j%2 else "p2"))
        for j,at in enumerate(pattern):
            ck.extend([click(f"b{who}-{j}a",user,"c_a",at),click(f"b{who}-{j}z",user,"c_b",at),click(f"b{who}-{j}f",user,"c_c",at+1)])
    geometry=case("bin_boundary_geometry",ev,ck)
    r=random.Random(424242)
    ev=[];ck=[]
    for u in range(80):
        user=f"binrandom{u}"
        points=[]
        at=r.randrange(gap)
        for j in range(120):
            at+=r.choice((0,1,gap-1,gap,gap+1,2*gap+1))
            if at>=14*DAY:break
            points.append(at)
            ev.append(event(f"br{u}-{j}",user,at,"purchase",r.randrange(1,1000),"p1" if j%3 else "p2"))
            if j%3==0:ck.append(click(f"brk{u}-{j}",user,"c_a" if j%2 else "c_b",at-r.choice((0,1,WEEK,WEEK+1))))
    r.shuffle(ev);r.shuffle(ck)
    randomized=case("bin_random_boundaries",ev,ck)
    ev=[];ck=[]
    for i in range(50_000):
        at=(i%20_000)*27_123
        if i%20_000>=10_000:at+=3*DAY
        ev.append(event(f"whale{i}","whale-"+str(i%8),at,"purchase" if i%13==0 else "view",1 if i%13==0 else "","p1" if i%2 else "p2"))
        if i%5==0:ck.append(click(f"wk{i}","whale-"+str(i%8),"c_a" if i%3 else "c_b",at-(i%4)*DAY))
    r.shuffle(ev);r.shuffle(ck)
    whales=case("bin_shared_device_whale",ev,ck,[row("whale-"+str(i)," A-shared") for i in range(8)])
    return [geometry,randomized,whales]


def large_output_case():
    return case("parquet_multiple_pages",[event(f"ep{i}",f"up{i}",0,"purchase" if i%7==0 else "view",1 if i%7==0 else "") for i in range(70_000)])


def purchase_cases():
    plain=case("purchase_bins_no_purchases",[
        event(f"np{i}",f"nonbuyer{i%4}",(i%10_000)*5_000,"cart" if i%2 else "view","bad-price" if i%3 else "10000000")
        for i in range(20_000)
    ],[click(f"npk{i}","nonbuyer0","c_a",i*500_000) for i in range(100)],
        [row(f"nonbuyer{i}"," A-nonbuyer") for i in range(4)])
    allbuy=case("purchase_bins_all_purchases",[
        event(f"ap{i}","buyer",(i%4_000)*1_500+(2*DAY if i>=8_000 else 0),"purchase","10000000",("p1","p2","p3")[i%3])
        for i in range(12_000)
    ],[click("apk","buyer","c_b",0)])
    alternating=[]
    for person in range(8):
        for b in range(30):
            at=(person%2)*2*DAY+b*1_800_000+(b%3)
            for j in range(6):
                kind="purchase" if (b+person)%2 else "view"
                alternating.append(event(f"alt{person}-{b}-{j}",f"altperson{person}",at+j,kind,"250" if kind=="purchase" else "bad",("p1","p2")[j%2]))
            alternating.append(event(f"badzero{person}-{b}",f"altperson{person}",at,"purchase","0"))
            alternating.append(event(f"badnegative{person}-{b}",f"altperson{person}",at,"purchase","-1"))
    random.Random(99173).shuffle(alternating)
    mixed=case("purchase_bins_alternating_invalid",alternating)
    return [plain,allbuy,mixed]


def compact_cases():
    base=START-WEEK
    ev=[
        event("eearly", "u1", 1, "view", ingest="1900-01-01T00:00:00Z"),
        event("eearly", "u2", 1, "purchase", 1000, ingest=WS),
        event("eshadow", "u1", "bad", ingest="1900-01-01T00:00:00Z"),
        event("eshadow", "u2", 1, "purchase", 9000, ingest=WS),
        event("epfirst", "u1", 2, "purchase", 300, ingest=WS),
        event("epfirst", "u2", 2, "view", ingest=stamp(START+1000)),
        event("evfirst", "u1", 3, "cart", "ignored", ingest=WS),
        event("evfirst", "u2", 3, "purchase", 4000, ingest=stamp(START+1000)),
        event("ewideuser", "u"+"a"*32, 4, "view", ingest=WS),
        event("ewideuser", "u2", 4, "purchase", 8000, ingest=stamp(START+1000)),
        event("einvalid", "", 5, "view", ingest=WS),
        event("einvalid", "u2", 5, "purchase", 6000, ingest=stamp(START+1000)),
        event("efarlate", "u3", 6, "view", ingest="9999-12-31T23:59:59Z"),
        event("efarlate", "u3", 6, "purchase", 700, ingest=WS),
        event("eubound", "u4", 7, "view", ingest=stamp(base+4_294_967_000)),
        event("eubound", "u4", 7, "purchase", 900, ingest=stamp(base+4_294_968_000)),
        event("ecbase", "u5", 8, "view", ingest=stamp(base)),
        event("ecbefore", "u6", 9, "view", ingest=stamp(base-1000)),
        event("eexact", "u7", 1_800_000),event("eexact1", "u7", 3_600_000),
        event("eexact2", "u7", 5_400_001),
    ]
    lanes=case("compact_ingest_and_lanes",ev)
    body=HEADERS["events"]+b"\n"+event("esplit", "u1", "bad", ingest=WS)+b"\n"
    body+=b"\n"*(65_535-len(body))
    body+=event("esplit", "u2", 1, "purchase", 5000, ingest=stamp(START+1000))+b"\n"
    body+=event("epair", "u3", 2, "purchase", 350, ingest=WS)+b"\n"
    body+=b"\n"*(131_071-len(body))
    body+=event("epair", "u4", 2, "view", ingest=stamp(START+1000))+b"\n"
    body+=b"\n"*(196_607-len(body))
    body+=event("eend", "u5", 3, "view")
    chunk=case("compact_chunk_boundaries",part_overrides={"events":{"part-0.csv":body}})
    # Deliberate full-hash collisions in the existing reversible long-key hash.
    # The IDs themselves remain distinct opaque strings and must never merge.
    multiplier=0xc2b2_ae3d_27d4_eb4f
    mask=(1<<64)-1
    long_ids=[f"{hi:016x}{(17 ^ (hi*multiplier & mask)):016x}" for hi in range(1,49)]
    hashes={((int(s[16:],16) ^ ((int(s[:16],16)*multiplier)&mask))*0x9e37_79b9_7f4a_7c15)&mask for s in long_ids}
    assert len(hashes)==1 and len(set(long_ids))==48
    coll=[];links=[]
    for i,s in enumerate(long_ids):
        coll.append(event("e"+s,"u"+s,i,"purchase",i+1))
        coll.append(event("e"+s,"uz"+str(i),i,"view",ingest=stamp(START+1000)))
        links.append(row("u"+s,"ualias"+str(i)))
    collisions=case("compact_exact_hash_collisions",coll,links=links)
    groups=[
        ("uzzzzzzzzzzz","u00000000000000010000000000000000"),
        ("u0","u00000000000000020000000000000000"),
        ("uabc"," A-exotic-minimum"),
        ("ulower","uFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"),
        ("uz9","u"+"0"*32),
        ("uz8","u"+"f"*32),
        ("u10","u1"),
    ]
    mixed=[];edges=[];cks=[]
    for i,(a,b) in enumerate(groups):
        for j in range(15):mixed.append(event(f"em{i}-{j}",a,j,"purchase",i+1))
        edges.extend([row(a,b),row(b,a),row(a,a),row(a,"ulink"+str(i))])
        cks.append(click(f"km{i}",b,"c_a",0))
    random.Random(1031).shuffle(edges)
    canon=case("compact_mixed_component_canonicals",mixed,cks,edges)
    def base36(value):
        digits="0123456789abcdefghijklmnopqrstuvwxyz"
        if value==0:return "0"
        result=""
        while value:
            value,remainder=divmod(value,36)
            result=digits[remainder]+result
        return result
    codes=["0","00","1","01","00000001","z","10"]
    codes += [base36(v) for v in (36**7-1,36**7,36**7+1,(1<<41)-2,(1<<41)-1,1<<41,36**8-1,36**8,36**11-1)]
    packed_ids=[]
    for i,code in enumerate(codes):
        # Every distinct textual form remains a distinct event and person. A
        # later purchase forces comparison across compact/wide payload lanes.
        packed_ids.append(event("e"+code,"u"+code,i*1000,"view",ingest=WS))
        packed_ids.append(event("e"+code,"udifferent",i*1000,"purchase",800+i,ingest=stamp(START+1000)))
    ids=case("compact16_id_boundaries",packed_ids)
    packed_time=[]
    for i,seconds in enumerate(((1<<23)-2,(1<<23)-1,1<<23,(1<<23)+1)):
        eid="et"+str(i)
        packed_time.append(event(eid,"u1",i*1000,"view",ingest=stamp(base+seconds*1000)))
        packed_time.append(event(eid,"u1",i*1000,"purchase",100+i,ingest=WS))
    packed_time += [
        event("ezero","u2",0,"view",ingest=stamp(base)),
        event("enegative","u2",1000,"view",ingest=stamp(base-1000)),
        event("ems1","u3",1,"view"), event("ems2","u3",1_800_001,"view"),
        event("ems3","u3",3_600_002,"view"),
        event("einvalidsmall","u4","bad",ingest=WS),
        event("einvalidsmall","u4",1000,"purchase",500,ingest=stamp(START+1000)),
    ]
    times=case("compact16_time_boundaries",packed_time)
    dense_events=[];dense_links=[];dense_clicks=[]
    dense_groups=[("u2","u10"),("uz","u00"),("ua","u9z"),("u0","u000"),
                  ("u3","u22222222222222222222222222222222"),
                  ("u1234","u12340000000000000000000000000000")]
    for i,(a,b) in enumerate(dense_groups):
        dense_events.extend([event("edense"+str(i),a,1000,"purchase",i+1),event("edensex"+str(i),b,2000)])
        dense_links.append(row(a,b))
    # Click IDs are globally unique unless copies are identical. Use per-group
    # suffixes which preserve the targeted k10 < k2 lexical relation.
    dense_clicks=[]
    for i,(a,b) in enumerate(dense_groups):
        dense_clicks.extend([click("k2"+str(i),a,"c_a",0),click("k10"+str(i),b,"c_b",0)])
    dense_events.extend([event("edenselong","uhex",0),event("edenseprefix","uprefix",0)])
    dense_clicks.extend([click("k11","uhex","c_a",0),click("k10"+"0"*30,"uhex","c_c",0),
                         click("k1234","uprefix","c_b",0),click("k1234"+"0"*28,"uprefix","c_c",0)])
    dense=case("dense_interval_ordering",dense_events,dense_clicks,dense_links)
    return [lanes,chunk,collisions,canon,ids,times,dense]


def adaptive_cases():
    events=[];clicks=[];links=[]
    counts=(0,1,4,5,64,65)
    starts=(0,1_800_003,WEEK+1,WEEK+1+1_800_003)
    for group,count in enumerate(counts*2):
        user=f"ua{group}";alias=f"ub{group}"
        links.append(row(user,alias))
        for session,start in enumerate(starts):
            for j in range(1 if group<6 else 3):
                events.append(event(f"ead{group}-{session}-{j}",user,start+j,"purchase" if j==0 else "view",17+group if j==0 else "",("p1","p2")[session%2]))
        for i in range(count):
            if i<4:
                cid=("kedge","k2","k10","kfuture")[i]+str(group)
                at=(-WEEK,0,0,1)[i]
                campaign=("c_a","c_b","c_a","c_c")[i]
            else:
                shapes=(f"k{((1<<120)|(group<<32)|i):032x}",f"k0{group}_{i}",f"K{group}-{i}",f"ké{group}-{i}",f"k9{group}x{i}")
                cid=shapes[i%len(shapes)]
                at=(-WEEK+i*1000,-(i%5)*DAY,0,1,1_800_004)[i%5]
                campaign=("c_a","c_b","c_c")[i%3]
            clicks.append(click(cid,alias,campaign,at))
    random.Random(1807).shuffle(clicks)
    random.Random(1891).shuffle(events)
    cardinality=case("adaptive_click_cardinalities",events,clicks,links)
    events=[];clicks=[]
    for group,count in enumerate((4,5,64,65)):
        user=f"ud{group}"
        for session,start in enumerate(starts):events.append(event(f"edupc{group}-{session}",user,start,"purchase",101))
        clicks.append(click(f"kfirst{group}",user,"c_a",0))
        identical=click(f"ksecond{group}",user,"c_b",1)
        clicks.extend([identical]*(count-1))
    duplicates=case("adaptive_duplicate_click_membership",events,clicks)
    return [cardinality,duplicates]


def p2_cases():
    users=("u0","u00","u1","u01","u7","u8","u9","ua")
    events=[];clicks=[]
    for person,user in enumerate(users):
        for j in range(2400):
            at=(j//300)*2_100_000+(j%300)*1000+(2*DAY if j>=1200 else 0)
            if j%17==0:at+=1
            purchase=j%13==0
            events.append(event(f"ep{person}-{j}",user,at,"purchase" if purchase else ("view" if j%2 else "cart"),100+person if purchase else "ignored",("p1","p2")[j%2]))
        clicks.extend([click(f"kpb{person}",user,"c_a",0),click(f"kpa{person}",user,"c_b",2*DAY)])
    for i in range(32):
        events.extend([event(f"epbad{i}",users[i%8],"bad",ingest=stamp(START-1000)),event(f"epbad{i}",users[(i+1)%8],1000,"purchase",99999)])
    random.Random(2213).shuffle(events)
    return [case("p2_compact_and_general_blocks",events,clicks,
                 [row("u7"," A-wide-canonical"),row("u8","u00000000000000010000000000000000")])]


def dictionary_cases():
    events=[]
    for person in range(5000):
        user=(f"u{person}",f"u{person:032x}",f" 用户 {person}",f" leading {person} ",f"U_{person}-é")[person%5]
        for day in range(14):
            events.append(event(f"ed{person}x{day}",user,day*DAY+1000,"view",""))
    random.Random(31511).shuffle(events)
    return [case("dictionary_repeated_daily_ids",events)]


def wide42_cases():
    # The fast engine permits less than 2**32 milliseconds including its
    # seven-day click lookback. A 42-day event window reaches the 22-bit
    # seconds boundary while still exercising that engine, unlike 50 days.
    mask=(1<<22)-1
    points=((mask-1)*1000,mask*1000-1,mask*1000,mask*1000+1,
            (mask+1)*1000,(mask+2)*1000)
    events=[];clicks=[]
    for i,relative in enumerate(points):
        at=relative-WEEK
        user=f"ut{i}"
        events.extend([
            event(f"et{i}a",user,at,"view",ingest=WS),
            event(f"et{i}b",user,at+1000,"cart",ingest=WS),
            event(f"et{i}c",user,at+2000,"purchase",101+i,ingest=WS),
            event(f"et{i}d",user,at+2_000_000,"view",ingest=WS),
        ])
        clicks.extend([
            click(f"kt{i}edge",user,"c_c",at-WEEK),
            click(f"kt{i}2",user,"c_a",at),
            click(f"kt{i}10",user,"c_b",at),
            click(f"kt{i}future",user,"c_c",at+1),
        ])
    at=mask*1000-WEEK
    events.extend([
        event("esentinelinvalid","usuppress","bad",ingest=WS),
        event("esentinelinvalid","usuppress",at,"purchase",9001,ingest=stamp(START+1000)),
        event("esentinelview","umixed",at-1000,"view",ingest=WS),
        event("esentinelview","udifferent",at,"purchase",9002,ingest=stamp(START+1000)),
        event("esentinelpurchase","umixed",at,"purchase",103,ingest=WS),
        event("esentinelpurchase","udifferent",at-1000,"view",ingest=stamp(START+1000)),
        event("esentinellateinvalid","usuppress","bad",ingest=stamp(START-WEEK+mask*1000)),
        event("esentinellateinvalid","usuppress",at+3000,"purchase",9003,
              ingest=stamp(START-WEEK+(mask+1)*1000)),
    ])
    for i,seconds in enumerate((mask-1,mask,mask+1)):
        ing=START-WEEK+seconds*1000
        events.extend([
            event(f"eingestedge{i}",f"ui{i}",at+5000,"view",ingest=stamp(ing)),
            event(f"eingestedge{i}","udifferent",at+5000,"purchase",9100+i,ingest=stamp(ing+1000)),
        ])
    time_case=case("wide42_time_boundaries",events,clicks,
                   window_end=stamp(START+42*DAY),require_fast=True)

    # Derive opaque textual IDs from their exact dense length intervals, so
    # these checks hit the bit boundary rather than a nearby numeric suffix.
    def dense_suffix(code):
        length=1;base=1
        while code>=base+36**length:
            base+=36**length;length+=1
        value=code-base
        chars="0123456789abcdefghijklmnopqrstuvwxyz"
        result=""
        for _ in range(length):
            value,digit=divmod(value,36)
            result=chars[digit]+result
        assert value==0
        assert base+int(result,36)==code
        return result
    codes=(1,36,37,(1<<41)-1,1<<41,(1<<41)+1,(1<<42)-1,1<<42,(1<<42)+1)
    suffixes=[dense_suffix(code) for code in codes]+["zzzzzzzz","00000000","000000000"]
    assert len(suffixes)==len(set(suffixes))
    events=[];clicks=[]
    for i,suffix in enumerate(suffixes):
        user="u"+suffix
        events.extend([
            event("e"+suffix,user,i*1000,"view",ingest=WS),
            event("e"+suffix,"udifferent",i*1000,"purchase",8000+i,ingest=stamp(START+1000)),
            event(f"ebuy{i}",user,i*1000+1,"purchase",i+1,ingest=WS),
        ])
        clicks.extend([
            click("k"+suffix,user,"c_a",0),
            click("k00"+suffix,user,"c_b",0),
        ])
    # Mixed compact/wide component roots must retain the bytewise minimum.
    a="u"+dense_suffix((1<<42)-7);b="u"+dense_suffix((1<<42)+7)
    events.extend([event("elink42a",a,1000),event("elink42b",b,2000,"purchase",57)])
    clicks.append(click("klink42",b,"c_c",0))
    key_case=case("wide42_key_lane_boundaries",events,clicks,[row(a,b)],require_fast=True)
    return [time_case,key_case]


def materialize(c, destination):
    target=destination/c["name"]
    target.mkdir(parents=True,exist_ok=True)
    (target/"manifest.json").write_text(json.dumps({"window_start": WS, "window_end": c.get("window_end",WE)}))
    for name, defaults in (("products",[("p1","alpha"),("p2","beta"),("p3","gamma")]),("campaigns",[("c_a","search"),("c_b","social"),("c_c","email")])):
        head=b"product_id,category" if name=="products" else b"campaign_id,channel"
        (target/(name+".csv")).write_bytes(b"\n".join([head]+[row(*v) for v in c.get(name,defaults)])+b"\n")
    for kind in HEADERS:
        folder=target/kind; folder.mkdir(exist_ok=True)
        for i in range(5):
            rows=c[kind][i::5]
            body=b"\n".join([HEADERS[kind]]+rows)
            if i%2: body+=b"\n"
            if c.get("pad_to_page") and kind=="events" and i==0:
                # Null lines are malformed; exactly page-sized mappings exercise scan tails.
                body=body+b"\n"*(4096-len(body))
            (folder/f"part-{i}.csv").write_bytes(body)
        if kind in c.get("hidden",{}):
            (folder/".extra.csv").write_bytes(b"\n".join([HEADERS[kind]]+c["hidden"][kind])+b"\n")
        for filename,content in c.get("part_overrides",{}).get(kind,{}).items():
            (folder/filename).write_bytes(content)
    return target


def reference_rows(reference, data):
    spec=importlib.util.spec_from_file_location("plain_reference",reference)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    saved=sys.argv; sys.argv=[str(reference),str(data),str(data/"unused")]
    result={}
    def capture(unused,user,campaign,channel):
        result["user_daily"]=[]; result["campaign_daily"]=[]
        date=lambda d:(dt.date(1970,1,1)+dt.timedelta(days=d)).isoformat()
        for (person,day),(sessions,events,revenue,categories) in user.items():
            top=None if not categories else min((c for c,v in categories.items() if v==max(categories.values())))
            result["user_daily"].append((person.decode(),date(day),sessions,events,revenue,None if top is None else top.decode()))
        for (camp,day),(sessions,purchasing,revenue,assists) in campaign.items():
            result["campaign_daily"].append((camp.decode(),"organic" if camp==b"organic" else channel[camp].decode(),date(day),sessions,purchasing,revenue,assists))
    module.write_outputs=capture
    try: module.main()
    finally: sys.argv=saved
    return result


COLUMNS={"user_daily":("user_id","day","sessions","events","revenue_cents","top_category"),"campaign_daily":("campaign_id","channel","day","sessions","purchasing_sessions","revenue_cents","assisted_sessions")}


def actual_rows(output):
    import pyarrow as pa
    import pyarrow.parquet as pq
    result={}
    for table,columns in COLUMNS.items():
        paths=[p for p in (output/table).glob("*.parquet") if not p.name.startswith((".","_")) and not p.is_symlink()]
        if not paths: raise AssertionError(f"no {table} Parquet file")
        rows=[]
        for p in paths:
            tab=pq.read_table(p)
            if len(tab.column_names)!=len(columns) or set(tab.column_names)!=set(columns): raise AssertionError(f"bad columns {tab.column_names}")
            for field in tab.schema:
                kind=field.type.value_type if pa.types.is_dictionary(field.type) else field.type
                if field.name=="day":
                    valid=pa.types.is_date32(field.type)
                elif field.name in ("sessions","events","revenue_cents","purchasing_sessions","assisted_sessions"):
                    valid=pa.types.is_integer(field.type)
                else:
                    valid=pa.types.is_string(kind) or pa.types.is_large_string(kind)
                if not valid: raise AssertionError(f"wrong logical type {field.name}: {field.type}")
            for d in tab.to_pylist():
                rows.append(tuple(d[k].isoformat() if k=="day" else d[k] for k in columns))
        result[table]=rows
    return result


def second_reader_rows(output):
    import duckdb
    connection=duckdb.connect()
    result={}
    try:
        for table,columns in COLUMNS.items():
            paths=[str(p) for p in (output/table).glob("*.parquet") if not p.name.startswith((".","_")) and not p.is_symlink()]
            query="SELECT "+",".join(columns)+" FROM read_parquet(?)"
            records=connection.execute(query,[paths]).fetchall()
            result[table]=[tuple(v.isoformat() if k=="day" else v for k,v in zip(columns,record)) for record in records]
    finally:connection.close()
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--reference",type=Path,default=ROOT.parents[1]/"handoff/tracks/shopping-sessions/verify/ref.py")
    parser.add_argument("--binary",type=Path)
    parser.add_argument("--root",type=Path,default=ROOT/"adversarial-data")
    parser.add_argument("--mode",action="append",default=[] ,help="NCPU[:slow|scalar], repeat flag for multiple modes")
    parser.add_argument("--report",type=Path,default=ROOT/"adversarial-results.json")
    parser.add_argument("--only",default="")
    parser.add_argument("--repeat",action="store_true")
    parser.add_argument("--bin-cases",action="store_true")
    parser.add_argument("--large-output",action="store_true")
    parser.add_argument("--purchase-cases",action="store_true")
    parser.add_argument("--compact-cases",action="store_true")
    parser.add_argument("--adaptive-cases",action="store_true")
    parser.add_argument("--p2-cases",action="store_true")
    parser.add_argument("--dictionary-cases",action="store_true")
    parser.add_argument("--wide42-cases",action="store_true")
    parser.add_argument("--second-reader",action="store_true")
    args=parser.parse_args()
    if hasattr(sys,"set_int_max_str_digits"):sys.set_int_max_str_digits(0)
    result=[]
    suite=cases()+(bin_cases() if args.bin_cases else [])+([large_output_case()] if args.large_output else [])+(purchase_cases() if args.purchase_cases else [])+(compact_cases() if args.compact_cases else [])+(adaptive_cases() if args.adaptive_cases else [])+(p2_cases() if args.p2_cases else [])+(dictionary_cases() if args.dictionary_cases else [])+(wide42_cases() if args.wide42_cases else [])
    for c in suite:
        if args.only and args.only not in c["name"]: continue
        data=materialize(c,args.root)
        expected=reference_rows(args.reference,data)
        (data/"expected.json").write_text(json.dumps(expected,ensure_ascii=False,indent=2))
        if not args.binary: continue
        for mode in args.mode or ["1","4","8","1:slow","1:scalar"]:
            n,*path=mode.split(":")
            output=args.root/("out-"+c["name"]+"-"+mode.replace(":","-"))
            output.mkdir(parents=True,exist_ok=True)
            env=os.environ.copy();env.update(DATA_DIR=str(data),OUTPUT_DIR=str(output),NCPU=n)
            env.pop("SESSIONS_PATH",None);env.pop("SESSIONS_SCALAR",None)
            if path and path[0]=="slow":env["SESSIONS_PATH"]="slow"
            if path and path[0]=="scalar":env["SESSIONS_SCALAR"]="1"
            for repetition in range(2 if args.repeat else 1):
                started=time.monotonic()
                run=subprocess.run([str(args.binary.resolve())],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
                entry={"case":c["name"],"mode":mode,"repeat":repetition,"seconds":time.monotonic()-started,"exit":run.returncode,"stdout_bytes":len(run.stdout),"bin_threshold":env.get("SESSIONS_BIN_THRESHOLD","default")}
                try:
                    assert run.returncode==0,run.stderr.decode(errors="replace")[-1000:]
                    assert not run.stdout,"stdout must be empty"
                    if c.get("require_fast") and not (path and path[0]=="slow"):
                        assert b"general path:" not in run.stderr,"boundary case unexpectedly bypassed the fast engine"
                        entry["fast_path_verified"]=True
                    got=actual_rows(output)
                    for table in COLUMNS:
                        want=Counter(expected[table]);have=Counter(got[table])
                        assert want==have,{"table":table,"missing":list((want-have).items())[:5],"extra":list((have-want).items())[:5]}
                    if args.second_reader:
                        other=second_reader_rows(output)
                        for table in COLUMNS:
                            assert Counter(expected[table])==Counter(other[table]),{"table":table,"reader":"duckdb"}
                        entry["readers"]=["pyarrow","duckdb"]
                    entry["passed"]=True
                except Exception as error:
                    entry["passed"]=False;entry["error"]=str(error)
                    (output/"failure.log").write_bytes(run.stderr)
                result.append(entry)
                print(json.dumps(entry),flush=True)
    args.report.write_text(json.dumps(result,indent=2))
    digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    args.report.with_suffix(".meta.json").write_text(json.dumps({"binary":str(args.binary) if args.binary else None,"binary_sha256":digest(args.binary) if args.binary else None,"reference":str(args.reference),"reference_sha256":digest(args.reference),"harness_sha256":digest(Path(__file__)),"arguments":vars(args)},default=str,indent=2))
    failures=sum(not r["passed"] for r in result)
    print(json.dumps({"runs":len(result),"passed":len(result)-failures,"failed":failures,"report":str(args.report)}))
    return int(bool(failures))


if __name__=="__main__":
    raise SystemExit(main())
