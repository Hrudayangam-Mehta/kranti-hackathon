#!/bin/bash
# defaults (every preset at its old value) on all 10 sources, then each preset 'on' on the 6 forced-FFA sources (T-F2)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; A=$S/fable_work/w2/A; L=$A/tree/lib
TAG=def LIB=$L $A/tools/rec.sh
TAG=defold LIB=$L SEL='"en_open":"off","en_band":"off","en_retarget":"off","en_contra":"off","fi_gate":"off","fi_save":"off","fi_reload":"off","fi_snap":"off","fi_rung":"off"' $A/tools/rec.sh
FF="kit_ffa l4800_ffa f1_ffa f2_ffa f3_ffa f4_ffa"
for p in en_open en_band en_retarget en_contra fi_gate fi_save fi_reload fi_snap fi_rung; do TAG=ff_$p LIB=$L SEL="\"$p\":\"on\"" SRCS="$FF" $A/tools/rec.sh; done
TAG=ff_strict LIB=$L SEL='"en_open":"strict"' SRCS="$FF" $A/tools/rec.sh; TAG=ff_rung LIB=$L SEL='"fi_rung":"rung"' SRCS="$FF" $A/tools/rec.sh
TAG=ff_bundle LIB=$L SEL='"en_open":"on","en_band":"on","en_retarget":"on","en_contra":"on","fi_gate":"on","fi_save":"on","fi_reload":"on","fi_snap":"on","fi_rung":"on"' SRCS="$FF" $A/tools/rec.sh
TAG=sq_bundle LIB=$L SEL='"en_open":"on","en_band":"on","en_retarget":"on","en_contra":"on","fi_gate":"on","fi_save":"on","fi_reload":"on","fi_snap":"on","fi_rung":"on"' SRCS="kit_squad kit_auto l4800_squad l4800_auto" $A/tools/rec.sh
echo ALLDONE > $A/id/IDALL_DONE
