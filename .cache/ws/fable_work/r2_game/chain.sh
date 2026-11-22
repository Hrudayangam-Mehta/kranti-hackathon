#!/bin/bash
cd $(dirname $0)
LIB=$PWD/lib3 N=36 ./run.sh B ''
LIB=$PWD/lib3 N=36 ./run.sh NV ',"lcCoverS":0,"lcLowHpf":0'
