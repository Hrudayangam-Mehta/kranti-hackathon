#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; A=$S/fable_work/w2/A; L=$A/tree/lib
$A/tools/simx.sh band_noD4 $L '"en_band":"on"' '"enAwayR":0'
$A/tools/simx.sh band_noD6 $L '"en_band":"on"' '"enFireGunR":0,"enFireLaserR":0,"enWalkHpf":0'
$A/tools/simx.sh band_noD2 $L '"en_band":"on"' '"enGunLo":55,"enGunHold":75,"enGunHi":95,"enStrafeMinR":1e9'
