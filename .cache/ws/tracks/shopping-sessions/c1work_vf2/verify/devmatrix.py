#!/usr/bin/env python3
"""Dev set (seed 1, 1M events) against kit/unz/dev-answer, both ways, in many configurations of
the F2 binary (and the F1 binary). Usage: devmatrix.py -> runs/dev_matrix.txt"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrun2  # noqa: E402

DEV = f"{vrun2.T}/kit/data/dev"
ANS = f"{vrun2.T}/kit/unz/dev-answer"
EK, UK = "0xf24638c44b", "0xf94d067aa5"
cfgs = [("n1", "f2", 1, {}), ("n2", "f2", 2, {}), ("n3", "f2", 3, {}), ("n4", "f2", 4, {}), ("n8", "f2", 8, {}),
        ("n16", "f2", 16, {}),
        ("G", "f2", 2, {"SESSIONS_LANE": "G"}), ("G_n8", "f2", 8, {"SESSIONS_LANE": "G"}),
        ("f2off", "f2", 2, {"SESSIONS_F2": "0"}), ("slow", "f2", 2, {"SESSIONS_PATH": "slow"}),
        ("scalar", "f2", 2, {"SESSIONS_SCALAR": "1"})]
for b in (6, 7, 8, 9, 10, 11, 12, 13, 14):
    cfgs.append((f"b{b}", "f2", [1, 2, 3, 5, 8][b % 5], {"SESSIONS_TEST_BUCKET_BITS": str(b)}))
cfgs += [("ekey_xor1", "f2", 2, {"SESSIONS_TEST_EVENT_KEY": hex(int(EK, 16) ^ 1)}),
         ("ekey_12345", "f2", 2, {"SESSIONS_TEST_EVENT_KEY": "12345"}),
         ("ekey_true_ncap300k", "f2", 2, {"SESSIONS_TEST_EVENT_KEY": EK, "SESSIONS_TEST_NCAP": "300000"}),
         ("ekey_true_ncap1_b6", "f2", 3, {"SESSIONS_TEST_EVENT_KEY": EK, "SESSIONS_TEST_NCAP": "1",
                                          "SESSIONS_TEST_BUCKET_BITS": "6"}),
         ("twist_ekey_b6", "f2", 2, {"SESSIONS_TEST_TWIST": "1", "SESSIONS_TEST_EVENT_KEY": EK,
                                     "SESSIONS_TEST_BUCKET_BITS": "6"}),
         ("ukey_wrong_ekey", "f2", 2, {"SESSIONS_TEST_USER_KEY": hex(int(UK, 16) ^ 2), "SESSIONS_TEST_EVENT_KEY": EK}),
         ("gcap3000_ekey_b6", "f2", 2, {"SESSIONS_TEST_GCAP": "3000", "SESSIONS_TEST_EVENT_KEY": EK,
                                        "SESSIONS_TEST_BUCKET_BITS": "6"}),
         ("gcap1_ekey", "f2", 2, {"SESSIONS_TEST_GCAP": "1", "SESSIONS_TEST_EVENT_KEY": EK}),
         ("scalar_twist_ekey_n1", "f2", 1, {"SESSIONS_SCALAR": "1", "SESSIONS_TEST_TWIST": "1",
                                            "SESSIONS_TEST_EVENT_KEY": EK}),
         ("f1_n2", "f1", 2, {}), ("f1_n8", "f1", 8, {}), ("f1_G", "f1", 2, {"SESSIONS_LANE": "G"})]
ok, txt, _ = vrun2.check(DEV, "dev", cfgs, ref_out=ANS)
open(f"{vrun2.RUNS}/dev_matrix.txt", "w").write(txt + "\n")
print(txt)
