#!/usr/bin/env python3
import ctypes, os, sys
ctypes.CDLL(None, use_errno=True).prctl(41, 1, 0, 0, 0)
os.execvp(sys.argv[1], sys.argv[1:])
