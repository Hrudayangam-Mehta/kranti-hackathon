import sys
fn = sys.argv[1]
s = open(fn).read()
R = [
("""  commit is 20 s earlier (kyoto-max). A chance hit within 1 s is not negligible (about 0.2 expected false hits over
  76 rows x 53 commits), so timing alone is not proof.""",
"""  commit is 20 s earlier (kyoto-max). But chance is real: in the 5 minutes before that board time the cloned repos
  made about 45 commits (0.15 per second), so any 2 s window catches some commit about 30% of the time. Timing
  alone is not proof."""),
("""- Second kind of evidence: Achintya-Lakshmanan's report (S4, written 04:24 UTC) lists 314159265 among practice
  #1-#4 (true only between 02:10:49 and 02:30:59 UTC, when 4.92 was fourth) and describes it as an aggressive
  booster that dies in the opening; the free-for-all posture in this code produces exactly that (section 7).""",
"""- Second kind of evidence: Achintya-Lakshmanan's report (S4, written 04:24 UTC) lists 314159265 among practice
  #1-#4 (consistent with the board between 02:10:49 and 02:30:59 UTC, when 4.92 would be fourth behind BobBuildIt,
  AT and Wolverines; other teams' earlier, lower scores are invisible, so this is a consistency check only) and
  describes it as an aggressive booster that dies in the opening; the free-for-all posture in this code produces
  that pattern (section 7)."""),
("""- Out of sight: when its target ducks behind cover within 60 m and it holds no lightning, it stops dead and holds
  the angle (it sidesteps only if hit in the last 2 s); farther away it paths after the target (practice only).""",
"""- Out of sight: when its target ducks behind cover within 60 m and it holds no lightning, it stops dead and holds
  the angle (it sidesteps only if hit in the last 2 s); farther away it paths after the target in the practice
  posture, and in the opening or a free-for-all only when it holds lightning and the target is within 90 m. In the
  middle of a free-for-all a lost sight line usually ends the fight instead (it is no longer "cornered", so it flees)."""),
("""   then ground crates (only with no hostile within 180 m and hp at least 70%) and drones (hp above 60%), all""",
"""   then ground crates (only with no mech within 180 m and hp at least 70%; in the opening and a free-for-all only
   hostile mechs count) and drones (hp above 60%), all"""),
("""3. Corner freeze: when its target ducks behind cover inside 60 m and it has no lightning, it stops dead and holds
   the angle until hit.""",
"""3. Corner freeze: when its target ducks behind cover inside 60 m and it has no lightning, it stops dead and holds
   the angle until hit (practice posture, opening, last three alive, or when its target is weak prey; in mid
   free-for-all a lost sight line makes it flee instead)."""),
("""- S6 Corner freeze: stops dead when its target ducks out of sight inside 60 m.""",
"""- S6 Corner freeze: stops dead when its target ducks out of sight inside 60 m (opening, the 40 s practice window,
  last three alive, or while hunting a target under 35% hp)."""),
("""| C1 | S2: a mech standing under 1 m/s within 3 m of a wall for more than 1 s at low speed history, or rising at 8-10 m/s beside a wall |""",
"""| C1 | S2: a mech standing (under 1 m/s) within 3 m of a building wall for more than 1 s, often right after a retreat leg, or rising at 8-10 m/s beside a wall |"""),
("""| C4 | S6: after we break sight inside 60 m, the mech that was fighting us stops dead (speed under 1 m/s) |""",
"""| C4 | S6: after we break sight inside 60 m, the mech that was fighting us stops dead (speed under 1 m/s); expect it in the opening, at 3 or fewer alive, or when we are under 35% hp |"""),
("""| 7 | A free-for-all latch on one foreign death before 60 s (two later) cost nothing visible in practice, where house bots die only to us | D12 latches at three; keep three for safety in practice (the looser latch that cost 1.6 elsewhere used beams), but two is defensible if the final needs an earlier switch | [1] absolute |""",
"""| 7 | A free-for-all latch on one foreign death before 60 s (two later) cost nothing visible in practice, where house bots die only to us | D12 latches at three; keep three for practice safety (X02's 3.56 line is confounded by six changes; X03's simulator saw 4% false positives for a two-death rule), but two before 120 s is defensible if the final needs an earlier switch | [1] absolute |"""),
("""- Identity rests on one sub-2 s timing hit plus a behaviour description; a coincidence has roughly a 1-in-5 chance.""",
"""- Identity rests on one sub-2 s timing hit plus a behaviour description; a chance commit falls in a given 2 s
  window about 30% of the time, so a coincidence is not excluded (the milestone label and the behaviour match make
  it less likely)."""),
]
for a, b in R:
    if s.count(a) != 1:
        print("MISS:", a[:70]); continue
    s = s.replace(a, b)
open(fn, "w").write(s)
print("ok")
