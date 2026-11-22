#!/bin/bash
cd $(dirname $0)
LIB=$PWD/lib2 N=12 ./run.sh K ',"lcKill":true'
LIB=$PWD/lib2 N=12 ./run.sh K50 ',"lowKillHpf":0.5'
LIB=$PWD/lib2 N=6 ./run.sh id2 ''
LIB=$PWD/lib2 N=12 ./run.sh KN ',"lcKill":true,"lcCoverS":0,"lcLowHpf":0'
