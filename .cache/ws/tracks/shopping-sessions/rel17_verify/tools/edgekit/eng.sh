#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
exec env -i DATA_DIR="$D" OUTPUT_DIR="$O" NCPU=${NCPU:-2} ${EXTRA_ENV} nice -n 10 taskset -c 2,3 ${ENG_BIN}
