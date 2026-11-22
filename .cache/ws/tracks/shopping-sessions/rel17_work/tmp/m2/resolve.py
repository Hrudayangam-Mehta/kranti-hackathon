import re, sys
src = open(sys.argv[1]).read()
blocks = re.findall(r"<<<<<<< cur\.rs\n(.*?)=======\n(.*?)>>>>>>> other\.rs\n", src, flags=re.S)
assert len(blocks) == 3, len(blocks)
out = src
for i, (cur, other) in enumerate(blocks):
    res = other
    res = res.replace("                let mut scratch = Scratch::new();\n", "")
    res = res.replace("parse_events(ctx, chunk, &mut scratch, &mut arena, p1.as_mut().unwrap())", "parse_events(ctx, chunk, &mut arena, p1.as_mut().unwrap())")
    res = res.replace("click_count +=\n                                        parse_clicks(ctx, people, chunk, &mut scratch, &mut arena, clicks.as_mut().unwrap());", "click_count += parse_clicks(ctx, people, chunk, &mut arena, clicks.as_mut().unwrap());")
    assert "scratch" not in res, res
    out = out.replace("<<<<<<< cur.rs\n" + cur + "=======\n" + other + ">>>>>>> other.rs\n", res, 1)
assert "<<<<<<<" not in out and ">>>>>>>" not in out and "=======\n" not in out
assert "Scratch" not in out and "scratch" not in out
open(sys.argv[2], "w").write(out)
print("resolved")
